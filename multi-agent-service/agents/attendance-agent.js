import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "../config/llm.js";
import { createAttendanceTools } from "../tools/attendance-tools.js";

export function createAttendanceAgent(requestContext = {}) {
  const llm = createChatModel({ temperature: 0.1 });
  const attendanceTools = createAttendanceTools(requestContext);
  const modelWithTools = llm.bindTools(attendanceTools);

  const ATTENDANCE_SYSTEM_PROMPT = `You are the WorkNex Attendance Agent.

Your scope is strictly attendance-related help for the WorkNex HR platform.

You can answer questions about:
- Today's attendance record
- Check-in and check-out status
- Monthly attendance history
- Present, late, absent, and half-day records
- Working hours
- Manager/admin attendance summaries
- Department or employee attendance when backend permissions allow it
- Holidays that explain attendance behavior

Critical rules:
1. Use the available tools whenever the user asks for real attendance data.
2. Never invent attendance numbers, dates, statuses, user names, or working hours.
3. Do not perform mutations. You cannot check users in, check users out, edit records, create holidays, sync TMS, or generate absences.
4. If a tool returns an authorization error, explain that the backend denied access and suggest using an account with the required role.
5. Keep tenant and role boundaries intact. The WorkNex backend is the source of truth for authorization.
6. When the user asks for a summary, provide concise insight plus the raw key numbers if available.
7. If the user asks something outside attendance, say that it should be routed to another WorkNex agent.

Response style:
- Be clear and operational.
- Use markdown tables only when showing multiple records.
- Mention when data is missing or filtered.
- Do not expose internal tool JSON unless the user asks for technical details.`;

  const callModel = async (state) => {
    const response = await modelWithTools.invoke([
      new SystemMessage(ATTENDANCE_SYSTEM_PROMPT),
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
      const selectedTool = attendanceTools.find((item) => item.name === toolCall.name);
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
