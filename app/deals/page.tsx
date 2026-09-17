import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import { getCurrentUser } from "@/lib/auth/session";
import { getLatestChatPerContract } from "@/lib/db/chatDb";
import { prisma } from "@/lib/db/prisma";
import DealsListClient, { DealItem } from "./DealsListClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Deals · PactIQ Workspace",
  description: "Repository of contracts, deal terms, and negotiation history in your PactIQ workspace.",
};

function safeToIso(dateValue: unknown): string {
  if (!dateValue) return new Date().toISOString();
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString();
  }
  try {
    const d = new Date(dateValue as string | number);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export default async function DealsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let contracts: Array<{
    id: string;
    filename: string;
    contractType: string | null;
    createdAt: Date;
    versions: Array<{
      id: string;
      versionNumber: number;
      reviews: Array<{
        id: string;
        userRole: string | null;
        findings: Array<{
          id: string;
          severity: string;
        }>;
      }>;
    }>;
  }> = [];

  try {
    contracts = await prisma.contract.findMany({
      where: { userId: user.id },
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
  } catch (e) {
    console.error("Could not load contracts for deals page:", e);
    contracts = [];
  }

  const contractIds = contracts.map((c) => c.id);
  let chatActivityMap = new Map<string, { lastMessageAt: Date; messageSnippet: string }>();
  try {
    chatActivityMap = await getLatestChatPerContract(contractIds);
  } catch (e) {
    console.warn("Could not load chat activities:", e);
  }

  const initialDeals: DealItem[] = contracts.map((c) => {
    const version = c.versions?.[0];
    const review = version?.reviews?.[0];
    const findings = review?.findings || [];
    const highCount = findings.filter((f) => f.severity === "high").length;
    const worthCount = findings.filter((f) => f.severity === "worth_reviewing").length;
    const understandCount = findings.filter((f) => f.severity === "understand").length;
    const chatActivity = chatActivityMap.get(c.id);

    return {
      id: c.id,
      filename: c.filename || "Untitled Contract",
      contractType: c.contractType || "Commercial Contract",
      createdAt: safeToIso(c.createdAt),
      userRole: review?.userRole || user.userRole || null,
      counts: {
        high: highCount,
        worth_reviewing: worthCount,
        understand: understandCount,
        total: findings.length,
      },
      chatActivity: chatActivity
        ? {
            lastMessageAt: safeToIso(chatActivity.lastMessageAt),
            messageSnippet: chatActivity.messageSnippet || "",
          }
        : null,
    };
  });

  const userProps = {
    id: user.id,
    name: user.name || null,
    email: user.email,
    image: user.image || null,
    userRole: user.userRole || null,
    onboardingCompleted: Boolean(user.onboardingCompleted),
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 bg-subtle-pattern">
      <Navbar user={userProps} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <DealsListClient initialDeals={initialDeals} />
      </main>

      <footer className="mt-20 border-t border-slate-200 bg-white px-6 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} PactIQ · Persistent Contract Workspace & Intelligence</p>
      </footer>
    </div>
  );
}
