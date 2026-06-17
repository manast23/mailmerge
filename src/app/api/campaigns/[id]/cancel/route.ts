import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
