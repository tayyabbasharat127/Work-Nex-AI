'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { aiAPI } from '@/lib/api';
import { Brain, Send, RefreshCw, Trash2, Sparkles, User } from 'lucide-react';

const QUICK_PROMPTS = [
  'What is the current attendance rate?',
  'Show me leave forecast for next month',
  'Which employees are at high attrition risk?',
  'Summarize team performance this month',
  'What are the attendance anomalies?',
  'How many pending leave requests are there?',
];

export default function AIChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your WorkNex AI HR Assistant 🤖\n\nI can help you with:\n• Leave forecasts and predictions\n• Attendance anomaly detection\n• Employee attrition risk analysis\n• Performance insights\n• HR policy questions\n\nWhat would you like to know?",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: userText, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiAPI.chat(userText);
      const reply = res?.message || res?.response || res?.content || 'I received your message but could not generate a response.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        intent: res?.intent,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure the backend is running and try again.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. How can I help you?",
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="admin" />

      <main className="flex-1 flex flex-col md:ml-64 overflow-hidden">
        {/* Header */}
        <div className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20">
              <Brain size={22} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI HR Assistant</h1>
              <p className="text-xs text-muted-foreground">Powered by WorkNex AI — statistical + rule-based intelligence</p>
            </div>
          </div>
          <button onClick={clearChat} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition text-sm">
            <Trash2 size={14} />
            Clear
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-3 border-b border-border bg-card/50 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button key={i} onClick={() => sendMessage(prompt)}
                className="px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition text-xs whitespace-nowrap">
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles size={14} className="text-purple-400" />
                </div>
              )}

              <div className={`max-w-lg ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : msg.isError
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm'
                    : 'bg-card border border-border rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  {msg.intent && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                      {msg.intent}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <User size={14} className="text-primary" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-purple-400 animate-pulse" />
              </div>
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about attendance, leaves, performance, forecasts..."
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:border-primary text-sm"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are based on your actual workforce data
          </p>
        </div>
      </main>
    </div>
  );
}
