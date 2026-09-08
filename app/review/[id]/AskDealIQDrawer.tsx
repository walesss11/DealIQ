"use client";

import { useEffect, useRef, useState } from "react";
import { ChatFocusContext, ChatResponsePayload } from "@/lib/ai/chat";

export interface DrawerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ sectionOrTitle: string; quoteSnippet: string }>;
  suggestedFollowUps?: string[];
  negotiationAction?: {
    title: string;
    draftEmail: string;
    replacementClause?: string;
  } | null;
  focusLabel?: string;
}

interface AskDealIQDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  filename: string;
  focusContext?: ChatFocusContext;
  onClearFocus?: () => void;
  topConcernSummary?: string;
}

export function AskDealIQDrawer({
  isOpen,
  onClose,
  contractId,
  filename,
  focusContext,
  onClearFocus,
  topConcernSummary,
}: AskDealIQDrawerProps) {
  const [messages, setMessages] = useState<DrawerMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Copy handler
  async function handleCopy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }

  // Send message
  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setError("");
    const userMsg: DrawerMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      focusLabel: focusContext?.label,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          focusContext,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || "Failed to get response from DealIQ.");
      }

      const payload = (await response.json()) as ChatResponsePayload;
      const assistantMsg: DrawerMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: payload.answer,
        sources: payload.sources,
        suggestedFollowUps: payload.suggestedFollowUps,
        negotiationAction: payload.negotiationAction,
      };

      setMessages([...newMessages, assistantMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Default suggested starter questions based on focus
  const starterQuestions =
    focusContext?.type === "finding"
      ? [
          "Why is this issue a problem for me?",
          "What should I negotiate to fix this?",
          "Explain this finding in simple terms",
          "Draft a polite pushback email for this term",
        ]
      : focusContext?.type === "clause"
      ? [
          "Explain what this clause means in plain English",
          "Is this clause standard or unusually one-sided?",
          "What potential risks are hidden here?",
          "How can I reword this clause to protect myself?",
        ]
      : [
          "What are the 3 biggest risks in this contract?",
          "What am I giving the other party vs getting?",
          "What important terms or protections are missing?",
          "Summarize this agreement in 5 key takeaways",
        ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop Click Dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-out Drawer Panel */}
      <div className="relative z-10 flex h-full w-full flex-col bg-slate-50 shadow-2xl sm:w-[500px] lg:w-[540px] border-l border-slate-200 transition-transform duration-300 ease-out">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-xs">
              D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-950">Ask DealIQ</h2>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[260px] sm:max-w-[320px]">
                {filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
              aria-label="Close Ask DealIQ"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Active Context Banner */}
        {focusContext && focusContext.type !== "deal" && (
          <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/80 px-4 py-2 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-blue-700 font-bold">
                {focusContext.type === "finding" ? "Focused Finding:" : "Focused Clause:"}
              </span>
              <span className="font-semibold text-slate-800 truncate">
                {focusContext.label || "Selected Item"}
              </span>
            </div>
            {onClearFocus && (
              <button
                type="button"
                onClick={onClearFocus}
                className="shrink-0 text-[11px] font-semibold text-blue-700 hover:text-blue-900 ml-2 underline"
              >
                Switch to whole deal
              </button>
            )}
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Initial State / Welcome */}
          {messages.length === 0 && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    ✨
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Contract Intelligence Assistant
                  </h3>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  I&apos;ve analyzed <strong className="text-slate-900">{filename}</strong>. You can ask me to explain legal terms, uncover hidden trade-offs, or draft negotiation counter-proposals.
                </p>
                {topConcernSummary && (
                  <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 p-2.5 rounded-lg leading-relaxed">
                    💡 <strong>Key takeaway:</strong> {topConcernSummary}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {focusContext?.type === "finding"
                    ? "Suggested questions about this finding"
                    : focusContext?.type === "clause"
                    ? "Suggested questions about this clause"
                    : "Try asking DealIQ"}
                </p>
                <div className="flex flex-col gap-2">
                  {starterQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="flex items-center justify-between text-left rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-900 transition-all active:scale-[0.99]"
                    >
                      <span>{q}</span>
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              {/* User Bubble */}
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-slate-900 px-4 py-3 text-xs sm:text-sm text-white shadow-xs">
                  {m.focusLabel && (
                    <p className="text-[10px] text-slate-400 font-mono mb-1">
                      Regarding: {m.focusLabel}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ) : (
                /* Assistant Bubble */
                <div className="w-full space-y-3">
                  <div className="rounded-2xl rounded-tl-xs border border-slate-200 bg-white p-4 sm:p-5 text-xs sm:text-sm text-slate-800 shadow-xs space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-[10px] font-bold text-white">
                        D
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                        DealIQ Assistant
                      </span>
                    </div>

                    {/* Markdown / Paragraph content */}
                    <div className="prose prose-slate prose-xs max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap space-y-2">
                      {m.content}
                    </div>

                    {/* Sources Citations */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="border-t border-slate-100 pt-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Source Citations
                        </p>
                        {m.sources.map((src, srcIdx) => (
                          <div
                            key={srcIdx}
                            className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs"
                          >
                            <p className="font-semibold text-slate-900 text-[11px]">
                              {src.sectionOrTitle}
                            </p>
                            {src.quoteSnippet && (
                              <p className="text-[11px] text-slate-600 font-mono italic mt-1">
                                &ldquo;{src.quoteSnippet}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Negotiation Action Card */}
                    {m.negotiationAction && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                            <span>💬</span> {m.negotiationAction.title || "Proposed Negotiation Action"}
                          </span>
                        </div>

                        {/* Email Draft Box */}
                        {m.negotiationAction.draftEmail && (
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase text-slate-500">
                                Polite Pushback Email
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    m.negotiationAction!.draftEmail,
                                    `email-${m.id}`
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                              >
                                {copiedKey === `email-${m.id}` ? "✓ Copied draft!" : "Copy email"}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-xs bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                              {m.negotiationAction.draftEmail}
                            </pre>
                          </div>
                        )}

                        {/* Replacement Clause */}
                        {m.negotiationAction.replacementClause && (
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase text-slate-500">
                                Suggested Alternative Clause
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(
                                    m.negotiationAction!.replacementClause!,
                                    `clause-${m.id}`
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900"
                              >
                                {copiedKey === `clause-${m.id}` ? "✓ Copied wording!" : "Copy wording"}
                              </button>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                              {m.negotiationAction.replacementClause}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggested Follow-Ups */}
                  {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                    <div className="space-y-1.5 pl-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Suggested Next Questions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.suggestedFollowUps.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            disabled={loading}
                            onClick={() => handleSend(q)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-900 transition active:scale-95"
                          >
                            {q} →
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-white p-4 shadow-xs text-xs text-blue-900 font-medium">
              <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>DealIQ is reviewing contract clauses & findings...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-bold">Could not complete request</p>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                focusContext?.type === "finding"
                  ? "Ask about this finding or how to negotiate..."
                  : "Ask about deal balance, risks, specific clauses..."
              }
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Ask DealIQ provides analysis grounded in your contract. It does not provide formal legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}
