"use client";

import Link from "next/link";
import { useState } from "react";
import { FindingCard, type FindingData } from "./FindingCard";
import { AskPactIQDrawer } from "./AskPactIQDrawer";
import { FullNegotiationModal } from "./FullNegotiationModal";
import { RedraftModal } from "./RedraftModal";
import { ChatFocusContext } from "@/lib/ai/chat";

export interface ReviewDashboardProps {
  contractId: string;
  filename: string;
  contractCreatedAt: string;
  contractType: string;
  confirmedContractType?: string;
  userRole?: string;
  findings: FindingData[];
  dealTerms: Array<{
    label: string;
    value: string;
    category: string;
    status: string;
    icon: string;
  }>;
  counts: {
    high: number;
    worth_reviewing: number;
    understand: number;
    no_issue?: number;
  };
  crossClauseCount: number;
}

const severityMeta: Record<string, { label: string; dot: string; badge: string }> = {
  high: { label: "High Attention", dot: "bg-red-600", badge: "badge-danger" },
  worth_reviewing: { label: "Worth Reviewing", dot: "bg-amber-600", badge: "badge-warning" },
  understand: { label: "Understand This", dot: "bg-blue-600", badge: "badge-info" },
  no_issue: { label: "Standard Term", dot: "bg-emerald-600", badge: "badge-success" },
};

