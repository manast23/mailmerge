import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { encrypt } from '@/lib/crypto'
import nodemailer from 'nodemailer'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  return NextResponse.json({
    gmailAddress: user.gmailAddress,
    connected: !!user.encryptedAppPassword,
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { gmailAddress, appPassword } = await req.json()
  if (!gmailAddress || !appPassword) {
    return NextResponse.json({ error: 'gmailAddress and appPassword are required' }, { status: 400 })
  }

  // Verify the credentials actually work before saving them
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailAddress, pass: appPassword.replace(/\s/g, '') },
    })
    await transporter.verify()
  } catch (e: any) {
    return NextResponse.json({ error: 'Could not connect to Gmail — check the address and App Password. (' + e.message + ')' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      gmailAddress,
      encryptedAppPassword: encrypt(appPassword.replace(/\s/g, '')),
    }
  })

  return NextResponse.json({ success: true, gmailAddress })
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  await prisma.user.update({
    where: { id: user.id },
    data: { gmailAddress: null, encryptedAppPassword: null }
  })
  return NextResponse.json({ success: true })
}
