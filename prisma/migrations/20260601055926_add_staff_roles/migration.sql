-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STAFF';

-- Make AS25-02 an ADMIN
UPDATE "Staff" SET "role" = 'ADMIN' WHERE "id" = 'AS25-02';
