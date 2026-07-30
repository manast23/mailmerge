import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
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
    hasPending:  c.recipients.some(r => r.status === 'pending' || r.status === 'scheduled'),
  }))
  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json()
  const { name, templateId } = body

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template || template.userId !== user.id) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const campaign = await prisma.campaign.create({
    data: { name, templateId, userId: user.id }
  })
  return NextResponse.json(campaign)
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { id, name, templateId } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { ...(name && { name }), ...(templateId && { templateId }) }
  })
  return NextResponse.json(campaign)
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.campaign.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