export function ReviewDashboardClient({
  contractId,
  filename,
  contractCreatedAt,
  contractType,
  confirmedContractType,
  userRole,
  findings,
  dealTerms,
  counts,
  crossClauseCount,
}: ReviewDashboardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [isRedraftModalOpen, setIsRedraftModalOpen] = useState(false);
  const [focusContext, setFocusContext] = useState<ChatFocusContext | undefined>({
    type: "deal",
    label: "Whole Agreement Overview",
  });
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const highCount = counts.high;
  const worthCount = counts.worth_reviewing;
  const understandCount = counts.understand;

  function openChatWithFocus(context: ChatFocusContext) {
    setFocusContext(context);
    setIsChatOpen(true);
  }

  function handleClearFocus() {
    setFocusContext({
      type: "deal",
      label: "Whole Agreement Overview",
    });
  }

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "cross_clause") return f.isCrossClause;
    return f.severity === selectedFilter;
  });

  const topConcernSummary =
    highCount > 0
      ? `Identified ${highCount} high-attention issue${highCount > 1 ? "s" : ""} requiring modification before signing.`
      : worthCount > 0
      ? `Identified ${worthCount} point${worthCount > 1 ? "s" : ""} worth reviewing to ensure fair commercial balance.`
      : "No critical red flags detected in extracted terms.";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-xs group-hover:bg-blue-900 transition-colors">
              P
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-950">PactIQ</span>
              <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline">
                Contract Review
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            {/* Ask PactIQ Main Header Button */}
            <button
              type="button"
              onClick={() =>
                openChatWithFocus({
                  type: "deal",
                  label: "Whole Agreement Overview",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition"
            >
              <span>✨</span>
              <span>Ask PactIQ</span>
            </button>

            <Link
              href="/deals"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>📁</span>
              <span className="hidden sm:inline">Your Deals</span>
            </Link>

            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Review Another</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Dashboard Content */}
      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        {/* Document Header Info Card */}
        <div className="card-surface rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Source-Grounded Review
                </span>
                {confirmedContractType && (
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                    {confirmedContractType}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Contract Intelligence Report
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <strong className="text-slate-700 font-medium">{filename}</strong>
                </span>
                <span>·</span>
                <span>Analyzed on {new Date(contractCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>

            {/* Risk Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${severityMeta.high.badge}`}>
                <span className="h-2 w-2 rounded-full bg-red-600" />
                {highCount} High Attention
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${severityMeta.worth_reviewing.badge}`}>
                <span className="h-2 w-2 rounded-full bg-amber-600" />
                {worthCount} Worth Reviewing
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${severityMeta.understand.badge}`}>
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                {understandCount} Understand
              </span>
              {crossClauseCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-indigo-700">
                  <span>⚡</span> {crossClauseCount} Cross-Clause
                </span>
              )}
            </div>
          </div>

          {/* Quick Summary Banner with Ask PactIQ CTA */}
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive Takeaway</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {highCount > 0
                  ? `PactIQ identified ${highCount} high-attention issue${highCount > 1 ? "s" : ""} requiring modification before signing, along with ${worthCount} term${worthCount > 1 ? "s" : ""} worth clarifying.`
                  : worthCount > 0
                  ? `The agreement contains standard provisions with ${worthCount} point${worthCount > 1 ? "s" : ""} worth reviewing to ensure fair alignment.`
                  : "No high-risk clauses or aggressive multi-term traps were identified in the extracted text."}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openChatWithFocus({
                  type: "deal",
                  label: "Executive Takeaway",
                })
              }
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-blue-700 active:scale-95 transition"
            >
              <span>✨ Ask PactIQ about this deal</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Section 1: Deal Summary & Contract at a Glance */}
        <section className="mt-8 card-surface rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                Deal Overview
              </span>
              <h2 className="mt-2 text-lg font-bold text-slate-950 flex items-center gap-2">
                <span>⚡</span> Deal Summary & Contract at a Glance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Key commercial parameters and core terms extracted directly from the agreement.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                openChatWithFocus({
                  type: "deal",
                  label: "Core Deal Matrix",
                })
              }
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
            >
              <span>✨ Ask PactIQ about these terms</span>
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dealTerms.map((term) => (
              <div
                key={term.label}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:bg-white hover:border-slate-300 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>{term.icon}</span>
                      <span>{term.label}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {term.status}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-800 font-medium leading-relaxed">
                    {term.value}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      openChatWithFocus({
                        type: "deal",
                        label: `${term.label} Term`,
                      })
                    }
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 opacity-80 group-hover:opacity-100 transition"
                  >
                    Ask PactIQ →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: What You're Getting vs. What You're Giving (Trade-Off Matrix) */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Card: What You Receive */}
          <div className="card-surface rounded-2xl p-6 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <span>🎁</span> What You Receive
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Your Entitlements
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Key value, payments, and protections guaranteed to you in this agreement.
            </p>
            <div className="mt-4 space-y-2.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <strong className="text-slate-900 block">Compensation & Fee Structure</strong>
                <p className="text-slate-600 mt-0.5">
                  {dealTerms.find((t) => t.category === "Commercial")?.value || "Payment according to agreed milestones."}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <strong className="text-slate-900 block">Deliverable Boundaries</strong>
                <p className="text-slate-600 mt-0.5">
                  {dealTerms.find((t) => t.category === "Obligations")?.value || "Defined scope of work."}
                </p>
              </div>
            </div>
          </div>

          {/* Card: What You Obligate / Give Up */}
          <div className="card-surface rounded-2xl p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <span>⚖️</span> What You Obligate / Give Up
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Your Concessions
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Rights granted, exclusivity locks, warranties, and obligations transferred to the client.
            </p>
            <div className="mt-4 space-y-2.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <strong className="text-slate-900 block">IP & License Concessions</strong>
                <p className="text-slate-600 mt-0.5">
                  {dealTerms.find((t) => t.category === "Rights")?.value || "Standard license grant."}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <strong className="text-slate-900 block">Exclusivity & Non-Compete Locks</strong>
                <p className="text-slate-600 mt-0.5">
                  {dealTerms.find((t) => t.category === "Restrictions")?.value || "No restrictive lockouts."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Detailed Findings & Filter Bar */}
        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Actionable Findings
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950 tracking-tight">
                Provisions That Require Your Attention
              </h2>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  selectedFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All ({findings.length})
              </button>
              {highCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter("high")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedFilter === "high"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-white border border-red-200 text-red-700 hover:bg-red-50"
                  }`}
                >
                  High ({highCount})
                </button>
              )}
              {worthCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter("worth_reviewing")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedFilter === "worth_reviewing"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  Review ({worthCount})
                </button>
              )}
              {understandCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter("understand")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedFilter === "understand"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white border border-blue-200 text-blue-800 hover:bg-blue-50"
                  }`}
                >
                  Understand ({understandCount})
                </button>
              )}
              {crossClauseCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter("cross_clause")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    selectedFilter === "cross_clause"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  }`}
                >
                  Cross-Clause ({crossClauseCount})
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {filteredFindings.length === 0 ? (
              <div className="card-surface rounded-2xl p-10 text-center">
                <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xl font-bold">
                  ✓
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No Findings in this Category
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  No clauses in this contract matched the selected filter.
                </p>
              </div>
            ) : (
              filteredFindings.map((finding, idx) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  index={idx}
                  onAskPactIQ={(f) =>
                    openChatWithFocus({
                      type: "finding",
                      findingId: f.id,
                      label: f.title,
                    })
                  }
                  onAskClause={(c) =>
                    openChatWithFocus({
                      type: "clause",
                      clauseId: c.id,
                      label: c.section || c.title || `Clause #${c.position + 1}`,
                    })
                  }
                />
              ))
            )}
          </div>
        </section>

        {/* Section: Take Action (Overall Contract Actions) */}
        <section className="mt-12 card-surface rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Take Action
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <span>⚡</span> Execute Your Contract Strategy
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Now that you&apos;ve reviewed all provisions, transform PactIQ&apos;s findings into ready-to-send negotiation communication or a revised draft.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {/* Action 1: Generate Full Negotiation Message */}
            <div className="group flex flex-col justify-between rounded-xl border border-blue-200/90 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    ✉️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 group-hover:text-blue-700 transition-colors">
                      Generate Full Negotiation Message
                    </h3>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                      Role-Adapted Email Draft
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Create one cohesive, professional message covering the key terms you may want to renegotiate. Consolidates high-priority findings and adjusts tone to your role.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNegotiationModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition"
                >
                  <span>✨ Generate Full Negotiation Message</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Action 2: Redraft Contract */}
            <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-400 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    📝
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 group-hover:text-slate-800 transition-colors">
                      Redraft Contract
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                      Targeted Clause Revisions
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Create a revised version of the contract based on the changes you select. Preserves the original contract intact while applying balanced replacement language.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRedraftModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-[0.98] transition"
                >
                  <span>📝 Redraft Contract</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Persistent Floating "Ask PactIQ" Trigger for Fast Access */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() =>
            openChatWithFocus({
              type: "deal",
              label: "Whole Agreement Overview",
            })
          }
          className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-800 hover:scale-[1.03] active:scale-95 transition-all"
        >
          <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <span>✨ Ask PactIQ</span>
        </button>
      </div>

      {/* Ask PactIQ Side Drawer */}
      <AskPactIQDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        contractId={contractId}
        filename={filename}
        focusContext={focusContext}
        onClearFocus={handleClearFocus}
        topConcernSummary={topConcernSummary}
      />

      {/* Feature 1: Full Negotiation Message Modal */}
      <FullNegotiationModal
        isOpen={isNegotiationModalOpen}
        onClose={() => setIsNegotiationModalOpen(false)}
        contractId={contractId}
        filename={filename}
        userRole={userRole}
        contractType={contractType}
      />

      {/* Feature 2: Redraft Contract Modal */}
      <RedraftModal
        isOpen={isRedraftModalOpen}
        onClose={() => setIsRedraftModalOpen(false)}
        contractId={contractId}
        filename={filename}
        findings={findings}
        userRole={userRole}
        contractType={contractType}
      />

      {/* Persistent Legal Notice & Disclaimer */}
      <footer className="mt-16 border-t border-slate-200 bg-white px-6 py-10 text-center text-xs text-slate-500 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-3">
          <p className="font-bold uppercase tracking-wider text-[11px] text-slate-700">
            Legal Disclaimer & Terms of Use
          </p>
          <p className="leading-relaxed text-[11px]">
            PactIQ provides automated analysis for informational purposes to help users understand contract terms, identify potential concerns, and prepare negotiation points. PactIQ is not a law firm and does not provide legal advice, opinions, or recommendations about legal rights or strategies.
          </p>
          <p className="text-slate-400 text-[10px]">
            © {new Date().getFullYear()} PactIQ. All analysis grounded in document text.
          </p>
        </div>
      </footer>
    </div>
  );
}
