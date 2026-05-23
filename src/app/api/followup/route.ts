import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { campaignId, templateId, followUpType, followUpLevel, delayMin = 30, delayMax = 90, fromName, fromEmail } = await req.json()

  if (!campaignId || !templateId || !followUpType || followUpLevel === undefined) {
    return NextResponse.json({ error: 'campaignId, templateId, followUpType and followUpLevel required' }, { status: 400 })
  }

  // Get original campaign with ALL sent recipients at the specified followUpLevel
  const original = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      recipients: {
        where: {
          status: 'sent',
          followUpCount: followUpLevel,
          ...(followUpType === 'opened'     ? { openedAt: { not: null } } : {}),
          ...(followUpType === 'not_opened' ? { openedAt: null }          : {}),
        }
      }
    }
  })
  if (!original) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (!original.recipients.length) return NextResponse.json({ error: 'No recipients match this filter' }, { status: 400 })

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Create follow-up campaign
  const followUp = await prisma.campaign.create({
    data: {
      name: `${original.name} — Follow-up ${followUpLevel + 1} (${followUpType === 'opened' ? 'Opened' : 'Not Opened'})`,
      templateId,
      status: 'sending',
      parentCampaignId: campaignId,
      followUpType,
      recipients: {
        create: original.recipients.map(r => ({
          email: r.email,
          data: r.data as any,
          status: 'pending',
          originalRecipientId: r.id,
          followUpCount: r.followUpCount, // carry forward so chain is trackable
        }))
      }
    },
    include: { recipients: true, template: true }
  })

  let sentCount = 0
  const errors: string[] = []

  for (let i = 0; i < followUp.recipients.length; i++) {
    const recipient = followUp.recipients[i]
    const originalRecipient = original.recipients.find(r => r.id === recipient.originalRecipientId)
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
        inReplyTo:  originalRecipient?.messageId || undefined,
        references: originalRecipient?.messageId || undefined,
      })

      // Update follow-up recipient
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: 'sent', sentAt: new Date(), trackId, messageId: result.messageId || null }
      })

      // Increment followUpCount on the ORIGINAL recipient so it won't be targeted again at this level
      if (originalRecipient) {
        await prisma.recipient.update({
          where: { id: originalRecipient.id },
          data: { followUpCount: { increment: 1 } }
        })
      }

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
