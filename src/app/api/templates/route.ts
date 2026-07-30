import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' }
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json()
  const { name, subject, body: templateBody } = body
  const template = await prisma.template.create({
    data: {
      userId:  user.id,
      name:    name    || 'Untitled',
      subject: subject || '',
      body:    templateBody || ''
    }
  })
  return NextResponse.json(template)
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json()
  const { id, name, subject, body: templateBody } = body

  const existing = await prisma.template.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const template = await prisma.template.update({
    where: { id },
    data:  { name, subject, body: templateBody }
  })
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.template.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  await prisma.template.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
