import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders } from '@/lib/email'
import { randomUUID } from 'crypto'
import { decrypt } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let totalSent = 0

  // ── 1. Process scheduled campaigns ──────────────────────
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
    include: { template: true, recipients: { where: { status: 'pending' } }, user: true }
  })

  // Mark as sending immediately to prevent double-send if cron overlaps
  if (campaigns.length > 0) {
    await prisma.campaign.updateMany({
      where: { id: { in: campaigns.map(c => c.id) } },
      data: { status: 'sending' }
    })
  }

  for (const campaign of campaigns) {
    if (!campaign.recipients.length) {
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'done' } })
      continue
    }
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'sending' } })
    let sentCount = 0

    if (!campaign.user.gmailAddress || !campaign.user.encryptedAppPassword) {
      await prisma.recipient.updateMany({
        where: { id: { in: campaign.recipients.map(r => r.id) } },
        data: { status: 'error', error: 'Gmail account not connected' }
      })
      continue
    }
    const gmailUser = campaign.user.gmailAddress
    const gmailAppPassword = decrypt(campaign.user.encryptedAppPassword)

    for (let i = 0; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i]
      const data = recipient.data as Record<string, string>
      const trackId = randomUUID()
      try {
        const subject = replacePlaceholders(campaign.template.subject, data)
        const html    = replacePlaceholders(campaign.template.body, data).replace(/\n/g, '<br>')
        const result  = await sendEmail({
          to: recipient.email, subject, html, trackId,
          gmailUser, gmailAppPassword,
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
      if (i < campaign.recipients.length - 1) await new Promise(resolve => setTimeout(resolve, 1000))
    }

    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'done', sentCount: { increment: sentCount } } })
    totalSent += sentCount
  }

  // ── 2. Process staggered recipients (new logic for delayed sends) ─────────────────────
  const now = new Date()
  const staggeredRecipients = await prisma.recipient.findMany({
    where: {
      status: 'pending',
      sendAfter: { lte: now }
    },
    include: { campaign: { include: { template: true, user: true } } },
    take: 50 // Limit per cron run to avoid timeout
  })

  for (const recipient of staggeredRecipients) {
    const campaign = recipient.campaign
    const data = recipient.data as Record<string, string>
    const trackId = randomUUID()

    if (!campaign.user.gmailAddress || !campaign.user.encryptedAppPassword) {
      await prisma.recipient.update({ where: { id: recipient.id }, data: { status: 'error', error: 'Gmail account not connected' } })
      continue
    }
    const staggeredGmailUser: string = campaign.user.gmailAddress
    const staggeredGmailAppPassword: string = decrypt(campaign.user.encryptedAppPassword)

    try {
      const subject = replacePlaceholders(campaign.template.subject, data)
      const html = replacePlaceholders(campaign.template.body, data).replace(/\n/g, '<br>')
      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
        trackId,
        fromName: recipient.fromName || undefined,
        gmailUser: staggeredGmailUser,
        gmailAppPassword: staggeredGmailAppPassword,
        attachmentUrl: campaign.template.attachmentUrl || undefined,
        attachmentName: campaign.template.attachmentName || undefined,
      })

      await prisma.recipient.update({
        where: { id: recipient.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          trackId,
          messageId: result.messageId || null,
          data: { ...(recipient.data as object), _subject: subject }
        }
      })

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { sentCount: { increment: 1 } }
      })

      totalSent++
    } catch (e: any) {
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: 'error', error: e.message }
      })
    }

    // Small delay between emails to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // ── 3. Process scheduled follow-ups ─────────────────────
  const scheduledFollowUps = await prisma.followUp.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
    include: { recipient: { include: { campaign: { include: { user: true } } } }, template: true }
  })

  // Mark all as 'sending' first to prevent double-send if cron overlaps
  if (scheduledFollowUps.length > 0) {
    await prisma.followUp.updateMany({
      where: { id: { in: scheduledFollowUps.map(f => f.id) } },
      data: { status: 'sending' }
    })
  }

  for (let i = 0; i < scheduledFollowUps.length; i++) {
    const followUp = scheduledFollowUps[i]
    const owner = followUp.recipient.campaign.user
    try {
      if (!owner.gmailAddress || !owner.encryptedAppPassword) {
        throw new Error('Gmail account not connected')
      }
      const followUpGmailUser: string = owner.gmailAddress
      const followUpGmailAppPassword: string = decrypt(owner.encryptedAppPassword)

      const data    = followUp.recipient.data as Record<string, string>
      const originalSubject = data._subject
      const followUpSubject = replacePlaceholders(followUp.template.subject, data)
      const subject = followUp.recipient.messageId && originalSubject
        ? `Re: ${originalSubject}`
        : followUpSubject
      const html    = replacePlaceholders(followUp.template.body, data).replace(/\n/g, '<br>')

      const result = await sendEmail({
        to:         followUp.recipient.email,
        subject, html,
        trackId:    followUp.trackId!,
        fromName:   followUp.fromName  || undefined,
        gmailUser: followUpGmailUser,
        gmailAppPassword: followUpGmailAppPassword,
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

    if (i < scheduledFollowUps.length - 1) await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return NextResponse.json({
    success: true,
    campaignsProcessed: campaigns.length,
    followUpsProcessed: scheduledFollowUps.length,
    staggeredProcessed: staggeredRecipients.length,
    totalSent
  })
}
