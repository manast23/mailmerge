import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'
import { getCurrentUser } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

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

  // Scheduled — save as FollowUp records with status 'scheduled'
  if (scheduledAt) {
    await prisma.followUp.createMany({
      data: targets.map(r => ({
        recipientId: r.id,
        templateId,
        status:      'scheduled',
        scheduledAt: new Date(scheduledAt),
        number:      followUpNumber,
        delayMin,
        delayMax,
        fromName:    fromName || null,
        fromEmail:   user.gmailAddress || null,
        trackId:     randomUUID(),
      }))
    })
    return NextResponse.json({ success: true, scheduled: true, count: targets.length })
  }

  if (!user.encryptedAppPassword || !user.gmailAddress) {
    return NextResponse.json({ error: 'Connect your Gmail account first (Account tab) before sending.' }, { status: 400 })
  }
  const gmailUser = user.gmailAddress
  const gmailAppPassword = decrypt(user.encryptedAppPassword)

  // Send immediately
  let sentCount = 0
  const errors: string[] = []

  for (let i = 0; i < targets.length; i++) {
    const recipient = targets[i]
    const trackId = randomUUID()

    try {
      const data    = recipient.data as Record<string, string>
      const html    = replacePlaceholders(template.body, data).replace(/\n/g, '<br>')

      // Gmail threads by subject — use Re: + original subject for threading
      // Original subject is stored in recipient data as _subject after first send
      const originalSubject = (recipient.data as any)._subject
      const followUpSubject = replacePlaceholders(template.subject, data)
      const subject = recipient.messageId && originalSubject
        ? `Re: ${originalSubject}`
        : followUpSubject

      const result = await sendEmail({
        to: recipient.email, subject, html, trackId, fromName,
        gmailUser, gmailAppPassword,
        attachmentUrl:  template.attachmentUrl  || undefined,
        attachmentName: template.attachmentName || undefined,
        inReplyTo:  recipient.messageId || undefined,
        references: recipient.messageId || undefined,
      })

      await prisma.$transaction([
        prisma.followUp.create({
          data: { recipientId: recipient.id, templateId, status: 'sent', sentAt: new Date(), trackId, messageId: result.messageId || null, number: followUpNumber }
        }),
        prisma.recipient.update({ where: { id: recipient.id }, data: { followUpCount: { increment: 1 } } })
      ])
      sentCount++
    } catch (e: any) {
      await prisma.followUp.create({
        data: { recipientId: recipient.id, templateId, status: 'error', error: e.message, trackId, number: followUpNumber }
      })
      errors.push(`${recipient.email}: ${e.message}`)
    }

    if (i < targets.length - 1) await randomDelay(delayMin, delayMax)
  }

  return NextResponse.json({ success: true, sentCount, errors })
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
