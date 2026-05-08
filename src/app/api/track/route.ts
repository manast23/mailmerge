import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  const trackId = req.nextUrl.searchParams.get('t')

  if (trackId) {
    try {
      await prisma.recipient.updateMany({
        where: { trackId, openedAt: null },
        data:  { openedAt: new Date() },
      })
    } catch (e) {
      // Silently fail — don't break the pixel response
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
