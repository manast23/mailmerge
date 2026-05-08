import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      template:   { select: { name: true, subject: true } },
      _count:     { select: { recipients: true } },
      recipients: { select: { status: true, openedAt: true } }
    }
  })
  const enriched = campaigns.map(c => ({
    id:          c.id,
    name:        c.name,
    status:      c.status,
    scheduledAt: c.scheduledAt,
    createdAt:   c.createdAt,
    template:    c.template,
    total:       c._count.recipients,
    sent:        c.recipients.filter(r => r.status === 'sent').length,
    opened:      c.recipients.filter(r => r.openedAt).length,
    errors:      c.recipients.filter(r => r.status === 'error').length,
  }))
  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, templateId } = body
  const campaign = await prisma.campaign.create({
    data: { name, templateId }
  })
  return NextResponse.json(campaign)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
}