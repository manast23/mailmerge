import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const MAX_ATTACHMENTS = 5

type Attachment = { url: string; name: string }

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const form = await req.formData()
    // Accept either a single 'file' (back-compat) or multiple 'files' entries.
    const files = form.getAll('files').length ? form.getAll('files') as File[] : [form.get('file') as File].filter(Boolean)
    const templateId = form.get('templateId') as string

    if (!files.length || !templateId) {
      return NextResponse.json({ error: 'File and templateId required' }, { status: 400 })
    }

    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template || template.userId !== user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const existing = (template.attachments as Attachment[] | null) || []
    if (existing.length + files.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `You can attach at most ${MAX_ATTACHMENTS} files per template (${existing.length} already attached).` },
        { status: 400 }
      )
    }

    const uploaded: Attachment[] = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const fileName = `${templateId}/${Date.now()}-${file.name}`

      const { error } = await supabase.storage
        .from('attachments')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true
        })
      if (error) throw error

      const { data: urlData } = await supabase.storage
        .from('attachments')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365)
      if (!urlData?.signedUrl) throw new Error('Could not get signed URL')

      uploaded.push({ url: urlData.signedUrl, name: file.name })
    }

    const attachments = [...existing, ...uploaded]

    await prisma.template.update({
      where: { id: templateId },
      data: { attachments }
    })

    return NextResponse.json({
      success: true,
      attachments,
      uploaded,
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const { templateId, url } = await req.json()
    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template || template.userId !== user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const existing = (template.attachments as Attachment[] | null) || []
    // If a specific url is given, remove just that one; otherwise clear all (back-compat).
    const attachments = url ? existing.filter(a => a.url !== url) : []

    await prisma.template.update({
      where: { id: templateId },
      data: { attachments }
    })
    return NextResponse.json({ success: true, attachments })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
