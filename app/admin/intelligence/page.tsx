import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIntelligencePage() {
  const [
    totalFindings,
    validatedCount,
    rejectedFindings,
    findingsByCategory,
    findingsBySeverity,
    crossClauseCount,
  ] = await Promise.all([
    prisma.finding.count(),
    prisma.finding.count({ where: { sourceValidated: true } }),
    prisma.finding.findMany({
      where: { sourceValidated: false },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        clause: true,
        review: {
          include: {
            contractVersion: {
              include: { contract: { select: { filename: true } } },
            },
          },
        },
      },
    }),
    prisma.finding.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
    prisma.finding.groupBy({
      by: ["severity"],
      _count: { _all: true },
    }),
    prisma.finding.count({
      where: { isCrossClause: true },
    }),
  ]);

  const rejectedCount = totalFindings - validatedCount;
  const groundingPassRate = totalFindings > 0 ? Math.round((validatedCount / totalFindings) * 100) : 100;

  const severityHigh = findingsBySeverity.find((s) => s.severity === "high")?._count._all || 0;
  const severityWorth = findingsBySeverity.find((s) => s.severity === "worth_reviewing")?._count._all || 0;
  const severityUnderstand = findingsBySeverity.find((s) => s.severity === "understand")?._count._all || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
          AI Intelligence & Grounding Telemetry
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Auditing AI review accuracy, source validation pass rates, and contractual risk patterns.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Findings Surfaced</span>
          <p className="mt-2 text-3xl font-black text-slate-950">{totalFindings}</p>
          <p className="mt-1 text-xs text-slate-500">Across all reviewed contract versions</p>
        </div>

        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">Grounding Pass Rate</span>
          <p className="mt-2 text-3xl font-black text-emerald-700">{groundingPassRate}%</p>
          <p className="mt-1 text-xs text-slate-500">{validatedCount} verified verbatim</p>
        </div>

        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 block">Grounding Rejections</span>
          <p className="mt-2 text-3xl font-black text-red-600">{rejectedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Hallucinations blocked by validator</p>
        </div>

        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">Cross-Clause Compound Risks</span>
          <p className="mt-2 text-3xl font-black text-indigo-700">{crossClauseCount}</p>
          <p className="mt-1 text-xs text-slate-500">Multi-clause interplay triggers</p>
        </div>
      </div>

      {/* Category Breakdown & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finding Category Distribution */}
        <div className="card-surface rounded-2xl p-6 border border-slate-200 bg-white shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
            Findings by Contract Category
          </h2>
          <p className="text-xs text-slate-500 mb-4">Volume of issues surfaced across legal categories.</p>

          <div className="space-y-3">
            {findingsByCategory.map((cat) => {
              const pct = totalFindings > 0 ? Math.round((cat._count._all / totalFindings) * 100) : 0;
              return (
                <div key={cat.category}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-800 capitalize">{cat.category.replaceAll("_", " ")}</span>
                    <span className="text-slate-500 font-mono">
                      {cat._count._all} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-slate-900 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Ratios */}
        <div className="card-surface rounded-2xl p-6 border border-slate-200 bg-white shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-1">
            Risk Severity Proportions
          </h2>
          <p className="text-xs text-slate-500 mb-4">Balance between high-attention alerts and comprehension terms.</p>

          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-900">High Attention (Red Flags)</p>
                <p className="text-[11px] text-red-700">Material risks requiring modification before signing.</p>
              </div>
              <span className="text-lg font-black text-red-700 font-mono">{severityHigh}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-900">Worth Reviewing</p>
                <p className="text-[11px] text-amber-700">Terms to be aware of or negotiate for fair balance.</p>
              </div>
              <span className="text-lg font-black text-amber-700 font-mono">{severityWorth}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900">Understand This</p>
                <p className="text-[11px] text-blue-700">Fair, standard, or positive provisions for full comprehension.</p>
              </div>
              <span className="text-lg font-black text-blue-700 font-mono">{severityUnderstand}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grounding Rejections Audit Log */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">
            Grounding Rejections Audit (Blocked Candidates)
          </h2>
          <p className="text-xs text-slate-500">
            PactIQ Source Validator automatically blocks candidate findings if they cannot be grounded verbatim.
          </p>
        </div>

        {rejectedFindings.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            ✓ Zero unvalidated findings in recent review runs.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rejectedFindings.map((rf) => (
              <div key={rf.id} className="p-5 hover:bg-slate-50/60 transition text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rf.title}</span>
                    <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      BLOCKED
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] mb-1.5">
                  <span>Category: <strong className="text-slate-800 capitalize">{rf.category.replaceAll("_", " ")}</strong></span>
                  <span>·</span>
                  <span>Severity: <strong className="text-slate-800 uppercase">{rf.severity}</strong></span>
                </div>
                <p className="text-[11px] text-red-600 font-semibold">
                  Rejection Reason: {rf.rejectionReason || "Could not be verified against verbatim contract text (Zero-Knowledge Filter)."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
