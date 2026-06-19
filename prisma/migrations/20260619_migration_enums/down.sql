-- Rollback: convert SEMESTER values back to TERM values
UPDATE "terms" SET "termNumber" = 'TERM_1' WHERE "termNumber" = 'SEMESTER_1';
UPDATE "terms" SET "termNumber" = 'TERM_2' WHERE "termNumber" = 'SEMESTER_2';