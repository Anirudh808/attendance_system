/*
  Warnings:

  - You are about to drop the column `workAddress` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `workLat` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `workLon` on the `Staff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "workAddress",
DROP COLUMN "workLat",
DROP COLUMN "workLon";
