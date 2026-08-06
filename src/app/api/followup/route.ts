import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (!user.encryptedAppPassword || !user.gmailAddress) {
    return NextResponse.json({ error: 'Connect your Gmail account first (Account tab) before sending.' }, { status: 400 })
  }

  const { campaignId, templateId, followUpType, followUpLevel, selectedIds, scheduledAt, delayMin = 30, delayMax = 90, fromName } = await req.json()

  if (!campaignId || !templateId || !followUpType || followUpLevel === undefined) {
    return NextResponse.json({ error: 'campaignId, templateId, followUpType and followUpLevel required' }, { status: 400 })
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template || template.userId !== user.id) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const whereFilter: any = selectedIds?.length
    ? { id: { in: selectedIds }, campaignId, status: 'sent' }
    : {
        campaignId, status: 'sent',
        followUpCount: followUpLevel,
        ...(followUpType === 'opened'     ? { openedAt: { not: null } } : {}),
        ...(followUpType === 'not_opened' ? { openedAt: null }          : {}),
      }

  const targets = await prisma.recipient.findMany({ where: whereFilter })
  if (!targets.length) return NextResponse.json({ error: 'No recipients match this filter' }, { status: 400 })

  const followUpNumber = followUpLevel + 1

  // Always queue as 'scheduled' FollowUp records with a staggered scheduledAt, whether the
  // user picked an explicit time or hit "send now" — cron picks these up a few at a time
  // (see /api/cron section 3), resumable across ticks. This used to send "now" follow-ups
  // synchronously in this request with an awaited delayMin-delayMax (default 30-90s!) gap
  // between each recipient — even 2 recipients meant a guaranteed 30s+ hold inside a single
  // HTTP request, which reliably exceeds Vercel's function timeout and leaves the rest of
  // the follow-ups simply never sent, no error shown.
  const baseTime = scheduledAt ? new Date(scheduledAt) : new Date()
  const avgDelay = (delayMin + delayMax) / 2
  await prisma.followUp.createMany({
    data: targets.map((r, index) => ({
      recipientId: r.id,
      templateId,
      status:      'scheduled',
      scheduledAt: new Date(baseTime.getTime() + index * avgDelay * 1000),
      number:      followUpNumber,
      delayMin,
      delayMax,
      fromName:    fromName || null,
      fromEmail:   user.gmailAddress || null,
      trackId:     randomUUID(),
    }))
  })

  return NextResponse.json({
    success: true,
    scheduled: !!scheduledAt,
    count: targets.length,
    message: scheduledAt
      ? `Scheduled ${targets.length} follow-up${targets.length > 1 ? 's' : ''} for ${baseTime.toLocaleString()}.`
      : `Queued ${targets.length} follow-up${targets.length > 1 ? 's' : ''} — cron will send them within the next few minutes.`
  })
}

// Cancel a scheduled follow-up
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const followUp = await prisma.followUp.findUnique({
    where: { id },
    include: { recipient: { include: { campaign: true } } }
  })
  if (!followUp || followUp.recipient.campaign.userId !== user.id) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  }

  await prisma.followUp.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
