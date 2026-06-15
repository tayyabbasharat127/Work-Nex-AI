import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../config/llm.js";

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

export const performanceRouteSchema = z.object({
  domain: z.enum(["performance", "unsupported"]),
  intent: z.enum([
    "my_performance",
    "team_performance",
    "performance_leaderboard",
    "user_performance",
    "unsupported_action",
    "unsupported_performance_query",
  ]),
  filters: z.object({
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    userId: z.string().optional(),
  }).default({}),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
});

const defaultRoute = {
  domain: "unsupported",
  intent: "unsupported_performance_query",
  filters: {},
  confidence: 0,
  reason: "No performance intent detected.",
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

function extractUserId(text) {
  const explicit = text.match(/\b(?:user|employee)\s*(?:id|#)\s*[:#-]?\s*([A-Za-z0-9_-]{8,})\b/i);
  return explicit?.[1];
}

function buildTimeFilters(text, { requireMonth = false } = {}) {
  const month = extractMonth(text) || (includesAny(text, ["this month", "current month"]) ? currentMonth() : undefined);
  const year = extractYear(text) || (month || requireMonth ? currentYear() : undefined);
  return { month: month || (requireMonth ? currentMonth() : undefined), year };
}

function routeByRules(request) {
  const text = normalizeText(request);
  if (!text) return defaultRoute;

  const isPerformanceish = includesAny(text, [
    "performance",
    "score",
    "scores",
    "leaderboard",
    "top performer",
    "top performers",
    "team ranking",
    "ranking",
    "punctuality score",
    "attendance score",
    "overall score",
  ]);

  if (!isPerformanceish) return defaultRoute;

  if (includesAny(text, [
    "update score",
    "edit score",
    "change score",
    "create score",
    "run etl",
    "run performance etl",
    "generate performance",
    "generate score",
    "recalculate performance",
  ])) {
    return {
      domain: "performance",
      intent: "unsupported_action",
      filters: {},
      confidence: 0.95,
      reason: "The user asked for a performance mutation or ETL action, but the performance agent is read-only.",
    };
  }

  const userId = extractUserId(request);
  if (userId) {
    return {
      domain: "performance",
      intent: "user_performance",
      filters: {
        userId,
        year: extractYear(text) || currentYear(),
      },
      confidence: 0.95,
      reason: "The user asked for one employee's performance by ID.",
    };
  }

  if (includesAny(text, ["leaderboard", "top performer", "top performers", "ranking", "rankings"])) {
    return {
      domain: "performance",
      intent: "performance_leaderboard",
      filters: buildTimeFilters(text, { requireMonth: true }),
      confidence: 0.95,
      reason: "The user asked for a performance leaderboard.",
    };
  }

  if (includesAny(text, ["team", "all employees", "everyone", "organization", "department"])) {
    return {
      domain: "performance",
      intent: "team_performance",
      filters: buildTimeFilters(text, { requireMonth: true }),
      confidence: 0.95,
      reason: "The user asked for team or organization performance.",
    };
  }

  if (includesAny(text, ["my", "mine", "me", "meri", "mera"]) || includesAny(text, ["performance", "score"])) {
    return {
      domain: "performance",
      intent: "my_performance",
      filters: {
        year: extractYear(text) || currentYear(),
      },
      confidence: 0.95,
      reason: "The user asked for their own performance.",
    };
  }

  return {
    domain: "performance",
    intent: "unsupported_performance_query",
    filters: {},
    confidence: 0.4,
    reason: "The request appears performance-related but does not match the MVP performance tools.",
  };
}

async function routeWithStructuredModel(request) {
  const llm = createChatModel({ temperature: 0 });
  if (typeof llm.withStructuredOutput !== "function") return null;

  const structuredLlm = llm.withStructuredOutput(performanceRouteSchema, {
    name: "worknex_performance_router",
  });

  return structuredLlm.invoke([
    new SystemMessage(`Classify the user's WorkNex performance request.

Return only the schema fields.
Supported intents:
- my_performance: current user's own performance records
- team_performance: manager/admin scoped team or organization performance
- performance_leaderboard: top performers or rankings for a month
- user_performance: one employee's performance when a userId is provided
- unsupported_action: mutation/ETL requests
- unsupported_performance_query: performance-related but outside available tools

Use current year when year is not stated. Use current month/year for team or leaderboard requests when month is not stated.`),
    new HumanMessage(String(request || "")),
  ]);
}

export async function routePerformanceRequest(request) {
  const ruleRoute = routeByRules(request);
  if (ruleRoute.confidence >= 0.9 || ruleRoute.domain === "unsupported") {
    return performanceRouteSchema.parse(ruleRoute);
  }

  try {
    const modelRoute = await routeWithStructuredModel(request);
    if (modelRoute) return performanceRouteSchema.parse(modelRoute);
  } catch {
    // Fall back to deterministic rules. Routing should not break chat.
  }

  return performanceRouteSchema.parse(ruleRoute);
}
