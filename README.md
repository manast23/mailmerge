<<<<<<< HEAD
# Mail Merge Pro — Deployment Guide

## What you need (all free)
1. **GitHub** account — github.com
2. **Vercel** account — vercel.com (sign in with GitHub)
3. **Supabase** account — supabase.com
4. **Resend** account — resend.com

---

## Step 1 — Supabase (Database)

1. Go to supabase.com → New Project
2. Choose a name, password, and region (pick closest to you)
3. Wait ~2 minutes for it to spin up
4. Go to **Project Settings → Database → Connection string**
5. Copy the **URI** — this is your `DATABASE_URL`
   - Replace `[YOUR-PASSWORD]` with the password you set
6. Also copy the **Direct connection** URL — this is your `DIRECT_URL`

---

## Step 2 — Resend (Email Sending)

1. Go to resend.com → Sign up
2. Go to **API Keys** → Create API Key → copy it
3. Go to **Domains** → Add your domain (or use `onboarding@resend.dev` for testing)
   - For testing: you can only send TO your own email with `onboarding@resend.dev`
   - To send to anyone: add and verify your own domain

---

## Step 3 — Deploy to Vercel

1. Upload this project to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/mailmerge-pro.git
   git push -u origin main
   ```

2. Go to vercel.com → New Project → Import your GitHub repo

3. Add these **Environment Variables** in Vercel:
   ```
   DATABASE_URL        = (from Supabase step above)
   DIRECT_URL          = (from Supabase step above)
   RESEND_API_KEY      = (from Resend step above)
   RESEND_FROM_EMAIL   = you@yourdomain.com
   NEXT_PUBLIC_APP_URL = https://your-app-name.vercel.app
   ```

4. Click **Deploy**

5. After deploy, run the database migration:
   - Go to Vercel → your project → Settings → Functions
   - OR run locally: `npx prisma db push`

---

## Step 4 — Run Database Migration

After deploying, you need to create the database tables.

**Option A — Vercel CLI (easiest):**
```bash
npm install -g vercel
vercel env pull .env.local
npx prisma db push
```

**Option B — Supabase SQL Editor:**
Run this in Supabase → SQL Editor:
```sql
-- Prisma will auto-generate this, but you can also run prisma db push locally
```

---

## Step 5 — Update App URL

After Vercel gives you your URL (e.g. `https://mailmerge-pro.vercel.app`):
1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
3. Redeploy (Vercel → Deployments → Redeploy)

This is important — it makes tracking pixels point to YOUR server.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Fill in your values in .env.local

# Push database schema
npx prisma db push

# Run dev server
npm run dev
```

Open http://localhost:3000

---

## How to Use

1. **Compose tab** → Create an email template with `{{placeholders}}`
2. **Campaigns tab** → Create a new campaign, select your template
3. **Add recipients** → Upload CSV, paste Google Sheet URL, or paste data manually
4. **Send** → Configure delay, set From name/email, hit Send
5. **Dashboard** → Filter by date range, opened/not opened, export CSV

---

## Tracking

The tracking pixel is hosted at `YOUR_APP_URL/api/track?t=TRACK_ID`

This is your own server — no Gmail blocking, works with all email clients including:
- Gmail web & mobile
- Outlook
- University emails
- 163.com, Yahoo, any provider

When a recipient opens the email, the Opened At column updates automatically in the Dashboard.
=======
# mailmerge
mailmerge app
>>>>>>> 873f1b31925b8c25060781dec22a875766ac22ba
