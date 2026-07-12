-- Extend LeaveType with common real-world leave types beyond the original 7,
-- so document uploads / manual policy entries mentioning these don't have to
-- be forced into OTHER. Additive only — existing rows/values unaffected.
-- Each value added separately per Postgres enum requirements.

ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'BEREAVEMENT';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'MARRIAGE';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'STUDY';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'HAJJ';
ALTER TYPE "LeaveType" ADD VALUE IF NOT EXISTS 'COMPENSATORY';
