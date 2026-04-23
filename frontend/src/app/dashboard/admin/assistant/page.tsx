"use client";

import React, { useState } from "react";
import Sidebar from "@/src/app/components/sideBar/admin/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Bot, User, Send } from "lucide-react";
import "./page.scss";

type ChatRole = "user" | "assistant";
interface ChatMessage {
  role: ChatRole;
  text: string;
}

const AdminAssistantPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello Admin! Ask me about staff attendance trends, leave spikes, or performance patterns.",
    },
  ]);

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: ChatMessage = { role: "user", text: query.trim() };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    // Simulated response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Company attendance increased by 3% this month. Leave requests peaked during week 2.",
        },
      ]);
    }, 700);
  };

  return (
    <div className="admin-assistant-page">
      <Sidebar />

      <main className="main-content">
        <div className="header">
          <SearchBox />
        </div>

        <div className="page-heading">
          <h1>AI Assistant</h1>
          <p>Ask any BI-related question about workforce performance.</p>
        </div>

        <div className="assistant-container card-box">
          {/* Chat Messages */}
          <div className="messages">
            {messages.map((msg, index) => (
              <div
                className={`message-row ${msg.role}`}
                key={index}
              >
                <div className="avatar">
                  {msg.role === "assistant" ? (
                    <Bot size={22} />
                  ) : (
                    <User size={22} />
                  )}
                </div>

                <div className="bubble">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form className="input-row" onSubmit={handleAsk}>
            <input
              type="text"
              placeholder='Ask: "Show department-wise performance"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <button type="submit">
              <Send size={18} /> Ask
            </button>
          </form>

          <div className="api-hint">
            Powered by <code>/api/admin/ai/query</code>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAssistantPage;
