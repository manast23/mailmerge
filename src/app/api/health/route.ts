import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  // Touch DB to warm up Prisma connection + all route handlers
  await Promise.all([
    prisma.campaign.count(),
    prisma.template.count(),
    prisma.recipient.count(),
  ])
  return NextResponse.json({ ok: true })
}
