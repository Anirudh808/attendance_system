/*
  Warnings:

  - You are about to drop the column `userId` on the `WorkLocation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WorkLocation" DROP CONSTRAINT "WorkLocation_userId_fkey";

-- AlterTable
ALTER TABLE "WorkLocation" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "_StaffWorkLocations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StaffWorkLocations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StaffWorkLocations_B_index" ON "_StaffWorkLocations"("B");

-- AddForeignKey
ALTER TABLE "_StaffWorkLocations" ADD CONSTRAINT "_StaffWorkLocations_A_fkey" FOREIGN KEY ("A") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffWorkLocations" ADD CONSTRAINT "_StaffWorkLocations_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
