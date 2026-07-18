-- Durable production storage for organization settings and leave automation.
-- This migration is additive and keeps tenant-owned data scoped by organizationId.

CREATE TYPE "PolicyDocumentStatus" AS ENUM ('UPLOADED', 'EXTRACTED', 'PARSED', 'APPROVED', 'REJECTED');

CREATE TYPE "ExtractedPolicyRuleStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

CREATE TYPE "LeavePolicyVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 30,
    "officeIpRanges" JSONB,
    "wifiVerificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leaveAutomationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "attendancePolicyJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "filePath" TEXT,
    "extractedText" TEXT,
    "status" "PolicyDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtractedPolicyRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "extractedJson" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ExtractedPolicyRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedPolicyRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeavePolicyVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyDocumentId" TEXT,
    "version" INTEGER NOT NULL,
    "status" "LeavePolicyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "rulesJson" JSONB NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePolicyVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaveDecisionLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL,
    "requiredApprovals" JSONB NOT NULL,
    "policyVersionId" TEXT,
    "evaluatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveDecisionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");
CREATE INDEX "OrganizationSettings_organizationId_idx" ON "OrganizationSettings"("organizationId");
CREATE INDEX "PolicyDocument_organizationId_idx" ON "PolicyDocument"("organizationId");
CREATE INDEX "PolicyDocument_organizationId_status_idx" ON "PolicyDocument"("organizationId", "status");
CREATE INDEX "ExtractedPolicyRule_organizationId_idx" ON "ExtractedPolicyRule"("organizationId");
CREATE INDEX "ExtractedPolicyRule_organizationId_status_idx" ON "ExtractedPolicyRule"("organizationId", "status");
CREATE UNIQUE INDEX "LeavePolicyVersion_organizationId_version_key" ON "LeavePolicyVersion"("organizationId", "version");
CREATE INDEX "LeavePolicyVersion_organizationId_idx" ON "LeavePolicyVersion"("organizationId");
CREATE INDEX "LeavePolicyVersion_organizationId_status_idx" ON "LeavePolicyVersion"("organizationId", "status");
CREATE INDEX "LeaveDecisionLog_organizationId_idx" ON "LeaveDecisionLog"("organizationId");
CREATE INDEX "LeaveDecisionLog_organizationId_leaveRequestId_idx" ON "LeaveDecisionLog"("organizationId", "leaveRequestId");

ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtractedPolicyRule" ADD CONSTRAINT "ExtractedPolicyRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractedPolicyRule" ADD CONSTRAINT "ExtractedPolicyRule_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "PolicyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeavePolicyVersion" ADD CONSTRAINT "LeavePolicyVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeavePolicyVersion" ADD CONSTRAINT "LeavePolicyVersion_policyDocumentId_fkey" FOREIGN KEY ("policyDocumentId") REFERENCES "PolicyDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeavePolicyVersion" ADD CONSTRAINT "LeavePolicyVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_evaluatedBy_fkey" FOREIGN KEY ("evaluatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveDecisionLog" ADD CONSTRAINT "LeaveDecisionLog_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "LeavePolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
