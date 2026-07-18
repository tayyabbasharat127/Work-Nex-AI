BEGIN;

CREATE UNIQUE INDEX "User_organizationId_employeeId_key" ON "User"("organizationId", "employeeId");
DROP INDEX IF EXISTS "User_employeeId_key";
CREATE INDEX "User_organizationId_isActive_idx" ON "User"("organizationId", "isActive");
CREATE INDEX "User_organizationId_roleId_idx" ON "User"("organizationId", "roleId");
CREATE INDEX "User_organizationId_managerId_idx" ON "User"("organizationId", "managerId");
CREATE INDEX "User_organizationId_departmentId_idx" ON "User"("organizationId", "departmentId");

CREATE UNIQUE INDEX "Holiday_organizationId_date_key" ON "Holiday"("organizationId", "date");
CREATE UNIQUE INDEX "BiometricIntegration_id_organizationId_key" ON "BiometricIntegration"("id", "organizationId");
CREATE UNIQUE INDEX "PolicyDocument_id_organizationId_key" ON "PolicyDocument"("id", "organizationId");
CREATE UNIQUE INDEX "LeavePolicyVersion_id_organizationId_key" ON "LeavePolicyVersion"("id", "organizationId");
CREATE UNIQUE INDEX "Subscription_id_organizationId_key" ON "Subscription"("id", "organizationId");

CREATE INDEX "EtlSyncLog_organizationId_createdAt_idx" ON "EtlSyncLog"("organizationId", "createdAt");
CREATE INDEX "EtlSyncLog_status_createdAt_idx" ON "EtlSyncLog"("status", "createdAt");
CREATE INDEX "Invoice_organizationId_createdAt_idx" ON "Invoice"("organizationId", "createdAt");
CREATE INDEX "AuditLog_organizationId_entity_createdAt_idx" ON "AuditLog"("organizationId", "entity", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_organizationId_fkey"
  FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BiometricDevice" DROP CONSTRAINT IF EXISTS "BiometricDevice_biometricIntegrationId_fkey";
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_biometricIntegrationId_organizationId_fkey"
  FOREIGN KEY ("biometricIntegrationId", "organizationId") REFERENCES "BiometricIntegration"("id", "organizationId") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "PolicyDocument" DROP CONSTRAINT IF EXISTS "PolicyDocument_uploadedById_fkey";
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_uploadedById_organizationId_fkey"
  FOREIGN KEY ("uploadedById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExtractedPolicyRule" DROP CONSTRAINT IF EXISTS "ExtractedPolicyRule_policyDocumentId_fkey";
ALTER TABLE "ExtractedPolicyRule" ADD CONSTRAINT "ExtractedPolicyRule_policyDocumentId_organizationId_fkey"
  FOREIGN KEY ("policyDocumentId", "organizationId") REFERENCES "PolicyDocument"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeavePolicyVersion" DROP CONSTRAINT IF EXISTS "LeavePolicyVersion_policyDocumentId_fkey";
ALTER TABLE "LeavePolicyVersion" DROP CONSTRAINT IF EXISTS "LeavePolicyVersion_approvedById_fkey";
ALTER TABLE "LeavePolicyVersion" ADD CONSTRAINT "LeavePolicyVersion_policyDocumentId_organizationId_fkey"
  FOREIGN KEY ("policyDocumentId", "organizationId") REFERENCES "PolicyDocument"("id", "organizationId") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "LeavePolicyVersion" ADD CONSTRAINT "LeavePolicyVersion_approvedById_organizationId_fkey"
  FOREIGN KEY ("approvedById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "LeaveDecisionLog" DROP CONSTRAINT IF EXISTS "LeaveDecisionLog_leaveRequestId_fkey";
ALTER TABLE "LeaveDecisionLog" DROP CONSTRAINT IF EXISTS "LeaveDecisionLog_employeeId_fkey";
ALTER TABLE "LeaveDecisionLog" DROP CONSTRAINT IF EXISTS "LeaveDecisionLog_evaluatedBy_fkey";
ALTER TABLE "LeaveDecisionLog" DROP CONSTRAINT IF EXISTS "LeaveDecisionLog_policyVersionId_fkey";
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_leaveRequestId_organizationId_fkey"
  FOREIGN KEY ("leaveRequestId", "organizationId") REFERENCES "LeaveRequest"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_employeeId_organizationId_fkey"
  FOREIGN KEY ("employeeId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_evaluatedBy_organizationId_fkey"
  FOREIGN KEY ("evaluatedBy", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_policyVersionId_organizationId_fkey"
  FOREIGN KEY ("policyVersionId", "organizationId") REFERENCES "LeavePolicyVersion"("id", "organizationId") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_subscriptionId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_organizationId_fkey"
  FOREIGN KEY ("subscriptionId", "organizationId") REFERENCES "Subscription"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Subscription"
  ALTER COLUMN "pricePerMonth" TYPE DECIMAL(12,2) USING ROUND("pricePerMonth"::numeric, 2),
  ALTER COLUMN "discountPercent" TYPE DECIMAL(5,2) USING ROUND("discountPercent"::numeric, 2);
ALTER TABLE "Invoice"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "discount" TYPE DECIMAL(12,2) USING ROUND("discount"::numeric, 2),
  ALTER COLUMN "tax" TYPE DECIMAL(12,2) USING ROUND("tax"::numeric, 2),
  ALTER COLUMN "totalAmount" TYPE DECIMAL(12,2) USING ROUND("totalAmount"::numeric, 2);

ALTER TABLE "User" ADD CONSTRAINT "User_authVersion_check" CHECK ("authVersion" >= 0);
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_progress_check" CHECK ("progress" BETWEEN 0 AND 100);
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_managerRating_check" CHECK ("managerRating" IS NULL OR "managerRating" BETWEEN 1 AND 5);
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_days_check" CHECK ("totalDays" >= 0 AND "maxCarryForward" >= 0);
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_days_check" CHECK ("totalDays" >= 0 AND "usedDays" >= 0 AND "remainingDays" >= 0);
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_workingHours_check" CHECK ("workingHours" IS NULL OR "workingHours" BETWEEN 0 AND 24);
ALTER TABLE "BiometricIntegration" ADD CONSTRAINT "BiometricIntegration_syncInterval_check" CHECK ("syncIntervalMinutes" BETWEEN 1 AND 1440);
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_port_check" CHECK ("port" IS NULL OR "port" BETWEEN 1 AND 65535);
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_amounts_check" CHECK ("pricePerMonth" >= 0 AND "discountPercent" BETWEEN 0 AND 100 AND "maxEmployees" > 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_check" CHECK ("amount" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "totalAmount" >= 0);

COMMIT;
