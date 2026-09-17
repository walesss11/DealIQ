import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Total counts
    const [
      totalContracts,
      totalVersions,
      totalReviews,
      totalUsers,
      totalFindings,
      totalPayments,
      totalConversations,
      totalMessages,
    ] = await Promise.all([
      prisma.contract.count(),
      prisma.contractVersion.count(),
      prisma.review.count(),
      prisma.user.count(),
      prisma.finding.count(),
      prisma.payment.count(),
      prisma.conversation.count(),
      prisma.chatMessage.count(),
    ]);

    // 2. Status breakdowns
    const [reviewStatuses, contractStatuses, paymentsData] = await Promise.all([
      prisma.review.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.contract.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        select: {
          amount: true,
          currency: true,
          status: true,
        },
      }),
    ]);

    const completedReviewsCount = reviewStatuses.find((s) => s.status === "complete")?._count._all || 0;
    const runningReviewsCount = reviewStatuses.find((s) => s.status === "running")?._count._all || 0;
    const errorReviewsCount = reviewStatuses.find((s) => s.status === "error")?._count._all || 0;

    // 3. Findings & Grounding metrics
    const [findingsBySeverity, findingsByCategory, validatedFindingsCount] = await Promise.all([
      prisma.finding.groupBy({
        by: ["severity"],
        _count: { _all: true },
      }),
      prisma.finding.groupBy({
        by: ["category"],
        _count: { _all: true },
      }),
      prisma.finding.count({
        where: { sourceValidated: true },
      }),
    ]);

    const highCount = findingsBySeverity.find((s) => s.severity === "high")?._count._all || 0;
    const worthCount = findingsBySeverity.find((s) => s.severity === "worth_reviewing")?._count._all || 0;
    const understandCount = findingsBySeverity.find((s) => s.severity === "understand")?._count._all || 0;
    const standardCount = findingsBySeverity.find((s) => s.severity === "no_issue")?._count._all || 0;

    const groundingRate = totalFindings > 0 ? Math.round((validatedFindingsCount / totalFindings) * 100) : 100;

    // 4. Revenue calculation
    const totalRevenueUSD = paymentsData
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.currency === "USD" ? p.amount : p.amount / 1500), 0);

    // 5. User roles distribution
    const usersWithRoles = await prisma.user.findMany({
      select: {
        userRole: true,
        onboardingCompleted: true,
      },
    });

    const roleDistribution: Record<string, number> = {};
    let onboardedUsersCount = 0;
    for (const u of usersWithRoles) {
      if (u.onboardingCompleted) onboardedUsersCount++;
      const role = u.userRole || "Unspecified";
      roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    }

    // 6. Contract types distribution
    const contractsWithTypes = await prisma.contract.findMany({
      select: {
        contractType: true,
      },
    });

    const contractTypeDistribution: Record<string, number> = {};
    for (const c of contractsWithTypes) {
      const type = c.contractType || "General Agreement";
      contractTypeDistribution[type] = (contractTypeDistribution[type] || 0) + 1;
    }

    // 7. Recent 5 reviews
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
                findings: {
                  select: { severity: true },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      overview: {
        totalContracts,
        totalVersions,
        totalReviews,
        totalUsers,
        onboardedUsersCount,
        totalFindings,
        groundingRate,
        totalRevenueUSD: Math.round(totalRevenueUSD),
        totalConversations,
        totalMessages,
      },
      pipeline: {
        completed: completedReviewsCount,
        running: runningReviewsCount,
        error: errorReviewsCount,
        successRate: totalReviews > 0 ? Math.round((completedReviewsCount / totalReviews) * 100) : 100,
      },
      findingsBreakdown: {
        high: highCount,
        worth_reviewing: worthCount,
        understand: understandCount,
        no_issue: standardCount,
        byCategory: findingsByCategory.map((c) => ({ category: c.category, count: c._count._all })),
      },
      distributions: {
        userRoles: Object.entries(roleDistribution).map(([role, count]) => ({ role, count })),
        contractTypes: Object.entries(contractTypeDistribution).map(([type, count]) => ({ type, count })),
      },
      recentContracts: recentContracts.map((c) => {
        const latestVersion = c.versions[0];
        const latestReview = latestVersion?.reviews[0];
        const fList = latestReview?.findings || [];
        return {
          id: c.id,
          filename: c.filename,
          contractType: c.contractType || "General Agreement",
          status: c.status,
          userEmail: c.user?.email || "Anonymous",
          userName: c.user?.name || "User",
          createdAt: c.createdAt.toISOString(),
          versionNumber: latestVersion?.versionNumber || 1,
          reviewStatus: latestReview?.status || "pending",
          counts: {
            high: fList.filter((f) => f.severity === "high").length,
            worth: fList.filter((f) => f.severity === "worth_reviewing").length,
            understand: fList.filter((f) => f.severity === "understand").length,
          },
        };
      }),
    });
  } catch (error: unknown) {
    console.error("Admin metrics API error:", error);
    return NextResponse.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
