# Mail Merge Pro — CLAUDE.md

## Project Overview
A full-stack mail merge web app for sending personalized cold outreach emails with open tracking, follow-ups, and scheduling. Initially targeting scholarship/admissions seekers (professor outreach), expanding to general cold email.

## Live URLs
- **App**: https://mailmerge-hazel.vercel.app
- **GitHub**: https://github.com/manast23/mailmerge (branch: master)

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, CSS Modules (no Tailwind)
- **Database**: Supabase PostgreSQL (project ID: uyfpkcuuzqvayegmsimb)
- **ORM**: Prisma v5.22
- **Email**: Nodemailer via Gmail SMTP (tauqiranas@gmail.com)
- **Storage**: Supabase Storage (file attachments)
- **Hosting**: Vercel
- **Scheduling**: cron-job.org pinging /api/cron every minute
- **Rich text**: TipTap editor

## File Structure
```
src/app/
  page.tsx          — entire frontend (single file, ~1300 lines)
  page.module.css   — all styles
  globals.css       — CSS variables + base styles (Arctic Minimal theme)
  layout.tsx        — root layout + favicon
  api/
    campaigns/      — GET, POST, PUT, DELETE campaigns
    recipients/     — GET (with followUps included), POST (CSV import)
    templates/      — GET, POST, PUT, DELETE templates
    send/           — POST send emails for a campaign
    followup/       — POST send/schedule follow-ups, DELETE cancel scheduled
    track/          — GET open tracking pixel (handles Recipient + FollowUp)
    upload/         — POST upload attachment, DELETE remove
    import-sheet/   — POST import from Google Sheet URL
    cron/           — GET process scheduled campaigns + follow-ups
prisma/schema.prisma — DB schema
src/lib/
  email.ts          — sendEmail(), replacePlaceholders(), randomDelay()
  prisma.ts         — Prisma client singleton
```

## Database Schema (Supabase)
- **Template**: id, name, subject, body, attachmentUrl, attachmentName
- **Campaign**: id, name, templateId, status (draft/sending/done/scheduled), scheduledAt, sentCount
- **Recipient**: id, campaignId, email, data (JSON), status, sentAt, openedAt, trackId, messageId, followUpCount, error
- **FollowUp**: id, recipientId, templateId, status (pending/scheduled/sent/error), sentAt, openedAt, scheduledAt, trackId, messageId, number, delayMin, delayMax, fromName, fromEmail, error

## Design System (Arctic Minimal)
- Font: Inter
- Colors: `--text: #111112`, `--bg: #f7f8fa`, `--bg2: #ffffff`, `--bg3: #f2f3f5`, `--border: #e8e9ec`
- Accent: black only. Green for opened, orange for scheduled, red for error
- No Tailwind — pure CSS Modules in page.module.css

## Key Features Working
- Templates with `{{placeholders}}` + TipTap rich text editor
- File attachment per template (stored in Supabase Storage)
- Auto-save draft while typing (2s debounce)
- Campaigns: create, send, edit name/template, delete
- Recipients: import via CSV, Google Sheet URL, or manual paste
- Email sending via Gmail SMTP with random delay between sends
- Open tracking pixel (works on 163, QQ, university emails)
- Scheduled sending via cron-job.org
- Follow-ups: sent in same Gmail thread (In-Reply-To header)
  - Per-recipient tracking with followUpCount
  - Scheduled follow-ups saved as FollowUp records (not campaigns)
  - Expandable timeline per recipient in table
  - Follow-ups column in recipients table
  - Cancel scheduled follow-ups from timeline
- Dashboard with filters, date range, CSV export
- Collapsible sidebar (hover to expand, pin button)
- Welcome screen on fresh load

## UI Layout
- Sidebar: fixed 220px, collapses to 60px on hover-out (pinnable)
- Main content: always starts at 220px left margin
- Three tabs: Campaigns, Compose (Templates), Dashboard
- Campaign detail: left panel (recipients table 295px height, scrollable) + right panel (send settings + follow-up card, sticky)

## Workflow
- Push directly to GitHub from Claude's container
- Vercel auto-deploys on push to master
- Schema changes require manual SQL in Supabase SQL Editor (Prisma binary blocked in container)
- Each session: share a fresh GitHub PAT → I push → user revokes PAT

## Known Patterns
- Optimistic UI throughout (local state updates instantly, DB syncs in background)
- `localTemplates` state in ComposeTab manages template list without parent re-renders
- `localCampaigns` state in CampaignsTab for instant delete
- All hooks declared at top of component before any functions
- `React.Fragment` with key for expandable table rows
- Follow-up grouping: `getFollowUpGroups()` groups recipients by followUpCount per opened/not-opened category

## Environment Variables (Vercel)
- DATABASE_URL, DIRECT_URL — Supabase connection strings
- GMAIL_USER, GMAIL_APP_PASSWORD — Gmail SMTP
- CRON_SECRET — cron-job.org auth
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase storage
