"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const roles = [
  {
    id: "creator",
    label: "Creator / Influencer / Artist",
    badge: "Media & Talent",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    subtitle: "Brand sponsorships, content licensing, likeness rights, and IP protection.",
  },
  {
    id: "freelancer",
    label: "Freelancer / Consultant",
    badge: "Services",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    subtitle: "Client master services agreements, milestone deliverables, and payment terms.",
  },
  {
    id: "small_business",
    label: "Small Business / Founder",
    badge: "Commercial",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    subtitle: "Vendor contracts, NDAs, joint ventures, and enterprise partnership agreements.",
  },
  {
    id: "employee",
    label: "Employee / Executive",
    badge: "Employment",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    subtitle: "Offer letters, non-competes, severance packages, and invention assignments.",
  },
  {
    id: "other",
    label: "General / Other Party",
    badge: "General",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    subtitle: "Standard contract evaluation and risk check for any legal document.",
  },
];

const contractTypes: Record<string, string[]> = {
  creator: [
    "Brand Sponsorship",
    "Influencer Agreement",
    "Content Licensing",
    "Talent Agreement",
    "Agency Representation",
    "Other",
  ],
  freelancer: [
    "Freelance Agreement",
    "Independent Contractor Agreement",
    "Statement of Work (SOW)",
    "Consulting Agreement",
    "Other",
  ],
  small_business: [
    "Master Services Agreement (MSA)",
    "Vendor Agreement",
    "Non-Disclosure Agreement (NDA)",
    "Partnership Agreement",
    "Software License",
    "Other",
  ],
  employee: ["Employment Agreement", "Executive Offer Letter", "Non-Compete / IP Assignment", "Other"],
  other: ["General Commercial Contract"],
};

const priorities = [
  { label: "Getting paid on time", icon: "💳" },
  { label: "Protecting my IP & content rights", icon: "🛡️" },
  { label: "Avoiding exclusivity lockouts", icon: "🚫" },
  { label: "Clear termination & cancellation terms", icon: "🚪" },
  { label: "Limiting uncapped liability & indemnity", icon: "⚖️" },
  { label: "Clear revision limits & deadlines", icon: "⏱️" },
  { label: "Review everything thoroughly", icon: "✨" },
];

const pipelineStages = [
  "Extracting document text and metadata...",
  "Segmenting contract into clause units...",
  "Running clause-level and cross-clause risk engines...",
  "Verifying source citations and formulating negotiation options...",
];

type ApiError = { error?: string };

