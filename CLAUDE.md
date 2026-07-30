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
- **Email**: Nodemailer via Gmail SMTP — per-user credentials (App Password), not a global account
- **Storage**: Supabase Storage (file attachments)
- **Hosting**: Vercel
- **Scheduling**: cron-job.org pinging /api/cron every minute
- **Rich text**: TipTap editor

## File Structure
```
src/app/
  page.tsx          — entire main app frontend (single file, ~1580 lines)
  page.module.css   — all styles for the main app
  auth.module.css   — shared styles for login/signup pages
  globals.css       — CSS variables + base styles (Arctic Minimal theme)
  layout.tsx        — root layout + favicon
  login/page.tsx    — login page
  signup/page.tsx   — signup page
  api/
    auth/
      signup/       — POST create user + session cookie
      login/        — POST verify credentials + session cookie
      logout/       — POST clear session cookie
      me/           — GET current logged-in user
    account/        — GET/POST/DELETE the user's own Gmail address + App Password
    campaigns/      — GET, POST, PUT, DELETE campaigns (scoped by userId)
    recipients/     — GET (with followUps included), POST (CSV import) (ownership checked via campaign)
    templates/      — GET, POST, PUT, DELETE templates (scoped by userId)
    send/           — POST send emails for a campaign (requires connected Gmail)
    followup/       — POST send/schedule follow-ups, DELETE cancel scheduled
    track/          — GET open tracking pixel (handles Recipient + FollowUp)
    upload/         — POST upload attachment, DELETE remove
    import-sheet/   — POST import from Google Sheet URL
    cron/           — GET process scheduled campaigns + follow-ups, using each owner's Gmail creds
src/middleware.ts   — redirects unauthenticated requests to /login (checks cookie presence only;
                      real JWT verification happens per-request in Node.js route handlers)
prisma/schema.prisma — DB schema
prisma/migrations/manual_multiuser_migration.sql — one-time manual SQL for the User table + backfill
src/lib/
  email.ts          — sendEmail(), replacePlaceholders(), randomDelay() — transporter built per-call
                      from the owning user's Gmail credentials, no global env-var transporter
  prisma.ts         — Prisma client singleton
  auth.ts           — hashPassword, verifyPassword, createSessionToken, verifySessionToken,
                      getCurrentUser() (reads mmp_session cookie)
  crypto.ts         — encrypt()/decrypt() (AES-256-GCM) for storing each user's App Password
```

## Database Schema (Supabase)
- **User**: id, name, email (unique), passwordHash, gmailAddress, encryptedAppPassword, createdAt
- **Template**: id, userId, name, subject, body, attachmentUrl, attachmentName
- **Campaign**: id, userId, name, templateId, status (draft/sending/done/scheduled), scheduledAt, sentCount
- **Recipient**: id, campaignId, email, data (JSON), status, sendAfter, sentAt, openedAt, trackId, messageId, followUpCount, error, fromName, fromEmail
- **FollowUp**: id, recipientId, templateId, status (pending/scheduled/sent/error), sentAt, openedAt, scheduledAt, trackId, messageId, number, delayMin, delayMax, fromName, fromEmail, error

## Design System (Arctic Minimal)
- Font: Inter
- Colors: `--text: #111112`, `--bg: #f7f8fa`, `--bg2: #ffffff`, `--bg3: #f2f3f5`, `--border: #e8e9ec`
- Accent: black only. Green for opened, orange for scheduled, red for error
- No Tailwind — pure CSS Modules in page.module.css

## Key Features Working
- Multi-user auth: signup/login/logout, each person's own account, gated by middleware
- Each user connects their own Gmail address + App Password (Account tab) — encrypted at rest,
  verified with transporter.verify() before saving
- Templates with `{{placeholders}}` + TipTap rich text editor
- File attachment per template (stored in Supabase Storage)
- Auto-save draft while typing (2s debounce)
- Campaigns: create, send, edit name/template, delete
- Recipients: import via CSV, Google Sheet URL, or manual paste (tab-separated; the textarea
  traps the Tab key and inserts a real tab character instead of shifting focus)
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
- **At the start of every new session on this project**: clone the repo with a fresh GitHub PAT
  and read this file FIRST, before touching any query — don't wait to be asked.
- **After any code change**: update this file (CLAUDE.md) in the same session to reflect it, then
  commit and push together with the code change.
- Push directly to GitHub from Claude's container
- Vercel auto-deploys on push to master
- Schema changes require manual SQL in Supabase SQL Editor (Prisma binary blocked in container —
  `npx prisma generate` fails with a 403 fetching the engine binary, since binaries.prisma.sh isn't
  in the container's allowed network domains)
- Each session: share a fresh GitHub PAT → I push → user revokes PAT
- **Repo hygiene**: never let sandbox paths (e.g. `/mnt/user-data/outputs/...`) get committed —
  `.gitignore` now excludes `/mnt/` and `*.bak`. A previously-committed stale duplicate under
  `mnt/user-data/outputs/mailmerge-app/` broke a Vercel build because tsconfig's `**/*.ts` include
  pattern made `next build`'s type-checker scan it even though it wasn't part of the real app.

## Known Patterns
- Optimistic UI throughout (local state updates instantly, DB syncs in background)
- `localTemplates` state in ComposeTab manages template list without parent re-renders
- `localCampaigns` state in CampaignsTab for instant delete
- All hooks declared at top of component before any functions
- `React.Fragment` with key for expandable table rows
- Follow-up grouping: `getFollowUpGroups()` groups recipients by followUpCount per opened/not-opened category

## Environment Variables (Vercel)
- DATABASE_URL, DIRECT_URL — Supabase connection strings
- SESSION_SECRET — signs login session cookies (pick a long random string)
- ENCRYPTION_KEY — encrypts each user's Gmail App Password at rest (pick a long random string)
- CRON_SECRET — cron-job.org auth
- NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY — Supabase storage (attachments)
- NEXT_PUBLIC_APP_URL — deployed app URL, used for the tracking pixel

## Multi-user architecture (added July 2026)
- **Status: live in production.** The manual Supabase migration has been run, the owner
  (tauqiranas@gmail.com) has signed up, old data was backfilled to that account, and Gmail is
  connected via the Account tab. New users just need to sign up and connect their own Gmail.
- Each person now has their own account (`/signup`, `/login`), gated by `src/middleware.ts`.
- Templates and Campaigns are scoped by `userId`. Recipients/FollowUps inherit access via their Campaign.
- Each user connects their own Gmail address + App Password under the "Account" tab
  (`/api/account`, encrypted with `ENCRYPTION_KEY` via `src/lib/crypto.ts`). Nodemailer transporters
  are now created per-send using the owning user's credentials (`src/lib/email.ts`), not a single
  global GMAIL_USER/GMAIL_APP_PASSWORD env var.
- `src/app/api/cron/route.ts` looks up each recipient/campaign/follow-up's owning user to send with
  the correct account.
- Migration SQL for the User table + userId columns: `prisma/migrations/manual_multiuser_migration.sql`
  (must be run manually in Supabase SQL Editor, then backfilled with the first signed-up user's id).
