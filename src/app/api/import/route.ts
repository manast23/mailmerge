import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const payload = await req.json()
  const { templates, campaigns } = payload || {}
  if (!Array.isArray(templates) || !Array.isArray(campaigns)) {
    return NextResponse.json({ error: 'Invalid export file' }, { status: 400 })
  }

  // 1) Recreate templates under this account, remembering old exportedId -> new id
  //    so campaigns below can be pointed at the right one.
  const idMap: Record<string, string> = {}
  for (const t of templates) {
    const created = await prisma.template.create({
      data: {
        userId: user.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        // Signed Supabase URLs aren't tied to who requests them, just to knowing the URL,
        // so attachments can be reused as-is without re-uploading the files.
        attachments: t.attachments || [],
      }
    })
    if (t.exportedId) idMap[t.exportedId] = created.id
  }

  // 2) Recreate campaigns + their recipients (fresh 'pending' status — no carried-over
  //    send/open history, since this account will be the one actually sending).
  let campaignsCreated = 0
  let recipientsCreated = 0
  for (const c of campaigns) {
    const templateId = idMap[c.templateExportedId]
    if (!templateId) continue // template for this campaign wasn't in the export, skip it
    const campaign = await prisma.campaign.create({
      data: { userId: user.id, name: c.name, templateId, status: 'draft' }
    })
    campaignsCreated++
    if (Array.isArray(c.recipients) && c.recipients.length) {
      const result = await prisma.recipient.createMany({
        data: c.recipients.map((r: any) => ({
          campaignId: campaign.id,
          email: r.email,
          data: r.data,
          status: 'pending',
        })),
        skipDuplicates: true,
      })
      recipientsCreated += result.count
    }
  }

  return NextResponse.json({
    success: true,
    templatesCreated: templates.length,
    campaignsCreated,
    recipientsCreated,
  })
}
