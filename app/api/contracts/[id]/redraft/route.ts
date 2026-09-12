import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redraftContract, RedraftFindingInput } from "@/lib/ai/redraft-contract";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      selectedFindingIds?: string[];
    };

    const selectedFindingIds = body.selectedFindingIds || [];
    if (!Array.isArray(selectedFindingIds) || selectedFindingIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one finding or recommended change to incorporate into the redraft." },
        { status: 400 }
      );
    }

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

    if (!review) {
      return NextResponse.json({ error: "Review analysis not found." }, { status: 404 });
    }

    // Match selected findings
    const matchedFindings = review.findings.filter((f) =>
      selectedFindingIds.includes(f.id)
    );

    if (matchedFindings.length === 0) {
      return NextResponse.json(
        { error: "None of the selected findings were found in this contract review." },
        { status: 400 }
      );
    }

    const redraftFindings: RedraftFindingInput[] = matchedFindings.map((f) => ({
      findingId: f.id,
      clauseId: f.clauseId,
      title: f.title,
      category: f.category,
      whatItSays: f.whatItSays,
      whatToConsider: f.whatToConsider,
      suggestedRewrite: f.suggestedRewrite,
      clause: {
        id: f.clause.id,
        section: f.clause.section,
        title: f.clause.title,
        text: f.clause.text,
        position: f.clause.position,
      },
    }));

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

    const result = await redraftContract({
      contractTitle: contract.filename,
      contractType: classificationResult.confirmedContractType || contract.contractType || "General Agreement",
      userRole: review.userRole,
      userPriorities,
      originalText: version.extractedText,
      clauses: version.clauses.map((c) => ({
        id: c.id,
        position: c.position,
        section: c.section,
        title: c.title,
        text: c.text,
      })),
      selectedFindings: redraftFindings,
    });

    return NextResponse.json({
      ...result,
      contractId: contract.id,
      filename: contract.filename,
      originalContractPreserved: true,
      selectedCount: matchedFindings.length,
    });
  } catch (error: unknown) {
    console.error("Contract redraft route error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate contract redraft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
