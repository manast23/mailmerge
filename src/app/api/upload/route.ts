import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File
    const templateId = form.get('templateId') as string

    if (!file || !templateId) {
      return NextResponse.json({ error: 'File and templateId required' }, { status: 400 })
    }

    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template || template.userId !== user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

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

    await prisma.template.update({
      where: { id: templateId },
      data: {
        attachmentUrl: urlData.signedUrl,
        attachmentName: file.name
      }
    })

    return NextResponse.json({
      success: true,
      attachmentName: file.name,
      attachmentUrl: urlData.signedUrl
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

    const { templateId } = await req.json()
    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template || template.userId !== user.id) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    await prisma.template.update({
      where: { id: templateId },
      data: { attachmentUrl: null, attachmentName: null }
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
