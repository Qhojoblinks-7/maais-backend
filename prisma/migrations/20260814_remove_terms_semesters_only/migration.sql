/*
  Remove term system options: keep only 2 semesters.
  Migrate existing TERM_1/TERM_2/TERM_3 values to SEMESTER_1/SEMESTER_2.
*/
-- Create new enum type
CREATE TYPE "TermNumber_new" AS ENUM ('SEMESTER_1', 'SEMESTER_2');

-- Alter terms table to use new type
ALTER TABLE "terms" ALTER COLUMN "termNumber" TYPE "TermNumber_new" USING (
  CASE "termNumber"
    WHEN 'TERM_1' THEN 'SEMESTER_1'
    WHEN 'TERM_2' THEN 'SEMESTER_2'
    WHEN 'TERM_3' THEN 'SEMESTER_2'
    WHEN 'SEMESTER_1' THEN 'SEMESTER_1'
    WHEN 'SEMESTER_2' THEN 'SEMESTER_2'
  END
);

-- Drop old enum type
DROP TYPE "TermNumber";

-- Rename new enum to original name
ALTER TYPE "TermNumber_new" RENAME TO "TermNumber";

-- Update default termSystem to TWO_SEMESTERS
ALTER TABLE "academic_years" ALTER COLUMN "termSystem" SET DEFAULT 'TWO_SEMESTERS';
