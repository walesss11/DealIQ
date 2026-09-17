"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar, { NavbarUser } from "@/app/components/Navbar";

export interface DashboardDeal {
  id: string;
  filename: string;
  contractType: string;
  createdAt: string;
  userRole?: string | null;
  versionCount?: number;
  latestVersionNumber?: number;
  counts: {
    high: number;
    worth_reviewing: number;
    understand: number;
    total: number;
  };
  chatActivity?: {
    lastMessageAt: string;
    messageSnippet: string;
  } | null;
}

export interface DashboardBillingStatus {
  hasFreeReview: boolean;
  freeReviewUsed: boolean;
  totalContractsCount: number;
  paidReviewsCount: number;
  priceNGN: number;
}

interface DashboardClientProps {
  user: NavbarUser & {
    priorities?: string[];
    contractTypes?: string[];
    contractExperience?: string | null;
  };
  initialDeals: DashboardDeal[];
  billingStatus?: DashboardBillingStatus;
}

export default function DashboardClient({ user, initialDeals, billingStatus }: DashboardClientProps) {
  const [deals, setDeals] = useState<DashboardDeal[]>(initialDeals);
  const [dealToDelete, setDealToDelete] = useState<DashboardDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(!user.onboardingCompleted);

  const firstName = user.name ? user.name.split(" ")[0] : "there";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const needsAttentionDeals = deals.filter(
    (d) => d.counts.high > 0 || d.counts.worth_reviewing > 0
  );

  async function handleDeleteConfirm() {
    if (!dealToDelete || isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/contracts/${dealToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete deal");
      setDeals((prev) => prev.filter((d) => d.id !== dealToDelete.id));
      setDealToDelete(null);
    } catch (err) {
      console.error("Delete deal error:", err);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      <Navbar user={user} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12 space-y-8">
        {/* Optional Profile Personalization Banner */}
        {showOnboardingBanner && (
          <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shrink-0">
                ✨
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Personalize Your Contract Risk Profile</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Set your role and deal priorities to tune clause recommendations and negotiation email drafts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Link
                href="/onboarding"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
              >
                Personalize Setup →
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setShowOnboardingBanner(false);
                  await fetch("/api/onboarding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ completed: true }),
                  }).catch(() => {});
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <section className="card-surface rounded-2xl p-6 sm:p-8 border border-slate-200/90 bg-white shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                  {user.userRole ? `${user.userRole.replace("_", " ")} Workspace` : "Contract Workspace"}
                </span>

                {billingStatus && (
                  billingStatus.hasFreeReview ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      1 Free Trial Review Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      ₦5,000 / review (Paystack)
                    </span>
                  )
                )}

                {user.priorities && user.priorities.length > 0 && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    · Tuned for {user.priorities.slice(0, 2).join(", ")}
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {getGreeting()}, {firstName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Ready to review your next deal? Upload a contract to run instant 3-layer risk checks and negotiation strategies.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Review a New Contract</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Needs Attention Section (Only rendered if items exist) */}
        {needsAttentionDeals.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                  Needs Attention ({needsAttentionDeals.length})
                </h2>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {needsAttentionDeals.slice(0, 3).map((deal) => (
                <div
                  key={`attention-${deal.id}`}
                  className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 flex flex-col justify-between hover:border-amber-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/80 px-2 py-0.5 rounded-md">
                        {deal.contractType}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(deal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-950 truncate">
                      {deal.filename}
                    </h3>

                    <p className="mt-1 text-xs text-amber-900/90 font-medium">
                      {deal.counts.high > 0
                        ? `${deal.counts.high} high-priority risk term${deal.counts.high > 1 ? "s" : ""} detected.`
                        : `${deal.counts.worth_reviewing} term${deal.counts.worth_reviewing > 1 ? "s" : ""} worth negotiating.`}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                    <Link
                      href={`/review/${deal.id}`}
                      className="text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1"
                    >
                      <span>Continue Review</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Your Deals Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight">
                Your Deals
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                All agreements reviewed in your personal workspace.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/deals"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline hidden sm:inline"
              >
                View full repository ({deals.length}) →
              </Link>
            </div>
          </div>

          {deals.length === 0 ? (
            /* Empty State */
            <div className="card-surface rounded-2xl p-12 text-center border border-dashed border-slate-300 bg-white shadow-2xs">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-2xl">
                📁
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-950">
                Your deals will appear here
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Upload your first contract and PactIQ will help you understand what you&apos;re getting, what you&apos;re giving, and what you may want to negotiate.
              </p>
              <div className="mt-6">
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition"
                >
                  <span>Review Your First Deal →</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Deals Grid */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-2xs flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition"
                >
                  <div>
                    {/* Header: Type, Version and Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 truncate max-w-[150px]">
                          {deal.contractType}
                        </span>
                        {deal.versionCount && deal.versionCount > 1 && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                            <span>🔄</span> v{deal.latestVersionNumber || deal.versionCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(deal.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-3 text-sm font-bold text-slate-950 truncate" title={deal.filename}>
                      {deal.filename}
                    </h3>

                    {/* Severity Badges */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {deal.counts.high > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                          <span>{deal.counts.high} High</span>
                        </span>
                      )}
                      {deal.counts.worth_reviewing > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          <span>{deal.counts.worth_reviewing} Review</span>
                        </span>
                      )}
                      {deal.counts.understand > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          <span>{deal.counts.understand} Note</span>
                        </span>
                      )}
                      {deal.counts.total === 0 && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          Analysis Complete
                        </span>
                      )}
                    </div>

                    {/* Chat activity snippet if present */}
                    {deal.chatActivity && (
                      <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1 font-bold text-slate-700 mb-0.5">
                          <span>💬 Ask PactIQ</span>
                        </div>
                        <p className="truncate italic">&quot;{deal.chatActivity.messageSnippet}&quot;</p>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/review/${deal.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>Continue Review</span>
                      <span>→</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDealToDelete(deal)}
                      className="text-xs text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                      title="Delete contract"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Delete Deal Confirmation Modal */}
      {dealToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-950">Delete Contract</h3>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">&quot;{dealToDelete.filename}&quot;</strong>? This will permanently remove the contract, analysis findings, and AI chat history.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDealToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-700 transition shadow-xs disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
