const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isEnabled(value) {
  return TRUE_VALUES.has(String(value || "").toLowerCase().trim());
}

export function configureLangSmith() {
  const tracingEnabled = isEnabled(process.env.LANGSMITH_TRACING || process.env.LANGCHAIN_TRACING_V2);

  if (tracingEnabled) {
    process.env.LANGSMITH_TRACING = "true";
    process.env.LANGCHAIN_TRACING_V2 = "true";
  }

  if (process.env.LANGSMITH_API_KEY && !process.env.LANGCHAIN_API_KEY) {
    process.env.LANGCHAIN_API_KEY = process.env.LANGSMITH_API_KEY;
  }

  if (process.env.LANGSMITH_ENDPOINT && !process.env.LANGCHAIN_ENDPOINT) {
    process.env.LANGCHAIN_ENDPOINT = process.env.LANGSMITH_ENDPOINT;
  }

  if (process.env.LANGSMITH_PROJECT && !process.env.LANGCHAIN_PROJECT) {
    process.env.LANGCHAIN_PROJECT = process.env.LANGSMITH_PROJECT;
  }

  return getLangSmithStatus();
}

export function getLangSmithStatus() {
  const tracingEnabled = isEnabled(process.env.LANGSMITH_TRACING || process.env.LANGCHAIN_TRACING_V2);

  return {
    tracingEnabled,
    project: process.env.LANGSMITH_PROJECT || process.env.LANGCHAIN_PROJECT || "default",
    endpoint: process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
    apiKeyConfigured: Boolean(process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY),
  };
}

export function buildLangSmithRunConfig({ threadId, userContext } = {}) {
  const role = userContext?.role || "UNKNOWN";
  const organizationId = userContext?.organizationId || "unknown";

  return {
    runName: "worknex_multi_agent_chat",
    tags: ["worknex", "multi-agent", "supervisor", "attendance", "leave"],
    metadata: {
      threadId,
      userRole: role,
      organizationId,
      service: "worknex-multi-agent-service",
    },
    configurable: {
      thread_id: threadId,
    },
  };
}
