-- ============================================================
-- Mail Merge Pro: Multi-user migration
-- Run these in order in the Supabase SQL Editor.
-- ============================================================

-- STEP 1: Create the User table
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "gmailAddress" TEXT,
  "encryptedAppPassword" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- STEP 2: Add nullable userId columns to existing tables
ALTER TABLE "Template" ADD COLUMN "userId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "userId" TEXT;

-- ============================================================
-- STOP HERE. Now deploy the app and sign up for your own
-- account at /signup (this becomes the owner of all existing
-- data). Then come back to Supabase, open the "User" table,
-- copy your new user's "id" value, and continue below.
-- ============================================================

-- STEP 3: Backfill existing Templates/Campaigns to your account
-- Replace YOUR_USER_ID with the id you copied above.
UPDATE "Template" SET "userId" = 'YOUR_USER_ID' WHERE "userId" IS NULL;
UPDATE "Campaign" SET "userId" = 'YOUR_USER_ID' WHERE "userId" IS NULL;

-- STEP 4: Make userId required and add foreign keys
ALTER TABLE "Template" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Campaign" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Done. Each brother should now sign up their own account at
-- /signup, then go to the Account tab and connect their own
-- Gmail address + App Password before sending campaigns.
