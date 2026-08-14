/*
  Add nationalId and subjects to student_profiles
  Add disability and canReadBraille to medical_records
*/
-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "nationalId" TEXT UNIQUE,
ADD COLUMN     "subjects" JSONB;

-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN     "canReadBraille" BOOLEAN,
ADD COLUMN     "disability" TEXT;
