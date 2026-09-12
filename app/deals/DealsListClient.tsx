"use client";

import Link from "next/link";
import { useState } from "react";

export interface DealItem {
  id: string;
  filename: string;
  contractType: string;
  createdAt: string;
  userRole?: string | null;
  counts: {
    high: number;
    worth_reviewing: number;
    understand: number;
    total: number;
  };
  chatActivity: {
    lastMessageAt: string;
    messageSnippet: string;
  } | null;
}

interface DealsListClientProps {
  initialDeals: DealItem[];
}

export default function DealsListClient({ initialDeals }: DealsListClientProps) {
  const [deals, setDeals] = useState<DealItem[]>(initialDeals);
  const [dealToDelete, setDealToDelete] = useState<DealItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm() {
    if (!dealToDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/contracts/${dealToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || "Failed to delete deal.");
      }

      setDeals((prev) => prev.filter((d) => d.id !== dealToDelete.id));
      setDealToDelete(null);
    } catch (err: unknown) {
      console.error("Delete error:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete deal.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {/* Total Counter and Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
              Your Deals & Contracts
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Contract Intelligence Workspace
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Return to any contract review, resume previous AI conversations, redraft clauses, or manage your deal history.
          </p>
        </div>

        <div className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs self-start sm:self-auto">
          Total Deals Analyzed: <strong className="text-slate-900">{deals.length}</strong>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="mt-8">
        {deals.length === 0 ? (
          <div className="card-surface rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-2xl">
              📑
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              No Contracts in Your Workspace
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
              Upload your first agreement to run full 3-layer risk analysis, get tailored negotiation strategies, and chat with Ask PactIQ.
            </p>
            <div className="mt-6">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
              >
                <span>Upload a Contract</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {deals.map((deal) => (
              <div
                key={deal.id}
                className="card-surface rounded-2xl p-5 sm:p-6 transition hover:border-slate-300 shadow-2xs flex flex-col justify-between gap-5 lg:flex-row lg:items-center group"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">
                      {deal.contractType || "Commercial Contract"}
                    </span>
                    {deal.userRole && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                        Role: {deal.userRole}
                      </span>
                    )}
                    {deal.chatActivity && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span>💬</span> Chat History Active
                      </span>
                    )}
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-950 flex items-center gap-2">
                    <span>📄</span>
                    <Link
                      href={`/review/${deal.id}`}
                      className="hover:text-blue-700 hover:underline transition"
                    >
                      {deal.filename}
                    </Link>
                  </h2>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      Reviewed on{" "}
                      {new Date(deal.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {deal.chatActivity && (
                      <>
                        <span>·</span>
                        <span>
                          Last chat:{" "}
                          {new Date(deal.chatActivity.lastMessageAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Badges & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 border-t border-slate-100 lg:pt-0 lg:border-t-0">
                  {/* Risk Summary Badges */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {deal.counts.high > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                        {deal.counts.high} High
                      </span>
                    )}
                    {deal.counts.worth_reviewing > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                        {deal.counts.worth_reviewing} Review
                      </span>
                    )}
                    {deal.counts.understand > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-blue-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        {deal.counts.understand} Understand
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Delete Deal Button */}
                    <button
                      type="button"
                      onClick={() => setDealToDelete(deal)}
                      title="Delete deal history"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="hidden sm:inline">Delete</span>
                    </button>

                    {/* Open Workspace Button */}
                    <Link
                      href={`/review/${deal.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
                    >
                      <span>Open Deal</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="card-surface w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Deal History?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
              <p className="text-xs text-slate-600 font-medium truncate">
                Contract: <strong className="text-slate-900">{dealToDelete.filename}</strong>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Permanently deletes this contract, all risk analysis findings, redraft versions, and saved AI chat history.
              </p>
            </div>

            {deleteError && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setDealToDelete(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Deal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
