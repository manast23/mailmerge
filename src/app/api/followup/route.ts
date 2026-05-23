import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { campaignId, templateId, followUpType, delayMin = 30, delayMax = 90, fromName, fromEmail } = await req.json()

  if (!campaignId || !templateId || !followUpType) {
    return NextResponse.json({ error: 'campaignId, templateId and followUpType required' }, { status: 400 })
  }

  // Get original campaign with recipients
  const original = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      recipients: { where: { status: 'sent' } }
    }
  })
  if (!original) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Filter recipients based on followUpType
  const targets = original.recipients.filter(r =>
    followUpType === 'opened' ? !!r.openedAt : !r.openedAt
  )

  if (!targets.length) return NextResponse.json({ error: 'No recipients match this filter' }, { status: 400 })

  // Get the follow-up template
  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Create follow-up campaign
  const followUp = await prisma.campaign.create({
    data: {
      name: `${original.name} — Follow-up (${followUpType === 'opened' ? 'Opened' : 'Not Opened'})`,
      templateId,
      status: 'sending',
      parentCampaignId: campaignId,
      followUpType,
      recipients: {
        create: targets.map(r => ({
          email: r.email,
          data: r.data as any,
          status: 'pending',
        }))
      }
    },
    include: { recipients: true, template: true }
  })

  // Send emails with threading headers
  let sentCount = 0
  const errors: string[] = []

  for (let i = 0; i < followUp.recipients.length; i++) {
    const recipient = followUp.recipients[i]
    // Find original recipient's messageId for threading
    const original_recipient = targets.find(r => r.email === recipient.email)
    const trackId = randomUUID()

    try {
      const data = recipient.data as Record<string, string>
      const subject = replacePlaceholders(template.subject, data)
      const html = replacePlaceholders(template.body, data).replace(/\n/g, '<br>')

      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
        trackId,
        fromName,
        fromEmail,
        attachmentUrl:  template.attachmentUrl  || undefined,
        attachmentName: template.attachmentName || undefined,
        inReplyTo:  original_recipient?.messageId || undefined,
        references: original_recipient?.messageId || undefined,
      })

      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: 'sent', sentAt: new Date(), trackId, messageId: result.messageId || null }
      })
      sentCount++
    } catch (e: any) {
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: 'error', error: e.message }
      })
      errors.push(`${recipient.email}: ${e.message}`)
    }

    if (i < followUp.recipients.length - 1) await randomDelay(delayMin, delayMax)
  }

  await prisma.campaign.update({
    where: { id: followUp.id },
    data: { status: 'done', sentCount: { increment: sentCount } }
  })

  return NextResponse.json({ success: true, sentCount, errors, campaignId: followUp.id })
}
