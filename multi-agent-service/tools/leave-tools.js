import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { callWorkNexApi, formatApiResult } from "./backend-client.js";

const optionalLimit = z.number().int().min(1).max(100).optional();
const leaveStatus = z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional();
const leaveType = z.enum(["ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"]).optional();

function formatLeaveListResult(result) {
  if (!result?.ok) return formatApiResult(result);
  const rows = Array.isArray(result.data) ? result.data : [];
  return JSON.stringify({
    success: true,
    message: result.message,
    count: rows.length,
    meta: result.meta,
    leaves: rows.map((leave) => ({
      id: leave.id,
      employee: leave.employee
        ? `${leave.employee.firstName || ""} ${leave.employee.lastName || ""}`.trim()
        : undefined,
      employeeId: leave.employee?.employeeId || leave.employeeId,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      totalDays: leave.totalDays,
      status: leave.status,
      reason: leave.reason,
      approver: leave.approver
        ? `${leave.approver.firstName || ""} ${leave.approver.lastName || ""}`.trim()
        : undefined,
      approverNote: leave.approverNote,
      appliedAt: leave.appliedAt,
      reviewedAt: leave.reviewedAt,
      decision: leave.decisionExplanation?.decision,
      decisionReasons: leave.decisionExplanation?.reasons,
    })),
  });
}

function formatLeaveBalancesResult(result) {
  if (!result?.ok) return formatApiResult(result);
  const rows = Array.isArray(result.data) ? result.data : [];
  return JSON.stringify({
    success: true,
    message: result.message,
    count: rows.length,
    balances: rows.map((balance) => ({
      leaveType: balance.policy?.leaveType,
      year: balance.year,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      remainingDays: balance.remainingDays,
      carryForward: balance.policy?.carryForward,
      maxCarryForward: balance.policy?.maxCarryForward,
      applicableRoles: balance.policy?.applicableRoles,
      description: balance.policy?.description,
    })),
  });
}

export function createLeaveTools(requestContext = {}) {
  const authToken = requestContext.authToken || "";

  const getMyLeaveBalances = tool(
    async () => {
      const result = await callWorkNexApi("/leave/balances/me", { authToken });
      return formatLeaveBalancesResult(result);
    },
    {
      name: "get_my_leave_balances",
      description: "Read the current user's leave balances for the current year, including policy, total, used, and remaining days.",
      schema: z.object({}),
    }
  );

  const getMyLeaveHistory = tool(
    async ({ status, leaveType: selectedLeaveType, page = 1, limit = 20 }) => {
      const result = await callWorkNexApi("/leave/my", {
        authToken,
        params: { status, leaveType: selectedLeaveType, page, limit },
      });
      return formatLeaveListResult(result);
    },
    {
      name: "get_my_leave_history",
      description: "Read the current user's leave request history. For general requests like 'show my leave history', 'all my leave history', 'my leaves', or 'leave history', call this tool without status or leaveType filters. Only set filters when the user explicitly asks for a specific status or leave type.",
      schema: z.object({
        status: leaveStatus.describe("Optional leave status filter."),
        leaveType: leaveType.describe("Optional leave type filter."),
        page: z.number().int().min(1).optional().default(1),
        limit: optionalLimit.default(20),
      }),
    }
  );

  const getPendingLeaves = tool(
    async () => {
      const result = await callWorkNexApi("/leave/pending", { authToken });
      return formatLeaveListResult(result);
    },
    {
      name: "get_pending_leaves",
      description: "Read pending leave requests for manager/admin approval. Backend RBAC scopes results to the caller.",
      schema: z.object({}),
    }
  );

  const getLeaveById = tool(
    async ({ leaveId }) => {
      const result = await callWorkNexApi(`/leave/${encodeURIComponent(leaveId)}`, { authToken });
      return formatApiResult(result);
    },
    {
      name: "get_leave_by_id",
      description: "Read details for one leave request by ID. Backend RBAC validates access.",
      schema: z.object({
        leaveId: z.string().min(1).describe("Leave request ID."),
      }),
    }
  );

  const getLeavePolicies = tool(
    async () => {
      const result = await callWorkNexApi("/leave/policies/all", { authToken });
      return formatApiResult(result);
    },
    {
      name: "get_leave_policies",
      description: "Read leave policies for the caller's organization, including quotas and applicable roles.",
      schema: z.object({}),
    }
  );

  return [
    getMyLeaveBalances,
    getMyLeaveHistory,
    getPendingLeaves,
    getLeaveById,
    getLeavePolicies,
  ];
}
