'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageCircle, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { multiAgentChat } from '@/services/multiAgentChat';

const THREAD_STORAGE_KEY = 'worknex-agent-thread-id';
const MESSAGES_STORAGE_KEY = 'worknex-agent-messages';
const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Hi, I am your WorkNex agent.',
};

const MARKDOWN_ALLOWED_ELEMENTS = [
  'p',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'br',
  'code',
  'pre',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
];

function ChatMarkdown({ content, isUser }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      allowedElements={MARKDOWN_ALLOWED_ELEMENTS}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ children }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-medium text-foreground">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 max-w-full overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/60 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="worknex-chat-scrollbar my-3 max-w-full overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
        tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
        tr: ({ children }) => <tr>{children}</tr>,
        th: ({ children }) => (
          <th className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">{children}</th>
        ),
        td: ({ children }) => (
          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{children}</td>
        ),
        hr: () => <hr className="my-3 border-border" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function MultiAgentChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(THREAD_STORAGE_KEY) || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    if (typeof window === 'undefined') return [WELCOME_MESSAGE];
    const raw = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [WELCOME_MESSAGE];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [WELCOME_MESSAGE];
    } catch {
      return [WELCOME_MESSAGE];
    }
  });
  const scrollRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (threadId) {
      window.localStorage.setItem(THREAD_STORAGE_KEY, threadId);
    }
  }, [threadId]);

  const sendMessage = async (text) => {
    const clean = text.trim();
    if (!clean || isLoading) return;

    setInput('');
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: clean }]);

    try {
      const result = await multiAgentChat.sendMessage(clean, threadId);
      if (result.threadId && result.threadId !== threadId) setThreadId(result.threadId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer || result.response || 'No response returned.',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error.message || 'Agent request failed.',
          tone: 'error',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (canSend) sendMessage(input);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          aria-label="WorkNex agent chat"
          role="dialog"
          className="flex h-[min(680px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-[420px] animate-in fade-in slide-in-from-bottom-3 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl md:w-[420px]"
        >
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot size={19} />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">WorkNex Agent</p>
                <p className="truncate text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Minimize WorkNex agent"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ChevronDown size={18} />
              </button>
            <button
              type="button"
              aria-label="Close WorkNex agent"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
            </div>
          </header>

          <div ref={scrollRef} className="worknex-chat-scrollbar min-h-0 flex-1 overflow-y-auto bg-background px-4 py-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role !== 'user' && (
                    <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Bot size={14} />
                    </div>
                  )}
                  <article
                    className={`max-w-[78%] rounded-lg px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.tone === 'error'
                          ? 'bg-destructive/10 text-destructive'
                          : 'border border-border bg-card text-foreground'
                    }`}
                  >
                    <ChatMarkdown content={message.content} isUser={message.role === 'user'} />
                  </article>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Bot size={14} />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </span>
                    <span>Thinking</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-card p-3">
            <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-lg border border-input bg-background p-1.5 focus-within:border-primary">
              <label className="sr-only" htmlFor="worknex-agent-input">Message</label>
              <textarea
                id="worknex-agent-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canSend) sendMessage(input);
                  }
                }}
                rows={1}
                placeholder="Message"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!canSend}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-label={isOpen ? 'Close WorkNex agent' : 'Open WorkNex agent'}
        onClick={() => setIsOpen((value) => !value)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-1 ring-primary/30 transition hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
