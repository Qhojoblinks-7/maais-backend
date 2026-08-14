/*
  Add dual-role support fields to staff_profiles.
*/
-- AlterTable
ALTER TABLE "staff_profiles" ADD COLUMN     "canTeach" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hodDepartmentId" VARCHAR(255),
ADD COLUMN     "isHod" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_hodDepartmentId_fkey" FOREIGN KEY ("hodDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
