-- Add ipAddress field to Attendance table
ALTER TABLE "Attendance" ADD COLUMN "ipAddress" TEXT;

-- Add index for faster IP-based queries
CREATE INDEX "Attendance_ipAddress_idx" ON "Attendance"("ipAddress");
