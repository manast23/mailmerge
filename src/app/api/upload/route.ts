import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File
    const campaignId = form.get('campaignId') as string

    if (!file || !campaignId) {
      return NextResponse.json({ error: 'File and campaignId required' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${campaignId}/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) throw error

    // Get signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from('attachments')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365)

    if (!urlData?.signedUrl) throw new Error('Could not get signed URL')

    // Save URL to campaign
    await prisma.campaign.update({
      where: { id: campaignId },
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
    const { campaignId } = await req.json()
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { attachmentUrl: null, attachmentName: null }
    })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
