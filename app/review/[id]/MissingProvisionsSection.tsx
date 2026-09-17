"use client";

import { useState } from "react";
import type { MissingProvision } from "@/lib/ai/missing-provisions";
import type { ChatFocusContext } from "@/lib/ai/chat";

interface MissingProvisionsSectionProps {
  provisions: MissingProvision[];
  onOpenChatWithFocus?: (context: ChatFocusContext) => void;
  userRole?: string;
  versionNumber?: number;
}

const importanceMeta: Record<string, { label: string; badge: string; dot: string }> = {
  critical: {
    label: "Critical Missing Protection",
    badge: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  recommended: {
    label: "Recommended Addition",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  good_to_have: {
    label: "Good Practice Safeguard",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
};

export function MissingProvisionsSection({
  provisions,
  onOpenChatWithFocus,
  userRole,
  versionNumber = 1,
}: MissingProvisionsSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(provisions[0]?.id || null);

  if (!provisions || provisions.length === 0) {
    return null;
  }

  const criticalCount = provisions.filter((p) => p.importance === "critical").length;
  const recommendedCount = provisions.filter((p) => p.importance === "recommended").length;

  async function handleCopyClause(provision: MissingProvision) {
    try {
      await navigator.clipboard.writeText(provision.suggestedClause);
      setCopiedId(provision.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.error("Failed to copy clause text:", e);
    }
  }

  async function handleCopySnippet(provision: MissingProvision) {
    try {
      await navigator.clipboard.writeText(provision.negotiationSnippet);
      setCopiedSnippetId(provision.id);
      setTimeout(() => setCopiedSnippetId(null), 2500);
    } catch (e) {
      console.error("Failed to copy snippet text:", e);
    }
  }

  return (
    <section className="card-surface rounded-2xl p-6 sm:p-8 border-l-4 border-l-indigo-600 shadow-sm transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
              <span>🛡️</span>
              <span>Protective Gap Analysis</span>
            </span>
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {criticalCount} Critical
              </span>
            )}
            {recommendedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {recommendedCount} Recommended
              </span>
            )}
          </div>
          <h2 className="mt-2 text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
            Important Missing Provisions
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Contracts drafted by clients often omit standard protections for {userRole || "service providers"}. 
            PactIQ identified {provisions.length} missing safeguard{provisions.length > 1 ? "s" : ""} you should consider proposing before signing.
          </p>
        </div>

        {onOpenChatWithFocus && (
          <button
            type="button"
            onClick={() =>
              onOpenChatWithFocus({
                type: "deal",
                label: `Missing Contract Protections (Version ${versionNumber})`,
              })
            }
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition cursor-pointer self-start sm:self-auto"
          >
            <span>✨ Ask PactIQ about all omissions</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Cards List */}
      <div className="mt-6 space-y-4">
        {provisions.map((provision) => {
          const isExpanded = expandedId === provision.id;
          const meta = importanceMeta[provision.importance] || importanceMeta.recommended;
          const isCopied = copiedId === provision.id;
          const isSnippetCopied = copiedSnippetId === provision.id;

          return (
            <div
              key={provision.id}
              className={`rounded-xl border transition overflow-hidden ${
                isExpanded
                  ? "border-indigo-200 bg-white shadow-xs"
                  : "border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300"
              }`}
            >
              {/* Collapsed/Expanded Header Summary */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : provision.id)}
                className="flex items-start justify-between gap-3 p-4 sm:p-5 cursor-pointer select-none"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg border border-slate-200/80">
                    {provision.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {provision.title}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {provision.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {provision.whatIsMissing}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <span className="text-xs font-semibold text-slate-400">
                    {isExpanded ? "Hide Details" : "View & Copy"}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Body */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-5 pt-3 sm:px-5 space-y-4 bg-slate-50/40">
                  {/* Why it matters */}
                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <span>⚠️</span>
                      <span>Why This Matters to You</span>
                    </div>
                    <p className="mt-1 text-xs text-amber-900/90 leading-relaxed font-normal">
                      {provision.whyItMatters}
                    </p>
                  </div>

                  {/* Proposed Clause Box */}
                  <div>
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span>📝</span>
                        <span>Proposed Contract Clause to Add</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyClause(provision);
                        }}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          isCopied
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <span>✓</span>
                            <span>Copied Clause!</span>
                          </>
                        ) : (
                          <>
                            <span>📋</span>
                            <span>Copy Proposed Clause</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-800 font-mono leading-relaxed select-all">
                      {provision.suggestedClause}
                    </div>
                  </div>

                  {/* Negotiation Snippet & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-bold text-slate-700">Quick Note:</span>
                      <span className="italic text-slate-500 truncate max-w-md">
                        &ldquo;{provision.negotiationSnippet}&rdquo;
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySnippet(provision);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        title="Copy email snippet for this point"
                      >
                        {isSnippetCopied ? "✓ Note Copied" : "Copy Email Note"}
                      </button>

                      {onOpenChatWithFocus && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenChatWithFocus({
                              type: "deal",
                              label: `Missing Provision: ${provision.title}`,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
                        >
                          <span>✨ Ask PactIQ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
