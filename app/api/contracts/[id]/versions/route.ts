import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { extractText } from "@/lib/ai/extract";
import { segmentText } from "@/lib/ai/segment";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/client";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx"]);

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contractId } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        versions: {
          orderBy: { versionNumber: "asc" },
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

    if (!contract || (contract.userId && contract.userId !== user.id)) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    const versions = contract.versions.map((v) => {
      const review = v.reviews[0];
      const findings = review?.findings || [];
      const highCount = findings.filter((f) => f.severity === "high").length;
      const worthCount = findings.filter((f) => f.severity === "worth_reviewing").length;
      const understandCount = findings.filter((f) => f.severity === "understand").length;

      let comparison = null;
      if (review?.comparisonResult) {
        try {
          comparison = JSON.parse(review.comparisonResult);
        } catch {
          comparison = null;
        }
      }

      return {
        id: v.id,
        versionNumber: v.versionNumber,
        filename: v.filename || contract.filename,
        createdAt: v.createdAt.toISOString(),
        hasReview: !!review,
        reviewId: review?.id,
        status: review?.status || "pending",
        counts: {
          high: highCount,
          worth_reviewing: worthCount,
          understand: understandCount,
          total: findings.length,
        },
        comparisonSummary: comparison?.summaryCounts || null,
      };
    });

    return NextResponse.json({
      contractId: contract.id,
      filename: contract.filename,
      contractType: contract.contractType,
      currentVersionCount: versions.length,
      versions,
    });
  } catch (error: unknown) {
    console.error("Failed to list contract versions:", error);
    return NextResponse.json({ error: "Failed to list contract versions." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let uploadedPath: string | null = null;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { id: contractId } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!contract || (contract.userId && contract.userId !== user.id)) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    const latestVersion = contract.versions[0];
    const previousReview = latestVersion?.reviews[0];

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF or DOCX file." }, { status: 400 });
    }
    if (fileEntry.size === 0 || fileEntry.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The file must be non-empty and no larger than 10 MB." },
        { status: 400 }
      );
    }

    const extension = fileEntry.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or DOCX file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const extracted = await extractText(buffer, fileEntry.name);
    const clauses = segmentText(extracted.pages);

    if (clauses.length === 0) {
      return NextResponse.json(
        { error: "PactIQ could not identify readable clauses in this revised document." },
        { status: 422 }
      );
    }

    const safeFilename = fileEntry.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    uploadedPath = `contracts/${randomUUID()}-${safeFilename}`;
    await storage.uploadFile(
      uploadedPath,
      buffer,
      fileEntry.type || "application/octet-stream"
    );

    const nextVersionNumber = (latestVersion?.versionNumber || 1) + 1;
    const userRole = previousReview?.userRole || user.userRole || "Contract Party";
    const userContractType = previousReview?.userContractType || contract.contractType || "General Agreement";
    const userPriorities = previousReview?.userPriorities || "[]";

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const version = await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          versionNumber: nextVersionNumber,
          fileReference: uploadedPath as string,
          extractedText: extracted.text,
        },
      });

      try {
        await tx.$executeRawUnsafe(
          `UPDATE contract_versions SET filename = $1 WHERE id = $2`,
          fileEntry.name,
          version.id
        );
      } catch {
        // Safe fallback
      }

      await tx.clause.createMany({
        data: clauses.map((clause) => ({
          contractVersionId: version.id,
          title: clause.title ?? null,
          section: clause.section ?? null,
          text: clause.text,
          pageNumber: clause.pageNumber ?? null,
          position: clause.position,
        })),
      });

      // Check if previous versions of this deal were already unlocked
      const isAlreadyUnlocked = Boolean(
        previousReview?.isPaid ||
        previousReview?.isFreeTrial ||
        contract.versions.some((v) => v.reviews.some((r) => r.isPaid || r.isFreeTrial))
      );
      const isPaidFlag = Boolean(previousReview?.isPaid || (isAlreadyUnlocked && !previousReview?.isFreeTrial));
      const isFreeTrialFlag = Boolean(previousReview?.isFreeTrial);

      const review = await tx.review.create({
        data: {
          contractVersionId: version.id,
          status: "pending",
          userRole,
          userContractType,
          userPriorities,
          isPaid: isPaidFlag,
          isFreeTrial: isFreeTrialFlag,
        },
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "pending",
          filename: fileEntry.name,
        },
      });

      return {
        contractId: contract.id,
        versionId: version.id,
        versionNumber: nextVersionNumber,
        reviewId: review.id,
        filename: fileEntry.name,
      };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (uploadedPath) {
      await storage.deleteFile(uploadedPath).catch((cleanupError: unknown) => {
        console.error("Failed to remove orphaned revision upload:", cleanupError);
      });
    }

    const message = messageFrom(error);
    console.error("Revision upload failed:", error);
    return NextResponse.json(
      { error: message || "PactIQ could not process this revised contract. Please try again." },
      { status: 500 }
    );
  }
}
