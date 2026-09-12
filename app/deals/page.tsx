import Link from "next/link";
import { getLatestChatPerContract } from "@/lib/db/chatDb";
import { prisma } from "@/lib/db/prisma";
import DealsListClient, { DealItem } from "./DealsListClient";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          reviews: {
            where: { status: "complete" },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              findings: {
                where: { sourceValidated: true },
              },
            },
          },
        },
      },
    },
  });

  const contractIds = contracts.map((c) => c.id);
  const chatActivityMap = await getLatestChatPerContract(contractIds);

  const initialDeals: DealItem[] = contracts.map((c) => {
    const version = c.versions[0];
    const review = version?.reviews[0];
    const findings = review?.findings || [];
    const highCount = findings.filter((f) => f.severity === "high").length;
    const worthCount = findings.filter((f) => f.severity === "worth_reviewing").length;
    const understandCount = findings.filter((f) => f.severity === "understand").length;
    const chatActivity = chatActivityMap.get(c.id);

    return {
      id: c.id,
      filename: c.filename,
      contractType: c.contractType || "Commercial Contract",
      createdAt: c.createdAt.toISOString(),
      userRole: review?.userRole,
      counts: {
        high: highCount,
        worth_reviewing: worthCount,
        understand: understandCount,
        total: findings.length,
      },
      chatActivity: chatActivity
        ? {
            lastMessageAt: chatActivity.lastMessageAt.toISOString(),
            messageSnippet: chatActivity.messageSnippet,
          }
        : null,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-xs group-hover:bg-blue-900 transition-colors">
              P
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-950">PactIQ</span>
              <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md hidden sm:inline">
                Workspace
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Review New Contract</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <DealsListClient initialDeals={initialDeals} />
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} PactIQ · Persistent Contract Workspace & Intelligence</p>
      </footer>
    </div>
  );
}
