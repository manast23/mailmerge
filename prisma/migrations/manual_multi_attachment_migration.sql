-- Multi-attachment support (up to 5 files per template)
-- Run this manually in the Supabase SQL Editor (Prisma binary is blocked in Claude's
-- sandbox, so this can't be applied via `npx prisma migrate`).

-- 1) Add the new column that holds an array of { url, name } objects
ALTER TABLE "Template" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';

-- 2) Backfill: move any existing single attachment into the new array
UPDATE "Template"
SET "attachments" = jsonb_build_array(jsonb_build_object('url', "attachmentUrl", 'name', "attachmentName"))
WHERE "attachmentUrl" IS NOT NULL AND "attachmentName" IS NOT NULL;

-- 3) Drop the old single-attachment columns now that everything reads/writes "attachments"
ALTER TABLE "Template" DROP COLUMN "attachmentUrl";
ALTER TABLE "Template" DROP COLUMN "attachmentName";
