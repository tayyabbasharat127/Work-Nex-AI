import { createLeaveTools } from "../tools/leave-tools.js";
import { routeLeaveRequest } from "../routing/leave-router.js";

function parseToolJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return { success: false, error: "Tool returned invalid JSON", raw };
  }
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

function normalizeError(payload, fallback) {
  return payload?.error || payload?.message || fallback;
}

function formatBalances(payload) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve leave balances.");
  if (!payload.count) return "No leave balances were found for your account.";

  const rows = payload.balances
    .map((item) => `| ${item.leaveType || "-"} | ${item.totalDays ?? "-"} | ${item.usedDays ?? "-"} | ${item.remainingDays ?? "-"} | ${item.carryForward ? `Yes, max ${item.maxCarryForward ?? 0}` : "No"} |`)
    .join("\n");

  return [
    "Here are your current leave balances:",
    "",
    "| Leave type | Total | Used | Remaining | Carry forward |",
    "|---|---:|---:|---:|---|",
    rows,
  ].join("\n");
}

function formatLeaveList(payload, emptyMessage = "No leave requests were found.") {
  if (!payload.success) return normalizeError(payload, "I could not retrieve leave requests.");
  if (!payload.count) return emptyMessage;

  const rows = payload.leaves
    .map((leave) => `| ${leave.leaveType || "-"} | ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)} | ${leave.totalDays ?? "-"} | ${leave.status || "-"} | ${leave.approver || "-"} | ${leave.reason || "-"} |`)
    .join("\n");

  return [
    `I found ${payload.count} leave request${payload.count === 1 ? "" : "s"}.`,
    "",
    "| Type | Date range | Days | Status | Approver | Reason |",
    "|---|---|---:|---|---|---|",
    rows,
  ].join("\n");
}

function formatPolicies(payload) {
  if (!payload.success) return normalizeError(payload, "I could not retrieve leave policies.");
  const policies = Array.isArray(payload.data) ? payload.data : [];
  if (!policies.length) return "No leave policies were found.";

  const rows = policies
    .map((policy) => `| ${policy.leaveType || "-"} | ${policy.totalDays ?? "-"} | ${policy.carryForward ? `Yes, max ${policy.maxCarryForward ?? 0}` : "No"} | ${(policy.applicableRoles || []).join(", ") || "-"} |`)
    .join("\n");

  return [
    "Here are the leave policies:",
    "",
    "| Leave type | Annual quota | Carry forward | Applicable roles |",
    "|---|---:|---|---|",
    rows,
  ].join("\n");
}

function formatLeaveDetail(payload) {
  if (!payload.success && !payload.data) {
    return normalizeError(payload, "I could not retrieve that leave request.");
  }

  const leave = payload.data || payload;
  if (!leave?.id) return "I could not find that leave request.";

  const employee = leave.employee
    ? `${leave.employee.firstName || ""} ${leave.employee.lastName || ""}`.trim()
    : "-";
  const approver = leave.approver
    ? `${leave.approver.firstName || ""} ${leave.approver.lastName || ""}`.trim()
    : "-";

  return [
    "Here is the leave request detail:",
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| ID | ${leave.id} |`,
    `| Employee | ${employee || "-"} |`,
    `| Type | ${leave.leaveType || "-"} |`,
    `| Date range | ${formatDate(leave.startDate)} to ${formatDate(leave.endDate)} |`,
    `| Days | ${leave.totalDays ?? "-"} |`,
    `| Status | ${leave.status || "-"} |`,
    `| Approver | ${approver || "-"} |`,
    `| Reason | ${leave.reason || "-"} |`,
  ].join("\n");
}

function findTool(tools, name) {
  return tools.find((item) => item.name === name);
}

async function invokeTool(tools, name, args = {}) {
  const selectedTool = findTool(tools, name);
  if (!selectedTool) {
    return { success: false, error: `Leave tool is not available: ${name}` };
  }
  return parseToolJson(await selectedTool.invoke(args));
}

export async function handleLeaveRequest(request, requestContext = {}) {
  const route = await routeLeaveRequest(request);
  if (route.domain !== "leave") {
    return {
      handled: false,
      route,
      answer: null,
    };
  }

  if (route.intent === "unsupported_action") {
    return {
      handled: true,
      route,
      answer: "The leave agent is currently read-only. I can review balances, history, pending approvals, policies, and request details, but I cannot apply, approve, reject, cancel, upload, or update leave records yet.",
    };
  }

  if (route.intent === "unsupported_leave_query") {
    return {
      handled: false,
      route,
      answer: null,
    };
  }

  const tools = createLeaveTools(requestContext);

  if (route.intent === "leave_balances") {
    const payload = await invokeTool(tools, "get_my_leave_balances");
    return { handled: true, route, answer: formatBalances(payload) };
  }

  if (route.intent === "leave_history") {
    const payload = await invokeTool(tools, "get_my_leave_history", {
      status: route.filters.status,
      leaveType: route.filters.leaveType,
      page: 1,
      limit: 20,
    });
    const filterText = [
      route.filters.status ? `${route.filters.status.toLowerCase()} status` : null,
      route.filters.leaveType ? `${route.filters.leaveType.toLowerCase()} leave type` : null,
    ].filter(Boolean).join(" and ");
    const emptyMessage = filterText
      ? `No leave requests were found for the ${filterText} filter.`
      : "Your leave history is empty.";
    return { handled: true, route, answer: formatLeaveList(payload, emptyMessage) };
  }

  if (route.intent === "pending_leave_approvals") {
    const payload = await invokeTool(tools, "get_pending_leaves");
    return { handled: true, route, answer: formatLeaveList(payload, "No pending leave approvals were found.") };
  }

  if (route.intent === "leave_request_detail") {
    if (!route.filters.leaveId) {
      return {
        handled: true,
        route,
        answer: "Please provide the leave request ID so I can fetch that specific request.",
      };
    }
    const payload = await invokeTool(tools, "get_leave_by_id", { leaveId: route.filters.leaveId });
    return { handled: true, route, answer: formatLeaveDetail(payload) };
  }

  if (route.intent === "leave_policies") {
    const payload = await invokeTool(tools, "get_leave_policies");
    return { handled: true, route, answer: formatPolicies(payload) };
  }

  return {
    handled: false,
    route,
    answer: null,
  };
}
