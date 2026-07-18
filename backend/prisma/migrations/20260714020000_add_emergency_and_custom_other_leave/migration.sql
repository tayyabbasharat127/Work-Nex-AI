ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'EMERGENCY';

ALTER TABLE "LeaveRequest"
  ADD COLUMN "otherLeaveName" TEXT,
  ADD COLUMN "balanceLeaveType" "LeaveType",
  ADD COLUMN "emergencyRecoveryDate" TIMESTAMP(3);

CREATE INDEX "LeaveRequest_organizationId_emergencyRecoveryDate_idx"
  ON "LeaveRequest"("organizationId", "emergencyRecoveryDate");
