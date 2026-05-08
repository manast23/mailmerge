import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { campaignId, delayMin = 30, delayMax = 90, dailyLimit = 450, fromName, fromEmail, scheduleAt } = body

  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

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

  const pending = campaign.recipients.slice(0, dailyLimit)
  if (!pending.length) return NextResponse.json({ success: true, sentCount: 0 })

  await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'sending' } })

  let sentCount = 0
  const errors: string[] = []

  for (let i = 0; i < pending.length; i++) {
    const recipient = pending[i]
    const data      = recipient.data as Record<string, string>
    const trackId   = randomUUID()
    try {
      const subject = replacePlaceholders(campaign.template.subject, data)
      const html    = replacePlaceholders(campaign.template.body, data)
      await sendEmail({ to: recipient.email, subject, html, trackId, fromName, fromEmail })
      await prisma.recipient.update({
        where: { id: recipient.id },
        data:  { status: 'sent', sentAt: new Date(), trackId }
      })
      sentCount++
    } catch (e: any) {
      await prisma.recipient.update({
        where: { id: recipient.id },
        data:  { status: 'error', error: e.message }
      })
      errors.push(`${recipient.email}: ${e.message}`)
    }
    if (i < pending.length - 1) await randomDelay(delayMin, delayMax)
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data:  { status: 'done', sentCount: { increment: sentCount } }
  })

  return NextResponse.json({ success: true, sentCount, errors })
}