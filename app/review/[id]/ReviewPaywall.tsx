"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar, { NavbarUser } from "@/app/components/Navbar";

interface ReviewPaywallProps {
  reviewId: string;
  contractId: string;
  filename: string;
  contractType: string;
  userRole?: string;
  user?: NavbarUser | null;
  highCount?: number;
  worthCount?: number;
  understandCount?: number;
  missingCount?: number;
  priceNGN?: number;
  freeTrialUsed?: boolean;
}

export default function ReviewPaywall({
  reviewId,
  contractId,
  filename,
  contractType,
  userRole,
  user,
  highCount = 0,
  worthCount = 0,
  understandCount = 0,
  missingCount = 0,
  priceNGN = 5000,
  freeTrialUsed = true,
}: ReviewPaywallProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Check if returning from Paystack redirect with reference
  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (reference && !verificationSuccess) {
      handleAutoVerify(reference);
    }
  }, [searchParams]);

  async function handleAutoVerify(reference: string) {
    setVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, reviewId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment verification failed. If your account was charged, please contact support.");
      }

      setVerificationSuccess(true);
      // Refresh page to load the unlocked review
      setTimeout(() => {
        router.push(`/review/${contractId}`);
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment verification failed";
      setErrorMessage(msg);
    } finally {
      setVerifying(false);
    }
  }

  async function handlePaystackCheckout() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment gateway.");
      }

      const authUrl =
        data.authorizationUrl ||
        data.authorization_url ||
        data.data?.authorization_url;

      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("Missing authorization URL from payment gateway.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      setLoading(false);
    }
  }

  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(priceNGN);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern flex flex-col">
      {user && <Navbar user={user} />}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-center">
        {/* Verification in Progress Banner */}
        {verifying && (
          <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 p-6 text-center animate-pulse shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3">
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-950">Verifying Paystack Payment...</h3>
            <p className="text-sm text-blue-700 mt-1">
              Securing transaction and unlocking your contract risk intelligence.
            </p>
          </div>
        )}

        {verificationSuccess && (
          <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-300 p-6 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white mb-3 font-black text-xl shadow-xs">
              ✓
            </div>
            <h3 className="text-xl font-extrabold text-emerald-950">Payment Confirmed!</h3>
            <p className="text-sm text-emerald-800 mt-1">
              Your contract review has been successfully unlocked. Redirecting to your report...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-5 text-sm text-red-800 flex items-start gap-3 shadow-sm">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold text-red-950">Payment Status Notice</p>
              <p className="mt-0.5 text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Paywall Card */}
        <div className="card-surface rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 sm:p-10">
          {/* Header & Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Free Trial Review Used
                </span>
                <span className="text-xs font-semibold text-slate-500">· {contractType}</span>
              </div>
              <h1 className="mt-2.5 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2.5">
                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{filename}</span>
              </h1>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Review Fee</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {formattedPrice}
              </div>
            </div>
          </div>

          {/* Explanation banner */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Every PactIQ account receives <strong className="text-slate-950">1 complimentary contract review</strong>. Your trial review has been used. Unlock full clause-by-clause intelligence and negotiation counter-proposals for <strong className="text-slate-950 font-bold">{formattedPrice}</strong>.
            </p>
          </div>

          {/* Teaser Findings Breakdown (Locked Preview) */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>AI Analysis Ready & Locked</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">100% Zero-Knowledge Verified</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-center">
                <div className="text-2xl font-black text-red-600">{highCount > 0 ? highCount : "—"}</div>
                <div className="text-[11px] font-bold text-red-800 uppercase tracking-wide mt-1">High Risks</div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
                <div className="text-2xl font-black text-amber-600">{worthCount > 0 ? worthCount : "—"}</div>
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mt-1">Negotiable</div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
                <div className="text-2xl font-black text-blue-600">{understandCount > 0 ? understandCount : "—"}</div>
                <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wide mt-1">Noteworthy</div>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 text-center">
                <div className="text-2xl font-black text-purple-600">{missingCount > 0 ? missingCount : "—"}</div>
                <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wide mt-1">Missing Terms</div>
              </div>
            </div>

            {/* Blurred Teaser Clause Cards */}
            <div className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-5 overflow-hidden">
              <div className="filter blur-xs select-none opacity-40 space-y-3">
                <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                <div className="h-10 bg-white rounded-xl w-full border border-slate-200"></div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px] p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mb-2 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-950">Full Intelligence Protected</h4>
                <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">
                  Includes clause-by-clause plain English breakdowns, counter-offer email drafts, missing critical provisions, and multi-version redlines.
                </p>
              </div>
            </div>
          </div>

          {/* Value Highlights */}
          <div className="mt-8 grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Instant AI Clause-by-Clause Risk Breakdown</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Pre-Drafted Counter-Offer Emails & Redlines</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Nigerian Legal Grounding & Protection Rules</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Continuous Deal Redline & Version Tracker</span>
            </div>
          </div>

          {/* Action CTA */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              ← Back to Dashboard
            </Link>

            <button
              onClick={handlePaystackCheckout}
              disabled={loading || verifying}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 h-12 rounded-lg bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-[0.99] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Connecting to Paystack...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Pay {formattedPrice} with Paystack</span>
                </>
              )}
            </button>
          </div>

          {/* Payment Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secured by Paystack
            </span>
            <span>·</span>
            <span>Cards, Bank Transfer & USSD Supported</span>
            <span>·</span>
            <span>One-time review fee</span>
          </div>
        </div>
      </main>
    </div>
  );
}
