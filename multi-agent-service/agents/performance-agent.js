import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../config/llm.js";
import { createPerformanceTools } from "../tools/performance-tools.js";

export function createPerformanceAgent(requestContext = {}) {
  const llm = createChatModel({ temperature: 0.1 });
  const performanceTools = createPerformanceTools(requestContext);
  const modelWithTools = llm.bindTools(performanceTools);

  const PERFORMANCE_SYSTEM_PROMPT = `You are the WorkNex Performance Agent.

Your scope is strictly performance analytics for the WorkNex HR platform.

You can answer questions about:
- Current user's monthly performance records
- Overall, attendance, and leave scores
- Present, absent, late, and leave-day signals inside performance records
- Manager/admin scoped team performance
- Manager/admin scoped performance leaderboard
- Specific employee performance when the backend allows it

Critical rules:
1. Use tools whenever the user asks for real performance data.
2. Never invent scores, employee names, months, departments, or rankings.
3. This version is read-only. You cannot edit scores, run ETL, generate records, or modify performance data.
4. Preserve backend authorization boundaries. The WorkNex backend is the source of truth for RBAC and tenant scoping.
5. If a backend tool returns an authorization error, explain that access is role-scoped.
6. Prefer concise tables for multiple records.

Response style:
- Be concise and operational.
- Mention when results are empty or filtered.
- Do not expose raw JSON unless the user asks for technical details.`;

  const callModel = async (state) => {
    const response = await modelWithTools.invoke([
      new SystemMessage(PERFORMANCE_SYSTEM_PROMPT),
      ...state.messages,
    ]);
    return { messages: [response] };
  };

  const executeTools = async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (!lastMessage.tool_calls?.length) {
      return { messages: [] };
    }

    const messages = [];
    for (const toolCall of lastMessage.tool_calls) {
      const selectedTool = performanceTools.find((item) => item.name === toolCall.name);
      if (!selectedTool) continue;

      try {
        const content = await selectedTool.invoke(toolCall.args);
        messages.push({
          role: "tool",
          content,
          tool_call_id: toolCall.id,
          name: toolCall.name,
        });
      } catch (error) {
        messages.push({
          role: "tool",
          content: `Tool error: ${error.message}`,
          tool_call_id: toolCall.id,
          name: toolCall.name,
        });
      }
    }
    return { messages };
  };

  const shouldContinue = (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    return lastMessage.tool_calls?.length ? "execute_tools" : END;
  };

  const builder = new StateGraph(MessagesAnnotation)
    .addNode("call_model", callModel)
    .addNode("execute_tools", executeTools)
    .addEdge(START, "call_model")
    .addConditionalEdges("call_model", shouldContinue, {
      execute_tools: "execute_tools",
      [END]: END,
    })
    .addEdge("execute_tools", "call_model");

  return builder.compile();
}
