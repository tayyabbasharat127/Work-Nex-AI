UPDATE "LeaveRequest" AS leave
SET "status" = CASE
  WHEN employee."managerId" IS NOT NULL THEN 'PENDING_MANAGER'::"LeaveStatus"
  ELSE 'PENDING_ADMIN'::"LeaveStatus"
END
FROM "User" AS employee
WHERE leave."employeeId" = employee."id"
  AND leave."organizationId" = employee."organizationId"
  AND leave."status" = 'PENDING'::"LeaveStatus";
