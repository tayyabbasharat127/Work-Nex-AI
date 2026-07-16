-- Allow LeaveBalance.remainingDays to go negative — supports the
-- "emergency advance leave" flow: an admin can approve a leave request
-- even when the employee's balance is insufficient, which takes their
-- balance negative. It is paid back automatically out of whatever they
-- earn/are granted next. totalDays and usedDays remain non-negative.
ALTER TABLE "LeaveBalance" DROP CONSTRAINT IF EXISTS "LeaveBalance_days_check";
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_days_check" CHECK ("totalDays" >= 0 AND "usedDays" >= 0);
