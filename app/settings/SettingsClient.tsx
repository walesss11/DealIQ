"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar, { NavbarUser } from "@/app/components/Navbar";

interface SettingsClientProps {
  user: NavbarUser & {
    priorities?: string[];
    contractTypes?: string[];
    contractExperience?: string | null;
  };
}

const roleOptions = [
  { id: "creator", label: "Creator / Influencer" },
  { id: "freelancer", label: "Freelancer / Consultant" },
  { id: "artist", label: "Artist / Entertainer" },
  { id: "small_business", label: "Small Business / Founder" },
  { id: "employee", label: "Employee / Professional" },
  { id: "other", label: "Other / General Commercial" },
];

const priorityOptions = [
  "Getting paid fairly & on time",
  "Protecting my content / IP",
  "Limiting usage rights & perpetual licenses",
  "Avoiding excessive revisions & obligations",
  "Protecting against cancellation (Kill fees)",
  "Limiting exclusivity & competitor lockouts",
  "Limiting uncapped liability & indemnification",
  "Understanding what I'm agreeing to clearly",
];

const experienceOptions = [
  { id: "new", label: "New to contracts" },
  { id: "occasional", label: "Review contracts occasionally" },
  { id: "regular", label: "Review contracts regularly" },
  { id: "experienced", label: "Experienced" },
];

export default function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();

  const [role, setRole] = useState(user.userRole || "creator");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(user.priorities || []);
  const [experience, setExperience] = useState(user.contractExperience || "occasional");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function togglePriority(label: string) {
    setSelectedPriorities((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : [...prev, label]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: role,
          priorities: selectedPriorities,
          contractExperience: experience,
          completed: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setMessage({ type: "success", text: "Preferences updated successfully." });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update preferences.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      <Navbar user={user} />

      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-12 space-y-8">
        <div className="border-b border-slate-200 pb-5">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
            Account & Intelligence Preferences
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            Settings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Manage your personal profile and customize how PactIQ evaluates your contracts.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span>{message.type === "success" ? "✓" : "⚠️"}</span>
            <span>{message.text}</span>
          </div>
        )}

        {/* Profile Card */}
        <section className="card-surface rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-2xs space-y-6">
          <h2 className="text-base font-bold text-slate-950 border-b border-slate-100 pb-3">
            Profile Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
              <div className="text-sm font-semibold text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                {user.name || "PactIQ User"}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
              <div className="text-sm font-semibold text-slate-900 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200">
                {user.email}
              </div>
            </div>
          </div>
        </section>

        {/* Intelligence Calibration Card */}
        <form onSubmit={handleSave} className="card-surface rounded-2xl p-6 sm:p-8 bg-white border border-slate-200 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">
                Contract Intelligence Preferences
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These settings prefill your intake reviews and guide risk detection.
              </p>
            </div>

            <Link
              href="/onboarding"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Rerun Onboarding Wizard →
            </Link>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2">
              Primary Role in Agreements
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {roleOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRole(opt.id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                    role === opt.id
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priorities Multi-Select */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2">
              Top Prioritized Review Areas
            </label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((item) => {
                const isSelected = selectedPriorities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => togglePriority(item)}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-900 font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{isSelected ? "✓ " : "+ "}</span>
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience level */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-2">
              Contract Experience Level
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {experienceOptions.map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => setExperience(exp.id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                    experience === exp.id
                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Preferences..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
