-- Staff Categories: org-defined, admin-named groups (e.g. "Faculty"/"NTS")
-- that carry per-category attendance rules (late threshold, 3-lates-to-absence,
-- weekly-hours target). Purely additive — no existing tables/columns touched,
-- and User.staffCategoryId is nullable so no existing row is affected.

CREATE TABLE "StaffCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lateThresholdTime" TEXT,
    "latesPerAbsence" INTEGER,
    "minHoursPerDay" DOUBLE PRECISION,
    "minHoursPerWeek" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffCategory_organizationId_name_key" ON "StaffCategory"("organizationId", "name");
CREATE UNIQUE INDEX "StaffCategory_id_organizationId_key" ON "StaffCategory"("id", "organizationId");
CREATE INDEX "StaffCategory_organizationId_idx" ON "StaffCategory"("organizationId");

ALTER TABLE "StaffCategory" ADD CONSTRAINT "StaffCategory_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "staffCategoryId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_staffCategoryId_organizationId_fkey"
    FOREIGN KEY ("staffCategoryId", "organizationId") REFERENCES "StaffCategory"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;
