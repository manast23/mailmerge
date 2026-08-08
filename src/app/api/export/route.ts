import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { templateIds = [], campaignIds = [] } = await req.json().catch(() => ({}))

  const campaigns = campaignIds.length
    ? await prisma.campaign.findMany({ where: { id: { in: campaignIds }, userId: user.id } })
    : []

  // A selected campaign's template always comes along, even if the person didn't tick it
  // separately in the Templates list — otherwise the campaign would be unimportable on the
  // other end (a campaign needs a template to exist).
  const templateIdSet = new Set<string>([...templateIds, ...campaigns.map(c => c.templateId)])

  const templates = templateIdSet.size
    ? await prisma.template.findMany({ where: { id: { in: [...templateIdSet] }, userId: user.id } })
    : []

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
      // Recipients are intentionally left out — this is just the campaign/template setup,
      // not a copy of who's been contacted. The importing account adds its own recipient
      // list before sending.
    })),
  })
}

