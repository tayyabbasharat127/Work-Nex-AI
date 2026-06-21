import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../config/llm.js";
import { createLeaveTools } from "../tools/leave-tools.js";

export function createLeaveAgent(requestContext = {}) {
  const llm = createChatModel({ temperature: 0.1 });
  const leaveTools = createLeaveTools(requestContext);
  const modelWithTools = llm.bindTools(leaveTools);

  const LEAVE_SYSTEM_PROMPT = `You are the WorkNex Leave Agent.

Your scope is strictly leave-management help for the WorkNex HR platform.

You can answer questions about:
- Current user's leave balances
- Current user's leave request history
- Leave request details
- Pending leave approvals for managers/admins
- Leave policies and quotas

Critical rules:
1. Use tools whenever the user asks for real leave data.
2. Never invent leave balances, dates, employee names, policy quotas, statuses, or approval decisions.
3. This first version is read-only. You cannot apply, approve, reject, cancel, evaluate, upload, parse, or modify leave records.
4. If the user asks to perform an action or broad admin/team leave listing, explain that the current leave agent can review core leave data only and that a separate confirmed tool is needed next.
5. Preserve backend authorization boundaries. The WorkNex backend is the source of truth for RBAC and tenant scoping.
6. If a backend tool returns an authorization error, explain that access is role-scoped.
7. For balances, clearly show total, used, and remaining days per leave type when available.
8. For leave requests, include type, date range, total days, status, approver, and reason when available.
9. Do not infer filters that the user did not explicitly request. If the user asks for "leave history", "my leaves", or "all my leave history", call get_my_leave_history with no status and no leaveType filter.
10. If a tool result has success=true and count greater than 0, you must summarize those records. Do not say the result is empty.
11. Only use status or leaveType filters when the user explicitly says pending, approved, rejected, cancelled, annual, sick, casual, maternity, paternity, unpaid, or other.

Response style:
- Be concise and operational.
- Use markdown tables for multiple balances or leave requests.
- Mention when results are filtered or empty.
- Do not expose raw JSON unless the user asks for technical details.`;

  const callModel = async (state) => {
    const response = await modelWithTools.invoke([
      new SystemMessage(LEAVE_SYSTEM_PROMPT),
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
      const selectedTool = leaveTools.find((item) => item.name === toolCall.name);
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
