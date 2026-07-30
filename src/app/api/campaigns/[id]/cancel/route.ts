import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } })
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const cancelled = await prisma.recipient.updateMany({
    where: { campaignId: params.id, status: 'pending' },
    data:  { status: 'cancelled' }
  })
  await prisma.campaign.update({
    where: { id: params.id },
    data:  { status: 'done' }
  })
  return NextResponse.json({ success: true, cancelledCount: cancelled.count })
}
