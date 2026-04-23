"use client";

import React, { useState } from "react";
import SidebarEmployee from "@/src/app/components/sideBar/employee/sidebar";
import { SearchBox } from "@/src/app/components/searchBox/searchBox";
import { Send, Bot, User } from "lucide-react";
import "./page.scss";


type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  text: string;
}


const EmployeeAssistantPage: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello! I'm the WorkNex Assistant. You can ask me anything about your attendance, leave balance, or performance.",
    },
  ]);

  
  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      text: query.trim(),
    };

    // Add user's message
    setMessages((prev: ChatMessage[]) => [...prev, userMessage]);

    setQuery("");

    // Simulated AI reply (replace with backend call)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        role: "assistant",
        text: "Based on your history, your attendance this month is 92% and you have 3 casual leaves remaining.",
      };

      setMessages((prev: ChatMessage[]) => [...prev, aiMessage]);
    }, 650);
  };

  return (
    <div className="assistant-page">
      <SidebarEmployee />

      <main className="main-content">
        {/* Search */}
        <div className="header">
          <SearchBox />
        </div>

        {/* Page Heading */}
        <div className="page-heading">
          <h1>WorkNex Assistant</h1>
          <p>Your personal HR assistant. Ask anything about your work insights.</p>
        </div>

        {/* Chat Card */}
        <div className="assistant-container card-box">
          {/* Chat Messages */}
          <div className="messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message-row ${
                  msg.role === "user" ? "user" : "assistant"
                }`}
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

          {/* Input Box */}
          <form className="input-row" onSubmit={handleAsk}>
            <input
              type="text"
              placeholder='Ask something like "What is my attendance this month?"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <button type="submit">
              <Send size={18} /> Ask
            </button>
          </form>

          <div className="api-hint">
            Powered by <code>/api/ai/query</code>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeAssistantPage;
