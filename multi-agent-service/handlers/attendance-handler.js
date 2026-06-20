import { createAttendanceTools } from "../tools/attendance-tools.js";
import { routeAttendanceRequest } from "../routing/attendance-router.js";

function parseToolJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return { success: false, error: "Tool returned invalid JSON", raw };
  }
}

function normalizeError(payload, fallback) {
  return payload?.error || payload?.message || fallback;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatHours(value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  if (number === 0) return "0";
  return number.toFixed(2);
}

function getRows(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function rowEmployee(row) {
  if (!row?.user) return "-";
  const name = `${row.user.firstName || ""} ${row.user.lastName || ""}`.trim();
  const employeeId = row.user.employeeId ? ` (${row.user.employeeId})` : "";
  return `${name || row.user.email || "-"}${employeeId}`;
}

function formatToday(payload) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve today's attendance.");
  const row = payload.data;
  if (!row) return "No attendance record was found for today.";

  return [
    "Here is your attendance for today:",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Date | ${formatDate(row.date)} |`,
    `| Status | ${row.status || "-"} |`,
    `| Check-in | ${formatTime(row.checkIn)} |`,
    `| Check-out | ${formatTime(row.checkOut)} |`,
    `| Working hours | ${formatHours(row.workingHours)} |`,
    `| Source | ${row.source || "-"} |`,
  ].join("\n");
}

function formatAttendanceRows(payload, emptyMessage = "No attendance records were found.", options = {}) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve attendance records.");
  const rows = getRows(payload);
  if (!rows.length) return emptyMessage;

  const limitedRows = rows.slice(0, options.maxRows || 20);
  const includeEmployee = Boolean(options.includeEmployee);
  const tableRows = limitedRows
    .map((row) => {
      const cells = [
        formatDate(row.date),
        row.status || "-",
        formatTime(row.checkIn),
        formatTime(row.checkOut),
        formatHours(row.workingHours),
        row.source || "-",
      ];
      if (includeEmployee) cells.unshift(rowEmployee(row));
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");

  const headers = includeEmployee
    ? "| Employee | Date | Status | Check-in | Check-out | Hours | Source |"
    : "| Date | Status | Check-in | Check-out | Hours | Source |";
  const separators = includeEmployee
    ? "|---|---|---|---:|---:|---:|---|"
    : "|---|---|---:|---:|---:|---|";

  const total = payload.meta?.total ?? rows.length;
  const capped = total > limitedRows.length ? ` Showing first ${limitedRows.length}.` : "";

  return [
    `I found ${total} attendance record${total === 1 ? "" : "s"}.${capped}`,
    "",
    headers,
    separators,
    tableRows,
  ].join("\n");
}

function formatStatusCount(payload, status, month, year) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve attendance records.");
  const rows = getRows(payload);
  const count = rows.filter((row) => row.status === status).length;
  const period = month && year ? ` in ${String(month).padStart(2, "0")}/${year}` : "";
  return `You had ${count} ${status.toLowerCase().replace("_", "-")} attendance record${count === 1 ? "" : "s"}${period}.`;
}

function formatHolidays(payload, year) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve attendance holidays.");
  const rows = getRows(payload);
  if (!rows.length) return `No attendance holidays were found${year ? ` for ${year}` : ""}.`;

  const tableRows = rows
    .map((holiday) => `| ${holiday.name || "-"} | ${formatDate(holiday.date)} | ${holiday.isRecurring ? "Yes" : "No"} |`)
    .join("\n");

  return [
    `Here are the attendance holidays${year ? ` for ${year}` : ""}:`,
    "",
    "| Holiday | Date | Recurring |",
    "|---|---|---|",
    tableRows,
  ].join("\n");
}

function formatSummary(payload, month, year) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve attendance summary.");
  const rows = getRows(payload);
  if (!rows.length) return "No attendance summary records were found.";

  const tableRows = rows
    .map((row) => `| ${row.status || "-"} | ${row._count?.status ?? 0} |`)
    .join("\n");
  const total = rows.reduce((sum, row) => sum + Number(row._count?.status || 0), 0);
  const period = month && year ? ` for ${String(month).padStart(2, "0")}/${year}` : "";

  return [
    `Attendance summary${period}: ${total} total record${total === 1 ? "" : "s"}.`,
    "",
    "| Status | Count |",
    "|---|---:|",
    tableRows,
  ].join("\n");
}

function findTool(tools, name) {
  return tools.find((item) => item.name === name);
}

async function invokeTool(tools, name, args = {}) {
  const selectedTool = findTool(tools, name);
  if (!selectedTool) {
    return { success: false, error: `Attendance tool is not available: ${name}` };
  }
  return parseToolJson(await selectedTool.invoke(args));
}

export async function handleAttendanceRequest(request, requestContext = {}) {
  const route = await routeAttendanceRequest(request);
  if (route.domain !== "attendance") {
    return { handled: false, route, answer: null };
  }

  if (route.intent === "unsupported_action") {
    return {
      handled: true,
      route,
      answer: "The attendance agent is currently read-only. I can review today's attendance, monthly history, status counts, holidays, summaries, and scoped attendance rows, but I cannot check in, check out, edit records, sync TMS, generate absences, or create holidays yet.",
    };
  }

  if (route.intent === "unsupported_attendance_query") {
    return { handled: false, route, answer: null };
  }

  const tools = createAttendanceTools(requestContext);

  if (route.intent === "today_attendance") {
    const payload = await invokeTool(tools, "get_today_attendance");
    return { handled: true, route, answer: formatToday(payload) };
  }

  if (route.intent === "my_attendance_history") {
    const payload = await invokeTool(tools, "get_my_attendance", {
      month: route.filters.month,
      year: route.filters.year,
      page: 1,
      limit: 31,
    });
    return { handled: true, route, answer: formatAttendanceRows(payload, "No attendance history was found.") };
  }

  if (route.intent === "attendance_count") {
    const payload = await invokeTool(tools, "get_my_attendance", {
      month: route.filters.month,
      year: route.filters.year,
      page: 1,
      limit: 100,
    });
    return {
      handled: true,
      route,
      answer: formatStatusCount(payload, route.filters.status, route.filters.month, route.filters.year),
    };
  }

  if (route.intent === "attendance_holidays") {
    const payload = await invokeTool(tools, "get_attendance_holidays", {
      year: route.filters.year,
    });
    return { handled: true, route, answer: formatHolidays(payload, route.filters.year) };
  }

  if (route.intent === "attendance_summary") {
    const payload = await invokeTool(tools, "get_attendance_summary", {
      month: route.filters.month,
      year: route.filters.year,
      userId: route.filters.userId,
      departmentId: route.filters.departmentId,
    });
    return { handled: true, route, answer: formatSummary(payload, route.filters.month, route.filters.year) };
  }

  if (route.intent === "attendance_rows") {
    const payload = await invokeTool(tools, "get_all_attendance", {
      date: route.filters.date,
      status: route.filters.status,
      userId: route.filters.userId,
      departmentId: route.filters.departmentId,
      page: 1,
      limit: 50,
    });
    return {
      handled: true,
      route,
      answer: formatAttendanceRows(payload, "No scoped attendance records were found.", { includeEmployee: true }),
    };
  }

  return { handled: false, route, answer: null };
}
