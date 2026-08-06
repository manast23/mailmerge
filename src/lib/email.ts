import nodemailer from 'nodemailer'
export { replacePlaceholders, extractPlaceholders } from './placeholders'

function getTransporter(gmailUser: string, gmailAppPassword: string) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })
}


export async function sendEmail({
  to,
  subject,
  html,
  trackId,
  fromName,
  attachmentUrl,
  attachmentName,
  inReplyTo,
  references,
  gmailUser,
  gmailAppPassword,
}: {
  to: string
  subject: string
  html: string
  trackId: string
  fromName?: string
  attachmentUrl?: string
  attachmentName?: string
  inReplyTo?: string
  references?: string
  gmailUser: string
  gmailAppPassword: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pixelUrl = `${baseUrl}/api/track?t=${trackId}`
  const trackedHtml = html + `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;outline:none" alt="" />`

  const fromAddress = fromName
    ? `${fromName} <${gmailUser}>`
    : gmailUser

  const transporter = getTransporter(gmailUser, gmailAppPassword)

  const mailOptions: any = {
    from: fromAddress,
    to,
    subject,
    html: trackedHtml,
    replyTo: gmailUser,
  }

  if (inReplyTo) mailOptions.inReplyTo = inReplyTo
  if (references) mailOptions.references = references

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
    return result  // result.messageId is available to caller
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
