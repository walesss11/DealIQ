"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FindingCard, type FindingData } from "./FindingCard";
import { AskPactIQDrawer } from "./AskPactIQDrawer";
import { FullNegotiationModal } from "./FullNegotiationModal";
import { RedraftModal } from "./RedraftModal";
import { UploadRevisionModal } from "./UploadRevisionModal";
import { RevisionComparisonView } from "./RevisionComparisonView";
import { DealTimelineView, type DealMilestone } from "./DealTimelineView";
import { MissingProvisionsSection } from "./MissingProvisionsSection";
import type { MissingProvision } from "@/lib/ai/missing-provisions";
import { ChatFocusContext } from "@/lib/ai/chat";
import type { VersionComparisonResult } from "@/lib/ai/compare-versions";

export interface VersionMetadata {
  id: string;
  versionNumber: number;
  filename: string;
  createdAt: string;
  counts: {
    high: number;
    worth_reviewing: number;
    understand: number;
  };
  comparisonSummary?: {
    totalChanges: number;
    addressedCount: number;
    partiallyAddressedCount: number;
    unresolvedCount: number;
    newProvisionsCount: number;
    acceptedCount?: number;
    unchangedCount?: number;
    removedProvisionsCount?: number;
  } | null;
  hasReview: boolean;
}

