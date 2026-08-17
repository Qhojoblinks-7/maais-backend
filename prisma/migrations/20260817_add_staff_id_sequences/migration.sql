-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "nationalId" TEXT,
ADD COLUMN IF NOT EXISTS "subjects" JSONB,
ADD COLUMN IF NOT EXISTS "isBoarder" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_profiles_nationalId_key" ON "student_profiles"("nationalId");

-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN IF NOT EXISTS "disability" TEXT,
ADD COLUMN IF NOT EXISTS "canReadBraille" BOOLEAN;

-- CreateTable
CREATE TABLE IF NOT EXISTS "staff_id_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "deptCode" TEXT NOT NULL DEFAULT '00',
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_id_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "staff_id_sequences_prefix_year_deptCode_key" ON "staff_id_sequences"("prefix", "year", "deptCode");
