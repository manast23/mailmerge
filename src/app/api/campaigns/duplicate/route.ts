import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { campaignId } = await req.json()
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  const original = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true, template: true }
  })
  if (!original) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Create duplicate campaign with all recipients as pending
  const duplicate = await prisma.campaign.create({
    data: {
      name: `Copy of ${original.name}`,
      templateId: original.templateId,
      status: 'draft',
      recipients: {
        create: original.recipients.map(r => ({
          email: r.email,
          data: r.data as any,
          status: 'pending',
        }))
      }
    },
    include: { template: true, recipients: true }
  })

  return NextResponse.json({
    id: duplicate.id,
    name: duplicate.name,
    status: duplicate.status,
    template: duplicate.template,
    templateId: duplicate.templateId,
    total: duplicate.recipients.length,
    sent: 0,
    opened: 0,
    errors: 0,
    createdAt: duplicate.createdAt,
  })
}
