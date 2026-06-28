-- Add freeze fields to departments table
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "isFrozen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "freezeReason" TEXT;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "frozenAt" TIMESTAMP(3);
