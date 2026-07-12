-- Sandwich-leave rule (opt-in per organization) + supporting fields on LeaveRequest.
-- Additive only, all with defaults that preserve every existing organization's
-- current behavior unless an admin explicitly opts in.

ALTER TABLE "LeaveRequest" ADD COLUMN "isSandwiched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeaveRequest" ADD COLUMN "sandwichExtraDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OrganizationSettings" ADD COLUMN "sandwichLeaveEnabled" BOOLEAN NOT NULL DEFAULT false;
