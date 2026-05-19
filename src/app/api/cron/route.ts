import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  // Security: verify secret token from cron-job.org
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all campaigns scheduled to send now or in the past
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() }
    },
    include: {
      template: true,
      recipients: { where: { status: 'pending' } }
    }
  })

  if (!campaigns.length) {
    return NextResponse.json({ message: 'No campaigns due', count: 0 })
  }

  let totalSent = 0

  for (const campaign of campaigns) {
    const pending = campaign.recipients
    if (!pending.length) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'done' }
      })
      continue
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'sending' }
    })

    let sentCount = 0

    for (let i = 0; i < pending.length; i++) {
      const recipient = pending[i]
      const data = recipient.data as Record<string, string>
      const trackId = randomUUID()

      try {
        const subject = replacePlaceholders(campaign.template.subject, data)
        const html = replacePlaceholders(campaign.template.body, data).replace(/\n/g, '<br>')
        await sendEmail({ to: recipient.email, subject, html, trackId })
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date(), trackId }
        })
        sentCount++
      } catch (e: any) {
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: { status: 'error', error: e.message }
        })
      }

      if (i < pending.length - 1) await randomDelay(5, 15)
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'done', sentCount: { increment: sentCount } }
    })

    totalSent += sentCount
  }

  return NextResponse.json({
    success: true,
    campaignsProcessed: campaigns.length,
    totalSent
  })
}
