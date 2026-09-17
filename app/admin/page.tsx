import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  // 1. Fetch live metrics
  const [
    totalContracts,
    totalVersions,
    totalReviews,
    totalUsers,
    totalFindings,
    totalPayments,
  ] = await Promise.all([
    prisma.contract.count(),
    prisma.contractVersion.count(),
    prisma.review.count(),
    prisma.user.count(),
    prisma.finding.count(),
    prisma.payment.count(),
  ]);

  // 2. Reviews pipeline status
  const reviewStatuses = await prisma.review.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const completedCount = reviewStatuses.find((s) => s.status === "complete")?._count._all || 0;
  const runningCount = reviewStatuses.find((s) => s.status === "running")?._count._all || 0;
  const errorCount = reviewStatuses.find((s) => s.status === "error")?._count._all || 0;
  const successRate = totalReviews > 0 ? Math.round((completedCount / totalReviews) * 100) : 100;

  // 3. Grounding pass rate
  const validatedCount = await prisma.finding.count({
    where: { sourceValidated: true },
  });
  const groundingRate = totalFindings > 0 ? Math.round((validatedCount / totalFindings) * 100) : 100;

  // 4. Severity breakdown
  const findingsBySeverity = await prisma.finding.groupBy({
    by: ["severity"],
    _count: { _all: true },
  });

  const highSeverity = findingsBySeverity.find((s) => s.severity === "high")?._count._all || 0;
  const worthSeverity = findingsBySeverity.find((s) => s.severity === "worth_reviewing")?._count._all || 0;
  const understandSeverity = findingsBySeverity.find((s) => s.severity === "understand")?._count._all || 0;

  // 5. Recent Contracts
  const recentContracts = await prisma.contract.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      versions: {
        take: 1,
        orderBy: { versionNumber: "desc" },
        include: {
          reviews: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              findings: { select: { severity: true } },
            },
          },
        },
      },
    },
  });

  // 6. User Roles Breakdown
  const userRoles = await prisma.user.groupBy({
    by: ["userRole"],
    _count: { _all: true },
  });

  // 7. Contract Types Breakdown
  const contractTypes = await prisma.contract.groupBy({
    by: ["contractType"],
    _count: { _all: true },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
          Executive Operations Overview
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Real-time metrics, review pipeline telemetry, and user growth across PactIQ.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contracts */}
        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Contracts</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 text-sm font-bold">
              📑
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{totalContracts}</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{totalVersions}</span> total versions tracked
          </p>
        </div>

        {/* Registered Users */}
        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-sm font-bold">
              👥
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{totalUsers}</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{totalReviews}</span> total reviews initiated
          </p>
        </div>

        {/* Grounding & Verification Rate */}
        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Grounding Pass Rate</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold">
              🎯
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-700">{groundingRate}%</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{validatedCount}</span> of {totalFindings} verified
          </p>
        </div>

        {/* Pipeline Success Rate */}
        <div className="card-surface rounded-2xl p-5 border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pipeline Health</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 text-sm font-bold">
              ⚡
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{successRate}%</p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600">{completedCount} success</span> ·{" "}
            <span className="font-semibold text-red-600">{errorCount} failed</span>
          </p>
        </div>
      </div>

      {/* Pipeline Status Monitor & Risk Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="card-surface rounded-2xl p-6 border border-slate-200 bg-white shadow-xs lg:col-span-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Finding Severity Distribution
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Breakdown of all {totalFindings} findings surfaced across the system.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> High Attention
                </span>
                <span className="text-slate-900 font-bold">{highSeverity}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${totalFindings > 0 ? (highSeverity / totalFindings) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-600" /> Worth Reviewing
                </span>
                <span className="text-slate-900 font-bold">{worthSeverity}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-amber-600 h-2 rounded-full"
                  style={{ width: `${totalFindings > 0 ? (worthSeverity / totalFindings) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Understand This
                </span>
                <span className="text-slate-900 font-bold">{understandSeverity}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${totalFindings > 0 ? (understandSeverity / totalFindings) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contract Types & Personas */}
        <div className="card-surface rounded-2xl p-6 border border-slate-200 bg-white shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Ecosystem Distribution
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Contract types and user personas active on PactIQ.</p>
            </div>
            <Link
              href="/admin/contracts"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View all contracts →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Top Contract Types */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Top Contract Types
              </span>
              <div className="space-y-2">
                {contractTypes.slice(0, 4).map((ct, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate max-w-[160px]">{ct.contractType || "General Agreement"}</span>
                    <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {ct._count._all}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top User Personas */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Top User Roles
              </span>
              <div className="space-y-2">
                {userRoles.slice(0, 4).map((ur, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate max-w-[160px]">{ur.userRole || "Unspecified"}</span>
                    <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {ur._count._all}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Ingested Contracts Queue */}
      <div className="card-surface rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">
              Recent Contracts Ingested
            </h2>
            <p className="text-xs text-slate-500">Live feed of contract reviews uploaded to the platform.</p>
          </div>
          <Link
            href="/admin/contracts"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Audit Table →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3">Contract Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Findings Breakdown</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentContracts.map((c) => {
                const latestVersion = c.versions[0];
                const latestReview = latestVersion?.reviews[0];
                const fList = latestReview?.findings || [];
                const high = fList.filter((f) => f.severity === "high").length;
                const worth = fList.filter((f) => f.severity === "worth_reviewing").length;
                const understand = fList.filter((f) => f.severity === "understand").length;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5">
                      <p className="font-bold text-slate-900 truncate max-w-[220px]">{c.filename}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        v{latestVersion?.versionNumber || 1} · {new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-600">
                      {c.contractType || "General"}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-900 font-medium">{c.user?.name || "User"}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]">{c.user?.email || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                          {high} H
                        </span>
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                          {worth} W
                        </span>
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                          {understand} U
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          c.status === "complete"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "processing"
                            ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href="/admin/contracts"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950"
                      >
                        <span>Audit Log</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
