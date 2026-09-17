"use client";

import { useState } from "react";

interface PromoteAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PromoteAdminModal({ isOpen, onClose, onSuccess }: PromoteAdminModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter a valid user email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/users/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to promote user.");
      }

      setSuccessMsg(data.message || "User successfully granted Admin privileges.");
      setTimeout(() => {
        onSuccess();
        onClose();
        setEmail("");
        setSuccessMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-base shadow-xs">
              🛡️
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">Add / Promote Admin</h2>
              <p className="text-xs text-slate-500">Grant system management privileges</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 leading-relaxed">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-bold leading-relaxed">
              ✓ {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              User Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. colleague@company.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-950"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              The user must have an existing PactIQ account.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Admin Privilege Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={`p-3 rounded-xl border text-left transition ${
                  role === "ADMIN"
                    ? "border-slate-950 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="block font-bold text-xs">Standard Admin</span>
                <span className={`block text-[10px] mt-0.5 ${role === "ADMIN" ? "text-slate-300" : "text-slate-500"}`}>
                  View telemetry & re-run pipelines
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole("SUPER_ADMIN")}
                className={`p-3 rounded-xl border text-left transition ${
                  role === "SUPER_ADMIN"
                    ? "border-amber-600 bg-amber-600 text-white shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="block font-bold text-xs">Super Admin</span>
                <span className={`block text-[10px] mt-0.5 ${role === "SUPER_ADMIN" ? "text-amber-100" : "text-slate-500"}`}>
                  Full control & promote other admins
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600 leading-relaxed space-y-1">
            <span className="font-bold text-slate-800 block">🔒 Zero-Knowledge Guarantee:</span>
            <span>
              Admins only receive access to pipeline diagnostics, user management, and telemetry. Admins will <strong>never</strong> have access to user contracts or private documents.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Promoting...</span>
                </>
              ) : (
                <span>Confirm & Promote Admin</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
