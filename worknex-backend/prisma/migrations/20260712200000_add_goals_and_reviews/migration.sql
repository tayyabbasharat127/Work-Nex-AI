-- Goals & Performance Reviews: a real, manager-driven qualitative signal
-- (goal tracking + rating/comments per review cycle) separate from the
-- existing attendance-derived PerformanceRecord score. Purely additive —
-- no existing tables/columns touched.

CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'MISSED');
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED');

CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT,
    "dueDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "managerRating" INTEGER,
    "managerComments" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Goal_id_organizationId_key" ON "Goal"("id", "organizationId");
CREATE INDEX "Goal_organizationId_userId_idx" ON "Goal"("organizationId", "userId");

CREATE UNIQUE INDEX "PerformanceReview_userId_managerId_cycle_key" ON "PerformanceReview"("userId", "managerId", "cycle");
CREATE UNIQUE INDEX "PerformanceReview_id_organizationId_key" ON "PerformanceReview"("id", "organizationId");
CREATE INDEX "PerformanceReview_organizationId_userId_idx" ON "PerformanceReview"("organizationId", "userId");
CREATE INDEX "PerformanceReview_organizationId_managerId_idx" ON "PerformanceReview"("organizationId", "managerId");

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_organizationId_fkey"
    FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_userId_organizationId_fkey"
    FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_managerId_organizationId_fkey"
    FOREIGN KEY ("managerId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
