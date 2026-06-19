-- First, update the enum values in the database to match the schema
UPDATE "terms" SET "termNumber" = 'SEMESTER_1' WHERE "termNumber" = 'TERM_1';
UPDATE "terms" SET "termNumber" = 'SEMESTER_2' WHERE "termNumber" = 'TERM_2';
UPDATE "terms" SET "termNumber" = 'SEMESTER_1' WHERE "termNumber" = 'TERM_3'; -- Only 2 semesters, map TERM_3 to SEMESTER_1

-- Now we need to drop the old enum and recreate with new values
-- This is handled by Prisma db push --accept-data-loss