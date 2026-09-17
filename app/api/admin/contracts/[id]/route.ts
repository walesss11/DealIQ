import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // PRIVACY-PRESERVING QUERY:
    // Strictly exclude extractedText, clause.text, finding.whatItSays/whatItMeans/whatToConsider, and chat messages.
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        contractType: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
          },
        },
        versions: {
          orderBy: { versionNumber: "asc" },
          select: {
            id: true,
            versionNumber: true,
            filename: true,
            createdAt: true,
            _count: {
              select: {
                clauses: true,
              },
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                status: true,
                createdAt: true,
                completedAt: true,
                modelVersion: true,
                findings: {
                  select: {
                    id: true,
                    category: true,
                    severity: true,
                    title: true,
                    sourceValidated: true,
                    confidence: true,
                    isCrossClause: true,
                    rejectionReason: true,
                    // EXCLUDE: whatItSays, whatItMeans, whatToConsider, suggestedRewrite, emailSnippet
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (error: unknown) {
    console.error("Admin contract telemetry inspect API error:", error);
    return NextResponse.json({ error: "Failed to inspect contract telemetry" }, { status: 500 });
  }
}
