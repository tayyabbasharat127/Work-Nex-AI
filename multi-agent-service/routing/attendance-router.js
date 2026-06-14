import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../config/llm.js";

const attendanceStatusValues = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE", "HOLIDAY"];
const monthNames = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

export const attendanceRouteSchema = z.object({
  domain: z.enum(["attendance", "unsupported"]),
  intent: z.enum([
    "today_attendance",
    "my_attendance_history",
    "attendance_count",
    "attendance_holidays",
    "attendance_summary",
    "attendance_rows",
    "unsupported_action",
    "unsupported_attendance_query",
  ]),
  filters: z.object({
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    date: z.string().optional(),
    status: z.enum(attendanceStatusValues).optional(),
    userId: z.string().optional(),
    departmentId: z.string().optional(),
  }).default({}),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
});

const defaultRoute = {
  domain: "unsupported",
  intent: "unsupported_attendance_query",
  filters: {},
  confidence: 0,
  reason: "No attendance intent detected.",
};

function normalizeText(input) {
  return String(input || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function currentYear() {
  return new Date().getFullYear();
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function extractYear(text) {
  const match = text.match(/\b(20\d{2}|21\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function extractMonth(text) {
  for (const [name, month] of Object.entries(monthNames)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) return month;
  }
  const numeric = text.match(/\b(?:month\s*)?([1-9]|1[0-2])(?:\/|-)(20\d{2}|21\d{2})\b/);
  return numeric ? Number(numeric[1]) : undefined;
}

function extractDate(text) {
  const iso = text.match(/\b(20\d{2}|21\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/);
  return iso?.[0];
}

function extractStatus(text) {
  if (includesAny(text, ["late", "late count", "late times"])) return "LATE";
  if (includesAny(text, ["absent", "absence", "absences"])) return "ABSENT";
  if (includesAny(text, ["half day", "half-day"])) return "HALF_DAY";
  if (includesAny(text, ["on leave"])) return "ON_LEAVE";
  if (includesAny(text, ["holiday"])) return "HOLIDAY";
  if (includesAny(text, ["present"])) return "PRESENT";
  return undefined;
}

function buildTimeFilters(text) {
  const month = extractMonth(text) || (includesAny(text, ["this month", "monthly"]) ? currentMonth() : undefined);
  const year = extractYear(text) || (month ? currentYear() : undefined);
  const date = extractDate(text);
  return { month, year, date };
}

function routeByRules(request) {
  const text = normalizeText(request);
  if (!text) return defaultRoute;

  const isAttendanceish = includesAny(text, [
    "attendance",
    "attendence",
    "check-in",
    "check in",
    "check me in",
    "check-out",
    "check out",
    "check me out",
    "working hours",
    "late",
    "absent",
    "present",
    "half day",
    "half-day",
    "holiday",
    "holidays",
  ]);

  if (!isAttendanceish) return defaultRoute;

  if (includesAny(text, ["check me in", "check me out", "mark me", "mark attendance", "edit attendance", "update attendance", "sync tms", "generate absence", "create holiday", "add holiday"])) {
    return {
      domain: "attendance",
      intent: "unsupported_action",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for an attendance mutation, but the attendance agent is read-only.",
    };
  }

  if (includesAny(text, ["holiday", "holidays"])) {
    return {
      domain: "attendance",
      intent: "attendance_holidays",
      filters: { year: extractYear(text) || currentYear() },
      confidence: 0.95,
      reason: "The user asked for attendance holidays.",
    };
  }

  if (includesAny(text, ["today", "check-in status", "check in status", "checked in", "checked out", "check-out status", "check out status"])) {
    return {
      domain: "attendance",
      intent: "today_attendance",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for today's attendance.",
    };
  }

  const filters = buildTimeFilters(text);
  const status = extractStatus(text);
  if (status) filters.status = status;

  if (includesAny(text, ["how many", "count", "times", "kitni", "kitna"]) && status) {
    return {
      domain: "attendance",
      intent: "attendance_count",
      filters: {
        month: filters.month || currentMonth(),
        year: filters.year || currentYear(),
        status,
      },
      confidence: 0.95,
      reason: "The user asked for an attendance status count.",
    };
  }

  if (includesAny(text, ["summary", "summarize", "overview", "rate"])) {
    return {
      domain: "attendance",
      intent: "attendance_summary",
      filters: {
        month: filters.month || currentMonth(),
        year: filters.year || currentYear(),
      },
      confidence: 0.9,
      reason: "The user asked for an attendance summary.",
    };
  }

  if (includesAny(text, ["team", "all employees", "everyone", "department"]) || filters.date) {
    return {
      domain: "attendance",
      intent: "attendance_rows",
      filters: {
        date: filters.date,
        status,
      },
      confidence: 0.9,
      reason: "The user asked for scoped attendance rows.",
    };
  }

  if (includesAny(text, ["history", "monthly", "month", "show my attendance", "attendance for", "my attendance"])) {
    return {
      domain: "attendance",
      intent: "my_attendance_history",
      filters: {
        month: filters.month || currentMonth(),
        year: filters.year || currentYear(),
        status,
      },
      confidence: 0.95,
      reason: "The user asked for their attendance history.",
    };
  }

  return {
    domain: "attendance",
    intent: "unsupported_attendance_query",
    filters: {},
    confidence: 0.4,
    reason: "The request appears attendance-related but does not match the MVP attendance tools.",
  };
}

async function routeWithStructuredModel(request) {
  const llm = createChatModel({ temperature: 0 });
  if (typeof llm.withStructuredOutput !== "function") return null;

  const structuredLlm = llm.withStructuredOutput(attendanceRouteSchema, {
    name: "worknex_attendance_router",
  });

  return structuredLlm.invoke([
    new SystemMessage(`Classify the user's WorkNex attendance request.

Return only the schema fields.
Supported intents:
- today_attendance: today's attendance, check-in/check-out status
- my_attendance_history: current user's attendance history for a month/year
- attendance_count: count a specific status such as late/absent/present for a period
- attendance_holidays: holidays affecting attendance
- attendance_summary: manager/admin summary counts
- attendance_rows: manager/admin scoped rows by date/status
- unsupported_action: mutation requests such as check in, check out, edit, sync, create holiday
- unsupported_attendance_query: attendance-related but outside available tools

Only include filters explicitly stated by the user. Use current month/year only when the user says "this month" or asks a monthly count without a month.`),
    new HumanMessage(String(request || "")),
  ]);
}

export async function routeAttendanceRequest(request) {
  const ruleRoute = routeByRules(request);
  if (ruleRoute.confidence >= 0.9 || ruleRoute.domain === "unsupported") {
    return attendanceRouteSchema.parse(ruleRoute);
  }

  try {
    const modelRoute = await routeWithStructuredModel(request);
    if (modelRoute) return attendanceRouteSchema.parse(modelRoute);
  } catch {
    // Fall back to rules. Routing should never break chat.
  }

  return attendanceRouteSchema.parse(ruleRoute);
}
