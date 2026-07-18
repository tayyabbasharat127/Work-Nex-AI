ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'PENDING_MANAGER';
ALTER TYPE "LeaveStatus" ADD VALUE IF NOT EXISTS 'PENDING_ADMIN';

ALTER TABLE "LeaveRequest"
  ADD COLUMN "managerApproverId" TEXT,
  ADD COLUMN "managerReviewedAt" TIMESTAMP(3),
  ADD COLUMN "managerNote" TEXT,
  ADD COLUMN "adminApproverId" TEXT,
  ADD COLUMN "adminReviewedAt" TIMESTAMP(3),
  ADD COLUMN "adminNote" TEXT;

ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_managerApproverId_organizationId_fkey"
  FOREIGN KEY ("managerApproverId", "organizationId")
  REFERENCES "User"("id", "organizationId")
  ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_adminApproverId_organizationId_fkey"
  FOREIGN KEY ("adminApproverId", "organizationId")
  REFERENCES "User"("id", "organizationId")
  ON DELETE NO ACTION ON UPDATE CASCADE;
