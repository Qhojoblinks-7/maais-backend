-- AddColumn
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "student_profiles_nationalId_key" ON "student_profiles"("nationalId");