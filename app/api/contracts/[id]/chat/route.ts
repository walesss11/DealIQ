import { NextRequest, NextResponse } from "next/server";

import { askDealIQChat, ChatFocusContext } from "@/lib/ai/chat";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      focusContext?: ChatFocusContext;
    };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages payload." }, { status: 400 });
    }

    // Fetch contract along with clauses and latest complete review
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            clauses: {
              orderBy: { position: "asc" },
            },
            reviews: {
              where: { status: "complete" },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                findings: {
                  where: { sourceValidated: true },
                  orderBy: [{ isCrossClause: "desc" }, { severity: "asc" }, { createdAt: "asc" }],
                  include: { clause: true },
                },
              },
            },
          },
        },
      },
    });

    if (!contract || !contract.versions[0]) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    const version = contract.versions[0];
    const review = version.reviews[0];

    let userPriorities: string[] = [];
    if (review?.userPriorities) {
      try {
        userPriorities = JSON.parse(review.userPriorities) as string[];
      } catch {
        userPriorities = [];
      }
    }

    let classificationResult: { confirmedContractType?: string } = {};
    if (review?.classificationResult) {
      try {
        classificationResult = JSON.parse(review.classificationResult);
      } catch {
        classificationResult = {};
      }
    }

    const firstFor = (category: string) =>
      review?.findings.find((f) => f.category === category && !f.isCrossClause);

    const dealSnapshot = [
      {
        label: "Contract Type",
        value: classificationResult.confirmedContractType || contract.contractType || "General Agreement",
      },
      {
        label: "Payment",
        value: firstFor("payment")?.whatItSays || "No explicit payment terms flagged.",
      },
      {
        label: "Deliverables",
        value: firstFor("deliverables")?.whatItSays || "Standard deliverables defined.",
      },
      {
        label: "IP Rights",
        value: firstFor("content_rights")?.whatItSays || "Standard IP license/rights.",
      },
      {
        label: "Exclusivity",
        value: firstFor("exclusivity")?.whatItSays || "No restrictive exclusivity terms found.",
      },
      {
        label: "Termination",
        value: firstFor("termination")?.whatItSays || "Standard termination rules.",
      },
    ];

    const result = await askDealIQChat(
      body.messages,
      {
        filename: contract.filename,
        contractType: classificationResult.confirmedContractType || contract.contractType || "General Agreement",
        userRole: review?.userRole || "Independent Professional",
        userPriorities,
        dealSnapshot,
        findings: review?.findings || [],
        clauses: version.clauses || [],
      },
      body.focusContext
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Chat route error:", error);
    const message = error instanceof Error ? error.message : "Failed to process chat query.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
