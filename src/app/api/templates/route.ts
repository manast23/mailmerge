import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { updatedAt: 'desc' }
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, subject, body: templateBody } = body
  const template = await prisma.template.create({
    data: {
      name:    name    || 'Untitled',
      subject: subject || '',
      body:    templateBody || ''
    }
  })
  return NextResponse.json(template)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, name, subject, body: templateBody } = body
  const template = await prisma.template.update({
    where: { id },
    data:  { name, subject, body: templateBody }
  })
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.template.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
