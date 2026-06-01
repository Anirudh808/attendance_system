/*
  Warnings:

  - Added the required column `name` to the `WorkLocation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkLocation" ADD COLUMN "name" TEXT;

-- Update existing records using data from the Staff table
UPDATE "WorkLocation"
SET "name" = "Staff"."workAddress"
FROM "Staff"
WHERE "WorkLocation"."userId" = "Staff"."id";

-- Set any remaining null values to a default just in case
UPDATE "WorkLocation"
SET "name" = 'Office'
WHERE "name" IS NULL;

-- Make it NOT NULL
ALTER TABLE "WorkLocation" ALTER COLUMN "name" SET NOT NULL;
