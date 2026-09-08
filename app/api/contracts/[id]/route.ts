import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: "DealIQ could not load this contract." }, { status: 500 });
  }
}
