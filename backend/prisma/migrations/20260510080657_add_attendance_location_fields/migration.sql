-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "Attendance_ipAddress_idx" ON "Attendance"("ipAddress");
