import Link from "next/link";

const audiences = [
  {
    role: "Content Creators & Streamers",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    badge: "Sponsorships & Brand Deals",
    headline: "Never give away your face, voice, or videos forever by mistake.",
    details: [
      "Catch clauses that let brands use your videos forever for free",
      "Spot competitor lockouts that stop you from taking other deals",
      "Make sure you still get paid if the brand cancels last minute",
    ],
  },
  {
    role: "Freelancers & Consultants",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    badge: "Client Service Agreements",
    headline: "Get paid on time with zero endless unpaid revisions.",
    details: [
      "Spot payment delays (like waiting 60 to 90 days after delivering work)",
      "Put a clear limit on revision rounds so projects don't drag on forever",
      "Ensure fair notice and reimbursement if a client ends the project early",
    ],
  },
  {
    role: "Artists, Musicians & Talent",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    badge: "Licensing & Creative Work",
    headline: "Keep ownership of your creative work, name, and likeness.",
    details: [
      "Understand whether you're licensing your work or giving it away completely",
      "Stop companies from using your work to train AI models without extra pay",
      "Protect your right to future credits, royalties, and portfolio use",
    ],
  },
  {
    role: "Small Businesses & Founders",
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    badge: "Vendor MSAs & NDAs",
    headline: "Avoid risky legal liabilities before signing on the dotted line.",
    details: [
      "Spot one-sided liability clauses that put all financial risk on your business",
      "Catch sneaky auto-renewal clauses that lock you in for another year",
      "Check where disputes must be settled so you don't get forced to travel abroad",
    ],
  },
];