async function readJson(response: Response): Promise<Record<string, unknown> & ApiError> {
  try {
    return (await response.json()) as Record<string, unknown> & ApiError;
  } catch {
    return {};
  }
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [contractType, setContractType] = useState("");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [billingStatus, setBillingStatus] = useState<{ hasFreeReview: boolean; freeReviewUsed: boolean; priceNGN: number } | null>(null);

  // Load user profile & onboarding preferences and billing status
  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, billingRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/payments/status"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.authenticated && meData.user) {
            if (meData.user.userRole && !role) {
              setRole(meData.user.userRole);
              const types = contractTypes[meData.user.userRole] ?? [];
              if (types.length > 0 && !contractType) {
                setContractType(types[0]);
              }
            }
            if (Array.isArray(meData.user.priorities) && meData.user.priorities.length > 0 && selectedPriorities.length === 0) {
              setSelectedPriorities(meData.user.priorities);
            }
          }
        }

        if (billingRes.ok) {
          const billingData = await billingRes.json();
          setBillingStatus(billingData);
        }
      } catch (e) {
        console.warn("Could not load user or billing status:", e);
      }
    }
    loadData();
  }, []);

  const availableTypes = useMemo(() => contractTypes[role] ?? [], [role]);
  const isBusy = status !== "idle";

  function togglePriority(priority: string) {
    setSelectedPriorities((current) => {
      if (priority === "Review everything thoroughly") {
        return current.includes("Review everything thoroughly") ? [] : ["Review everything thoroughly"];
      }
      const withoutEverything = current.filter((item) => item !== "Review everything thoroughly");
      return withoutEverything.includes(priority)
        ? withoutEverything.filter((item) => item !== priority)
        : [...withoutEverything, priority];
    });
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file || !role || !contractType) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a file smaller than 10 MB.");
      return;
    }

    try {
      setStatus("uploading");
      setStageIndex(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userRole", role);
      formData.append("userContractType", contractType);
      formData.append("userPriorities", JSON.stringify(selectedPriorities));

      const uploadResponse = await fetch("/api/contracts", { method: "POST", body: formData });
      const uploadResult = await readJson(uploadResponse);
      if (!uploadResponse.ok || typeof uploadResult.contractId !== "string") {
        throw new Error(uploadResult.error || "The contract could not be uploaded.");
      }

      setStatus("analyzing");
      setStageIndex(1);
      const stageInterval = setInterval(() => {
        setStageIndex((prev) => (prev < pipelineStages.length - 1 ? prev + 1 : prev));
      }, 3500);

      const analysisResponse = await fetch(`/api/contracts/${uploadResult.contractId}/analyze`, {
        method: "POST",
      });
      clearInterval(stageInterval);

      const analysisResult = await readJson(analysisResponse);
      if (!analysisResponse.ok) {
        throw new Error(analysisResult.error || "The contract could not be analyzed.");
      }

      router.push(`/review/${uploadResult.contractId}`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/deals"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <span>📁</span>
              <span>Your Deals</span>
            </Link>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>Secure Intake Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Upload Container */}
      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <div className="card-surface rounded-2xl p-6 sm:p-10">
          <div className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Contract Intake
              </span>
              {billingStatus && (
                billingStatus.hasFreeReview ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    1 Free Trial Review Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    ₦5,000 per review (Paystack)
                  </span>
                )
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              Upload your agreement for review
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Provide your contract along with your role. PactIQ will analyze key provisions, detect one-sided terms, and generate tactical negotiation recommendations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {/* Step 1: File Dropzone */}
            <section>
              <div className="flex items-center justify-between">
                <label htmlFor="contract-file" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    1
                  </span>
                  <span>Select Contract Document</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">PDF or DOCX (up to 10 MB)</span>
              </div>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition-all ${
                  isDragging
                    ? "border-blue-600 bg-blue-50/50"
                    : file
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-blue-600">
                  {file ? (
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-900">
                  {file ? file.name : "Click to select a file, or drag and drop it here"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · File loaded & ready for evaluation`
                    : "Supports standard PDF or Microsoft Word (.docx) files"}
                </p>

                {file && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                    className="mt-3 text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove file
                  </button>
                )}

                <input
                  id="contract-file"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={isBusy}
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </section>

            {/* Step 2: Role Selector */}
            <section>
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  2
                </span>
                <span>Who are you in this agreement?</span>
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {roles.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setRole(r.id);
                        setContractType("");
                      }}
                      className={`flex flex-col text-left rounded-xl border p-4 transition-all duration-150 ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-md ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}>
                            {r.icon}
                          </div>
                          <span className="text-xs font-bold text-slate-950">{r.label}</span>
                        </div>
                        {isSelected && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{r.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: Contract Type Chips */}
            {role && (
              <section className="transition-opacity duration-200">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    3
                  </span>
                  <span>What kind of contract is this?</span>
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableTypes.map((type) => {
                    const isSelected = contractType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setContractType(type)}
                        className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Step 4: Priorities Multi-Select */}
            <fieldset>
              <legend className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  4
                </span>
                <span>What areas matter most to you? <span className="font-normal text-slate-500 text-xs">(Optional)</span></span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {priorities.map((item) => {
                  const selected = selectedPriorities.includes(item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={isBusy}
                      aria-pressed={selected}
                      onClick={() => togglePriority(item.label)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-start gap-3"
              >
                <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-bold text-red-900">Analysis could not be completed</p>
                  <p className="mt-0.5 text-red-700 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Active Analysis Progress Box */}
            {isBusy && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{status === "uploading" ? "Uploading & Extracting Document..." : "PactIQ Intelligence Pipeline Running..."}</span>
                  </span>
                  <span className="text-[11px] font-mono text-blue-700">Step {stageIndex + 1} of 4</span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-200/80">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                    style={{ width: `${((stageIndex + 1) / 4) * 100}%` }}
                  />
                </div>

                <p className="mt-2.5 text-xs text-blue-800 font-medium">
                  {pipelineStages[stageIndex]}
                </p>
              </div>
            )}

            {/* Pricing Note */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 flex items-start gap-3">
              <div className="text-base shrink-0 mt-0.5">
                {billingStatus?.hasFreeReview ? "🎁" : "💳"}
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-900">
                  {billingStatus?.hasFreeReview
                    ? "Free Trial Review Included"
                    : "Pay-Per-Review via Paystack (₦5,000)"}
                </p>
                <p className="text-slate-500 leading-relaxed">
                  {billingStatus?.hasFreeReview
                    ? "Your first contract review is completely free with full access to high-risk warnings and negotiation emails."
                    : "Your free trial review has been used. You'll preview the detected risk counts before unlocking complete clause intelligence for ₦5,000."}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBusy || !file || !role || !contractType}
              className="w-full h-12 rounded-lg bg-slate-900 font-bold text-white text-sm shadow-sm hover:bg-slate-800 active:scale-[0.99] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "uploading"
                ? "Extracting document..."
                : status === "analyzing"
                ? "Analyzing & validating terms..."
                : "Analyze Contract with PactIQ →"}
            </button>

            {/* Footer Disclaimer */}
            <p className="text-center text-[11px] text-slate-500 leading-relaxed">
              PactIQ is an informational intelligence tool and does not provide legal advice. Your documents are processed privately and securely.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
