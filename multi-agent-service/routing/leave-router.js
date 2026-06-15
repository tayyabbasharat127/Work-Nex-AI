import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../config/llm.js";

const leaveStatusValues = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const leaveTypeValues = ["ANNUAL", "SICK", "CASUAL", "MATERNITY", "PATERNITY", "UNPAID", "OTHER"];

export const leaveRouteSchema = z.object({
  domain: z.enum(["leave", "unsupported"]),
  intent: z.enum([
    "leave_balances",
    "leave_history",
    "pending_leave_approvals",
    "leave_request_detail",
    "leave_policies",
    "unsupported_action",
    "unsupported_leave_query",
  ]),
  filters: z.object({
    status: z.enum(leaveStatusValues).optional(),
    leaveType: z.enum(leaveTypeValues).optional(),
    leaveId: z.string().optional(),
  }).default({}),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
});

const defaultRoute = {
  domain: "unsupported",
  intent: "unsupported_leave_query",
  filters: {},
  confidence: 0,
  reason: "No leave intent detected.",
};

function normalizeText(input) {
  return String(input || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function extractStatus(text) {
  if (includesAny(text, ["pending"])) return "PENDING";
  if (includesAny(text, ["approved", "approve ho", "accepted"])) return "APPROVED";
  if (includesAny(text, ["rejected", "reject ho", "declined"])) return "REJECTED";
  if (includesAny(text, ["cancelled", "canceled", "cancel ho"])) return "CANCELLED";
  return undefined;
}

function extractLeaveType(text) {
  if (includesAny(text, ["annual"])) return "ANNUAL";
  if (includesAny(text, ["sick", "medical"])) return "SICK";
  if (includesAny(text, ["casual"])) return "CASUAL";
  if (includesAny(text, ["maternity"])) return "MATERNITY";
  if (includesAny(text, ["paternity"])) return "PATERNITY";
  if (includesAny(text, ["unpaid"])) return "UNPAID";
  if (includesAny(text, ["other"])) return "OTHER";
  return undefined;
}

function extractLeaveId(rawText) {
  const text = String(rawText || "");
  const explicit = text.match(/\b(?:leave|request)\s*(?:id|#)\s*[:#-]?\s*([A-Za-z0-9_-]{8,})\b/i);
  if (explicit) return explicit[1];

  const genericId = text.match(/\b(c[a-z0-9]{20,}|[a-f0-9]{24,}|[a-f0-9-]{32,})\b/i);
  return genericId?.[1];
}

function routeByRules(request) {
  const text = normalizeText(request);
  if (!text) return defaultRoute;

  const isLeaveish = includesAny(text, [
    "leave",
    "leaves",
    "balance",
    "balances",
    "remaining",
    "policy",
    "policies",
    "quota",
    "approval",
    "approvals",
    "holiday request",
  ]);

  if (!isLeaveish) return defaultRoute;

  if (includesAny(text, ["apply", "submit", "create", "approve it", "reject it", "cancel my", "cancel this", "upload", "update"])) {
    return {
      domain: "leave",
      intent: "unsupported_action",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for a mutation, but the leave agent is read-only.",
    };
  }

  if (includesAny(text, ["balance", "balances", "remaining", "left", "kitni", "kitna"])) {
    return {
      domain: "leave",
      intent: "leave_balances",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for leave balances.",
    };
  }

  if (includesAny(text, ["pending approval", "pending approvals", "approval list", "approve requests", "approvals"])) {
    return {
      domain: "leave",
      intent: "pending_leave_approvals",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for pending leave approvals.",
    };
  }

  if (includesAny(text, ["policy", "policies", "quota", "rules", "rule"])) {
    return {
      domain: "leave",
      intent: "leave_policies",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for leave policy or quota information.",
    };
  }

  if (includesAny(text, ["history", "my leaves", "leave history", "leave requests", "all my leave", "show my leave", "leaves dikhao"])) {
    const filters = {};
    const status = extractStatus(text);
    const leaveType = extractLeaveType(text);
    if (status) filters.status = status;
    if (leaveType) filters.leaveType = leaveType;

    return {
      domain: "leave",
      intent: "leave_history",
      filters,
      confidence: 0.95,
      reason: "The user asked for their leave history.",
    };
  }

  const leaveId = extractLeaveId(request);
  if (leaveId && includesAny(text, ["status", "detail", "details", "request", "leave"])) {
    return {
      domain: "leave",
      intent: "leave_request_detail",
      filters: { leaveId },
      confidence: 0.95,
      reason: "The user asked about a specific leave request.",
    };
  }

  return {
    domain: "leave",
    intent: "unsupported_leave_query",
    filters: {},
    confidence: 0.4,
    reason: "The request appears leave-related but does not match the MVP leave tools.",
  };
}

async function routeWithStructuredModel(request) {
  const llm = createChatModel({ temperature: 0 });
  if (typeof llm.withStructuredOutput !== "function") return null;

  const structuredLlm = llm.withStructuredOutput(leaveRouteSchema, {
    name: "worknex_leave_router",
  });

  return structuredLlm.invoke([
    new SystemMessage(`Classify the user's WorkNex leave-management request.

Return only the schema fields.
Supported intents:
- leave_balances: current user's leave balance/remaining days
- leave_history: current user's leave history or own leave requests
- pending_leave_approvals: manager/admin pending approvals
- leave_request_detail: one leave request by ID
- leave_policies: leave policy, rules, quota
- unsupported_action: mutation requests such as apply, approve, reject, cancel, upload, update
- unsupported_leave_query: leave-related but outside available tools

Only include status or leaveType filters when the user explicitly asks for them.
Use domain=unsupported only when the request is not leave-related.`),
    new HumanMessage(String(request || "")),
  ]);
}

export async function routeLeaveRequest(request) {
  const ruleRoute = routeByRules(request);
  if (ruleRoute.confidence >= 0.9 || ruleRoute.domain === "unsupported") {
    return leaveRouteSchema.parse(ruleRoute);
  }

  try {
    const modelRoute = await routeWithStructuredModel(request);
    if (modelRoute) {
      return leaveRouteSchema.parse(modelRoute);
    }
  } catch {
    // Fall through to the deterministic route. Routing should never break chat.
  }

  return leaveRouteSchema.parse(ruleRoute);
}
