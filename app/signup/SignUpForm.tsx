"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/onboarding";
  const isGoogleDevDemo = searchParams.get("google_dev_demo") === "true";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      router.push(data.redirectTo || "/onboarding");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError(null);
    setGoogleLoading(true);

    if (isGoogleDevDemo) {
      try {
        const devEmail = prompt("Enter Google account email (e.g. alex@gmail.com):", "alex.creator@gmail.com");
        if (!devEmail) {
          setGoogleLoading(false);
          return;
        }

        const res = await fetch("/api/auth/google/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: devEmail,
            name: devEmail.split("@")[0].replace(".", " "),
            sub: `google_${devEmail.replace(/[^a-zA-Z0-9]/g, "")}`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google sign up failed");

        router.push(data.redirectTo || "/onboarding");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Google sign up failed");
        setGoogleLoading(false);
      }
      return;
    }

    window.location.href = `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;
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
          Get started with PactIQ
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-600">
          Create an account to personalize your contract intelligence.
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

          {/* Primary CTA: Google Auth */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition shadow-2xs disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="email">
                Email Address
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

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5" htmlFor="password">
                Password <span className="text-slate-400 font-normal">(min. 8 characters)</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.99] transition shadow-xs disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? "Creating account..." : "Create PactIQ Account →"}
            </button>
          </form>

          {/* Switch to Sign In */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-600">
            Already have an account?{" "}
            <Link
              href={`/login${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 font-medium transition">
            ← Back to PactIQ Homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
