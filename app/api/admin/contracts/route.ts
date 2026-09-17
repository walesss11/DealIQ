import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || "";
    const contractType = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: "insensitive" } },
        { contractType: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (contractType && contractType !== "all") {
      where.contractType = contractType;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              userRole: true,
            },
          },
          versions: {
            orderBy: { versionNumber: "desc" },
            include: {
              reviews: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                  findings: {
                    select: {
                      id: true,
                      severity: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = contracts.map((c) => {
      const latestVersion = c.versions[0];
      const latestReview = latestVersion?.reviews[0];
      const findings = latestReview?.findings || [];

      return {
        id: c.id,
        filename: c.filename,
        contractType: c.contractType || "General Agreement",
        status: c.status,
        totalVersions: c.versions.length,
        activeVersionNumber: latestVersion?.versionNumber || 1,
        user: c.user
          ? {
              id: c.user.id,
              name: c.user.name || "User",
              email: c.user.email,
              role: c.user.userRole || "User",
            }
          : null,
        createdAt: c.createdAt.toISOString(),
        review: latestReview
          ? {
              id: latestReview.id,
              status: latestReview.status,
              createdAt: latestReview.createdAt.toISOString(),
              counts: {
                high: findings.filter((f) => f.severity === "high").length,
                worth: findings.filter((f) => f.severity === "worth_reviewing").length,
                understand: findings.filter((f) => f.severity === "understand").length,
                total: findings.length,
              },
            }
          : null,
      };
    });

    return NextResponse.json({
      contracts: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Admin contracts list API error:", error);
    return NextResponse.json({ error: "Failed to load contracts" }, { status: 500 });
  }
}
