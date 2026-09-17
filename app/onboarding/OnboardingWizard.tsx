"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const roleOptions = [
  {
    id: "creator",
    label: "Creator / Influencer",
    icon: "🎥",
    subtitle: "Brand sponsorships, content licensing, likeness rights, and talent agreements.",
  },
  {
    id: "freelancer",
    label: "Freelancer / Consultant",
    icon: "💼",
    subtitle: "Client master services agreements, milestone deliverables, and payment terms.",
  },
  {
    id: "artist",
    label: "Artist / Entertainer",
    icon: "🎨",
    subtitle: "Licensing agreements, publishing, royalties, performance, and likeness.",
  },
  {
    id: "small_business",
    label: "Small Business / Founder",
    icon: "🏢",
    subtitle: "Vendor contracts, NDAs, commercial partnerships, and B2B agreements.",
  },
  {
    id: "employee",
    label: "Employee / Professional",
    icon: "👔",
    subtitle: "Offer letters, non-competes, IP assignment, and severance packages.",
  },
  {
    id: "other",
    label: "Other / General Party",
    icon: "📄",
    subtitle: "Standard contract evaluation and risk check for any legal document.",
  },
];

const contractTypesByRole: Record<string, string[]> = {
  creator: [
    "Brand Deals",
    "Sponsorships",
    "Influencer Agreements",
    "Content Agreements",
    "Talent Agreements",
    "Licensing Agreements",
    "Other",
  ],
  freelancer: [
    "Freelance Agreements",
    "Service Agreements",
    "Consulting Agreements",
    "NDAs",
    "Statements of Work (SOW)",
    "Other",
  ],
  artist: [
    "Licensing Agreements",
    "Recording & Publishing Deals",
    "Performance Contracts",
    "Talent Agreements",
    "Merchandise Rights",
    "Other",
  ],
  small_business: [
    "Vendor Agreements",
    "Service Agreements",
    "Partnership Agreements",
    "NDAs",
    "Employment Agreements",
    "Software Licenses",
    "Other",
  ],
  employee: [
    "Employment Agreements",
    "Executive Offer Letters",
    "Non-Competes / IP Assignment",
    "Severance Packages",
    "Other",
  ],
  other: [
    "Commercial Contracts",
    "NDAs",
    "Service Agreements",
    "General Agreements",
    "Other",
  ],
};

const priorityOptions = [
  { id: "payment", label: "Getting paid fairly & on time", icon: "💳" },
  { id: "ip", label: "Protecting my content / IP", icon: "🛡️" },
  { id: "usage", label: "Limiting usage rights & perpetual licenses", icon: "⏳" },
  { id: "obligations", label: "Avoiding excessive revisions & obligations", icon: "📋" },
  { id: "cancellation", label: "Protecting against cancellation (Kill fees)", icon: "🚪" },
  { id: "exclusivity", label: "Limiting exclusivity & competitor lockouts", icon: "🚫" },
  { id: "liability", label: "Limiting uncapped liability & indemnification", icon: "⚖️" },
  { id: "clarity", label: "Understanding what I'm agreeing to clearly", icon: "✨" },
];

const experienceOptions = [
  {
    id: "new",
    label: "I'm new to contracts",
    subtitle: "I want plain-English explanations and step-by-step guidance on what terms mean.",
    icon: "🌱",
  },
  {
    id: "occasional",
    label: "I review contracts occasionally",
    subtitle: "I know the basics but want PactIQ to catch hidden traps and red flags.",
    icon: "📖",
  },
  {
    id: "regular",
    label: "I review contracts regularly",
    subtitle: "I need fast, tactical negotiation points and ready-to-use email drafts.",
    icon: "⚡",
  },
  {
    id: "experienced",
    label: "I'm experienced",
    subtitle: "I want exhaustive cross-clause risk audits, redrafts, and precise clause comparisons.",
    icon: "🎯",
  },
];

interface OnboardingWizardProps {
  initialState?: {
    onboardingStep?: number;
    userRole?: string | null;
    contractTypes?: string[];
    priorities?: string[];
    contractExperience?: string | null;
  };
}

