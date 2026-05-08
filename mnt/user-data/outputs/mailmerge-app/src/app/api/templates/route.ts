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

  if (!name || !subject || !templateBody) {
    return NextResponse.json({ error: 'name, subject and body are required' }, { status: 400 })
  }

  const template = await prisma.template.create({
    data: { name, subject, body: templateBody }
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
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.template.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
