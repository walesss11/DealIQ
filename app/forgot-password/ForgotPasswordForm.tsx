"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setSubmitted(true);
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-6 lg:px-8 bg-slate-50 bg-subtle-pattern text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-lg shadow-sm group-hover:bg-blue-900 transition-colors">
            P
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-950">PactIQ</span>
        </Link>
        <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
          Reset your password
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600">
          Enter your email and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card-surface rounded-2xl p-8 sm:p-10 border border-slate-200/90 shadow-sm bg-white">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-start gap-3">
              <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>{error}</div>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-950">Check your inbox</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists for <strong className="text-slate-900">{email}</strong>, you will receive password reset instructions.
              </p>

              {devResetUrl && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs">
                  <div className="font-bold text-amber-900 mb-1">Local Development Quick Reset Link:</div>
                  <Link href={devResetUrl} className="text-blue-600 hover:underline break-all font-mono">
                    {devResetUrl}
                  </Link>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="email">
                  Account Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.99] transition shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? "Sending..." : "Send Reset Link →"}
              </button>

              <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
                Remember your password?{" "}
                <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
