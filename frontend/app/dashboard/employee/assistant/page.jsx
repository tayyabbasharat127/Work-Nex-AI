'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import RoleGate from '@/components/RoleGate';
import { aiAPI } from '@/lib/api';
import { Bot, RefreshCw, Send } from 'lucide-react';

export default function EmployeeAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask about leave policy, attendance, dashboard help, Power BI setup, or performance analytics.',
      meta: 'Grounded RAG or deterministic fallback is labeled when returned by the backend.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const response = await aiAPI.chat(text);
      const content = response.answer || response.message || response.response || 'No answer returned.';
      const sources = Array.isArray(response.sources) && response.sources.length ? `Sources: ${response.sources.join(', ')}` : '';
      const mode = response.fallback ? 'Deterministic fallback' : 'AI/RAG service response';
      setMessages((prev) => [...prev, { role: 'assistant', content, meta: [mode, sources].filter(Boolean).join(' | ') }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: error.message || 'Assistant request failed.', meta: 'Backend error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGate allow={['EMPLOYEE']}>
      <div className="flex h-screen bg-background">
        <Sidebar role="employee" />
        <main className="flex-1 overflow-auto md:ml-64">
          <div className="sticky top-0 z-20 border-b border-border bg-card p-6">
            <h1 className="text-3xl font-bold">AI Assistant</h1>
            <p className="text-muted-foreground mt-1">Employee help backed by the real AI chat endpoint.</p>
          </div>

          <div className="p-6">
            <section className="mx-auto max-w-4xl rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 border-b border-border p-4">
                <div className="rounded-lg bg-primary/15 p-2"><Bot size={20} className="text-primary" /></div>
                <div>
                  <p className="font-semibold">WorkNex assistant</p>
                  <p className="text-xs text-muted-foreground">POST /api/v1/ai/chat</p>
                </div>
              </div>

              <div className="h-[58vh] overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-lg p-4 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      {message.meta && <p className="mt-3 border-t border-border/60 pt-2 text-xs opacity-75">{message.meta}</p>}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                      <RefreshCw size={14} className="animate-spin" />
                      Waiting for backend response...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                    className="flex-1 rounded-lg border border-border bg-input px-4 py-3 outline-none focus:border-primary"
                    placeholder="Ask a question..."
                    maxLength={1000}
                  />
                  <button onClick={sendMessage} disabled={loading || !input.trim()} className="rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </RoleGate>
  );
}
