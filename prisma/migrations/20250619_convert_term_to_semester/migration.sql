-- Rename TERM_1 to SEMESTER_1 and TERM_2 to SEMESTER_2 in the TermNumber enum
ALTER TYPE "TermNumber" RENAME VALUE 'TERM_1' TO 'SEMESTER_1';
ALTER TYPE "TermNumber" RENAME VALUE 'TERM_2' TO 'SEMESTER_2';
-- Drop TERM_3 if it exists (we only want 2 semesters now)
ALTER TYPE "TermNumber" DROP VALUE 'TERM_3';