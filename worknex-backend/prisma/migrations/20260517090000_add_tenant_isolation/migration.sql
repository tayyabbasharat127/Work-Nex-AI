-- Add tenant columns as nullable first so existing rows can be backfilled safely.
ALTER TABLE "Department" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LeavePolicy" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LeaveBalance" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Holiday" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "PerformanceRecord" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "EtlSyncLog" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;

-- Backfill rows that can only be assigned safely when the database has a single organization.
DO $$
DECLARE
  org_count integer;
  sole_org_id text;
BEGIN
  SELECT COUNT(*), MIN(id) INTO org_count, sole_org_id FROM "Organization";

  IF org_count = 0 AND (
    EXISTS (SELECT 1 FROM "Department")
    OR EXISTS (SELECT 1 FROM "User")
    OR EXISTS (SELECT 1 FROM "LeavePolicy")
    OR EXISTS (SELECT 1 FROM "Holiday")
  ) THEN
    RAISE EXCEPTION 'Cannot backfill tenant isolation: existing tenant-owned rows but no Organization rows exist.';
  END IF;

  IF org_count > 1 AND (
    EXISTS (SELECT 1 FROM "Department" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "User" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "LeavePolicy" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Holiday" WHERE "organizationId" IS NULL)
  ) THEN
    RAISE EXCEPTION 'Cannot safely backfill tenant isolation for departments/users/policies/holidays with multiple organizations. Assign organizationId manually first.';
  END IF;

  IF org_count = 1 THEN
    UPDATE "Department" SET "organizationId" = sole_org_id WHERE "organizationId" IS NULL;
    UPDATE "User" SET "organizationId" = sole_org_id WHERE "organizationId" IS NULL;
    UPDATE "LeavePolicy" SET "organizationId" = sole_org_id WHERE "organizationId" IS NULL;
    UPDATE "Holiday" SET "organizationId" = sole_org_id WHERE "organizationId" IS NULL;
    UPDATE "EtlSyncLog" SET "organizationId" = sole_org_id WHERE "organizationId" IS NULL;
  END IF;
END $$;

-- Backfill rows whose organization can be derived from related records.
UPDATE "Attendance" a
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE a."userId" = u.id AND a."organizationId" IS NULL;

UPDATE "LeaveRequest" lr
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE lr."employeeId" = u.id AND lr."organizationId" IS NULL;

UPDATE "LeaveBalance" lb
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE lb."userId" = u.id AND lb."organizationId" IS NULL;

UPDATE "Notification" n
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE n."userId" = u.id AND n."organizationId" IS NULL;

UPDATE "PerformanceRecord" pr
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE pr."userId" = u.id AND pr."organizationId" IS NULL;

UPDATE "AuditLog" al
SET "organizationId" = u."organizationId"
FROM "User" u
WHERE al."userId" = u.id AND al."organizationId" IS NULL;

-- Fail if any required tenant-owned row could not be assigned.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Department" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "User" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "LeavePolicy" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "LeaveBalance" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "LeaveRequest" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Attendance" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Holiday" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "Notification" WHERE "organizationId" IS NULL)
    OR EXISTS (SELECT 1 FROM "PerformanceRecord" WHERE "organizationId" IS NULL)
  THEN
    RAISE EXCEPTION 'Cannot complete tenant isolation migration: required organizationId backfill left NULL rows.';
  END IF;
END $$;

-- Convert required tenant columns to NOT NULL.
ALTER TABLE "Department" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LeavePolicy" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LeaveBalance" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LeaveRequest" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Attendance" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Holiday" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PerformanceRecord" ALTER COLUMN "organizationId" SET NOT NULL;

-- Replace global department names with per-organization uniqueness.
DROP INDEX IF EXISTS "Department_name_key";

CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE UNIQUE INDEX "LeavePolicy_organizationId_leaveType_key" ON "LeavePolicy"("organizationId", "leaveType");
CREATE INDEX "LeavePolicy_organizationId_leaveType_idx" ON "LeavePolicy"("organizationId", "leaveType");
CREATE INDEX "LeaveBalance_organizationId_idx" ON "LeaveBalance"("organizationId");
CREATE INDEX "LeaveRequest_organizationId_status_idx" ON "LeaveRequest"("organizationId", "status");
CREATE INDEX "Attendance_organizationId_date_idx" ON "Attendance"("organizationId", "date");
CREATE INDEX "Holiday_organizationId_idx" ON "Holiday"("organizationId");
CREATE INDEX "Notification_organizationId_userId_isRead_idx" ON "Notification"("organizationId", "userId", "isRead");
CREATE INDEX "PerformanceRecord_organizationId_year_month_idx" ON "PerformanceRecord"("organizationId", "year", "month");
CREATE INDEX "EtlSyncLog_organizationId_idx" ON "EtlSyncLog"("organizationId");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EtlSyncLog" ADD CONSTRAINT "EtlSyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
