/*
  Warnings:

  - You are about to drop the column `applicable_programs` on the `subjects` table. All the data in the column will be lost.
  - You are about to drop the column `credit_hours` on the `subjects` table. All the data in the column will be lost.
  - Made the column `createdById` on table `support_tickets` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "class_sections" ADD COLUMN     "track" TEXT;

-- AlterTable
ALTER TABLE "curriculum_mappings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "staff_profiles" ADD COLUMN     "canOversight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canTeach" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "applicable_programs",
DROP COLUMN "credit_hours",
ADD COLUMN     "applicablePrograms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "creditHours" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "support_tickets" ALTER COLUMN "studentId" DROP NOT NULL,
ALTER COLUMN "createdById" SET NOT NULL;

-- AlterTable
ALTER TABLE "timetable_entries" ADD COLUMN     "track" TEXT;

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "onsetDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "treatment" TEXT,
    "medication" TEXT,
    "dosage" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_records_studentId_idx" ON "medical_records"("studentId");

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
