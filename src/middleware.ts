import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'mmp_session'
const PUBLIC_PATHS = ['/login', '/signup']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSession = !!req.cookies.get(COOKIE_NAME)?.value
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (hasSession && isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
