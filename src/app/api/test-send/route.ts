import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendEmail, replacePlaceholders, extractPlaceholders } from '@/lib/email'
import { randomUUID } from 'crypto'
import { decrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (!user.gmailAddress || !user.encryptedAppPassword) {
    return NextResponse.json({ error: 'Connect your Gmail account first (Account tab) before sending a test.' }, { status: 400 })
  }

  const { templateId, subject: subjectOverride, body: bodyOverride } = await req.json()
  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 })

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template || template.userId !== user.id) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Prefer whatever is currently on-screen (subjectOverride/bodyOverride) over the last
  // auto-saved DB copy, since auto-save has a debounce and the user may be testing edits
  // that haven't been persisted yet.
  const rawSubject = subjectOverride ?? template.subject
  const rawBody = bodyOverride ?? template.body

  // Fill every {{placeholder}} with a bracketed sample value so the recipient can see
  // exactly which merge tags exist and check for typos (e.g. {{Name}} vs {{name}}).
  const placeholders = extractPlaceholders(rawSubject + ' ' + rawBody)
  const sampleData: Record<string, string> = {}
  placeholders.forEach(p => { sampleData[p] = `[${p}]` })

  const gmailUser = user.gmailAddress
  const gmailAppPassword = decrypt(user.encryptedAppPassword)
  const subject = `[TEST] ${replacePlaceholders(rawSubject, sampleData)}`
  const html = replacePlaceholders(rawBody, sampleData).replace(/\n/g, '<br>')

  try {
    await sendEmail({
      to: gmailUser,
      subject,
      html,
      trackId: randomUUID(),
      gmailUser,
      gmailAppPassword,
      attachmentUrl: template.attachmentUrl || undefined,
      attachmentName: template.attachmentName || undefined,
    })
    return NextResponse.json({ success: true, placeholders })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send test email' }, { status: 500 })
  }
}
