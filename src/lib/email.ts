import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export function replacePlaceholders(text: string, data: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return data[key.trim()] !== undefined ? String(data[key.trim()]) : match
  })
}

export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))]
}

export async function sendEmail({
  to,
  subject,
  html,
  trackId,
  fromName,
  fromEmail,
  attachmentUrl,
  attachmentName,
}: {
  to: string
  subject: string
  html: string
  trackId: string
  fromName?: string
  fromEmail?: string
  attachmentUrl?: string
  attachmentName?: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pixelUrl = `${baseUrl}/api/track?t=${trackId}`
  const trackedHtml = html + `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;outline:none" alt="" />`

  const fromAddress = fromName
    ? `${fromName} <${process.env.GMAIL_USER}>`
    : `${process.env.GMAIL_USER}`

  const mailOptions: any = {
    from: fromAddress,
    to,
    subject,
    html: trackedHtml,
    replyTo: process.env.GMAIL_USER,
  }

  // Attach file if provided
  if (attachmentUrl && attachmentName) {
    mailOptions.attachments = [
      {
        filename: attachmentName,
        path: attachmentUrl,
      }
    ]
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('Gmail result:', result.messageId)
    return result
  } catch (err: any) {
    console.error('Gmail SMTP error:', err.message)
    throw err
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function randomDelay(minSec: number, maxSec: number) {
  const ms = (Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec) * 1000
  return sleep(ms)
}
