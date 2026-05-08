import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaignId')
  const status     = req.nextUrl.searchParams.get('status')
  const dateFrom   = req.nextUrl.searchParams.get('dateFrom')
  const dateTo     = req.nextUrl.searchParams.get('dateTo')
  const search     = req.nextUrl.searchParams.get('search')

  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

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

  if (search) {
    where.email = { contains: search, mode: 'insensitive' }
  }

  const recipients = await prisma.recipient.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json(recipients)
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  const campaignId  = req.nextUrl.searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  // CSV upload
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file') as File
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

    const text    = await file.text()
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })

    if (!records.length) return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })

    const emailKey = Object.keys(records[0]).find(k =>
      k.toLowerCase().includes('email') || k.toLowerCase().includes('mail')
    )
    if (!emailKey) return NextResponse.json({ error: 'No email column found in CSV' }, { status: 400 })

    const created = await prisma.recipient.createMany({
      data: records.map((r: any) => ({
        campaignId,
        email: r[emailKey],
        data:  r,
      })),
      skipDuplicates: true
    })

    return NextResponse.json({ success: true, count: created.count, columns: Object.keys(records[0]) })
  }

  // JSON — manual paste or Google Sheet import
  const body = await req.json()
  const { recipients, columns } = body

  if (!recipients?.length) return NextResponse.json({ error: 'recipients array required' }, { status: 400 })

  const emailKey = columns?.find((k: string) =>
    k.toLowerCase().includes('email') || k.toLowerCase().includes('mail')
  ) || 'email'

  const created = await prisma.recipient.createMany({
    data: recipients.map((r: any) => ({
      campaignId,
      email: r[emailKey] || r.email,
      data:  r,
    })),
    skipDuplicates: true
  })

  return NextResponse.json({ success: true, count: created.count })
}

export async function DELETE(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
  await prisma.recipient.deleteMany({ where: { campaignId } })
  return NextResponse.json({ success: true })
}
