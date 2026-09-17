import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getLatestChatPerContract } from "@/lib/db/chatDb";
import { prisma } from "@/lib/db/prisma";
import { getUserBillingStatus } from "@/lib/payments/billing";
import DashboardClient, { DashboardDeal } from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard · PactIQ Workspace",
  description: "Your personalized PactIQ contract intelligence workspace.",
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

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let billingStatus;
  try {
    billingStatus = await getUserBillingStatus(user.id);
  } catch (e) {
    console.warn("Could not load billing status:", e);
    billingStatus = {
      hasFreeReview: true,
      freeReviewUsed: false,
      totalContractsCount: 0,
      paidReviewsCount: 0,
      priceNGN: 5000,
    };
  }

  let priorities: string[] = [];
  if (user.priorities) {
    try {
      priorities = JSON.parse(user.priorities);
    } catch {
      priorities = [];
    }
  }

  let contractTypes: string[] = [];
  if (user.contractTypes) {
    try {
      contractTypes = JSON.parse(user.contractTypes);
    } catch {
      contractTypes = [];
    }
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
    console.error("Could not load contracts for dashboard:", e);
    contracts = [];
  }

  const contractIds = contracts.map((c) => c.id);
  let chatActivityMap = new Map<string, { lastMessageAt: Date; messageSnippet: string }>();
  try {
    chatActivityMap = await getLatestChatPerContract(contractIds);
  } catch (e) {
    console.warn("Could not load chat activities:", e);
  }

  const initialDeals: DashboardDeal[] = contracts.map((c) => {
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
      contractType: c.contractType || "Commercial Agreement",
      createdAt: safeToIso(c.createdAt),
      userRole: review?.userRole || user.userRole || null,
      versionCount: c.versions?.length || 1,
      latestVersionNumber: version?.versionNumber || 1,
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
    priorities,
    contractTypes,
    contractExperience: user.contractExperience || null,
  };

  return <DashboardClient user={userProps} initialDeals={initialDeals} billingStatus={billingStatus} />;
}

