import { createPerformanceTools } from "../tools/performance-tools.js";
import { routePerformanceRequest } from "../routing/performance-router.js";

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

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(digits);
}

function monthLabel(month, year) {
  if (!month && !year) return "";
  if (!month) return String(year);
  return `${String(month).padStart(2, "0")}/${year || ""}`;
}

function employeeName(record) {
  const name = record.employee || "-";
  const employeeId = record.employeeId ? ` (${record.employeeId})` : "";
  return `${name}${employeeId}`;
}

function average(records, key) {
  if (!records.length) return 0;
  const total = records.reduce((sum, record) => sum + Number(record[key] || 0), 0);
  return total / records.length;
}

function latestRecord(records) {
  return [...records].sort((a, b) => {
    if (a.year !== b.year) return Number(b.year || 0) - Number(a.year || 0);
    return Number(b.month || 0) - Number(a.month || 0);
  })[0];
}

function formatPerformanceTrend(payload, title = "Performance records") {
  if (!payload.success) return normalizeError(payload, "I could not retrieve performance records.");
  const records = Array.isArray(payload.records) ? payload.records : [];
  if (!records.length) return "No performance records were found.";

  const latest = latestRecord(records);
  const avgOverall = average(records, "overallScore");
  const rows = records
    .map((record) => `| ${monthLabel(record.month, record.year)} | ${formatNumber(record.overallScore)} | ${formatNumber(record.attendanceScore)} | ${formatNumber(record.leaveScore)} | ${record.presentDays ?? "-"} | ${record.absentDays ?? "-"} | ${record.lateDays ?? "-"} | ${formatNumber(record.avgWorkingHours)} |`)
    .join("\n");

  return [
    `${title}: ${records.length} record${records.length === 1 ? "" : "s"}.`,
    `Latest overall score: ${formatNumber(latest.overallScore)} (${monthLabel(latest.month, latest.year)}). Average overall score: ${formatNumber(avgOverall)}.`,
    "",
    "| Period | Overall | Attendance | Leave | Present | Absent | Late | Avg hours |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    rows,
  ].join("\n");
}

function formatTeamPerformance(payload, title = "Team performance") {
  if (!payload.success) return normalizeError(payload, "I could not retrieve team performance.");
  const records = Array.isArray(payload.records) ? payload.records : [];
  if (!records.length) return "No team performance records were found.";

  const avgOverall = average(records, "overallScore");
  const rows = records
    .slice(0, 20)
    .map((record) => `| ${employeeName(record)} | ${monthLabel(record.month, record.year)} | ${formatNumber(record.overallScore)} | ${formatNumber(record.attendanceScore)} | ${formatNumber(record.leaveScore)} | ${record.presentDays ?? "-"} | ${record.absentDays ?? "-"} | ${record.lateDays ?? "-"} |`)
    .join("\n");

  return [
    `${title}: ${records.length} record${records.length === 1 ? "" : "s"}. Average overall score: ${formatNumber(avgOverall)}.`,
    "",
    "| Employee | Period | Overall | Attendance | Leave | Present | Absent | Late |",
    "|---|---|---:|---:|---:|---:|---:|---:|",
    rows,
  ].join("\n");
}

function formatLeaderboard(payload) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve the performance leaderboard.");
  const records = Array.isArray(payload.records) ? payload.records : [];
  if (!records.length) return "No leaderboard records were found.";

  const rows = records
    .slice(0, 20)
    .map((record, index) => `| ${index + 1} | ${employeeName(record)} | ${record.department || "-"} | ${formatNumber(record.overallScore)} | ${formatNumber(record.attendanceScore)} | ${formatNumber(record.leaveScore)} |`)
    .join("\n");

  return [
    `Here is the performance leaderboard for ${monthLabel(records[0]?.month, records[0]?.year)}:`,
    "",
    "| Rank | Employee | Department | Overall | Attendance | Leave |",
    "|---:|---|---|---:|---:|---:|",
    rows,
  ].join("\n");
}

function findTool(tools, name) {
  return tools.find((item) => item.name === name);
}

async function invokeTool(tools, name, args = {}) {
  const selectedTool = findTool(tools, name);
  if (!selectedTool) {
    return { success: false, error: `Performance tool is not available: ${name}` };
  }
  return parseToolJson(await selectedTool.invoke(args));
}

export async function handlePerformanceRequest(request, requestContext = {}) {
  const route = await routePerformanceRequest(request);
  if (route.domain !== "performance") {
    return { handled: false, route, answer: null };
  }

  if (route.intent === "unsupported_action") {
    return {
      handled: true,
      route,
      answer: "The performance agent is currently read-only. I can review performance records, team performance, and leaderboards, but I cannot edit scores, run ETL, or generate new records yet.",
    };
  }

  if (route.intent === "unsupported_performance_query") {
    return { handled: false, route, answer: null };
  }

  const tools = createPerformanceTools(requestContext);

  if (route.intent === "my_performance") {
    const payload = await invokeTool(tools, "get_my_performance", {
      year: route.filters.year,
    });
    return {
      handled: true,
      route,
      answer: formatPerformanceTrend(payload, "Your performance"),
    };
  }

  if (route.intent === "user_performance") {
    if (!route.filters.userId) {
      return {
        handled: true,
        route,
        answer: "Please provide the employee user ID so I can fetch that specific performance record.",
      };
    }
    const payload = await invokeTool(tools, "get_user_performance", {
      userId: route.filters.userId,
      year: route.filters.year,
    });
    return {
      handled: true,
      route,
      answer: formatPerformanceTrend(payload, "Employee performance"),
    };
  }

  if (route.intent === "team_performance") {
    const payload = await invokeTool(tools, "get_team_performance", {
      month: route.filters.month,
      year: route.filters.year,
    });
    return {
      handled: true,
      route,
      answer: formatTeamPerformance(payload, `Team performance for ${monthLabel(route.filters.month, route.filters.year)}`),
    };
  }

  if (route.intent === "performance_leaderboard") {
    const payload = await invokeTool(tools, "get_performance_leaderboard", {
      month: route.filters.month,
      year: route.filters.year,
    });
    return {
      handled: true,
      route,
      answer: formatLeaderboard(payload),
    };
  }

  return { handled: false, route, answer: null };
}
