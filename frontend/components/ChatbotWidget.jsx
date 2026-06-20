'use client';

import { useState, useEffect, useRef } from 'react';
import { aiAPI } from '@/lib/api';
import {
  Bot, Send, X, Minimize2, Maximize2,
  Sparkles, User, RefreshCw, ChevronDown, Zap
} from 'lucide-react';

const QUICK_PROMPTS = [
  'How many leaves do I have?',
  'What is my attendance today?',
  'Show my performance score',
  'What is the leave policy?',
  'Am I checked in today?',
];

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm your WorkNex AI assistant 👋\n\nAsk me anything about your leaves, attendance, performance, or HR policies — I'll fetch your real data instantly.",
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function ChatbotWidget() {
  const [open, setOpen]         = useState(false);
  const [minimized, setMin]     = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [aiMode, setAiMode]     = useState(null);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  // Fetch AI mode on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000'}/chat/status`)
      .then(r => r.json())
      .then(d => setAiMode(d.llmProvider || d.mode))
      .catch(() => setAiMode('statistical'));
  }, []);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, minimized]);

  // Focus input when opened
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, minimized]);

  const openChat = () => {
    setOpen(true);
    setMin(false);
    setUnread(0);
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = {
      role: 'user',
      content: msg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiAPI.chat(msg);
      const answer = res?.answer || res?.message || 'Sorry, I could not get a response.';
      const botMsg = {
        role: 'assistant',
        content: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: res?.confidence,
        fallback: res?.fallback,
      };
      setMessages(prev => [...prev, botMsg]);
      // If widget is closed/minimized increment unread
      if (!open || minimized) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Make sure the backend is running.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([WELCOME]);

  const providerLabel = aiMode === 'groq'
    ? { text: 'Groq · Llama 3.3', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' }
    : aiMode === 'gemini'
    ? { text: 'Gemini 1.5 Flash', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' }
    : aiMode === 'openai'
    ? { text: 'GPT-4o mini', color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' }
    : { text: 'Statistical', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' };

  return (
    <>
      {/* ── Floating Button ── */}
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-2xl shadow-primary/40 transition-all duration-200 hover:scale-110 hover:shadow-primary/60 active:scale-95"
          aria-label="Open AI assistant"
        >
          <Sparkles size={24} className="text-primary-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        </button>
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300 ${
            minimized ? 'h-14 w-72' : 'h-[560px] w-[380px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 48px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl border-b border-border bg-card px-4 py-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Sparkles size={17} className="text-primary" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">WorkNex AI</p>
              {aiMode && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${providerLabel.bg} ${providerLabel.color}`}>
                  <Zap size={8} />
                  {providerLabel.text}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMin(m => !m)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/15 hover:text-red-400 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body — hidden when minimized */}
          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Bot size={11} className="text-primary" />
                      </div>
                    )}

                    <div className={`max-w-[82%] space-y-1`}>
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          msg.role === 'user'
                            ? 'rounded-br-sm bg-primary text-primary-foreground'
                            : msg.isError
                            ? 'rounded-bl-sm border border-red-500/30 bg-red-500/10 text-red-300'
                            : 'rounded-bl-sm border border-border bg-muted text-foreground'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-muted-foreground px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                        {msg.time}
                        {msg.confidence !== undefined && !msg.fallback && (
                          <span className="ml-1 opacity-60">· {Math.round(msg.confidence * 100)}% conf</span>
                        )}
                      </p>
                    </div>

                    {msg.role === 'user' && (
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <User size={11} className="text-primary" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Bot size={11} className="text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick prompts */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Quick questions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => send(p)}
                        disabled={loading}
                        className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input bar */}
              <div className="border-t border-border px-3 py-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 focus-within:border-primary transition">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="Ask me anything..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
                    maxLength={500}
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
                  >
                    {loading
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <Send size={13} />
                    }
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between px-0.5">
                  <p className="text-[10px] text-muted-foreground">Powered by WorkNex AI</p>
                  <button onClick={clearChat} className="text-[10px] text-muted-foreground hover:text-foreground transition">
                    Clear chat
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
