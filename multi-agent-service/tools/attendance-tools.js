import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { callWorkNexApi, formatApiResult } from "./backend-client.js";

const optionalMonth = z.number().int().min(1).max(12).optional();
const optionalYear = z.number().int().min(2000).max(2100).optional();
const optionalLimit = z.number().int().min(1).max(100).optional();

export function createAttendanceTools(requestContext = {}) {
  const authToken = requestContext.authToken || "";

  const getTodayAttendance = tool(
    async () => {
      const result = await callWorkNexApi("/attendance/today", { authToken });
      return formatApiResult(result);
    },
    {
      name: "get_today_attendance",
      description: "Read the current user's attendance record for today, including check-in, check-out, status, and working hours.",
      schema: z.object({}),
    }
  );

  const getMyAttendance = tool(
    async ({ month, year, page = 1, limit = 31 }) => {
      const result = await callWorkNexApi("/attendance/my", {
        authToken,
        params: { month, year, page, limit },
      });
      return formatApiResult(result);
    },
    {
      name: "get_my_attendance",
      description: "Read the current user's attendance history for a month/year. Use for self-service attendance questions.",
      schema: z.object({
        month: optionalMonth.describe("Month number from 1 to 12. Omit when the user did not specify a month."),
        year: optionalYear.describe("Four digit year. Omit when the user did not specify a year."),
        page: z.number().int().min(1).optional().default(1),
        limit: optionalLimit.default(31),
      }),
    }
  );

  const getAttendanceSummary = tool(
    async ({ month, year, userId, departmentId }) => {
      const result = await callWorkNexApi("/attendance/summary", {
        authToken,
        params: { month, year, userId, departmentId },
      });
      return formatApiResult(result);
    },
    {
      name: "get_attendance_summary",
      description: "Read attendance summary for a manager/admin scoped view. Backend RBAC decides whether the caller can access the requested scope.",
      schema: z.object({
        month: optionalMonth.describe("Month number from 1 to 12."),
        year: optionalYear.describe("Four digit year."),
        userId: z.string().optional().describe("Optional employee user ID when asking about one employee."),
        departmentId: z.string().optional().describe("Optional department ID when asking about one department."),
      }),
    }
  );

  const getUserAttendance = tool(
    async ({ userId, month, year, page = 1, limit = 31 }) => {
      const result = await callWorkNexApi(`/attendance/user/${encodeURIComponent(userId)}`, {
        authToken,
        params: { month, year, page, limit },
      });
      return formatApiResult(result);
    },
    {
      name: "get_user_attendance",
      description: "Read attendance history for a specific employee. Use only when the user asks about a named/specific employee and provides an ID or the supervisor context includes one.",
      schema: z.object({
        userId: z.string().min(1).describe("WorkNex user ID for the employee."),
        month: optionalMonth.describe("Month number from 1 to 12."),
        year: optionalYear.describe("Four digit year."),
        page: z.number().int().min(1).optional().default(1),
        limit: optionalLimit.default(31),
      }),
    }
  );

  const getAllAttendance = tool(
    async ({ date, status, departmentId, userId, page = 1, limit = 50 }) => {
      const result = await callWorkNexApi("/attendance", {
        authToken,
        params: { date, status, departmentId, userId, page, limit },
      });
      return formatApiResult(result);
    },
    {
      name: "get_all_attendance",
      description: "Read manager/admin scoped attendance rows with optional filters. Backend RBAC and tenant scoping are authoritative.",
      schema: z.object({
        date: z.string().optional().describe("Optional ISO date such as 2026-06-14."),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE", "HOLIDAY"]).optional(),
        departmentId: z.string().optional(),
        userId: z.string().optional(),
        page: z.number().int().min(1).optional().default(1),
        limit: optionalLimit.default(50),
      }),
    }
  );

  const getHolidays = tool(
    async ({ year }) => {
      const result = await callWorkNexApi("/attendance/holidays", {
        authToken,
        params: { year },
      });
      return formatApiResult(result);
    },
    {
      name: "get_attendance_holidays",
      description: "Read organization holidays that can affect attendance and absence explanations.",
      schema: z.object({
        year: optionalYear.describe("Four digit year."),
      }),
    }
  );

  return [
    getTodayAttendance,
    getMyAttendance,
    getAttendanceSummary,
    getUserAttendance,
    getAllAttendance,
    getHolidays,
  ];
}