export interface ReviewDashboardProps {
  contractId: string;
  filename: string;
  contractCreatedAt: string;
  contractType: string;
  confirmedContractType?: string;
  userRole?: string;
  findings: FindingData[];
  missingProvisions?: MissingProvision[];
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
  currentVersionNumber?: number;
  allVersions?: VersionMetadata[];
  comparison?: VersionComparisonResult;
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
  missingProvisions = [],
  dealTerms,
  counts,
  crossClauseCount,
  currentVersionNumber = 1,
  allVersions = [],
  comparison,
}: ReviewDashboardProps) {
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [isRedraftModalOpen, setIsRedraftModalOpen] = useState(false);
  const [isUploadRevisionOpen, setIsUploadRevisionOpen] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"comparison" | "review" | "timeline">(
    comparison || currentVersionNumber > 1 ? "comparison" : "review"
  );

  useEffect(() => {
    if (comparison || currentVersionNumber > 1) {
      setActiveWorkspaceTab("comparison");
    } else {
      setActiveWorkspaceTab("review");
    }
  }, [currentVersionNumber, comparison]);
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

  // Build deal milestones for timeline
  const milestones: DealMilestone[] = allVersions.flatMap((v): DealMilestone[] => {
    const formattedDate = new Date(v.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (v.versionNumber === 1) {
      return [
        {
          id: `v1-upload`,
          versionNumber: 1,
          filename: v.filename,
          date: formattedDate,
          title: `Version 1 (Original Contract) Uploaded`,
          type: "upload",
          description: `Original agreement "${v.filename}" uploaded and ingested into PactIQ.`,
          isActiveVersion: currentVersionNumber === 1,
        },
        {
          id: `v1-review`,
          versionNumber: 1,
          filename: v.filename,
          date: formattedDate,
          title: `Initial PactIQ Contract Intelligence Completed`,
          type: "review",
          description: `Identified source-grounded terms, cross-clause risks, and negotiation positions.`,
          stats: v.counts,
          isActiveVersion: currentVersionNumber === 1,
        },
      ];
    }

    return [
      {
        id: `v${v.versionNumber}-upload`,
        versionNumber: v.versionNumber,
        filename: v.filename,
        date: formattedDate,
        title: `Version ${v.versionNumber} (Revised Contract) Uploaded`,
        type: "revision",
        description: `Revised agreement received from counterparty and loaded for comparative analysis.`,
        isActiveVersion: currentVersionNumber === v.versionNumber,
      },
      {
        id: `v${v.versionNumber}-comparison`,
        versionNumber: v.versionNumber,
        filename: v.filename,
        date: formattedDate,
        title: `Version ${v.versionNumber} Comparison & Re-Review Generated`,
        type: "comparison",
        description: `Compared changes against Version ${v.versionNumber - 1} and previous negotiation requests.`,
        stats: v.counts,
        comparisonStats: v.comparisonSummary || undefined,
        isActiveVersion: currentVersionNumber === v.versionNumber,
      },
    ];
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-xs group-hover:bg-blue-900 transition-colors">
                P
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-950">PactIQ</span>
                <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline">
                  Deal Workspace
                </span>
              </div>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
              title="Return to your workspace dashboard"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Revised Contract Button */}
            <button
              type="button"
              onClick={() => setIsUploadRevisionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-100 active:scale-95 transition cursor-pointer"
            >
              <span>+</span>
              <span className="hidden sm:inline">Add Revised Contract</span>
              <span className="sm:hidden">Add Revision</span>
            </button>

            {/* Ask PactIQ Main Header Button */}
            <button
              type="button"
              onClick={() =>
                openChatWithFocus({
                  type: "deal",
                  label: `Whole Agreement Overview (Version ${currentVersionNumber})`,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition cursor-pointer"
            >
              <span>✨</span>
              <span>Ask PactIQ</span>
            </button>

            <Link
              href="/deals"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>📁</span>
              <span className="hidden sm:inline">Your Deals</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Dashboard Content */}
      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10 space-y-6">
        {/* Top Breadcrumbs & Back Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 text-xs">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-bold text-slate-600 hover:text-blue-700 transition group self-start"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>← Go back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Link href="/dashboard" className="hover:text-slate-900 transition">Workspace</Link>
            <span>/</span>
            <Link href="/deals" className="hover:text-slate-900 transition">Your Deals</Link>
            <span>/</span>
            <span className="text-slate-900 font-bold truncate max-w-[220px]">{filename}</span>
          </div>
        </div>

        {/* Multi-Version Switcher & Revision Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
              <span>📑</span> Versions:
            </span>

            {allVersions.map((v) => {
              const isCurrent = v.versionNumber === currentVersionNumber;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => router.push(`/review/${contractId}?v=${v.versionNumber}`)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                    isCurrent
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  <span>Version {v.versionNumber}</span>
                  {v.versionNumber === 1 ? (
                    <span className="text-[10px] opacity-75 font-normal">(Original)</span>
                  ) : (
                    <span className="text-[10px] opacity-75 font-normal">(Revised)</span>
                  )}
                  {v.comparisonSummary && (
                    <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                      isCurrent ? "bg-blue-500 text-white" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {(v.comparisonSummary.addressedCount ?? v.comparisonSummary.acceptedCount ?? 0)}✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsUploadRevisionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shrink-0 cursor-pointer self-start sm:self-center"
          >
            <span>+</span>
            <span>Upload Version {allVersions.length + 1}</span>
          </button>
        </div>

        {/* Document Header Info Card */}
        <div className="card-surface rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Source-Grounded Review
                </span>
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                  Version {currentVersionNumber} {currentVersionNumber === 1 ? "(Original Draft)" : "(Negotiated Revision)"}
                </span>
                {confirmedContractType && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 hidden sm:inline">
                    {confirmedContractType}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {currentVersionNumber > 1
                  ? `Version ${currentVersionNumber} Revision & Negotiation Outcome`
                  : "Contract Intelligence Report"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <strong className="text-slate-700 font-medium">{filename}</strong>
                </span>
                <span>·</span>
                <span>Uploaded on {new Date(contractCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
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
              {missingProvisions.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-indigo-700">
                  <span>🛡️</span> {missingProvisions.length} Missing Protections
                </span>
              )}
            </div>
          </div>

          {/* Quick Summary Banner with Ask PactIQ CTA */}
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Executive Takeaway</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {comparison
                  ? `Version ${currentVersionNumber} comparison: ${comparison.overviewSummary}`
                  : highCount > 0
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
                  label: `Executive Takeaway (Version ${currentVersionNumber})`,
                })
              }
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-blue-700 active:scale-95 transition"
            >
              <span>✨ Ask PactIQ about this</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Deal Workspace Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
          {comparison && (
            <button
              type="button"
              onClick={() => setActiveWorkspaceTab("comparison")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 transition cursor-pointer ${
                activeWorkspaceTab === "comparison"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>📊 What Changed & Negotiation Outcome</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeWorkspaceTab === "comparison" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"
              }`}>
                {comparison.changes.length} changes
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveWorkspaceTab("review")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 transition cursor-pointer ${
              activeWorkspaceTab === "review"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>📑 {currentVersionNumber > 1 ? `Full Version ${currentVersionNumber} Analysis` : "Full Contract Analysis"}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeWorkspaceTab === "review" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {findings.length} findings
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveWorkspaceTab("timeline")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 transition cursor-pointer ${
              activeWorkspaceTab === "timeline"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>⏳ Deal Progression Timeline</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeWorkspaceTab === "timeline" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {milestones.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Revision Comparison View */}
        {activeWorkspaceTab === "comparison" && comparison && (
          <RevisionComparisonView
            comparison={comparison}
            onOpenChat={openChatWithFocus}
            onOpenNegotiation={() => setIsNegotiationModalOpen(true)}
            onOpenRedraft={() => setIsRedraftModalOpen(true)}
            onOpenUploadRevision={() => setIsUploadRevisionOpen(true)}
            dealTerms={dealTerms}
          />
        )}

        {/* Tab 2: Deal Timeline View */}
        {activeWorkspaceTab === "timeline" && (
          <DealTimelineView
            milestones={milestones}
            onSelectVersion={(v) => router.push(`/review/${contractId}?v=${v}`)}
            onUploadRevision={() => setIsUploadRevisionOpen(true)}
          />
        )}

        {/* Tab 3: Detailed Contract Review & Finding Cards */}
        {activeWorkspaceTab === "review" && (
          <>
            {/* Section 1: Deal Summary & Contract at a Glance */}
            <section className="card-surface rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                    Deal Overview
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-slate-950 flex items-center gap-2">
                    <span>⚡</span> Deal Summary & Contract at a Glance
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Key commercial parameters and core terms extracted directly from Version {currentVersionNumber}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openChatWithFocus({
                      type: "deal",
                      label: `Core Deal Matrix (Version ${currentVersionNumber})`,
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

            {/* Section 2: What You Receive vs. What You Give (Trade-Off Matrix) */}
            <section className="grid gap-4 md:grid-cols-2">
              {/* Card: What You Receive */}
              <div className="card-surface rounded-2xl p-6 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span>🎁</span> What You Receive
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Your Entitlements & Protections
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Total financial compensation, payment schedule, and protective terms guaranteed to you.
                </p>
                <div className="mt-4 space-y-2.5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                    <strong className="text-slate-900 block">Total Compensation & Payment Schedule</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {dealTerms.find((t) => t.category === "Commercial")?.value || "Payment according to agreed milestones."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                    <strong className="text-slate-900 block">Termination Notice & Exit Protections</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {dealTerms.find((t) => t.category === "Governance")?.value || "Mutual notice and payment for completed work upon termination."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card: What You Give & Obligate */}
              <div className="card-surface rounded-2xl p-6 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <span>⚖️</span> What You Give & Obligate
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Your Deliverables & Commitments
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Deliverables you must produce, rights granted to the client, and restrictions binding you.
                </p>
                <div className="mt-4 space-y-2.5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                    <strong className="text-slate-900 block">Required Deliverables & Scope of Work</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {dealTerms.find((t) => t.category === "Obligations")?.value || "Defined scope of work and deliverables."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                    <strong className="text-slate-900 block">IP Rights & Client License Granted</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {dealTerms.find((t) => t.category === "Rights")?.value || "Standard commercial license grant."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
                    <strong className="text-slate-900 block">Exclusivity & Operating Restrictions</strong>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      {dealTerms.find((t) => t.category === "Restrictions")?.value || "No restrictive lockouts."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Detailed Findings & Filter Bar */}
            <section className="mt-4">
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
                      No clauses in this version matched the selected filter.
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
                          label: c.section || c.title || `Paragraph (Page ${c.pageNumber || 1})`,
                        })
                      }
                    />
                  ))
                )}
              </div>
            </section>

            {/* Section: Missing Protective Provisions */}
            {missingProvisions.length > 0 && (
              <MissingProvisionsSection
                provisions={missingProvisions}
                onOpenChatWithFocus={openChatWithFocus}
                userRole={userRole}
                versionNumber={currentVersionNumber}
              />
            )}
          </>
        )}

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
                Now that you&apos;ve reviewed Version {currentVersionNumber}, transform PactIQ&apos;s findings into ready-to-send negotiation communication, upload a counterparty revision, or redraft.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {/* Action 1: Upload Revised Contract */}
            <div className="group flex flex-col justify-between rounded-xl border border-indigo-200/90 bg-white p-5 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    🔄
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 group-hover:text-indigo-700 transition-colors">
                      Add Revised Contract
                    </h3>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                      Version Comparison
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Upload an updated draft from the other party. PactIQ will compare changes directly against your previous negotiations.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadRevisionOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>+ Add Revised Contract</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Action 2: Generate Full Negotiation Message */}
            <div className="group flex flex-col justify-between rounded-xl border border-blue-200/90 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    ✉️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 group-hover:text-blue-700 transition-colors">
                      Generate Negotiation Message
                    </h3>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                      1st-Person Email Draft
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Create a cohesive message addressing the counterparty with polite, constructive proposals covering unresolved issues.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNegotiationModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>✨ Generate Negotiation Email</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Action 3: Redraft Contract */}
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
                      Targeted Revisions
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Generate balanced replacement language for selected clauses without modifying unaffected terms.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRedraftModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer"
                >
                  <span>📝 Redraft Contract</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Navigation & Actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Finished reviewing this agreement?</h4>
                <p className="text-xs text-slate-500">Return to your workspace dashboard to track other deals or upload new contracts.</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Link
                href="/deals"
                className="flex-1 sm:flex-initial text-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
              >
                📁 View All Deals
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 sm:flex-initial text-center inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-900 transition shadow-xs"
              >
                <span>← Back to Dashboard</span>
              </Link>
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
              label: `Whole Agreement Overview (Version ${currentVersionNumber})`,
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

      {/* Upload Revision Modal */}
      <UploadRevisionModal
        isOpen={isUploadRevisionOpen}
        onClose={() => setIsUploadRevisionOpen(false)}
        contractId={contractId}
        contractName={filename}
        currentVersionNumber={currentVersionNumber}
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
