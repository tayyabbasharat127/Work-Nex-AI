-- CreateEnum
CREATE TYPE "AiLeaveRecommendation" AS ENUM ('APPROVE', 'REJECT', 'REVIEW');

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_adminApproverId_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_managerApproverId_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_staffCategoryId_organizationId_fkey";

-- DropIndex
DROP INDEX "EtlSyncLog_organizationId_idx";

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "aiConfidence" INTEGER,
ADD COLUMN     "aiGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiPolicyObservations" JSONB,
ADD COLUMN     "aiReasoning" JSONB,
ADD COLUMN     "aiRecommendation" "AiLeaveRecommendation";

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "aiLeaveAdvisorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "pricePerMonth" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffCategoryId_organizationId_fkey" FOREIGN KEY ("staffCategoryId", "organizationId") REFERENCES "StaffCategory"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_managerApproverId_organizationId_fkey" FOREIGN KEY ("managerApproverId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_adminApproverId_organizationId_fkey" FOREIGN KEY ("adminApproverId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
