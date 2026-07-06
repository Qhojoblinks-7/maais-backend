-- CreateEnum
CREATE TYPE "GradeRevisionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "grade_revisions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeEntryId" TEXT NOT NULL,
    "className" TEXT,
    "issue" TEXT NOT NULL,
    "severity" "GradeRevisionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "history" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grade_revisions_teacherId_idx" ON "grade_revisions"("teacherId");

-- CreateIndex
CREATE INDEX "grade_revisions_studentId_idx" ON "grade_revisions"("studentId");

-- CreateIndex
CREATE INDEX "grade_revisions_subjectId_idx" ON "grade_revisions"("subjectId");

-- CreateIndex
CREATE INDEX "grade_revisions_gradeEntryId_idx" ON "grade_revisions"("gradeEntryId");
