"use client";

import React, { useState } from "react";
import SidebarManager from "@/src/app/components/sideBar/manager/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Bot, User, Send } from "lucide-react";
import "./page.css";

const ManagerAssistantPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: "Hello Manager! Ask me anything about team attendance, leaves, or performance insights.",
    },
  ]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newUserMsg = { role: "user" as const, text: query.trim() };

    setMessages((prev) => [...prev, newUserMsg]);
    setQuery("");

    // FAKE AI RESPONSE — replace with `/api/ai/team-query`
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Team insight: Attendance this week is 87%, and 2 employees have pending leave requests.",
        },
      ]);
    }, 700);
  };

  return (
    <div className="manager-assistant">
      <SidebarManager />

      <main className="main-content">
        {/* Top Search */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Page Heading */}
        <div className="page-heading">
          <h1>Team AI Assistant</h1>
          <p>Ask questions about your team’s performance, attendance, leaves, and more.</p>
        </div>

        {/* Chat Container */}
        <div className="assistant-container">
          {/* Message List */}
          <div className="messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message-row ${msg.role === "user" ? "user" : "assistant"}`}
              >
                <div className="avatar">
                  {msg.role === "assistant" ? <Bot size={20} /> : <User size={20} />}
                </div>

                <div className="bubble">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Input Row */}
          <form className="input-row" onSubmit={handleAsk}>
            <input
              type="text"
              placeholder='Ask something like "Show weekly team attendance"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">
              <Send size={18} />
              Ask
            </button>
          </form>

          <div className="api-hint">
            Powered by <code>/api/ai/team-query</code>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerAssistantPage;
