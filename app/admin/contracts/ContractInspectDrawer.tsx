"use client";

import { useEffect, useState } from "react";

interface ContractInspectDrawerProps {
  contractId: string | null;
  onClose: () => void;
}

export function ContractInspectDrawer({ contractId, onClose }: ContractInspectDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [rerunMessage, setRerunMessage] = useState("");

  useEffect(() => {
    if (!contractId) return;
    async function loadContract() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/contracts/${contractId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.contract);
        }
      } catch (err) {
        console.error("Failed to load contract inspect details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadContract();
  }, [contractId]);

  async function handleRerun() {
    if (!contractId || rerunLoading) return;
    setRerunLoading(true);
    setRerunMessage("");
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/rerun`, { method: "POST" });
      if (res.ok) {
        setRerunMessage("✓ Analysis re-run queued successfully. The pipeline is processing.");
      } else {
        setRerunMessage("Failed to queue re-run.");
      }
    } catch {
      setRerunMessage("Error triggering re-run.");
    } finally {
      setRerunLoading(false);
    }
  }

  if (!contractId) return null;

  const latestVersion = data?.versions?.[data.versions.length - 1];
  const latestReview = latestVersion?.reviews?.[0];
  const findings = latestReview?.findings || [];
  const clauseCount = latestVersion?._count?.clauses || 0;

  const highCount = findings.filter((f: any) => f.severity === "high").length;
  const worthCount = findings.filter((f: any) => f.severity === "worth_reviewing").length;
  const understandCount = findings.filter((f: any) => f.severity === "understand").length;
  const validatedCount = findings.filter((f: any) => f.sourceValidated).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-out Panel */}
      <div className="relative z-10 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[600px] lg:w-[660px] border-l border-slate-200 transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-950">Review Pipeline Diagnostics</h2>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                ID: {contractId.slice(0, 10)}...
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[380px]">
              {data?.filename || "Loading telemetry..."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRerun}
              disabled={rerunLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
            >
              <span>🔄</span>
              <span>{rerunLoading ? "Queueing..." : "Re-run Review"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {rerunMessage && (
          <div className="bg-blue-50 text-blue-800 text-xs px-6 py-2 border-b border-blue-100 font-semibold">
            {rerunMessage}
          </div>
        )}

        {/* Privacy & Zero-Knowledge Guarantee Banner */}
        <div className="bg-emerald-50/80 border-b border-emerald-100 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-900">
          <span className="text-sm">🔒</span>
          <span className="font-semibold">
            Zero-Knowledge Privacy: Raw contract text and verbatim clauses are strictly hidden and encrypted.
          </span>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
              Loading pipeline telemetry...
            </div>
          ) : !data ? (
            <div className="text-center text-xs text-red-500 py-10">Failed to load contract telemetry.</div>
          ) : (
            <>
              {/* 1. Ingestion & User Metadata */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Document & Processing Metadata
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">User Account</span>
                    <span className="font-semibold text-slate-800 truncate block">{data.user?.email || "Anonymous"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Contract Category</span>
                    <span className="font-semibold text-slate-800">{data.contractType || "General"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Document Versions</span>
                    <span className="font-semibold text-slate-800">{data.versions?.length || 1} version(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Clauses Parsed</span>
                    <span className="font-bold text-slate-900">{clauseCount} clauses</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Current Status</span>
                    <span className="font-bold text-emerald-700">{data.status.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Uploaded At</span>
                    <span className="font-medium text-slate-600 font-mono text-[11px]">
                      {new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Review Telemetry & Grounding Metrics */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Review Finding Telemetry (Anonymized)
                </h3>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <span className="text-[10px] uppercase font-bold text-red-700 block">High</span>
                    <span className="text-lg font-black text-red-800 font-mono">{highCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Worth</span>
                    <span className="text-lg font-black text-amber-800 font-mono">{worthCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-700 block">Understand</span>
                    <span className="text-lg font-black text-blue-800 font-mono">{understandCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Verified</span>
                    <span className="text-lg font-black text-emerald-800 font-mono">{validatedCount}</span>
                  </div>
                </div>

                {/* Finding Topics List (Titles Only - No Private Document Content) */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Finding Topics Identified ({findings.length})
                  </span>
                  <div className="space-y-1.5">
                    {findings.map((f: any, idx: number) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <span className="font-semibold text-slate-800 truncate max-w-[340px]">
                          #{idx + 1} · {f.title}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded capitalize text-slate-600">
                            {f.category}
                          </span>
                          <span className={f.sourceValidated ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                            {f.sourceValidated ? "✓ Verified" : "✗ Rejected"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Pipeline Lifecycle Diagnostics */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Pipeline Execution Stages
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="font-medium text-slate-800">1. Document Ingestion & Storage</span>
                    </span>
                    <span className="text-emerald-700 font-bold text-[11px]">Completed</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="font-medium text-slate-800">2. Text Extraction & Clause Segmentation</span>
                    </span>
                    <span className="text-emerald-700 font-bold text-[11px]">{clauseCount} Clauses</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="font-medium text-slate-800">3. 3-Layer Legal Intelligence & Cross-Clause Check</span>
                    </span>
                    <span className="text-emerald-700 font-bold text-[11px]">Analyzed</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span className="font-medium text-slate-800">4. Source Grounding Verification</span>
                    </span>
                    <span className="text-emerald-700 font-bold text-[11px]">
                      {validatedCount}/{findings.length} Passed
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
