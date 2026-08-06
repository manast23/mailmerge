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
      template: { select: { name: true, subject: true } },
      _count:   { select: { recipients: true } },
    }
  })
  const campaignIds = campaigns.map(c => c.id)

  // Aggregate counts in the DB instead of pulling every recipient row down just to
  // count them in JS — this was the slow part, and it runs on every poll (every 12s).
  const [statusCounts, openedCounts] = campaignIds.length ? await Promise.all([
    prisma.recipient.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true },
    }),
    prisma.recipient.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, openedAt: { not: null } },
      _count: { _all: true },
    }),
  ]) : [[], []]

  const byCampaign: Record<string, { sent: number, error: number, pending: number, scheduled: number }> = {}
  for (const row of statusCounts) {
    const cid = row.campaignId
    if (!byCampaign[cid]) byCampaign[cid] = { sent: 0, error: 0, pending: 0, scheduled: 0 }
    if (row.status in byCampaign[cid]) (byCampaign[cid] as any)[row.status] = row._count._all
  }
  const openedByCampaign: Record<string, number> = {}
  for (const row of openedCounts) openedByCampaign[row.campaignId] = row._count._all

  const enriched = campaigns.map(c => {
    const counts = byCampaign[c.id] || { sent: 0, error: 0, pending: 0, scheduled: 0 }
    return {
      id:          c.id,
      name:        c.name,
      status:      c.status,
      scheduledAt: c.scheduledAt,
      createdAt:   c.createdAt,
      template:    c.template,
      templateId:  c.templateId,
      total:       c._count.recipients,
      sent:        counts.sent,
      opened:      openedByCampaign[c.id] || 0,
      errors:      counts.error,
      hasPending:  counts.pending > 0 || counts.scheduled > 0,
    }
  })
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
