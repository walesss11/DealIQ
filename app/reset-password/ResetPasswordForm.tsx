"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      router.push(data.redirectTo || "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-6 lg:px-8 bg-slate-50 text-slate-900">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="card-surface rounded-2xl p-8 bg-white border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Invalid Password Reset Link</h2>
            <p className="mt-2 text-xs text-slate-600">
              This password reset link is missing a valid security token.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Request a New Link
            </Link>
          </div>
        </div>
      </div>
    );
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
          Set new password
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600">
          Choose a secure new password for your account.
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

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="password">
                New Password <span className="text-slate-400 font-normal">(min. 8 characters)</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.99] transition shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? "Updating password..." : "Update Password & Sign In →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
