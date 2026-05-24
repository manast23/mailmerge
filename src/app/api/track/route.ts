import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  const trackId = req.nextUrl.searchParams.get('t')

  if (trackId) {
    try {
      // Try recipient first, then follow-up
      const recipient = await prisma.recipient.findFirst({ where: { trackId } })
      if (recipient) {
        if (!recipient.openedAt) {
          await prisma.recipient.update({ where: { id: recipient.id }, data: { openedAt: new Date() } })
        }
      } else {
        const followUp = await prisma.followUp.findFirst({ where: { trackId } })
        if (followUp && !followUp.openedAt) {
          await prisma.followUp.update({ where: { id: followUp.id }, data: { openedAt: new Date() } })
        }
      }
    } catch (e) {
      // Silently fail
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma':        'no-cache',
      'Expires':       '0',
    },
  })
}
