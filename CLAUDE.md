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
    test-send/      — POST send a one-off test copy of a template to the logged-in user's own inbox
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
  email.ts          — sendEmail(), transporter built per-call from the owning user's Gmail
                      credentials, no global env-var transporter. Re-exports replacePlaceholders/
                      extractPlaceholders from placeholders.ts for backward compatibility.
  placeholders.ts   — replacePlaceholders(), extractPlaceholders() — pure functions, no
                      nodemailer/node deps, safe to import from the client-side page.tsx
                      (used there for merge-tag typo detection against imported columns)
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
- Send a test copy of a template to yourself before running a real campaign (Compose tab)
- Merge-tag typo warning on the campaign detail page (flags `{{tags}}` with no matching column)
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

## Live status polling + button loading states (added August 2026)
- **Problem reported:** Campaign card / detail page status (sending → done, opened, etc.) never
  updated on its own — the whole app only fetched campaigns/recipients once on initial page load
  (`useEffect(() => {...}, [])` with no interval). Users had to manually reload the browser to see
  fresh state. Also, several action buttons (Send, Schedule, Follow-up, Create Campaign, Update,
  CSV/Sheet/Manual import) had no loading/spinner feedback, so the app looked "stuck" for the few
  seconds between click and response — a `loading` state existed in `CampaignDetail` but was never
  rendered anywhere.
- **Fix — background polling:**
  - Top-level `App` component: `loadCampaigns()` now also runs on a 12s `setInterval`, plus
    immediately on `visibilitychange`/`window focus` (tab refocus), cleaned up on unmount.
  - `CampaignsTab`: when `localCampaigns` refreshes from the poll, the currently-open `selected`
    campaign (passed into `CampaignDetail`) is kept in sync (status/sentCount/scheduledAt) so the
    detail header doesn't lag behind the list.
  - `CampaignDetail`: `loadRecipients(silent?)` now accepts a silent flag; a background
    `setInterval` (8s) calls `loadRecipients(true)` whenever any recipient/follow-up is still
    `pending`/`sending`/`scheduled` or the campaign itself is `sending`/`scheduled`. Polling
    auto-stops once nothing is left in-flight, so idle campaigns don't poll forever.
- **Fix — loading UI:** added a reusable `Spinner` component (inline SVG, `animate-spin`). Applied
  spinner + disabled state to: Send/Schedule, Follow-up send/schedule, Create Campaign, Update
  (campaign edit), CSV/Sheet/Manual-paste import, and the manual Refresh button. The recipients
  table now shows a "Loading recipients…" spinner on first load (`loading && recipients.length===0`)
  instead of a blank/stuck-looking panel.
- **Root-cause note re: scheduled sends "only arriving after I refresh the app":** confirmed via
  code review this is not caused by the frontend — nothing in `page.tsx` calls `/api/cron`, so
  refreshing the browser cannot trigger a send. The real driver is the cron-job.org polling
  interval (this file says every 1 min, but should be double-checked against the actual
  cron-job.org dashboard config/run history, since the "arrives right after I happen to refresh"
  pattern is consistent with a delayed cron tick, not a refresh-triggered action). Also confirmed
  this is unrelated to having 2 Gmail-connected users — each send builds its own per-user Nodemailer
  transporter (`src/lib/email.ts`), there's no shared bottleneck or global rate limit tied to
  account count at this scale.

## Selective export + no-recipients (updated August 2026)
Reworked per follow-up request — export is now selective, not all-or-nothing, and never
includes recipients at all (not even optionally):
- `POST /api/export` (was `GET`) now takes `{ templateIds, campaignIds }`. Any template used by
  a selected campaign is automatically unioned in server-side too, even if not explicitly
  passed — a campaign is unimportable without its template.
- Campaigns in the export carry `templateExportedId` only, no `recipients` field at all —
  the importing account always starts that campaign at 0 recipients and adds its own list.
- New `ExportModal` in `AccountTab` (opened via "⬇ Export…") lists the user's campaigns and
  templates with checkboxes. Ticking a campaign auto-locks its template's checkbox on (shown
  as "Auto-included (used by X)", can't be unticked independently — untick the campaign
  instead). Templates can also be selected independently of any campaign.

