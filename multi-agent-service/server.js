import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HumanMessage } from "@langchain/core/messages";
import { createSupervisorAgent } from "./agents/supervisor.js";
import { getBackendApiUrl, getCorsOrigins, normalizeBearerToken } from "./config/runtime.js";
import { resolveLlmProvider } from "./config/llm.js";
import { buildLangSmithRunConfig, configureLangSmith, getLangSmithStatus } from "./config/langsmith.js";
import { getMemoryStatus, initializeMemory } from "./config/memory.js";

dotenv.config();
const langSmithStatus = configureLangSmith();
await initializeMemory();

const app = express();
const PORT = Number(process.env.PORT || 8010);

app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = getCorsOrigins();
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "worknex-multi-agent-service",
    timestamp: new Date().toISOString(),
    llmProvider: resolveLlmProvider(),
    backendApiUrl: getBackendApiUrl(),
    langsmith: getLangSmithStatus(),
    memory: getMemoryStatus(),
    agents: ["supervisor", "attendance", "leave"],
  });
});

app.get("/api/capabilities", (req, res) => {
  res.json({
    supervisor: {
      description: "Routes WorkNex chat requests to specialized HR agents.",
      implementedAgents: ["attendance_agent", "leave_agent"],
      plannedAgents: ["performance_agent", "policy_agent", "reports_agent"],
    },
    attendance_agent: {
      mode: "read-only",
      dataSource: "WorkNex backend API",
      requiresAuthorizationHeader: true,
      tools: [
        "get_today_attendance",
        "get_my_attendance",
        "get_attendance_summary",
        "get_user_attendance",
        "get_all_attendance",
        "get_attendance_holidays",
      ],
    },
    leave_agent: {
      mode: "read-only",
      dataSource: "WorkNex backend API",
      requiresAuthorizationHeader: true,
      tools: [
        "get_my_leave_balances",
        "get_my_leave_history",
        "get_pending_leaves",
        "get_leave_by_id",
        "get_leave_policies",
      ],
    },
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, threadId, userId, userContext } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "message is required and must be a string",
      });
    }

    const authToken = normalizeBearerToken(req.headers.authorization || req.body.authToken);
    const resolvedThreadId = threadId || `thread_${Date.now()}`;
    const supervisor = createSupervisorAgent({
      authToken,
      userId: userId || userContext?.id || "anonymous",
      userContext: userContext || null,
    });

    const result = await supervisor.invoke(
      { messages: [new HumanMessage(message)] },
      buildLangSmithRunConfig({ threadId: resolvedThreadId, userContext })
    );

    const lastMessage = result.messages[result.messages.length - 1];
    const answer = typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

    res.json({
      success: true,
      answer,
      response: answer,
      threadId: resolvedThreadId,
      agent: "supervisor",
      implementedAgents: ["attendance_agent", "leave_agent"],
      trace: {
        langsmith: getLangSmithStatus(),
      },
    });
  } catch (error) {
    console.error("Multi-agent chat error:", error);
    res.status(500).json({
      success: false,
      message: "Multi-agent service failed to process the request",
      error: error.message,
    });
  }
});

app.get("/api/threads/:threadId", async (req, res) => {
  try {
    const { threadId } = req.params;
    const supervisor = createSupervisorAgent({
      authToken: "",
      userId: "history_reader",
      userContext: null,
    });

    const state = await supervisor.getState({
      configurable: {
        thread_id: threadId,
      },
    });

    const messages = Array.isArray(state?.values?.messages)
      ? state.values.messages
      : [];

    res.json({
      success: true,
      threadId,
      messages: messages
        .filter((message) => {
          const role = message._getType?.() || message.getType?.() || message.role;
          const content = typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content);
          return ["human", "ai"].includes(role) && content.trim().length > 0;
        })
        .map((message) => ({
          role: message._getType?.() || message.getType?.() || message.role || "unknown",
          content: typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content),
        })),
      memory: getMemoryStatus(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to read thread history",
      error: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  if (err.message?.startsWith("CORS blocked origin")) {
    return res.status(403).json({ success: false, message: err.message });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log(`WorkNex multi-agent service running on http://localhost:${PORT}`);
  console.log(`Backend API: ${getBackendApiUrl()}`);
  console.log(`LLM provider: ${resolveLlmProvider()}`);
  console.log(`LangSmith tracing: ${langSmithStatus.tracingEnabled ? "enabled" : "disabled"} (${langSmithStatus.project})`);
  console.log(`Memory: ${getMemoryStatus().checkpointer} (${getMemoryStatus().persistence})`);
});
