import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { campaignId } = await req.json()
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  const original = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { recipients: true, template: true }
  })
  if (!original || original.userId !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const duplicate = await prisma.campaign.create({
    data: {
      name: `Copy of ${original.name}`,
      templateId: original.templateId,
      userId: user.id,
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
