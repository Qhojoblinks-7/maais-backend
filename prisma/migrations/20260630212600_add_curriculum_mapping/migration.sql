-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "credit_hours" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "subjects" ADD COLUMN     "applicable_programs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "curriculum_mappings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "subjectId" TEXT NOT NULL,
    "classSectionId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deployedAt" TIMESTAMP(3),
    "deployedById" TEXT,

    CONSTRAINT "curriculum_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_mappings_subjectId_classSectionId_academicYearId_key" ON "curriculum_mappings"("subjectId", "classSectionId", "academicYearId");

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_classSectionId_fkey" FOREIGN KEY ("classSectionId") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;
