-- Phase B: finalize the dynamic-roles migration now that
-- scripts/backfill-dynamic-roles.js has populated User.roleId and
-- LeavePolicy.applicableRoleIds for every existing row (verified: 0 users
-- with null roleId). Drops the legacy RoleTier-typed columns and makes
-- User.roleId required.

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_roleId_fkey";
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "LeavePolicy" DROP COLUMN "applicableRoles";
