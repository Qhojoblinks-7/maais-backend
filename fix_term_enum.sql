ALTER TYPE "TermNumber" RENAME TO "TermNumber_old";
CREATE TYPE "TermNumber" AS ENUM ('SEMESTER_1', 'SEMESTER_2');
ALTER TABLE "Term" ALTER COLUMN "termNumber" TYPE "TermNumber" USING "termNumber"::text::"TermNumber";
DROP TYPE "TermNumber_old";
