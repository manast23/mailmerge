import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { campaignId, delayMin = 3600, delayMax = 7200, dailyLimit = 450, fromName, fromEmail, scheduleAt } = body
  
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

  // Calculate staggered sendAfter times for each recipient
  const now = new Date()
  const avgDelay = (delayMin + delayMax) / 2
  const updates = pending.map((recipient, index) => {
    const sendAfter = new Date(now.getTime() + (index * avgDelay) * 1000)
    
    return prisma.recipient.update({
      where: { id: recipient.id },
      data: { 
        sendAfter,
        status: 'pending'
      }
    })
  })

  await prisma.$transaction(updates)

  await prisma.campaign.update({ 
    where: { id: campaignId }, 
    data: { status: 'sending' } 
  })

  return NextResponse.json({ 
    success: true, 
    queuedCount: pending.length,
    message: `Queued ${pending.length} recipients. Emails will be sent with ${delayMin}-${delayMax}s delays via cron.`
  })
}
