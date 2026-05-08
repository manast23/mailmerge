import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
}: {
  to: string
  subject: string
  html: string
  trackId: string
  fromName?: string
  fromEmail?: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const pixelUrl = `${baseUrl}/api/track?t=${trackId}`
  const trackedHtml = html + `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;outline:none" alt="" />`

  const from = fromName && fromEmail
    ? `${fromName} <${fromEmail}>`
    : `Mail Merge Pro <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`

  console.log('--- Resend Debug ---')
  console.log('To:', to)
  console.log('From:', from)
  console.log('Subject:', subject)
  console.log('API Key exists:', !!process.env.RESEND_API_KEY)
  console.log('API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 8))

  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html: trackedHtml,
    })
    console.log('Resend result:', JSON.stringify(result))
    return result
  } catch (err: any) {
    console.error('Resend error:', err.message)
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