## New feature: Export / Import data between accounts (added August 2026)
- **Use case that prompted this:** Anas runs campaigns for his brother's professor outreach
  using a Gmail address he created himself (so he can send from his own laptop instead of
  needing his brother's device/login), and wanted to move the already-built templates +
  campaign/recipient setup from the brother's existing account into this new one without
  rebuilding everything by hand.
- **Design choice — export/import file, not a direct cross-account copy:** considered letting
  one account push data straight into another by just naming the target (e.g. by email), but
  that's a bad pattern for a multi-tenant app even at small scale — it'd mean any user could
  write into any other user's account by guessing/knowing their email. A downloadable JSON
  file that the person manually re-uploads into the target account keeps each account's data
  isolated and auth-scoped the same way everything else in the app already is, and doubles as
  a generically useful backup/restore feature for any future user.
- `GET /api/export` — returns the current user's templates + campaigns as JSON. Recipients are
  exported as just `{ email, data }` (no send/open history, no status) — the whole point is the
  *importing* account does the actual sending from here on. Templates carry their
  `attachmentUrl` as-is; Supabase signed URLs aren't tied to which app-user requests them, so
  the attachment file itself doesn't need to be re-uploaded.
- `POST /api/import` — recreates templates under the *current* user, builds an
  exportedId → new-id map, then recreates campaigns (status `'draft'`) pointing at the right
  new template id, with recipients inserted fresh (`status: 'pending'`).
- UI: Account tab → "Move Data Between Accounts" card, with Export/Import buttons
  (`exportData()` / `handleImportFile()` in `AccountTab`).

## Fixed: recipient table showed "Pending" for scheduled campaigns (added August 2026)
- **Not a functional bug — the schedule itself worked correctly, this was a display-only
  label bug.** In `CampaignDetail`'s recipients table, the status badge logic explicitly did
  `r.status === 'pending' && campaign.status === 'scheduled' ? 'pending' : r.status` — i.e. it
  detected "this row belongs to a scheduled campaign" and then mapped it right back to the same
  `'pending'` label anyway, so there was never any visible difference between a normal pending
  row and one waiting on a schedule. `StatusBadge` also had no `'scheduled'` entry in its
  color/label maps at all.
- **Fix:** now passes `'scheduled'` through properly, and `StatusBadge` has a dedicated
  blue "⏰ Scheduled" style for it. Same no-op existed for the follow-up status badge
  (`f.status === 'scheduled' ? 'pending' : f.status`) — simplified to just pass `f.status`
  straight through now that `'scheduled'` renders correctly.

## Root-caused: scheduled sends & "Send Now" follow-ups timing out (added August 2026)
**This is the real fix for "scheduled campaign doesn't send until I refresh" — everything
before this was UI polish, this is the actual server bug.**
- **Scheduled campaigns:** `/api/send`'s `scheduleAt` branch used to only set
  `Campaign.status='scheduled'` + `scheduledAt`, with no `sendAfter` on any recipient. When
  `scheduledAt` arrived, cron's old section 1 looped through *every* recipient **synchronously,
  inside the request**, calling `sendEmail()` + `await setTimeout(1000)` between each one. For
  more than a handful of recipients this reliably exceeds Vercel's function timeout — the
  function gets killed mid-loop, `Campaign.status` is already `'sending'` so cron's own
  scheduled-campaign query never finds it again, and the un-sent recipients never got a
  `sendAfter` set, so nothing ever picks them back up. Permanently stuck, silently.
- **Follow-up "send now":** same class of bug, worse — `/api/followup`'s immediate-send branch
  awaited `randomDelay(delayMin, delayMax)` (**default 30–90 seconds**) between every recipient,
  synchronously inside the request. Two recipients guaranteed a 30s+ hold in a single HTTP call.
- **Fix — unify everything onto the one pattern that already worked** (the staggered
  `sendAfter` + resumable cron pickup used by regular "Send Now" campaigns):
  - `/api/send`: both the immediate and `scheduleAt` branches now compute staggered
    `sendAfter` per recipient from the same base time (`now` or `scheduleAt`), same
    day-spillover logic for `dailyLimit`. Scheduled campaigns keep `status: 'scheduled'` until
    cron flips it.
  - `/api/cron` section 1 no longer sends anything itself — it's now a single cheap
    `updateMany` that flips `'scheduled'` → `'sending'` once `scheduledAt` has passed (plus
    one flipping empty/already-done scheduled campaigns straight to `'done'`). Section 2 (the
    existing staggered loop, `take: 50` per tick, no campaign-status dependency) does the
    actual sending automatically once flipped.
  - `/api/followup`: dropped the synchronous immediate-send branch entirely. Every follow-up
    (explicit schedule or "send now") is now written as a `status: 'scheduled'` `FollowUp` row
    with a staggered `scheduledAt` (starting at `scheduledAt` or `now`, spaced by
    `avgDelay = (delayMin+delayMax)/2`). Cron section 3 (now capped at `take: 50` per tick, to
    match section 2) picks these up the same resumable way.
  - Net effect: nothing in this app sleeps synchronously inside a request anymore — matches the
    "never sleep in-process on Vercel" principle this file already documented, which the
    scheduled-send and follow-up-send-now paths had quietly been violating.

## Fixed: duplicate recipients on re-import (added August 2026)
- `POST /api/recipients` already passed `skipDuplicates: true` to `createMany`, but it was a
  no-op — Prisma's `skipDuplicates` only works against an actual DB unique constraint, and
  `Recipient` had none on `(campaignId, email)`. Re-importing the same CSV (or an overlapping
  list) silently created duplicate recipient rows, so the same person could get emailed twice.
- **Fix:** added `@@unique([campaignId, email])` to `Recipient` in `schema.prisma`. **Not yet
  applied to the DB** — needs the SQL below run manually in Supabase SQL Editor. This one
  needs to happen in two steps since existing duplicates would violate a fresh unique
  constraint:
  ```sql
  -- 1) Remove existing duplicates first, keeping the oldest row per campaign+email
  DELETE FROM "Recipient" a
  USING "Recipient" b
  WHERE a.id <> b.id
    AND a."campaignId" = b."campaignId"
    AND a.email = b.email
    AND a."createdAt" > b."createdAt";

  -- 2) Then add the constraint (this is what makes skipDuplicates actually work)
  CREATE UNIQUE INDEX IF NOT EXISTS "Recipient_campaignId_email_key" ON "Recipient" ("campaignId", "email");
  ```

## Fixed: campaign never left "sending" status (added August 2026)
- **Real bug found during a wider review** (not just a UI staleness issue): the normal "Send Now"
  path uses `/api/send`'s staggered `sendAfter` flow (cron section 2), which sends every recipient
  fine but never once updated `Campaign.status` back to `'done'` — only the separate "scheduled
  campaign" cron path (section 1) and the cancel endpoint did that. So every regular send left the
  campaign stuck on `status: 'sending'` in the database forever, regardless of any frontend
  refresh/polling.
- **Fix:** `src/app/api/cron/route.ts` now runs a sweep at the end of every cron tick — any
  campaign with `status: 'sending'` and zero remaining `pending` recipients gets flipped to
  `'done'`. This also self-heals any campaigns that were already stuck before this fix shipped
  (they'll flip to `done` on the next cron run after deploy).
- **Known gap, not yet fixed — silent per-send cap:** `/api/send` accepts a `dailyLimit` (default
  450) and only queues `recipients.slice(0, dailyLimit)` — recipients beyond that are left with
  `sendAfter: null` and are silently never sent (frontend never passes `dailyLimit`, so any
  campaign over 450 recipients quietly drops the rest with no warning or automatic continuation
  the next day). Flagged to Anas; needs either an automatic next-day rollover in the cron sweep or
  at minimum a toast telling the user how many were skipped.

## Test-send, merge-tag typo detection, daily-limit rollover (added August 2026)
- **Test send:** Compose tab now has a "✉️ Send Test to Myself" button (`sendTestEmail()` in
  `ComposeTab`). Calls `POST /api/test-send` with `{ templateId, subject, body }` — the current
  on-screen subject/body are sent (not the last auto-saved DB copy, since auto-save has a 2s
  debounce). Every `{{placeholder}}` is filled with a bracketed sample value (e.g. `{{Name}}` →
  `[Name]`) so the user can see exactly which merge tags exist in the rendered email, subject
  gets a `[TEST]` prefix. Sends to the user's own connected Gmail address. Disabled while the
  template is still an unsaved `temp_...` id.
- **Merge-tag typo detection:** `CampaignDetail` now computes `unmatchedPlaceholders` — the
  template's `{{placeholders}}` (via `extractPlaceholders` from the new `src/lib/placeholders.ts`,
  matched against `allTemplates` by `editTemplateId || campaign.templateId`) that don't
  case-insensitively match any imported recipient column. Shows an orange warning banner at the
  top of the campaign detail view listing the mismatched tags and available columns, and
  `startSend()` now shows a `confirm()` dialog before sending if any mismatches exist (doesn't
  hard-block — some campaigns may intentionally leave a tag unmatched).
  - Fixed a related data gap: `GET /api/campaigns` never returned `templateId` on each campaign,
    only the nested `template.{name,subject}` — added `templateId` to the response so the typo
    check (and the campaign-edit template dropdown) can find the right template.
- **Daily-limit silent drop fixed:** `POST /api/send` previously did
  `campaign.recipients.slice(0, dailyLimit)` (default 450) and left anything beyond that with
  `sendAfter: null` forever — silently never sent, no warning. Now all pending recipients get a
  `sendAfter`, staggered within `dailyLimit`-sized batches spread one day apart
  (`dayOffset = Math.floor(index / dailyLimit)`), so cron picks up each day's batch automatically.
  Response includes `daysNeeded` and a `message` describing the multi-day queue; the frontend now
  shows that `message` in the toast instead of the old `Sent ${d.sentCount} emails!` (which was
  always `undefined` for the normal Send-Now path, since that endpoint returns `queuedCount`, not
  `sentCount` — emails are actually sent later by cron, not synchronously in the request).

## Welcome screen redesigned to match login page + shown only once (added August 2026)
- Replaced the centered dark-overlay "Get Started" card with the same split-screen layout as
  `/login` (`src/app/login/page.tsx`) — dark `bg-ink` dotted brand panel on the left (55%,
  hidden below `lg`), white form-style panel on the right (45%). The 4 feature bullets that
  used to sit inside the card now live in the left panel under the "Outreach, refined."
  tagline; the right panel just has "Welcome back, {first name} 👋" + a single "Get Started"
  button, no form fields (person is already authenticated at this point).
- **Shown once per browser, not on every visit**: `enterApp()` sets
  `localStorage.setItem('mmp_seen_welcome', '1')`; on mount, if that key exists,
  `showWelcome` starts `false` and the dashboard renders immediately. A `welcomeChecked` flag
  gates both the welcome screen and the main app shell until the `localStorage` check has run
  (avoids a server/client render mismatch and a flash of the wrong screen) — during that brief
  window neither renders, just the plain `bg-bg` background.
- `userName` (first name) is now captured alongside `userInitial` from `/api/auth/me` for the
  "Welcome back, X" greeting.

## Fixed: Home screen stats/table flashed empty before loading (added August 2026)
- Root cause: `HomeTab` computed stats straight off the `campaigns` state, which starts as `[]`
  until the initial `loadCampaigns()` fetch resolves — so right after clicking "Get Started" the
  stat cards briefly showed `0` and the Recent Campaigns card showed the "No campaigns yet" empty
  state, before flipping to real data a moment later. Looked like the app was stuck/lying.
- Fix: added a `campaignsLoaded` flag in `App` (set `true` once the first `loadCampaigns()`
  response lands), passed down to `HomeTab` as `loading`. While `loading`, the 4 stat cards and
  the Recent Campaigns table render `animate-pulse` skeleton placeholders instead of real
  (momentarily-zero) values or the empty state.

## Fixed: actual /api/campaigns query performance (added August 2026)
- **The real speed issue, found after being asked "did you actually make the homepage load
  fast?"** — the previous loading-skeleton fix (above) only hid the wait, it didn't remove it.
  `GET /api/campaigns` was pulling down every single recipient row (`status`, `openedAt`) for
  every campaign the user has, just to `.filter()`/`.length` count them in JS. This runs on every
  page load *and* on every 12s background poll, so it scales badly and adds real DB load as
  recipient counts grow — this is what was actually making the home screen (and the polling)
  slow, not just missing a spinner.
- **Fix:** rewrote it to use two `prisma.recipient.groupBy()` aggregate queries (by
  `[campaignId, status]` and by `campaignId` filtered to `openedAt: not null`) instead of
  fetching raw rows — the DB does the counting, only small aggregate rows come back over the wire.
- **Also added missing indexes** (`prisma/schema.prisma` updated, but — per the standing rule
  below — **must be applied manually in Supabase SQL Editor**, not yet run):
  ```sql
  CREATE INDEX IF NOT EXISTS "Recipient_campaignId_status_idx" ON "Recipient" ("campaignId", "status");
  CREATE INDEX IF NOT EXISTS "Recipient_campaignId_openedAt_idx" ON "Recipient" ("campaignId", "openedAt");
  CREATE INDEX IF NOT EXISTS "Recipient_status_sendAfter_idx" ON "Recipient" ("status", "sendAfter");
  CREATE INDEX IF NOT EXISTS "FollowUp_status_scheduledAt_idx" ON "FollowUp" ("status", "scheduledAt");
  CREATE INDEX IF NOT EXISTS "Campaign_userId_createdAt_idx" ON "Campaign" ("userId", "createdAt");
  CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign" ("status");
  ```
  These weren't there before — every `campaignId`/`status`/`sendAfter` filter (including the
  cron tick, which runs constantly) was doing a full table scan on `Recipient`/`FollowUp`.

