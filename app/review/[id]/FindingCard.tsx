"use client";

import { useState } from "react";

export interface FindingData {
  id: string;
  category: string;
  severity: string;
  title: string;
  whatItSays: string;
  whatItMeans: string;
  whatToConsider: string;
  negotiationOptions: string | null;
  suggestedRewrite: string | null;
  emailSnippet: string | null;
  isCrossClause: boolean;
  relatedClauseIds: string | null;
  clause: {
    id: string;
    section: string | null;
    title: string | null;
    text: string;
    pageNumber: number | null;
    position: number;
  };
}

const severityMeta: Record<
  string,
  { label: string; badge: string; dot: string; border: string; accent: string }
> = {
  high: {
    label: "High Attention",
    badge: "badge-danger",
    dot: "bg-red-600",
    border: "border-red-200",
    accent: "bg-red-50/50",
  },
  worth_reviewing: {
    label: "Worth Reviewing",
    badge: "badge-warning",
    dot: "bg-amber-600",
    border: "border-amber-200",
    accent: "bg-amber-50/50",
  },
  understand: {
    label: "Understand This",
    badge: "badge-info",
    dot: "bg-blue-600",
    border: "border-blue-200",
    accent: "bg-blue-50/50",
  },
  no_issue: {
    label: "Standard Term",
    badge: "badge-success",
    dot: "bg-emerald-600",
    border: "border-emerald-200",
    accent: "bg-emerald-50/50",
  },
};

interface FindingCardProps {
  finding: FindingData;
  index: number;
  onAskDealIQ?: (finding: FindingData) => void;
  onAskClause?: (clause: FindingData["clause"]) => void;
}

export function FindingCard({ finding, index, onAskDealIQ, onAskClause }: FindingCardProps) {
  const [copiedType, setCopiedType] = useState<"rewrite" | "email" | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "negotiate">("analysis");

  const meta = severityMeta[finding.severity] ?? severityMeta.understand;

  let optionsList: Array<{ option: string; rationale: string }> = [];
  if (finding.negotiationOptions) {
    try {
      optionsList = JSON.parse(finding.negotiationOptions);
    } catch {
      optionsList = [];
    }
  }

  const hasNegotiation = optionsList.length > 0 || finding.suggestedRewrite || finding.emailSnippet;

  async function handleCopy(text: string, type: "rewrite" | "email") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error("Could not copy to clipboard:", e);
    }
  }

  return (
    <article
      id={`finding-${finding.id}`}
      className="card-surface rounded-2xl p-6 sm:p-7 transition-all"
    >
      {/* Finding Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          {finding.isCrossClause && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              ⚡ Cross-Clause Compound Risk
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Finding #{index + 1} · {finding.category.replaceAll("_", " ")}
          </span>

          {onAskDealIQ && (
            <button
              type="button"
              onClick={() => onAskDealIQ(finding)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition"
            >
              <span>✨</span>
              <span>Ask DealIQ</span>
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-950">{finding.title}</h3>

      {/* Tabs */}
      {hasNegotiation && (
        <div className="mt-5 flex gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("analysis")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "analysis"
                ? "border-slate-900 text-slate-950 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            3-Layer Legal Analysis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("negotiate")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === "negotiate"
                ? "border-blue-600 text-blue-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>💬</span>
            <span>Negotiation & Counter-Offers</span>
          </button>
        </div>
      )}

      {/* Tab 1: 3-Layer Breakdown */}
      {activeTab === "analysis" && (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {/* Layer 1: What it says */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                  1
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  What the Contract Says
                </h4>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-700">{finding.whatItSays}</p>
            </div>
          </div>

          {/* Layer 2: What it means */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold">
                  2
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  What This Means For You
                </h4>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-800">{finding.whatItMeans}</p>
            </div>
          </div>

          {/* Layer 3: What to consider */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-blue-900 text-[11px] font-bold">
                  3
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  What You Could Consider
                </h4>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-800">{finding.whatToConsider}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Negotiation Drawer */}
      {activeTab === "negotiate" && (
        <div className="mt-5 space-y-5">
          {/* Tactical Options */}
          {optionsList.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tactical Negotiation Strategies
              </h4>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                {optionsList.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-blue-600">⚡</span>
                        {opt.option}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opt.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Replacement Clause Language */}
          {finding.suggestedRewrite && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Proposed Replacement Clause Language
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopy(finding.suggestedRewrite!, "rewrite")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-xs hover:bg-blue-50 active:scale-95 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedType === "rewrite" ? "✓ Copied to clipboard!" : "Copy replacement text"}</span>
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-white p-3.5 rounded-lg border border-slate-200">
                {finding.suggestedRewrite}
              </pre>
            </div>
          )}

          {/* Ready-to-Send Email Proposal Draft */}
          {finding.emailSnippet && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Ready-to-Paste Negotiation Email Draft
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopy(finding.emailSnippet!, "email")}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedType === "email" ? "✓ Copied draft!" : "Copy email draft"}</span>
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap bg-white p-3.5 rounded-lg border border-slate-200 font-sans">
                {finding.emailSnippet}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Source Citation Collapsible */}
      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>View Source Document Citation</span>
          </span>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            Verified Verbatim
          </span>
        </summary>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-mono font-semibold text-slate-500">
              {finding.clause.section || finding.clause.title || `Clause #${finding.clause.position + 1}`}
              {finding.clause.pageNumber ? ` · Page ${finding.clause.pageNumber}` : ""}
            </p>
            {onAskClause && (
              <button
                type="button"
                onClick={() => onAskClause(finding.clause)}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
              >
                Ask DealIQ about this clause →
              </button>
            )}
          </div>
          <div className="whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-slate-200 text-slate-700 text-xs leading-relaxed">
            {finding.clause.text}
          </div>
        </div>
      </details>
    </article>
  );
}
