import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (!user.encryptedAppPassword) {
    return NextResponse.json({ error: 'Connect your Gmail account first (Account tab) before sending.' }, { status: 400 })
  }

  const body = await req.json()
  const { campaignId, delayMin = 3600, delayMax = 7200, dailyLimit = 450, fromName, scheduleAt } = body

  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  const campaignOwner = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaignOwner || campaignOwner.userId !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (scheduleAt) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data:  { status: 'scheduled', scheduledAt: new Date(scheduleAt) }
    })
    return NextResponse.json({ success: true, scheduled: true })
  }

  const campaign = await prisma.campaign.findUnique({
    where:   { id: campaignId },
    include: { template: true, recipients: { where: { status: 'pending' } } }
  })

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const pending = campaign.recipients
  if (!pending.length) return NextResponse.json({ success: true, sentCount: 0 })

  // Calculate staggered sendAfter times for each recipient. If there are more recipients
  // than the per-day cap, spill the overflow into subsequent days (same time-of-day window)
  // instead of silently dropping them — cron will pick each batch up once its day arrives.
  const now = new Date()
  const avgDelay = (delayMin + delayMax) / 2
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  const updates = pending.map((recipient, index) => {
    const dayOffset = Math.floor(index / dailyLimit)
    const indexInDay = index % dailyLimit
    const sendAfter = new Date(now.getTime() + dayOffset * ONE_DAY_MS + (indexInDay * avgDelay) * 1000)

    return prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        sendAfter,
        status: 'pending',
        fromName: fromName || null,
        fromEmail: user.gmailAddress || null,
      }
    })
  })

  await prisma.$transaction(updates)

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'sending' }
  })

  const daysNeeded = Math.ceil(pending.length / dailyLimit)
  return NextResponse.json({
    success: true,
    queuedCount: pending.length,
    daysNeeded,
    message: daysNeeded > 1
      ? `Queued ${pending.length} recipients across ${daysNeeded} days (${dailyLimit}/day limit) — the rest will send automatically on the following days via cron.`
      : `Queued ${pending.length} recipients. Emails will be sent with ${delayMin}-${delayMax}s delays via cron.`
  })
}
