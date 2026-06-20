import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { callWorkNexApi, formatApiResult } from "./backend-client.js";

const optionalMonth = z.number().int().min(1).max(12).optional();
const optionalYear = z.number().int().min(2000).max(2100).optional();

function formatPerformanceListResult(result) {
  if (!result?.ok) return formatApiResult(result);
  const rows = Array.isArray(result.data) ? result.data : [];
  return JSON.stringify({
    success: true,
    message: result.message,
    count: rows.length,
    meta: result.meta,
    records: rows.map((record) => ({
      id: record.id,
      userId: record.userId,
      employee: record.user
        ? `${record.user.firstName || ""} ${record.user.lastName || ""}`.trim()
        : undefined,
      employeeId: record.user?.employeeId,
      department: record.user?.department?.name,
      month: record.month,
      year: record.year,
      presentDays: record.presentDays,
      absentDays: record.absentDays,
      lateDays: record.lateDays,
      leaveDays: record.leaveDays,
      avgWorkingHours: record.avgWorkingHours,
      attendanceScore: record.attendanceScore,
      leaveScore: record.leaveScore,
      overallScore: record.overallScore,
    })),
  });
}

export function createPerformanceTools(requestContext = {}) {
  const authToken = requestContext.authToken || "";

  const getMyPerformance = tool(
    async ({ year }) => {
      const result = await callWorkNexApi("/performance/me", {
        authToken,
        params: { year },
      });
      return formatPerformanceListResult(result);
    },
    {
      name: "get_my_performance",
      description: "Read the current user's monthly performance records for a year.",
      schema: z.object({
        year: optionalYear.describe("Four digit year. Omit when the user did not specify a year."),
      }),
    }
  );

  const getUserPerformance = tool(
    async ({ userId, year }) => {
      const result = await callWorkNexApi(`/performance/user/${encodeURIComponent(userId)}`, {
        authToken,
        params: { year },
      });
      return formatPerformanceListResult(result);
    },
    {
      name: "get_user_performance",
      description: "Read performance records for a specific employee. Backend RBAC validates access.",
      schema: z.object({
        userId: z.string().min(1).describe("WorkNex user ID for the employee."),
        year: optionalYear.describe("Four digit year. Omit when the user did not specify a year."),
      }),
    }
  );

  const getTeamPerformance = tool(
    async ({ month, year }) => {
      const result = await callWorkNexApi("/performance/team", {
        authToken,
        params: { month, year },
      });
      return formatPerformanceListResult(result);
    },
    {
      name: "get_team_performance",
      description: "Read manager/admin scoped team or organization performance records for one month.",
      schema: z.object({
        month: optionalMonth.describe("Month number from 1 to 12. Omit when the user did not specify a month."),
        year: optionalYear.describe("Four digit year. Omit when the user did not specify a year."),
      }),
    }
  );

  const getPerformanceLeaderboard = tool(
    async ({ month, year }) => {
      const result = await callWorkNexApi("/performance/leaderboard", {
        authToken,
        params: { month, year },
      });
      return formatPerformanceListResult(result);
    },
    {
      name: "get_performance_leaderboard",
      description: "Read manager/admin scoped performance leaderboard for one month.",
      schema: z.object({
        month: optionalMonth.describe("Month number from 1 to 12. Omit when the user did not specify a month."),
        year: optionalYear.describe("Four digit year. Omit when the user did not specify a year."),
      }),
    }
  );

  return [
    getMyPerformance,
    getUserPerformance,
    getTeamPerformance,
    getPerformanceLeaderboard,
  ];
}