## UI Redesign — Google Stitch mockups → Tailwind implementation (added August 2026)
- **Status: implemented and live in `src/app/page.tsx`, `login/page.tsx`, `signup/page.tsx`.**
  The app has been fully converted from CSS Modules to Tailwind CSS, and restyled to match the
  "Refined Arctic Minimal" mockups in `design/stitch-mockups/`. `page.module.css` and
  `auth.module.css` have been deleted — all styling is now Tailwind utility classes (plus a
  few small shared class-string constants at the top of `page.tsx`: `cardCls`, `inputCls`,
  `labelCls`, `btnPrimaryCls`, `btnGhostCls`, `badgeCls`, and small components `Avatar`,
  `StatCard`, `EmptyState`, `StatusBadge`, `StatusDot`, `Toggle`).
- `tailwind.config.js` defines the design tokens matching the mockups: `ink` (#111112),
  `bg` (#f7f8fa), `surface`/`surface-low`/`surface-high`, `border` (#e8e9ec), `secondary`
  (#5c5f60), `outline` (#77777b), plus `sidebar_expanded`/`sidebar_collapsed` spacing tokens.
  Tailwind v3 is used (not v4) for compatibility with this Next.js 14 setup and the
  Stitch-exported config style.
- Every screen's top bar was unified to just a page label + a solid dark circular initials
  avatar (fetched from `/api/auth/me`) — no notification bell, no help icon, no stock photos,
  matching the finalized Stitch mockups.
- Login/Signup now use the full-viewport split-panel layout from the mockups (black brand
  panel left with dot-grid texture, form panel right) instead of the old centered-card auth
  layout — no Google/social sign-in, no terms checkbox (neither is a real feature).
- **All existing functionality was preserved 1:1** — every state variable, handler, effect,
  and API call in `page.tsx` is unchanged from the pre-redesign version; only JSX
  markup/classNames were rewritten. Verified with `npx next build` — it compiles successfully
  (`✓ Compiled successfully`); the only remaining build errors are pre-existing implicit-`any`
  TypeScript errors in API routes caused by Prisma Client types not being generated in this
  sandbox (binary download blocked — same known limitation documented above), unrelated to
  this redesign.
- Previous phase note (for history): originally the Stitch mockups were design-phase-only
  and not yet wired into real components.
- Design direction: "Refined Arctic Minimal" — a more polished version of the existing black/white
  monochrome theme (better spacing, typography, subtle details), no new color theme.
- **Switching to Tailwind CSS** (currently CSS Modules) — chosen because Stitch exports Tailwind
  natively, making future iterations easier to merge.
- Static Stitch-exported HTML mockups (raw Tailwind CDN + Material Symbols, not yet wired to real
  data or components) are saved for reference at `design/stitch-mockups/`:
  - `login.html`, `signup.html` — full-viewport split-panel auth screens (black brand panel left,
    form right). Email/password only — no Google/social sign-in, no terms checkbox (not real features).
  - `home.html` — sidebar + top bar, welcome header, 4 stat cards (Campaigns/Sent/Open Rate/Follow-ups),
    recent campaigns grid.
  - `account.html` — Profile card + Gmail Connection card (matches real `/api/account` fields).
  - `campaigns-list.html` — campaign card grid with real app metrics only (no credits/billing).
  - `campaign-detail.html` — two-panel layout: recipients table (65%, expandable rows showing
    per-recipient send/open/follow-up timeline) + Send Settings / Follow-up cards (35%). Follow-up
    targeting matches the real opened/not-opened logic — no fictional "sequence steps".
  - `compose.html` — template list (240px) + editor canvas with Tiptap-style toolbar (bold/italic/
    strikethrough), placeholder syntax, attachment dropzone (PDF/Word/Excel/images), autosave
    indicator. No test-send or discard buttons (app has neither).
  - `dashboard.html` — filter bar + compact stat row + sortable recipients table with an
    "Opened At" column (no click-tracking column — the app only tracks opens, not clicks).
- **Consistency rules applied across all 8 mockups** (fixes from earlier Stitch drafts that had to
  be corrected): sidebar-only nav, minimal top bar with just a page title/breadcrumb + a solid dark
  circular initials avatar (no notification bell, no help icon, no stock photos), and no invented
  features — no OAuth/social login, no subscription tiers, no credit/billing system, no click-rate
  or reply tracking, no multi-step drip sequences. Every number/feature shown should map to something
  the real app actually does.
- Next step: convert these mockups' Tailwind markup into the real `page.tsx` / component files
  (replacing CSS Modules), wiring up real state/API calls, keeping functionality identical.
