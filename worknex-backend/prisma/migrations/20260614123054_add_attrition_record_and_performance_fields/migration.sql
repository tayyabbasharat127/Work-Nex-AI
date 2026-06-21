-- AlterTable
ALTER TABLE "PerformanceRecord" ADD COLUMN     "mlPredictedScore" DOUBLE PRECISION,
ADD COLUMN     "punctualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AttritionRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLabel" TEXT NOT NULL,
    "willLeaveProb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "factors" JSONB NOT NULL DEFAULT '[]',
    "modelVersion" TEXT NOT NULL DEFAULT 'deterministic-v1',
    "source" TEXT NOT NULL DEFAULT 'DETERMINISTIC',
    "performanceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttritionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttritionRecord_organizationId_year_month_idx" ON "AttritionRecord"("organizationId", "year", "month");

-- CreateIndex
CREATE INDEX "AttritionRecord_organizationId_riskLabel_idx" ON "AttritionRecord"("organizationId", "riskLabel");

-- CreateIndex
CREATE UNIQUE INDEX "AttritionRecord_userId_month_year_key" ON "AttritionRecord"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "AttritionRecord" ADD CONSTRAINT "AttritionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttritionRecord" ADD CONSTRAINT "AttritionRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttritionRecord" ADD CONSTRAINT "AttritionRecord_performanceRecordId_fkey" FOREIGN KEY ("performanceRecordId") REFERENCES "PerformanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
