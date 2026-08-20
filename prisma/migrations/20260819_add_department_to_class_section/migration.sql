-- Add departmentId to class_sections
ALTER TABLE "class_sections" ADD COLUMN "departmentId" TEXT;

-- Add foreign key constraint
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_departmentId_fkey" 
  FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for performance
CREATE INDEX "class_sections_departmentId_idx" ON "class_sections"("departmentId");
