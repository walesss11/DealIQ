"use client";

import { useState } from "react";
import type { VersionComparisonResult } from "@/lib/ai/compare-versions";
import type { ChatFocusContext } from "@/lib/ai/chat";

interface RevisionComparisonViewProps {
  comparison: VersionComparisonResult;
  onOpenChat: (context: ChatFocusContext) => void;
  onOpenNegotiation: () => void;
  onOpenRedraft?: () => void;
  onOpenUploadRevision?: () => void;
  dealTerms?: Array<{
    label: string;
    value: string;
    category: string;
    status: string;
    icon: string;
  }>;
}

export function RevisionComparisonView({
  comparison,
  onOpenChat,
  onOpenNegotiation,
  onOpenRedraft,
  onOpenUploadRevision,
  dealTerms,
}: RevisionComparisonViewProps) {
  const [activeConcernFilter, setActiveConcernFilter] = useState<"all" | "addressed" | "partially_addressed" | "unresolved">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = comparison.summaryCounts;
  const previousConcerns = comparison.previousConcerns || [];
  const whatChanged = comparison.whatChanged || [];
  const newIssues = comparison.newIssues || [];
  const dealAsItStands = comparison.dealAsItStands || {};

  const addressedList = previousConcerns.filter((c) => c.status === "addressed");
  const partialList = previousConcerns.filter((c) => c.status === "partially_addressed");
  const unresolvedList = previousConcerns.filter((c) => c.status === "unresolved");

  const filteredConcerns = previousConcerns.filter((c) => {
    if (activeConcernFilter === "all") return true;
    return c.status === activeConcernFilter;
  });

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header & Context Hero Card */}
      <section className="card-surface rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-white via-blue-50/20 to-slate-50 border border-blue-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white shadow-2xs">
                <span>🔄</span> REVISED DEAL REVIEW
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Version {comparison.currentVersionNumber} compared with Version {comparison.previousVersionNumber}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              Where Your Deal Stands Now
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              {comparison.overviewSummary || `PactIQ reviewed Version ${comparison.currentVersionNumber} against Version ${comparison.previousVersionNumber}. Compare updated terms and negotiation positions below.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() =>
                onOpenChat({
                  type: "deal",
                  label: `Version ${comparison.currentVersionNumber} Comparison Summary`,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition cursor-pointer"
            >
              <span>✨</span>
              <span>Ask What Changed</span>
            </button>
          </div>
        </div>

        {/* 2. Deal Update Metric Bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Addressed */}
          <button
            type="button"
            onClick={() => setActiveConcernFilter("addressed")}
            className={`rounded-xl border p-4 text-left transition cursor-pointer ${
              activeConcernFilter === "addressed"
                ? "border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-400/30"
                : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <span>✓</span> Addressed
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                Resolved
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{counts.addressedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Issues resolved in your favor</p>
          </button>

          {/* Partially Addressed */}
          <button
            type="button"
            onClick={() => setActiveConcernFilter("partially_addressed")}
            className={`rounded-xl border p-4 text-left transition cursor-pointer ${
              activeConcernFilter === "partially_addressed"
                ? "border-amber-500 bg-amber-50/90 ring-2 ring-amber-400/30"
                : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <span>~</span> Partially Addressed
              </span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                Improved
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{counts.partiallyAddressedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Better, but some risk remains</p>
          </button>

          {/* Unresolved */}
          <button
            type="button"
            onClick={() => setActiveConcernFilter("unresolved")}
            className={`rounded-xl border p-4 text-left transition cursor-pointer ${
              activeConcernFilter === "unresolved"
                ? "border-rose-500 bg-rose-50/90 ring-2 ring-rose-400/30"
                : "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <span>✗</span> Still Unresolved
              </span>
              <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded">
                Unchanged
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{counts.unresolvedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Previous concerns not updated</p>
          </button>

          {/* New Provisions */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                <span>+</span> New Provisions
              </span>
              <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-100 px-1.5 py-0.2 rounded">
                Added
              </span>
            </div>
            <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{counts.newProvisionsCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Newly introduced terms</p>
          </div>
        </div>
      </section>

      {/* 3. Your Previous Concerns Section (Evolution of Identified Issues) */}
      <section className="card-surface rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Issue Evolution
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <span>🎯</span> Status of Your Previous Concerns
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracking how each issue identified in your previous review was handled by the counterparty.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveConcernFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeConcernFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({previousConcerns.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveConcernFilter("addressed")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeConcernFilter === "addressed"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              ✓ Addressed ({addressedList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveConcernFilter("partially_addressed")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeConcernFilter === "partially_addressed"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              ~ Partial ({partialList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveConcernFilter("unresolved")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeConcernFilter === "unresolved"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              ✗ Unresolved ({unresolvedList.length})
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {filteredConcerns.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
              No concerns matching the selected filter.
            </div>
          ) : (
            filteredConcerns.map((concern, idx) => {
              const isAddressed = concern.status === "addressed";
              const isPartial = concern.status === "partially_addressed";
              const isUnresolved = concern.status === "unresolved";

              const badgeStyle = isAddressed
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isPartial
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-rose-50 text-rose-800 border-rose-200";

              const borderAccent = isAddressed
                ? "border-l-4 border-l-emerald-500"
                : isPartial
                ? "border-l-4 border-l-amber-500"
                : "border-l-4 border-l-rose-500";

              const statusIcon = isAddressed ? "✓" : isPartial ? "~" : "✗";
              const statusText = isAddressed
                ? "ADDRESSED"
                : isPartial
                ? "PARTIALLY ADDRESSED"
                : "STILL UNRESOLVED";

              return (
                <div
                  key={concern.id || idx}
                  className={`rounded-xl border border-slate-200 bg-white p-5 shadow-2xs ${borderAccent} transition`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold border ${badgeStyle}`}>
                        <span>{statusIcon}</span>
                        <span>{statusText}</span>
                      </span>
                      <h3 className="text-base font-bold text-slate-950">{concern.title}</h3>
                    </div>
                    {concern.sourceRef && (
                      <span className="text-xs font-mono text-slate-500">
                        {concern.sourceRef}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                    {/* Previous Concern */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Previous Issue (Version {comparison.previousVersionNumber})
                      </span>
                      <p className="mt-1 text-slate-700 leading-relaxed font-medium">
                        {concern.previousConcern}
                      </p>
                    </div>

                    {/* What was recommended */}
                    <div className="rounded-lg bg-blue-50/50 border border-blue-200/80 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                        What You Recommended / Asked For
                      </span>
                      <p className="mt-1 text-slate-800 leading-relaxed font-medium">
                        {concern.previousRecommendation}
                      </p>
                    </div>

                    {/* Revised Term */}
                    <div className={`rounded-lg p-3 border ${
                      isAddressed
                        ? "bg-emerald-50/50 border-emerald-200"
                        : isPartial
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-rose-50/50 border-rose-200"
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                        Now in Version {comparison.currentVersionNumber}
                      </span>
                      <p className="mt-1 text-slate-900 leading-relaxed font-medium">
                        {concern.revisedTerm}
                      </p>
                    </div>
                  </div>

                  {/* Why / Substantive Explanation */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-start gap-2">
                    <span className="text-slate-400 text-xs">💬</span>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      <strong className="font-semibold text-slate-900">Why: </strong>
                      <span>{concern.substantiveExplanation}</span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. What Changed in the Text (Before → After Diff Breakdown) */}
      <section className="card-surface rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Material Changes
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <span>📝</span> What Changed in the Text
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct before-and-after comparison of modified clauses and why they impact your position.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {whatChanged.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-600">
              <span className="text-slate-400 block text-base mb-1">📄</span>
              <strong className="text-slate-800 font-semibold block">Clause text comparison synchronized</strong>
              <span>Review the evolution of your specific negotiation items above in the <strong>Status of Your Previous Concerns</strong> section.</span>
            </div>
          ) : (
            whatChanged.map((change, idx) => (
              <div
                key={change.id || idx}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 hover:border-slate-300 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-950">{change.title}</h3>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {change.category.replaceAll("_", " ")}
                    </span>
                  </div>
                  {change.revisedClauseRef && (
                    <span className="text-xs font-mono text-slate-500">
                      Ref: {change.revisedClauseRef}
                    </span>
                  )}
                </div>

                {/* Before → After Side-by-Side Diff Box */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {/* Before */}
                  <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                      <span>❌</span> Version {comparison.previousVersionNumber} (Before)
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 font-mono bg-white p-2.5 rounded border border-rose-200 whitespace-pre-wrap">
                      {change.beforeText}
                    </p>
                  </div>

                  {/* After */}
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/40 p-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                      <span>✅</span> Version {comparison.currentVersionNumber} (Now)
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-900 font-mono bg-white p-2.5 rounded border border-emerald-300 whitespace-pre-wrap font-medium">
                      {change.afterText}
                    </p>
                  </div>
                </div>

                {/* Why It Matters */}
                <div className="mt-3.5 rounded-lg bg-blue-50/60 border border-blue-200/80 p-3 flex items-start gap-2">
                  <span className="text-blue-700 text-sm">💡</span>
                  <div className="text-xs text-blue-950 leading-relaxed">
                    <strong className="font-bold">Why it matters: </strong>
                    <span>{change.whyItMatters}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 5. New Material Issues Section */}
      {newIssues.length > 0 && (
        <section className="card-surface rounded-2xl p-6 sm:p-8 bg-white border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-4">
            <div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                New Additions
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <span>➕</span> New Material Provisions Introduced
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Terms or clauses added in this revision that were not present in previous drafts.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {newIssues.map((issue, idx) => (
              <div
                key={issue.id || idx}
                className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded">
                      + New Provision
                    </span>
                    <h3 className="text-sm font-bold text-slate-950">{issue.title}</h3>
                  </div>
                  {issue.revisedClauseRef && (
                    <span className="text-xs font-mono text-slate-500">
                      {issue.revisedClauseRef}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-800 leading-relaxed font-medium">
                  {issue.description}
                </p>

                <div className="mt-3 rounded-lg bg-white p-3 border border-indigo-100 text-xs text-slate-700">
                  <strong className="font-semibold text-indigo-950">Why this matters: </strong>
                  <span>{issue.whyItMatters}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. The Deal As It Stands (Current State Summary based ONLY on the revised contract) */}
      <section className="card-surface rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Current Agreement Snapshot
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <span>📋</span> The Deal As It Stands
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              What you are actually agreeing to if you sign Version {comparison.currentVersionNumber} today.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Compensation */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>💳</span> Compensation
            </span>
            <p className="mt-2 text-xs font-bold text-slate-900 leading-relaxed">
              {dealAsItStands.compensation && dealAsItStands.compensation !== "Agreed fee specified in revision."
                ? dealAsItStands.compensation
                : dealTerms?.find((t) => t.category === "Commercial")?.value || "Standard agreed compensation."}
            </p>
          </div>

          {/* Payment Schedule */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>📅</span> Payment Schedule
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.paymentSchedule && dealAsItStands.paymentSchedule !== "Milestones and payment timing specified in revision."
                ? dealAsItStands.paymentSchedule
                : dealTerms?.find((t) => t.category === "Commercial")?.value || "Payment according to agreed milestones."}
            </p>
          </div>

          {/* Deliverables */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>📦</span> Deliverables & Scope
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.deliverables && dealAsItStands.deliverables !== "Content deliverables and campaign scope."
                ? dealAsItStands.deliverables
                : dealTerms?.find((t) => t.category === "Obligations")?.value || "Specified content deliverables."}
            </p>
          </div>

          {/* Usage Rights */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🛡️</span> Usage Rights
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.usageRights && dealAsItStands.usageRights !== "License scope and duration."
                ? dealAsItStands.usageRights
                : dealTerms?.find((t) => t.category === "Rights")?.value || "Licensed media usage rights."}
            </p>
          </div>

          {/* IP Ownership */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🏷️</span> IP Ownership
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.ipOwnership && dealAsItStands.ipOwnership !== "IP ownership and copyright retention terms."
                ? dealAsItStands.ipOwnership
                : dealTerms?.find((t) => t.category === "Rights")?.value || "Retained copyright with brand license."}
            </p>
          </div>

          {/* Exclusivity */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🔒</span> Exclusivity
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.exclusivity && dealAsItStands.exclusivity !== "Competitor restrictions and lockout duration."
                ? dealAsItStands.exclusivity
                : dealTerms?.find((t) => t.category === "Restrictions")?.value || "Non-exclusive or direct competitor lockout."}
            </p>
          </div>

          {/* Term & Termination */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>🚪</span> Term & Termination
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.termAndTermination && dealAsItStands.termAndTermination !== "Contract term and cancellation conditions."
                ? dealAsItStands.termAndTermination
                : dealTerms?.find((t) => t.category === "Governance")?.value || "Mutual notice and cancellation rights."}
            </p>
          </div>

          {/* Revisions */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>✏️</span> Revisions & Approval
            </span>
            <p className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
              {dealAsItStands.revisions && dealAsItStands.revisions !== "Revision rounds and approval timeline."
                ? dealAsItStands.revisions
                : "Defined revision round limit."}
            </p>
          </div>
        </div>
      </section>

      {/* 7. PactIQ's Take (Executive Negotiation Assessment) */}
      <section className="card-surface rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-white text-xs font-bold">
            P
          </span>
          <h2 className="text-lg font-bold tracking-tight text-white">
            PactIQ&apos;s Take on Version {comparison.currentVersionNumber}
          </h2>
        </div>
        <p className="mt-3 text-sm text-slate-200 leading-relaxed font-normal">
          {comparison.pactiqTake || comparison.overviewSummary}
        </p>
      </section>

      {/* 8. What Do You Want To Do? (Action Bar) */}
      <section className="card-surface rounded-2xl p-6 sm:p-8 bg-slate-50 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <span>⚡</span> What Do You Want To Do Next?
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Transform this version analysis into your next counter-offer, send an email, redraft, or upload an updated file.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Action 1: Negotiation Message */}
          <button
            type="button"
            onClick={onOpenNegotiation}
            className="flex flex-col justify-between rounded-xl bg-white border border-blue-200 p-4 text-left shadow-2xs hover:border-blue-400 hover:shadow-sm transition cursor-pointer group"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white text-base font-bold shadow-2xs group-hover:scale-105 transition-transform">
                ✉️
              </div>
              <h3 className="mt-3 text-xs font-bold text-slate-950 group-hover:text-blue-700 transition-colors">
                Generate Negotiation Message
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Create a ready-to-send 1st-person email addressing remaining unresolved issues.
              </p>
            </div>
            <span className="mt-4 text-[11px] font-bold text-blue-700 flex items-center gap-1">
              <span>Generate Email</span>
              <span>→</span>
            </span>
          </button>

          {/* Action 2: Ask PactIQ */}
          <button
            type="button"
            onClick={() =>
              onOpenChat({
                type: "deal",
                label: `Version ${comparison.currentVersionNumber} Next Action Strategy`,
              })
            }
            className="flex flex-col justify-between rounded-xl bg-white border border-slate-200 p-4 text-left shadow-2xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer group"
          >
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white text-base font-bold shadow-2xs group-hover:scale-105 transition-transform">
                ✨
              </div>
              <h3 className="mt-3 text-xs font-bold text-slate-950 group-hover:text-slate-800 transition-colors">
                Ask PactIQ
              </h3>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Chat with PactIQ about specific clause trade-offs or alternative counter-positions.
              </p>
            </div>
            <span className="mt-4 text-[11px] font-bold text-slate-900 flex items-center gap-1">
              <span>Start Chat</span>
              <span>→</span>
            </span>
          </button>

          {/* Action 3: Redraft Contract */}
          {onOpenRedraft && (
            <button
              type="button"
              onClick={onOpenRedraft}
              className="flex flex-col justify-between rounded-xl bg-white border border-slate-200 p-4 text-left shadow-2xs hover:border-slate-300 hover:shadow-sm transition cursor-pointer group"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white text-base font-bold shadow-2xs group-hover:scale-105 transition-transform">
                  📝
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-950 group-hover:text-emerald-800 transition-colors">
                  Redraft Contract
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Generate balanced replacement language for remaining unresolved clauses.
                </p>
              </div>
              <span className="mt-4 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <span>Open Redrafter</span>
                <span>→</span>
              </span>
            </button>
          )}

          {/* Action 4: Upload Another Revision */}
          {onOpenUploadRevision && (
            <button
              type="button"
              onClick={onOpenUploadRevision}
              className="flex flex-col justify-between rounded-xl bg-white border border-indigo-200 p-4 text-left shadow-2xs hover:border-indigo-400 hover:shadow-sm transition cursor-pointer group"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white text-base font-bold shadow-2xs group-hover:scale-105 transition-transform">
                  🔄
                </div>
                <h3 className="mt-3 text-xs font-bold text-slate-950 group-hover:text-indigo-700 transition-colors">
                  Add Revised Contract
                </h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Upload an updated draft from the counterparty to compare as Version {comparison.currentVersionNumber + 1}.
                </p>
              </div>
              <span className="mt-4 text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                <span>Upload Version {comparison.currentVersionNumber + 1}</span>
                <span>→</span>
              </span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
