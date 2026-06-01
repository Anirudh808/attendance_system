-- CreateTable
CREATE TABLE "WorkLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workLat" DOUBLE PRECISION NOT NULL,
    "workLon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "WorkLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkLocation" ADD CONSTRAINT "WorkLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing staff locations
INSERT INTO "WorkLocation" ("id", "userId", "workLat", "workLon")
SELECT 'loc-' || "id", "id", "workLat", "workLon" FROM "Staff";

