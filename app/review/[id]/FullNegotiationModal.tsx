"use client";

import { useState, useEffect, useCallback } from "react";

interface FullNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  filename: string;
  userRole?: string;
  contractType?: string;
}

export function FullNegotiationModal({
  isOpen,
  onClose,
  contractId,
  filename,
  userRole,
}: FullNegotiationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [omittedSummary, setOmittedSummary] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const fetchNegotiationMessage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/negotiation-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate negotiation message.");
      }

      const data = await res.json();
      setSubject(data.subject || `Re: ${filename} – Negotiation & Discussion Points`);
      setMessage(data.message || "");
      setKeyPoints(data.keyPointsIncluded || []);
      setOmittedSummary(data.omittedPointsSummary);
      setHasGenerated(true);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [contractId, filename]);

  useEffect(() => {
    if (isOpen && !hasGenerated && !loading) {
      fetchNegotiationMessage();
    }
  }, [isOpen, hasGenerated, loading, fetchNegotiationMessage]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      const fullText = `Subject: ${subject}\n\n${message}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-xs">
              ✉️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">
                  Full Negotiation Message
                </h2>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                  Synthesized Draft
                </span>
              </div>
              <p className="text-xs text-slate-500">
                One complete message consolidated from key contract findings · Ready to edit & send
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 animate-spin">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Synthesizing Negotiation Strategy...
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Consolidating priority findings, grouping related terms, and tailoring tone for {userRole || "your role"}.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button
                type="button"
                onClick={fetchNegotiationMessage}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Context / Key Points summary pills */}
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Negotiation Focus Areas Covered ({keyPoints.length})
                  </span>
                  {omittedSummary && (
                    <span className="text-[10px] text-slate-500 italic">
                      {omittedSummary}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keyPoints.map((point, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-2xs"
                    >
                      <span className="text-blue-600 font-bold">✓</span>
                      {point}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subject Line Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Message Body Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Message Body (Editable)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Feel free to tweak names, numbers, or details before copying
                  </span>
                </div>
                <textarea
                  rows={12}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 font-sans text-xs leading-relaxed text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 resize-y"
                  placeholder="Negotiation message text..."
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={fetchNegotiationMessage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Regenerate Message</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>

            <button
              type="button"
              disabled={loading || !message}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copied ? "✓ Copied to Clipboard!" : "Copy Full Message"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
