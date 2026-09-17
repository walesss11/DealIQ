import { NextRequest, NextResponse } from "next/server";
import { generateFullNegotiation } from "@/lib/ai/generate-full-negotiation";
import { evaluateMissingProvisionsRules } from "@/lib/ai/missing-provisions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { Finding } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
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
                  orderBy: [{ isCrossClause: "desc" }, { severity: "asc" }, { createdAt: "asc" }],
                  include: { clause: true },
                },
              },
            },
          },
        },
      },
    });

    if (!contract || (contract.userId && contract.userId !== user.id) || !contract.versions[0]) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    const version = contract.versions[0];
    const review = version.reviews[0];

    if (!review) {
      return NextResponse.json({ error: "Review analysis not found." }, { status: 404 });
    }

    let userPriorities: string[] = [];
    if (review.userPriorities) {
      try {
        userPriorities = JSON.parse(review.userPriorities) as string[];
      } catch {
        userPriorities = [];
      }
    }

    let classificationResult: { confirmedContractType?: string } = {};
    if (review.classificationResult) {
      try {
        classificationResult = JSON.parse(review.classificationResult);
      } catch {
        classificationResult = {};
      }
    }

    const firstFor = (category: string) =>
      review.findings.find((f: Finding) => f.category === category && !f.isCrossClause);

    const dealTerms = [
      {
        label: "Contract Type",
        value: classificationResult.confirmedContractType || contract.contractType || "General Agreement",
      },
      {
        label: "Payment",
        value: firstFor("payment")?.whatItSays || "Not explicitly flagged",
      },
      {
        label: "Deliverables",
        value: firstFor("deliverables")?.whatItSays || "Standard scope",
      },
      {
        label: "Content & IP Rights",
        value: firstFor("content_rights")?.whatItSays || "Standard licensing",
      },
      {
        label: "Exclusivity",
        value: firstFor("exclusivity")?.whatItSays || "Non-exclusive",
      },
      {
        label: "Termination",
        value: firstFor("termination")?.whatItSays || "Standard notice",
      },
    ];

    const confirmedType = classificationResult.confirmedContractType || contract.contractType || "General Agreement";
    const missingProvisions = evaluateMissingProvisionsRules(
      version.extractedText || "",
      confirmedType,
      review.userRole || "Contractor"
    );

    const result = await generateFullNegotiation({
      filename: contract.filename,
      contractType: confirmedType,
      userRole: review.userRole,
      userPriorities,
      dealTerms,
      missingProvisions: missingProvisions.map((m) => ({
        title: m.title,
        whyItMatters: m.whyItMatters,
        suggestedClause: m.suggestedClause,
        negotiationSnippet: m.negotiationSnippet,
      })),
      findings: review.findings.map((f) => ({
        id: f.id,
        category: f.category,
        severity: f.severity,
        title: f.title,
        whatItSays: f.whatItSays,
        whatItMeans: f.whatItMeans,
        whatToConsider: f.whatToConsider,
        suggestedRewrite: f.suggestedRewrite,
        emailSnippet: f.emailSnippet,
        isCrossClause: f.isCrossClause,
        clause: f.clause
          ? {
              section: f.clause.section,
              title: f.clause.title,
              text: f.clause.text,
              position: f.clause.position,
            }
          : null,
      })),
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Generate full negotiation route error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate negotiation message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
