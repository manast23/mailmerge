import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let totalSent = 0

  // ── 1. Process scheduled campaigns ──────────────────────
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
    include: { template: true, recipients: { where: { status: 'pending' } } }
  })

  for (const campaign of campaigns) {
    if (!campaign.recipients.length) {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'done' } })
      continue
    }
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'sending' } })
    let sentCount = 0

    for (let i = 0; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i]
      const data = recipient.data as Record<string, string>
      const trackId = randomUUID()
      try {
        const subject = replacePlaceholders(campaign.template.subject, data)
        const html    = replacePlaceholders(campaign.template.body, data).replace(/\n/g, '<br>')
        const result  = await sendEmail({
          to: recipient.email, subject, html, trackId,
          attachmentUrl:  campaign.template.attachmentUrl  || undefined,
          attachmentName: campaign.template.attachmentName || undefined,
        })
        await prisma.recipient.update({
          where: { id: recipient.id },
          data:  { status: 'sent', sentAt: new Date(), trackId, messageId: result.messageId || null }
        })
        sentCount++
      } catch (e: any) {
        await prisma.recipient.update({ where: { id: recipient.id }, data: { status: 'error', error: e.message } })
      }
      if (i < campaign.recipients.length - 1) await randomDelay(5, 15)
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'done', sentCount: { increment: sentCount } } })
    totalSent += sentCount
  }

  // ── 2. Process scheduled follow-ups ─────────────────────
  const scheduledFollowUps = await prisma.followUp.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
    include: { recipient: true, template: true }
  })

  for (let i = 0; i < scheduledFollowUps.length; i++) {
    const followUp = scheduledFollowUps[i]
    try {
      const data    = followUp.recipient.data as Record<string, string>
      const subject = replacePlaceholders(followUp.template.subject, data)
      const html    = replacePlaceholders(followUp.template.body, data).replace(/\n/g, '<br>')

      const result = await sendEmail({
        to:         followUp.recipient.email,
        subject, html,
        trackId:    followUp.trackId!,
        fromName:   followUp.fromName  || undefined,
        fromEmail:  followUp.fromEmail || undefined,
        attachmentUrl:  followUp.template.attachmentUrl  || undefined,
        attachmentName: followUp.template.attachmentName || undefined,
        inReplyTo:  followUp.recipient.messageId || undefined,
        references: followUp.recipient.messageId || undefined,
      })

      await prisma.$transaction([
        prisma.followUp.update({
          where: { id: followUp.id },
          data:  { status: 'sent', sentAt: new Date(), messageId: result.messageId || null }
        }),
        prisma.recipient.update({
          where: { id: followUp.recipientId },
          data:  { followUpCount: { increment: 1 } }
        })
      ])
      totalSent++
    } catch (e: any) {
      await prisma.followUp.update({ where: { id: followUp.id }, data: { status: 'error', error: e.message } })
    }

    if (i < scheduledFollowUps.length - 1) await randomDelay(5, 15)
  }

  return NextResponse.json({ success: true, campaignsProcessed: campaigns.length, followUpsProcessed: scheduledFollowUps.length, totalSent })
}
