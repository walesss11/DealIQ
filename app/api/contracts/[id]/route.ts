import { NextResponse } from "next/server";

import { deleteContractCompletely, ensureCascadeConstraints } from "@/lib/db/chatDb";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/client";

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
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
                  include: { clause: true },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    const version = contract.versions[0];
    if (!version) return NextResponse.json({ error: "Contract version not found." }, { status: 404 });

    let signedUrl: string | null = null;
    try {
      signedUrl = await storage.getSignedUrl(version.fileReference);
    } catch (error: unknown) {
      console.error("Could not create a signed document URL:", error);
    }

    const review = version.reviews[0];
    return NextResponse.json({
      contract: {
        id: contract.id,
        filename: contract.filename,
        contractType: contract.contractType,
        status: contract.status,
        createdAt: contract.createdAt,
      },
      version: { id: version.id, versionNumber: version.versionNumber, signedUrl },
      review: review
        ? {
            id: review.id,
            status: review.status,
            overallAttention: parseJson(review.overallAttention),
            classificationResult: parseJson(review.classificationResult),
            userRole: review.userRole,
            userContractType: review.userContractType,
            userPriorities: parseJson(review.userPriorities) ?? [],
            completedAt: review.completedAt,
            findings: review.findings,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch contract:", error);
    return NextResponse.json({ error: "PactIQ could not load this contract." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch versions to clean up storage files
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        versions: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    // 2. Delete associated uploaded storage files
    for (const v of contract.versions) {
      if (v.fileReference) {
        await storage.deleteFile(v.fileReference).catch((err) => {
          console.warn(`Could not delete storage file ${v.fileReference}:`, err);
        });
      }
    }

    // 3. Delete contract and all related records cleanly in dependency order via transaction
    await deleteContractCompletely(id);

    // 4. Ensure DB cascade constraints are active in the background
    ensureCascadeConstraints().catch(() => {});

    return NextResponse.json({ success: true, message: "Deal deleted successfully." });
  } catch (error: unknown) {
    console.error("Failed to delete contract:", error);
    const message = error instanceof Error ? error.message : "Failed to delete deal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

