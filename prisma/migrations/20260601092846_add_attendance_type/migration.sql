-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "attendanceType" "AttendanceType" NOT NULL DEFAULT 'CHECK_IN',
ADD COLUMN     "workLocationId" TEXT,
ADD COLUMN     "workLocationName" TEXT;
