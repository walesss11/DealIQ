"use client";

import { useState } from "react";
import type { FindingData } from "./FindingCard";
import { downloadRevisedAsDocx, downloadRevisedAsPdf } from "@/lib/export-document";

interface RedraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  filename: string;
  findings: FindingData[];
  userRole?: string;
  contractType?: string;
}

interface RedraftClauseChange {
  clauseId: string;
  section: string;
  originalText: string;
  revisedText: string;
  rationale: string;
}

interface RedraftResult {
  revisedFullText: string;
  changes: RedraftClauseChange[];
  consistencyNotes: string[];
  originalContractPreserved: boolean;
  selectedCount: number;
}

export function RedraftModal({
  isOpen,
  onClose,
  contractId,
  filename,
  findings,
  userRole,
}: RedraftModalProps) {
  // Actionable findings that can be redrafted
  const actionableFindings = findings.filter((f) => f.clause && f.clause.text);

  // Initialize selection with high and worth_reviewing findings
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const initial = actionableFindings
      .filter((f) => f.severity === "high" || f.severity === "worth_reviewing")
      .map((f) => f.id);
    return initial.length > 0 ? initial : actionableFindings.map((f) => f.id);
  });

  const [step, setStep] = useState<"select" | "result">("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedraftResult | null>(null);
  const [activeTab, setActiveTab] = useState<"diff" | "full" | "consistency">("diff");
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedClauseId, setCopiedClauseId] = useState<string | null>(null);

  if (!isOpen) return null;

  function toggleFinding(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    setSelectedIds(actionableFindings.map((f) => f.id));
  }

  function handleClearAll() {
    setSelectedIds([]);
  }

  async function handleGenerateRedraft() {
    if (selectedIds.length === 0) {
      setError("Please select at least one change to redraft.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contracts/${contractId}/redraft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedFindingIds: selectedIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate revised contract.");
      }

      const data: RedraftResult = await res.json();
      setResult(data);
      setStep("result");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred during redrafting.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadDocx() {
    if (!result?.revisedFullText) return;
    try {
      await downloadRevisedAsDocx(
        filename.replace(/\.[^/.]+$/, "") + " (Revised)",
        result.revisedFullText,
        filename
      );
    } catch (err) {
      console.error("Failed to generate Word document:", err);
    }
  }

  function handleDownloadPdf() {
    if (!result?.revisedFullText) return;
    try {
      downloadRevisedAsPdf(
        filename.replace(/\.[^/.]+$/, "") + " (Revised)",
        result.revisedFullText,
        filename
      );
    } catch (err) {
      console.error("Failed to generate PDF document:", err);
    }
  }

  async function handleCopyFull() {
    if (!result?.revisedFullText) return;
    try {
      await navigator.clipboard.writeText(result.revisedFullText);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2500);
    } catch (err) {
      console.error("Failed to copy redrafted text:", err);
    }
  }

  async function handleCopyClause(text: string, clauseId: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedClauseId(clauseId);
      setTimeout(() => setCopiedClauseId(null), 2500);
    } catch (err) {
      console.error("Failed to copy clause text:", err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-xs">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">Redraft Contract</h2>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Original Preserved
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {step === "select"
                  ? "Select the specific recommendations you want PactIQ to incorporate into a revised contract"
                  : "Targeted revisions incorporated · Original structure and unselected clauses preserved"}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white animate-spin">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Drafting Targeted Amendments...
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Applying your {selectedIds.length} selected changes, preserving exact clause numbering, defined terms, and running internal legal consistency validation.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-xs font-semibold text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
              >
                Back to Selection
              </button>
            </div>
          ) : step === "select" ? (
            <div className="space-y-4">
              {/* Instructions banner */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Select the changes you&apos;d like PactIQ to make
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    PactIQ will only modify the clauses you check below. All other provisions, numbering, and definitions remain strictly unchanged.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50 transition"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Selection Checklist */}
              <div className="space-y-2.5">
                {actionableFindings.map((finding) => {
                  const isChecked = selectedIds.includes(finding.id);
                  return (
                    <label
                      key={finding.id}
                      className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                        isChecked
                          ? "border-blue-300 bg-blue-50/40 shadow-2xs"
                          : "border-slate-200 bg-white hover:bg-slate-50/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFinding(finding.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-950">
                            {finding.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              finding.severity === "high"
                                ? "bg-red-100 text-red-800"
                                : finding.severity === "worth_reviewing"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {finding.severity === "high"
                              ? "High Attention"
                              : finding.severity === "worth_reviewing"
                              ? "Worth Reviewing"
                              : "Understand"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {finding.clause.section || finding.clause.title || `Clause #${finding.clause.position + 1}`}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          <strong>Proposed Adjustment: </strong>
                          {finding.whatToConsider}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Result View */
            <div className="space-y-4">
              {/* Preserved / Generated Status Banner */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Revised Contract Successfully Generated
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      <strong>Original contract preserved</strong> · {result?.changes.length} targeted clause amendments applied.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("select")}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
                  >
                    <span>← Adjust Selection</span>
                  </button>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex gap-1 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("diff")}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                    activeTab === "diff"
                      ? "border-slate-900 text-slate-950 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Clause Amendments ({result?.changes.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("full")}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                    activeTab === "full"
                      ? "border-slate-900 text-slate-950 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Full Revised Agreement
                </button>
                {result?.consistencyNotes && result.consistencyNotes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("consistency")}
                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
                      activeTab === "consistency"
                        ? "border-slate-900 text-slate-950 font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Consistency Check ({result.consistencyNotes.length})
                  </button>
                )}
              </div>

              {/* Tab 1: Clause Diff Comparison */}
              {activeTab === "diff" && (
                <div className="space-y-4">
                  {result?.changes.map((chg, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                    >
                      {/* Clause Title & Rationale Header */}
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {chg.section}
                          </span>
                          <p className="text-xs text-slate-600 mt-0.5">
                            <strong>Rationale: </strong>
                            {chg.rationale}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyClause(chg.revisedText, chg.clauseId)}
                          className="text-[11px] font-semibold text-blue-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-blue-50 transition"
                        >
                          {copiedClauseId === chg.clauseId ? "✓ Copied" : "Copy Revised Clause"}
                        </button>
                      </div>

                      {/* Side-by-side or stacked diff */}
                      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                        {/* Original */}
                        <div className="p-4 bg-red-50/20">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
                              Original Clause
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                            {chg.originalText}
                          </p>
                        </div>

                        {/* Revised */}
                        <div className="p-4 bg-emerald-50/20">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                              Redrafted Clause
                            </span>
                          </div>
                          <p className="text-xs text-slate-900 leading-relaxed font-mono whitespace-pre-wrap font-medium">
                            {chg.revisedText}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Full Document Text */}
              {activeTab === "full" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Complete Assembled Document Text
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Targeted revisions incorporated · Unselected sections preserved verbatim
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadDocx}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition"
                      >
                        <span>📝 Word (.docx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 transition"
                      >
                        <span>📄 PDF (.pdf)</span>
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-white p-5 rounded-lg border border-slate-200 max-h-[500px] overflow-y-auto">
                    {result?.revisedFullText}
                  </pre>
                </div>
              )}

              {/* Tab 3: Consistency Notes */}
              {activeTab === "consistency" && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Automated Legal Consistency Checks
                  </h4>
                  <div className="space-y-2">
                    {result?.consistencyNotes.map((note, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            {step === "result" && (
              <button
                type="button"
                onClick={() => setStep("select")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>← Edit Selected Changes</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>

            {step === "select" ? (
              <button
                type="button"
                disabled={loading || selectedIds.length === 0}
                onClick={handleGenerateRedraft}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition"
              >
                <span>Redraft Contract ({selectedIds.length} changes)</span>
                <span>→</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyFull}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedFull ? "✓ Copied!" : "Copy Text"}</span>
                </button>

                {/* Download Word Document (.docx) */}
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 active:scale-95 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download Word (.docx)</span>
                </button>

                {/* Download PDF Document (.pdf) */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download PDF (.pdf)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
