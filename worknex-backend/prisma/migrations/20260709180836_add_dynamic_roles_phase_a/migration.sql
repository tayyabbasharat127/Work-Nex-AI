-- Phase A of the dynamic-roles migration: purely additive, no data loss.
-- The old `Role` enum is renamed to `RoleTier` (Postgres preserves the type's
-- OID and all data in columns using it — this is NOT a drop/recreate).
-- The old `User.role` / `LeavePolicy.applicableRoles` columns are kept as-is
-- so a backfill script can read them before Phase B drops them.

-- Rename existing enum type Role -> RoleTier (safe: columns using it keep their data)
ALTER TYPE "Role" RENAME TO "RoleTier";

-- New dynamic Role model
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "tier" "RoleTier" NOT NULL,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_organizationId_name_key" ON "Role"("organizationId", "name");
CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");

ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User: new nullable FK to the dynamic Role, coexisting with the legacy `role` column
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LeavePolicy: new applicableRoleIds coexisting with the legacy applicableRoles (RoleTier[]) column
ALTER TABLE "LeavePolicy" ADD COLUMN "applicableRoleIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
