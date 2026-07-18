CREATE UNIQUE INDEX "Department_id_organizationId_key" ON "Department"("id", "organizationId");
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");
CREATE UNIQUE INDEX "LeavePolicy_id_organizationId_key" ON "LeavePolicy"("id", "organizationId");
CREATE UNIQUE INDEX "LeaveRequest_id_organizationId_key" ON "LeaveRequest"("id", "organizationId");
CREATE UNIQUE INDEX "PerformanceRecord_id_organizationId_key" ON "PerformanceRecord"("id", "organizationId");

ALTER TABLE "User" DROP CONSTRAINT "User_departmentId_fkey";
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";
ALTER TABLE "LeaveBalance" DROP CONSTRAINT "LeaveBalance_policyId_fkey";
ALTER TABLE "LeaveBalance" DROP CONSTRAINT "LeaveBalance_userId_fkey";
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_approverId_fkey";
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_employeeId_fkey";
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_userId_fkey";
ALTER TABLE "PerformanceRecord" DROP CONSTRAINT "PerformanceRecord_userId_fkey";
ALTER TABLE "AttritionRecord" DROP CONSTRAINT "AttritionRecord_userId_fkey";
ALTER TABLE "AttritionRecord" DROP CONSTRAINT "AttritionRecord_performanceRecordId_fkey";

ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_organizationId_fkey" FOREIGN KEY ("departmentId", "organizationId") REFERENCES "Department"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_organizationId_fkey" FOREIGN KEY ("managerId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_policyId_organizationId_fkey" FOREIGN KEY ("policyId", "organizationId") REFERENCES "LeavePolicy"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approverId_organizationId_fkey" FOREIGN KEY ("approverId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_organizationId_fkey" FOREIGN KEY ("employeeId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttritionRecord" ADD CONSTRAINT "AttritionRecord_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttritionRecord" ADD CONSTRAINT "AttritionRecord_performanceRecordId_organizationId_fkey" FOREIGN KEY ("performanceRecordId", "organizationId") REFERENCES "PerformanceRecord"("id", "organizationId") ON DELETE NO ACTION ON UPDATE CASCADE;
