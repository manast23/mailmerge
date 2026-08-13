import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'
import { getCurrentUser } from '@/lib/auth'

async function assertCampaignOwnership(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  return !!campaign && campaign.userId === userId
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const campaignId = req.nextUrl.searchParams.get('campaignId')
  const status     = req.nextUrl.searchParams.get('status')
  const dateFrom   = req.nextUrl.searchParams.get('dateFrom')
  const dateTo     = req.nextUrl.searchParams.get('dateTo')
  const search     = req.nextUrl.searchParams.get('search')

  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
  if (!(await assertCampaignOwnership(campaignId, user.id))) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const where: any = { campaignId }
  if (status === 'opened')     where.openedAt = { not: null }
  if (status === 'not_opened') where.AND = [{ status: 'sent' }, { openedAt: null }]
  if (status === 'pending')    where.status = 'pending'
  if (status === 'sent')       where.status = 'sent'
  if (status === 'error')      where.status = 'error'
  if (dateFrom || dateTo) {
    where.sentAt = {}
    if (dateFrom) where.sentAt.gte = new Date(dateFrom)
    if (dateTo)   { const d = new Date(dateTo); d.setHours(23,59,59); where.sentAt.lte = d }
  }
  if (search) where.email = { contains: search, mode: 'insensitive' }

  const recipients = await prisma.recipient.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      followUps: {
        orderBy: { number: 'asc' },
        include: { template: { select: { name: true, subject: true } } }
      }
    }
  })
  return NextResponse.json(recipients)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''
  const campaignId  = req.nextUrl.searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
  if (!(await assertCampaignOwnership(campaignId, user.id))) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    const text    = await file.text()
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })
    if (!records.length) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })
    const emailKey = Object.keys(records[0]).find((k: string) =>
      k.toLowerCase().includes('email') || k.toLowerCase().includes('mail')
    )
    if (!emailKey) return NextResponse.json({ error: 'No email column found in CSV' }, { status: 400 })
    const created = await prisma.recipient.createMany({
      data: records.map((r: any) => ({ campaignId, email: r[emailKey], data: r })),
      skipDuplicates: true
    })
    return NextResponse.json({ success: true, count: created.count, columns: Object.keys(records[0]) })
  }

  const body = await req.json()
  const { recipients, columns } = body
  if (!recipients?.length) return NextResponse.json({ error: 'recipients array required' }, { status: 400 })
  const emailKey = columns?.find((k: string) =>
    k.toLowerCase().includes('email') || k.toLowerCase().includes('mail')
  ) || 'email'
  const created = await prisma.recipient.createMany({
    data: recipients.map((r: any) => ({ campaignId, email: r[emailKey] || r.email, data: r })),
    skipDuplicates: true
  })
  return NextResponse.json({ success: true, count: created.count })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const campaignId = req.nextUrl.searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
  if (!(await assertCampaignOwnership(campaignId, user.id))) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Optional JSON body { ids: string[] } to delete only specific recipients.
  // No body / empty ids clears the whole campaign (existing behavior).
  let ids: string[] | undefined
  try {
    const body = await req.json()
    if (Array.isArray(body?.ids) && body.ids.length) ids = body.ids
  } catch {
    // no body sent — fall through to "clear all"
  }

  const deleted = await prisma.recipient.deleteMany({
    where: ids ? { id: { in: ids }, campaignId } : { campaignId }
  })
  return NextResponse.json({ success: true, deletedCount: deleted.count })
}