const engineLayers = [
  {
    layer: "01",
    title: "The Exact Contract Words",
    subtitle: "What it actually says",
    description:
      "We pull the exact sentence from your document so you can verify the facts for yourself without confusing legal jargon.",
    example:
      "“Creator hereby grants Company a perpetual, irrevocable, worldwide license to exploit and sublicense the Content in all media...”",
    badgeColor: "badge-neutral",
  },
  {
    layer: "02",
    title: "What This Means in Plain English",
    subtitle: "How it affects you",
    description:
      "A simple breakdown of how this term affects your money, your future opportunities, and your creative freedom.",
    example:
      "“The brand can reuse, edit, and resell your video forever—even in TV ads 10 years from now—without paying you another dime.”",
    badgeColor: "badge-warning",
  },
  {
    layer: "03",
    title: "What You Can Ask For Instead",
    subtitle: "How to fix it",
    description:
      "Ready-to-copy polite email messages and replacement wording you can send to negotiate a fairer agreement.",
    example:
      "“Limit usage to 12 months on social media only, with an extra 50% fee if they want to use it on TV or renew next year.”",
    badgeColor: "badge-info",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      {/* Top Announcement / Trust Banner */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur px-4 py-2 text-center text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-1.5 text-blue-600 font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Grounded Contract Review + AI Chat
        </span>
        <span className="mx-2 text-slate-300">·</span>
        <span>Every finding is backed by the real words in your contract.</span>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-base shadow-sm group-hover:bg-blue-900 transition-colors">
              D
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-950">DealIQ</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 -mt-1">Contract Intelligence</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors">How It Works</a>
            <a href="#ask-dealiq" className="hover:text-slate-950 transition-colors flex items-center gap-1.5">
              <span>Ask DealIQ AI</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">NEW</span>
            </a>
            <a href="#features" className="hover:text-slate-950 transition-colors">What We Spot</a>
            <a href="#audiences" className="hover:text-slate-950 transition-colors">Who It&apos;s For</a>
            <a href="#security" className="hover:text-slate-950 transition-colors">Privacy & Security</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              <span>Review a Contract</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="relative px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-5xl text-center">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-blue-700">
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span>Contract Intelligence & Negotiation Made Simple</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl leading-[1.1]">
              Know what you&apos;re signing{" "}
              <span className="text-blue-700 block mt-1">
                before you sign away your rights.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600 font-normal">
              Upload your agreement to uncover hidden risks in plain English, understand your trade-offs, and chat with <strong>Ask DealIQ</strong> to get ready-to-send negotiation emails in seconds.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/upload"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                <span>Review a Contract</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

            </div>

            {/* Trust Points */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>No Hallucinations — 100% Backed by Real Text</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Supports PDF & Word (.docx)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span>Context-Aware AI Assistant</span>
              </div>
            </div>

            {/* Hero Product UI Mockup */}
            <div className="relative mx-auto mt-14 max-w-5xl rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6 text-left">
                {/* Mockup Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 rounded-full bg-red-500" />
                    <span className="flex h-3 w-3 rounded-full bg-amber-500" />
                    <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="ml-2 text-xs font-bold text-slate-800">DealIQ Review: Brand Sponsorship Agreement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                      Brand Deal Agreement
                    </span>
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Verified Quotes
                    </span>
                  </div>
                </div>

                {/* Mockup Deal Snapshot Grid */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Payment</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">$12,500 on Net-30</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Usage Rights</p>
                    <p className="mt-1 text-xs font-bold text-red-600">Perpetual / Worldwide</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Exclusivity</p>
                    <p className="mt-1 text-xs font-bold text-amber-600">90-Day Competitor Lock</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Cancellation</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">14 Days Written Notice</p>
                  </div>
                </div>

                {/* Mockup Finding + Chat Drawer Overlay Preview */}
                <div className="mt-4 grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-7 rounded-xl border border-red-200 bg-red-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          HIGH ATTENTION
                        </span>
                        <span className="text-xs font-bold text-slate-900">Perpetual Content Ownership Trap</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">Section 4.2</span>
                    </div>

                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p className="text-[10px] font-bold uppercase text-slate-400">1. What It Says</p>
                        <p className="mt-1 text-slate-700 leading-relaxed text-[11px]">“Creator assigns all worldwide rights in perpetuity...”</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <p className="text-[10px] font-bold uppercase text-slate-400">2. Plain English</p>
                        <p className="mt-1 text-slate-700 leading-relaxed text-[11px]">You lose ownership forever and cannot license it elsewhere.</p>
                      </div>
                    </div>
                  </div>

                  {/* Ask DealIQ Drawer Mockup Preview */}
                  <div className="lg:col-span-5 rounded-xl border border-blue-200 bg-white p-4 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-900 text-[9px] font-bold text-white">D</span>
                        <span className="text-xs font-bold text-slate-900">Ask DealIQ</span>
                      </div>
                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                        Section 4.2 Context
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-900 text-white p-2.5 text-[11px]">
                      <p>“How do I push back on this perpetual license?”</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700 space-y-1.5">
                      <p className="font-semibold text-slate-900">Suggested Action:</p>
                      <p className="text-slate-600 leading-relaxed">
                        Ask for a 12-month digital license with a 50% fee buyout option.
                      </p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded">
                          📋 1-Click Copy Email Draft
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: The 3-Layer Framework */}
        <section id="how-it-works" className="border-t border-slate-200 bg-white px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                How DealIQ Works
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-4xl tracking-tight">
                No confusing legal talk. Just 3 clear steps for every issue.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                DealIQ breaks down every flagged contract term into 3 structured layers so you immediately understand the real-world impact and know exactly how to respond.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {engineLayers.map((layer) => (
                <div
                  key={layer.layer}
                  className="card-surface card-surface-hover rounded-2xl p-7 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-400">STEP {layer.layer}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${layer.badgeColor}`}>
                        {layer.subtitle}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{layer.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">{layer.description}</p>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Example</p>
                    <p className="mt-1.5 text-xs text-slate-700 leading-relaxed italic">{layer.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Ask DealIQ AI Spotlight */}
        <section id="ask-dealiq" className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-blue-50/30 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto">
              <span className="rounded-full border border-blue-300 bg-blue-100/70 px-3.5 py-1 text-xs font-bold text-blue-800">
                ✨ Meet Ask DealIQ
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-5xl tracking-tight leading-tight">
                An AI assistant that has already read your entire contract.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                <strong>Ask DealIQ</strong> is built directly on top of your contract review. It understands your specific agreement, your role, and your priorities—giving you clear answers and drafting ready-to-send negotiation emails on the spot.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="card-surface rounded-2xl p-6 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-lg font-bold">
                  🔍
                </div>
                <h3 className="text-base font-bold text-slate-950">Ask About Any Clause</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click on any sentence in your contract to ask what it means in plain English without copying and pasting legalese.
                </p>
              </div>

              <div className="card-surface rounded-2xl p-6 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-lg font-bold">
                  ⚖️
                </div>
                <h3 className="text-base font-bold text-slate-950">See What You&apos;re Giving Up</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ask <em>&ldquo;What am I giving the other party vs getting?&rdquo;</em> or <em>&ldquo;Is anything missing?&rdquo;</em> to spot unfair trade-offs instantly.
                </p>
              </div>

              <div className="card-surface rounded-2xl p-6 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-lg font-bold">
                  💬
                </div>
                <h3 className="text-base font-bold text-slate-950">Ready-to-Send Pushbacks</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Get polite, ready-to-paste emails and replacement wording you can send straight to the brand or client.
                </p>
              </div>

              <div className="card-surface rounded-2xl p-6 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-lg font-bold">
                  🛡️
                </div>
                <h3 className="text-base font-bold text-slate-950">Zero Made-Up Terms</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every answer points to real section numbers and exact quotes. If something isn&apos;t in the contract, DealIQ clearly tells you.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition"
              >
                <span>Try Ask DealIQ on Your Contract</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Section: Features */}
        <section id="features" className="border-t border-slate-200 bg-slate-50 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Built For Creators, Freelancers & Businesses
                </span>
                <h2 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-4xl tracking-tight leading-tight">
                  Protecting you against one-sided agreements and sneaky traps.
                </h2>
                <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600">
                  Big companies hire teams of lawyers to write contracts that heavily protect their interests. DealIQ levels the playing field with clear, practical intelligence built for you.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                      ⚡
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Spot Traps Hidden Across Multiple Sections</h4>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        Catches sneaky combinations—like an exclusivity rule that keeps you from taking other work for 6 months after the contract ends.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                      💬
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">1-Click Counter-Proposals & Email Drafts</h4>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        Get copyable replacement words and polite, professional email templates for every single flagged issue.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm">
                      🔍
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Every Finding Backed by Real Text</h4>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        Every concern shows the exact clause it came from. If a claim isn&apos;t supported by the actual document text, we reject it immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-surface rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-base font-bold text-slate-900">Common Traps DealIQ Spots</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Automated checks against standard protective guidelines.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Forever Rights & AI Training Traps", category: "IP & Content Rights", level: "High Attention", color: "badge-danger" },
                    { label: "Unlimited Financial Liability Clauses", category: "Legal Protection", level: "High Attention", color: "badge-danger" },
                    { label: "Overly Broad Competitor Lockouts", category: "Exclusivity", level: "Worth Reviewing", color: "badge-warning" },
                    { label: "Net-60 / Net-90 Late Payout Terms", category: "Getting Paid", level: "Worth Reviewing", color: "badge-warning" },
                    { label: "One-Sided Contract Changes Without Notice", category: "Governance", level: "Understand", color: "badge-info" },
                  ].map((risk, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{risk.label}</p>
                        <p className="text-[10px] text-slate-500">{risk.category}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${risk.color}`}>
                        {risk.level}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    href="/upload"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                  >
                    <span>Check Your Agreement Now</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Audiences */}
        <section id="audiences" className="border-t border-slate-200 bg-white px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-2xl mx-auto">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Tailored Checklists
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-4xl tracking-tight">
                Built specifically for the kind of work you do.
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Pick your role when uploading your contract to get customized risk checks and relevant negotiation tips.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map((item) => (
                <div
                  key={item.role}
                  className="card-surface card-surface-hover rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-slate-950">{item.role}</h3>
                    <p className="mt-1.5 text-xs text-blue-700 font-medium">{item.headline}</p>

                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {item.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/upload"
                    className="mt-6 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition"
                  >
                    Upload Agreement →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Security & Privacy */}
        <section id="security" className="border-t border-slate-200 bg-slate-50 px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              Privacy & Confidentiality First
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-950 sm:text-4xl tracking-tight">
              Your confidential documents always stay private.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              DealIQ is built with strict privacy standards. Your contracts are processed securely, stored with encryption, and never used to train public AI models.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Encrypted End-to-End</h4>
                <p className="mt-1 text-xs text-slate-600">All uploads and reviews use secure modern encryption in transit and at rest.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Zero AI Model Training</h4>
                <p className="mt-1 text-xs text-slate-600">Your documents, private rates, and terms are never shared or used to train public AI.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Zero Guesswork</h4>
                <p className="mt-1 text-xs text-slate-600">All findings point to real text in your contract—eliminating made-up or inferred terms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="border-t border-slate-200 bg-white px-6 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-900 p-8 sm:p-12 text-white shadow-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Ready to Review?</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Don&apos;t sign until you know what it means.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
              Upload your PDF or Word file right now, get an easy-to-read breakdown, and ask any question to Ask DealIQ in seconds.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/upload"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-7 text-sm font-semibold text-white shadow hover:bg-blue-500 active:scale-95 transition-all"
              >
                <span>Upload Contract — Free Review</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 px-6 py-12 text-xs text-slate-400 sm:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
                D
              </div>
              <span className="text-sm font-bold text-white tracking-wide">DealIQ</span>
            </div>
            <p className="text-xs text-slate-400">
              Empowering creators, freelancers, and businesses with transparent contract intelligence.
            </p>
          </div>

          <div className="text-slate-400 space-y-2 text-[11px] leading-relaxed">
            <p>
              <strong>Legal Notice:</strong> DealIQ uses artificial intelligence to help independent creators, professionals, and businesses understand contract terms, identify potential concerns, and prepare negotiation alternatives. DealIQ is an informational tool and does not provide legal advice or create an attorney-client relationship. For complex or high-stakes matters, consult a qualified attorney.
            </p>
            <p className="text-slate-500">
              © {new Date().getFullYear()} CaseSimpli Legal Technologies Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
