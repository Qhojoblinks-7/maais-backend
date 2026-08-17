-- Add isBoarder column if it doesn't exist (databases that only used prisma migrate deploy)
-- The Prisma schema already declares: isBoarder Boolean @default(false)
-- but this was never captured in a migration file.
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "isBoarder" BOOLEAN NOT NULL DEFAULT false;

-- Fix existing rows that may have NULL values (databases that added it as nullable via prisma db push)
UPDATE "student_profiles" SET "isBoarder" = false WHERE "isBoarder" IS NULL;

-- Ensure NOT NULL constraint and default are in place
ALTER TABLE "student_profiles" ALTER COLUMN "isBoarder" SET NOT NULL;
ALTER TABLE "student_profiles" ALTER COLUMN "isBoarder" SET DEFAULT false;

-- Add middleName to parent_profiles (matches Prisma schema)
ALTER TABLE "parent_profiles" ADD COLUMN IF NOT EXISTS "middleName" TEXT;