export default function OnboardingWizard({ initialState }: OnboardingWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(initialState?.onboardingStep || 1);
  const [role, setRole] = useState(initialState?.userRole || "creator");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialState?.contractTypes || ["Brand Deals", "Sponsorships"]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    initialState?.priorities || ["Getting paid fairly & on time", "Protecting my content / IP"]
  );
  const [experience, setExperience] = useState(initialState?.contractExperience || "occasional");
  const [saving, setSaving] = useState(false);

  // Sync state whenever step changes
  async function persistProgress(nextStep: number, completed = false) {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingStep: nextStep,
          userRole: role,
          contractTypes: selectedTypes,
          priorities: selectedPriorities,
          contractExperience: experience,
          completed,
        }),
      });
    } catch (e) {
      console.warn("Could not persist onboarding step:", e);
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    const nextStep = step + 1;
    setStep(nextStep);
    persistProgress(nextStep, false);
  }

  function handleBack() {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      persistProgress(prevStep, false);
    }
  }

  async function handleComplete(targetRoute: "/upload" | "/dashboard") {
    setSaving(true);
    try {
      await persistProgress(6, true);
    } catch (e) {
      console.warn("Could not save onboarding progress:", e);
    }
    window.location.href = targetRoute;
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await persistProgress(6, true);
    } catch (e) {
      console.warn("Could not save onboarding progress:", e);
    }
    window.location.href = "/dashboard";
  }

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function togglePriority(priorityLabel: string) {
    setSelectedPriorities((prev) =>
      prev.includes(priorityLabel)
        ? prev.filter((p) => p !== priorityLabel)
        : [...prev, priorityLabel]
    );
  }

  const availableContractTypes = contractTypesByRole[role] || contractTypesByRole.other;

  return (
    <div className="min-h-screen bg-slate-50 bg-subtle-pattern text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-2xs">
              P
            </div>
            <span className="text-base font-bold tracking-tight text-slate-950">PactIQ</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Step {step} of 6
            </span>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-600 hover:text-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer"
            >
              Skip to Dashboard →
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1">
        <div
          className="bg-blue-600 h-1 transition-all duration-300 ease-out"
          style={{ width: `${(step / 6) * 100}%` }}
        />
      </div>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-10 sm:py-16">
        <div className="w-full max-w-2xl">
          {/* SCREEN 1: WELCOME */}
          {step === 1 && (
            <div className="card-surface rounded-2xl p-8 sm:p-12 text-center bg-white border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-3xl mb-6">
                ✨
              </div>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                Personalize Your Experience
              </span>
              <h1 className="mt-4 text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                Let&apos;s personalize PactIQ for you.
              </h1>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                A few quick questions will help us tailor your contract reviews to your specific role, deal types, and the terms that matter most to you.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto min-w-[200px] py-3 px-6 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.99] transition shadow-xs cursor-pointer"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: ROLE SELECTION */}
          {step === 2 && (
            <div className="card-surface rounded-2xl p-6 sm:p-10 bg-white border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Step 2 · Your Profile
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                  What best describes you?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  We use your role to calibrate contract risk thresholds and recommend favorable alternatives.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {roleOptions.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-600"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{r.icon}</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-950">{r.label}</span>
                        </div>
                        {isSelected && <span className="flex h-2 w-2 rounded-full bg-blue-600" />}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{r.subtitle}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-5 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: CONTRACT TYPES */}
          {step === 3 && (
            <div className="card-surface rounded-2xl p-6 sm:p-10 bg-white border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Step 3 · Agreements & Deals
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                  What types of deals do you typically review?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select all that apply. We will tune our clause checklist for these agreements.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {availableContractTypes.map((type) => {
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`inline-flex items-center gap-2 py-2 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedTypes.length === 0}
                  className="py-2.5 px-5 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: PRIORITIES */}
          {step === 4 && (
            <div className="card-surface rounded-2xl p-6 sm:p-10 bg-white border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Step 4 · Core Priorities
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                  What matters most to you when reviewing a deal?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select your top concerns. PactIQ will emphasize these areas in your Deal at a Glance and risk findings.
                </p>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {priorityOptions.map((item) => {
                  const isSelected = selectedPriorities.includes(item.label);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePriority(item.label)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <span className="text-xs sm:text-sm font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedPriorities.length === 0}
                  className="py-2.5 px-5 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: EXPERIENCE LEVEL */}
          {step === 5 && (
            <div className="card-surface rounded-2xl p-6 sm:p-10 bg-white border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Step 5 · Legal Experience
                </span>
                <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                  How experienced are you with contracts?
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  This helps us tune the complexity of our plain-English explanations.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {experienceOptions.map((exp) => {
                  const isSelected = experience === exp.id;
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setExperience(exp.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-2xl shrink-0">{exp.icon}</span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-950">{exp.label}</h4>
                        <p className="mt-0.5 text-xs text-slate-500">{exp.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-5 rounded-xl bg-slate-900 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 active:scale-95 transition shadow-xs cursor-pointer"
                >
                  Finalize Personalization →
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 6: COMPLETION CONFIRMATION */}
          {step === 6 && (
            <div className="card-surface rounded-2xl p-8 sm:p-12 text-center bg-white border border-slate-200 shadow-sm animate-in fade-in duration-200">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-3xl mb-6">
                🎉
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                Personalization Complete
              </span>
              <h1 className="mt-4 text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                You&apos;re ready to review your first deal.
              </h1>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                PactIQ will use your preferences to make your contract reviews, 3-layer risk breakdowns, and tactical negotiation strategies immediately relevant to you.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleComplete("/upload")}
                  className="w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Review a Contract →"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleComplete("/dashboard")}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
