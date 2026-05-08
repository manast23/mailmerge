import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  // Convert Google Sheet URL to CSV export URL
  let csvUrl = url
  try {
    // Handle various Google Sheets URL formats
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 })

    const sheetId = match[1]
    const gidMatch = url.match(/gid=(\d+)/)
    const gid      = gidMatch ? gidMatch[1] : '0'
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
  } catch (e) {
    return NextResponse.json({ error: 'Could not parse Google Sheets URL' }, { status: 400 })
  }

  try {
    const res  = await fetch(csvUrl)
    if (!res.ok) return NextResponse.json({ error: 'Could not fetch sheet. Make sure it is set to "Anyone with the link can view".' }, { status: 400 })

    const text    = await res.text()
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true })

    if (!records.length) return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 })

    const columns = Object.keys(records[0])
    return NextResponse.json({ success: true, records, columns, count: records.length })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to import: ' + e.message }, { status: 500 })
  }
}
