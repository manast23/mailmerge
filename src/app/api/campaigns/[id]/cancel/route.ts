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

  // Optional JSON body { recipientIds: string[] } to revoke only specific pending
  // recipients. No body / empty array cancels every pending recipient (existing behavior).
  let recipientIds: string[] | undefined
  try {
    const body = await req.json()
    if (Array.isArray(body?.recipientIds) && body.recipientIds.length) recipientIds = body.recipientIds
  } catch {
    // no body sent — fall through to "cancel all"
  }

  const cancelled = await prisma.recipient.updateMany({
    where: recipientIds
      ? { id: { in: recipientIds }, campaignId: params.id, status: 'pending' }
      : { campaignId: params.id, status: 'pending' },
    data: { status: 'cancelled' }
  })

  // Only flip the campaign to "done" once nothing is left pending — matters for a
  // partial (selected-recipients) cancel, where other recipients may still be queued.
  const stillPending = await prisma.recipient.count({ where: { campaignId: params.id, status: 'pending' } })
  if (stillPending === 0) {
    await prisma.campaign.update({ where: { id: params.id }, data: { status: 'done' } })
  }

  return NextResponse.json({ success: true, cancelledCount: cancelled.count })
}
