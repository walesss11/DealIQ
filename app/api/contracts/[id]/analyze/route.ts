import { NextResponse } from "next/server";

import { analyzeClauses, type ClauseForAnalysis } from "@/lib/ai/analyze-clause";
import { classifyContract } from "@/lib/ai/classify";
import { analyzeCrossClauses } from "@/lib/ai/cross-clause";
import { generateNegotiation } from "@/lib/ai/generate-negotiation";
import { validateSource } from "@/lib/ai/validate-source";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

function parsePriorities(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;
  let activeReviewId: string | null = null;

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            clauses: { orderBy: { position: "asc" } },
            reviews: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }
    const version = contract.versions[0];
    if (!version || !version.extractedText) {
      return NextResponse.json({ error: "No extracted contract version was found." }, { status: 404 });
    }
    if (version.clauses.length === 0) {
      return NextResponse.json({ error: "No clauses were found for analysis." }, { status: 422 });
    }

    const latestReview = version.reviews[0];
    if (!latestReview) {
      return NextResponse.json({ error: "No review was prepared for this contract." }, { status: 404 });
    }
    if (latestReview.status === "running") {
      return NextResponse.json({ error: "This contract is already being analyzed." }, { status: 409 });
    }

    const review = latestReview.status === "pending"
      ? latestReview
      : await prisma.review.create({
          data: {
            contractVersionId: version.id,
            status: "pending",
            userRole: latestReview.userRole,
            userContractType: latestReview.userContractType,
            userPriorities: latestReview.userPriorities,
          },
        });
    activeReviewId = review.id;

    await prisma.$transaction([
      prisma.review.update({ where: { id: review.id }, data: { status: "running" } }),
      prisma.contract.update({ where: { id: contractId }, data: { status: "processing" } }),
    ]);

    const priorities = parsePriorities(review.userPriorities);
    const classification = await classifyContract(
      version.extractedText,
      review.userRole || "Other",
      review.userContractType || "General Contract Review"
    );

    const clausesForAnalysis: ClauseForAnalysis[] = version.clauses.map((clause) => ({
      id: clause.id,
      index: clause.position,
      text: clause.text,
    }));

    // 1. Clause-level analysis
    const rawFindings = await analyzeClauses(
      clausesForAnalysis,
      classification.confirmedContractType,
      priorities
    );

    // 2. Cross-clause analysis (Spec Section 5.1)
    const crossFindings = await analyzeCrossClauses(
      clausesForAnalysis,
      classification.confirmedContractType
    );

    const counts = { high: 0, worthReviewing: 0, understand: 0, noIssue: 0 };

    // Process Clause Findings
    for (const finding of rawFindings) {
      const clause = version.clauses.find((candidate) => candidate.position === finding.clauseIndex);
      if (!clause) {
        console.warn(`Rejected finding with unknown clause index ${finding.clauseIndex}.`);
        continue;
      }

      const validation = await validateSource(
        version.extractedText,
        clause.text,
        finding.whatItSays,
        finding.title
      );

      let negotiationOptions: string | null = null;
      let suggestedRewrite: string | null = null;
      let emailSnippet: string | null = null;

      if (validation.isValid && (finding.severity === "high" || finding.severity === "worth_reviewing")) {
        try {
          const neg = await generateNegotiation(
            finding.title,
            clause.text,
            finding.whatItSays,
            finding.whatItMeans,
            finding.whatToConsider,
            classification.confirmedContractType
          );
          negotiationOptions = JSON.stringify(neg.options);
          suggestedRewrite = neg.suggestedWording;
          emailSnippet = neg.emailSnippet;
        } catch (negErr) {
          console.warn(`Could not generate negotiation options for ${finding.title}:`, negErr);
        }
      }

      await prisma.finding.create({
        data: {
          reviewId: review.id,
          clauseId: clause.id,
          category: finding.category,
          severity: finding.severity,
          title: finding.title,
          whatItSays: finding.whatItSays,
          whatItMeans: finding.whatItMeans,
          whatToConsider: finding.whatToConsider,
          sourceValidated: validation.isValid,
          confidence: finding.confidence,
          rejectionReason: validation.isValid ? null : validation.reason,
          negotiationOptions,
          suggestedRewrite,
          emailSnippet,
          isCrossClause: false,
        },
      });

      if (!validation.isValid) continue;
      if (finding.severity === "high") counts.high += 1;
      if (finding.severity === "worth_reviewing") counts.worthReviewing += 1;
      if (finding.severity === "understand") counts.understand += 1;
      if (finding.severity === "no_issue") counts.noIssue += 1;
    }

    // Process Cross-Clause Findings
    for (const crossFinding of crossFindings) {
      const primaryClause = version.clauses.find(
        (c) => c.position === crossFinding.primaryClauseIndex
      );
      if (!primaryClause) continue;

      const validation = await validateSource(
        version.extractedText,
        primaryClause.text,
        crossFinding.whatItSays,
        crossFinding.title
      );

      const relatedClauses = version.clauses
        .filter((c) => crossFinding.relatedClauseIndices.includes(c.position))
        .map((c) => c.id);

      let negotiationOptions: string | null = null;
      let suggestedRewrite: string | null = null;
      let emailSnippet: string | null = null;

      if (validation.isValid && (crossFinding.severity === "high" || crossFinding.severity === "worth_reviewing")) {
        try {
          const neg = await generateNegotiation(
            crossFinding.title,
            primaryClause.text,
            crossFinding.whatItSays,
            crossFinding.whatItMeans,
            crossFinding.whatToConsider,
            classification.confirmedContractType
          );
          negotiationOptions = JSON.stringify(neg.options);
          suggestedRewrite = neg.suggestedWording;
          emailSnippet = neg.emailSnippet;
        } catch (negErr) {
          console.warn(`Could not generate negotiation options for cross finding ${crossFinding.title}:`, negErr);
        }
      }

      await prisma.finding.create({
        data: {
          reviewId: review.id,
          clauseId: primaryClause.id,
          category: "general",
          severity: crossFinding.severity,
          title: `[Cross-Clause] ${crossFinding.title}`,
          whatItSays: crossFinding.whatItSays,
          whatItMeans: crossFinding.whatItMeans,
          whatToConsider: crossFinding.whatToConsider,
          sourceValidated: validation.isValid,
          confidence: crossFinding.confidence,
          rejectionReason: validation.isValid ? null : validation.reason,
          negotiationOptions,
          suggestedRewrite,
          emailSnippet,
          isCrossClause: true,
          relatedClauseIds: JSON.stringify(relatedClauses),
        },
      });

      if (!validation.isValid) continue;
      if (crossFinding.severity === "high") counts.high += 1;
      if (crossFinding.severity === "worth_reviewing") counts.worthReviewing += 1;
      if (crossFinding.severity === "understand") counts.understand += 1;
    }

    await prisma.$transaction([
      prisma.review.update({
        where: { id: review.id },
        data: {
          status: "complete",
          classificationResult: JSON.stringify(classification),
          overallAttention: JSON.stringify(counts),
          modelVersion: process.env.OPENAI_MODEL || "gpt-4o",
          completedAt: new Date(),
        },
      }),
      prisma.contract.update({ where: { id: contractId }, data: { status: "complete" } }),
    ]);

    return NextResponse.json({
      success: true,
      reviewId: review.id,
      overallAttention: counts,
      reportUrl: `/review/${contractId}`,
    });
  } catch (error: unknown) {
    console.error("Analysis pipeline failed:", error);
    const message = error instanceof Error ? error.message : "The analysis pipeline failed.";
    const updates = [
      prisma.contract.update({ where: { id: contractId }, data: { status: "error" } }),
    ];
    if (activeReviewId) {
      updates.push(
        prisma.review.update({ where: { id: activeReviewId }, data: { status: "error" } }) as never
      );
    }
    await prisma.$transaction(updates).catch((statusError: unknown) => {
      console.error("Could not record pipeline failure:", statusError);
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
