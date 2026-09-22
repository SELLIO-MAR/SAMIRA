-- AlterTable
ALTER TABLE "Level" ADD COLUMN     "restDays" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "SchoolConfig" ADD COLUMN     "maxSubjectHoursPerDay" INTEGER NOT NULL DEFAULT 2;
