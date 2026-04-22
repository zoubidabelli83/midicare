-- AlterTable
ALTER TABLE "User" ADD COLUMN "availability" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "certifications" TEXT;
ALTER TABLE "User" ADD COLUMN "hourlyRate" REAL;
ALTER TABLE "User" ADD COLUMN "serviceRadius" REAL DEFAULT 10;
ALTER TABLE "User" ADD COLUMN "specialties" TEXT;
ALTER TABLE "User" ADD COLUMN "yearsExperience" INTEGER;
