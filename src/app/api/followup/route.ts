import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, replacePlaceholders, randomDelay } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const { campaignId, templateId, followUpType, followUpLevel, selectedIds, delayMin = 30, delayMax = 90, fromName, fromEmail } = await req.json()

  if (!campaignId || !templateId || !followUpType || followUpLevel === undefined) {
    return NextResponse.json({ error: 'campaignId, templateId, followUpType and followUpLevel required' }, { status: 400 })
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Filter targets
  const whereFilter: any = selectedIds?.length
    ? { id: { in: selectedIds }, campaignId, status: 'sent' }
    : {
        campaignId,
        status: 'sent',
        followUpCount: followUpLevel,
        ...(followUpType === 'opened'     ? { openedAt: { not: null } } : {}),
        ...(followUpType === 'not_opened' ? { openedAt: null }          : {}),
      }

  const targets = await prisma.recipient.findMany({ where: whereFilter })
  if (!targets.length) return NextResponse.json({ error: 'No recipients match this filter' }, { status: 400 })

  let sentCount = 0
  const errors: string[] = []
  const followUpNumber = followUpLevel + 1

  for (let i = 0; i < targets.length; i++) {
    const recipient = targets[i]
    const trackId = randomUUID()

    try {
      const data = recipient.data as Record<string, string>
      const subject = replacePlaceholders(template.subject, data)
      const html    = replacePlaceholders(template.body, data).replace(/\n/g, '<br>')

      const result = await sendEmail({
        to: recipient.email,
        subject,
        html,
        trackId,
        fromName,
        fromEmail,
        attachmentUrl:  template.attachmentUrl  || undefined,
        attachmentName: template.attachmentName || undefined,
        inReplyTo:  recipient.messageId || undefined,
        references: recipient.messageId || undefined,
      })

      // Save follow-up record on the recipient
      await prisma.followUp.create({
        data: {
          recipientId: recipient.id,
          templateId,
          status:  'sent',
          sentAt:  new Date(),
          trackId,
          messageId: result.messageId || null,
          number:  followUpNumber,
        }
      })

      // Increment followUpCount on recipient
      await prisma.recipient.update({
        where: { id: recipient.id },
        data:  { followUpCount: { increment: 1 } }
      })

      sentCount++
    } catch (e: any) {
      await prisma.followUp.create({
        data: {
          recipientId: recipient.id,
          templateId,
          status: 'error',
          error:  e.message,
          trackId,
          number: followUpNumber,
        }
      })
      errors.push(`${recipient.email}: ${e.message}`)
    }

    if (i < targets.length - 1) await randomDelay(delayMin, delayMax)
  }

  return NextResponse.json({ success: true, sentCount, errors })
}
