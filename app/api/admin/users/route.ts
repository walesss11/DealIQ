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
    const role = searchParams.get("role") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && role !== "all") {
      where.userRole = role;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              contracts: true,
              payments: true,
              conversations: true,
            },
          },
        },
      }),
    ]);

    const formatted = users.map((u) => {
      let contractTypes: string[] = [];
      let priorities: string[] = [];
      if (u.contractTypes) {
        try {
          contractTypes = JSON.parse(u.contractTypes);
        } catch {}
      }
      if (u.priorities) {
        try {
          priorities = JSON.parse(u.priorities);
        } catch {}
      }

      return {
        id: u.id,
        name: u.name || "User",
        email: u.email,
        image: u.image,
        role: (u as any).role || (isAdminUser(u) ? "ADMIN" : "USER"),
        isAdmin: isAdminUser(u),
        userRole: u.userRole || "Unspecified",
        onboardingCompleted: u.onboardingCompleted,
        contractExperience: u.contractExperience || "Standard",
        contractTypes,
        priorities,
        stats: {
          contractsCount: u._count.contracts,
          paymentsCount: u._count.payments,
          conversationsCount: u._count.conversations,
        },
        createdAt: u.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      users: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Admin users list API error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
