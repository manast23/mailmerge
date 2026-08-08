import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const templates = await prisma.template.findMany({ where: { userId: user.id } })
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    include: { recipients: true }
  })

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    fromAccount: user.email,
    templates: templates.map(t => ({
      // Re-imported as a brand new template on the target account — the exportedId lets
      // campaigns below reference the right one without colliding with real DB ids.
      exportedId: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      attachmentUrl: t.attachmentUrl,
      attachmentName: t.attachmentName,
    })),
    campaigns: campaigns.map(c => ({
      name: c.name,
      templateExportedId: c.templateId,
      // Recipients come across fresh — pending, no send/open history — since the whole
      // point is the *target* account does the actual sending from here on.
      recipients: c.recipients.map(r => ({ email: r.email, data: r.data })),
    })),
  })
}
