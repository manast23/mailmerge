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
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Please upload an image file' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    // One fixed filename per user (not timestamped like template attachments) — a re-upload
    // just overwrites it, no orphaned old photos piling up in storage.
    const fileName = `avatars/${user.id}`

    const { error } = await supabase.storage
      .from('attachments')
      .upload(fileName, buffer, { contentType: file.type, upsert: true })
    if (error) throw error

    const { data: urlData } = await supabase.storage
      .from('attachments')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365)
    if (!urlData?.signedUrl) throw new Error('Could not get signed URL')

    // Cache-bust so the browser doesn't keep showing a stale cached image after re-upload
    // (the storage path is fixed per user, only the querystring changes).
    const avatarUrl = `${urlData.signedUrl}&v=${Date.now()}`

    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } })

    return NextResponse.json({ success: true, avatarUrl })
  } catch (err: any) {
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } })
  return NextResponse.json({ success: true })
}
