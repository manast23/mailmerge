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

  // ── 1. Scheduled campaigns whose time has arrived ───────
  // Recipients for these already have their staggered `sendAfter` timestamps set (by
  // /api/send at schedule-time), so all this needs to do is flip the campaign from
  // 'scheduled' to 'sending' — the staggered loop below (section 2) does the actual
  // sending, a few at a time, resumable across cron ticks. This used to loop through
  // every recipient synchronously with a 1s delay between each *inside this request*,
  // which could exceed Vercel's function timeout for anything more than a handful of
  // recipients — the campaign would get stuck on 'sending' with the rest of the
  // recipients permanently un-sent (no sendAfter was ever set on them, so nothing would
  // ever pick them back up). That was the root cause of scheduled sends "not going out
  // until I refresh the app" — refreshing didn't fix anything, it just happened to be
  // checked after enough time had passed for a lucky partial batch to get through.
  // Also flip empty scheduled campaigns (0 recipients, or scheduled by mistake with
  // nothing pending) straight to 'done' instead of leaving them stuck on 'scheduled'.
  await prisma.campaign.updateMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() }, recipients: { none: { status: 'pending' } } },
    data:  { status: 'done' }
  })
  await prisma.campaign.updateMany({
    where: { status: 'scheduled', scheduledAt: { lte: new Date() } },
    data:  { status: 'sending' }
  })

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
    include: { recipient: { include: { campaign: { include: { user: true } } } }, template: true },
    take: 50 // Limit per cron run to avoid timeout, same as the recipient loop above
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

  // ── 4. Sweep: campaigns stuck on 'sending' with nothing left pending → mark 'done' ──
  // (The staggered-send path above never flips status itself — this closes that gap,
  // and also self-heals any campaigns that got stuck before this fix shipped.)
  const stillSending = await prisma.campaign.findMany({
    where: { status: 'sending' },
    include: { recipients: { where: { status: 'pending' }, select: { id: true } } }
  })
  const doneIds = stillSending.filter(c => c.recipients.length === 0).map(c => c.id)
  if (doneIds.length > 0) {
    await prisma.campaign.updateMany({ where: { id: { in: doneIds } }, data: { status: 'done' } })
  }

  return NextResponse.json({
    success: true,
    followUpsProcessed: scheduledFollowUps.length,
    staggeredProcessed: staggeredRecipients.length,
    completedCampaigns: doneIds.length,
    totalSent
  })
}
