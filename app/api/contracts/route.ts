import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { extractText } from "@/lib/ai/extract";
import { segmentText } from "@/lib/ai/segment";
import { prisma } from "@/lib/db/prisma";
import { storage } from "@/lib/storage/client";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx"]);

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function parsePriorities(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const userRole = formData.get("userRole");
    const userContractType = formData.get("userContractType");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF or DOCX file." }, { status: 400 });
    }
    if (typeof userRole !== "string" || !userRole.trim()) {
      return NextResponse.json({ error: "Choose the role that best describes you." }, { status: 400 });
    }
    if (typeof userContractType !== "string" || !userContractType.trim()) {
      return NextResponse.json({ error: "Choose a contract type." }, { status: 400 });
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
        { error: "DealIQ could not identify readable clauses in this document." },
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

    const priorities = parsePriorities(formData.get("userPriorities"));
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const contract = await tx.contract.create({
        data: {
          filename: fileEntry.name,
          contractType: userContractType,
          status: "pending",
        },
      });
      const version = await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          versionNumber: 1,
          fileReference: uploadedPath as string,
          extractedText: extracted.text,
        },
      });

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
      const review = await tx.review.create({
        data: {
          contractVersionId: version.id,
          status: "pending",
          userRole,
          userContractType,
          userPriorities: JSON.stringify(priorities),
        },
      });

      return { contractId: contract.id, reviewId: review.id };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: unknown) {
    if (uploadedPath) {
      await storage.deleteFile(uploadedPath).catch((cleanupError: unknown) => {
        console.error("Failed to remove orphaned upload:", cleanupError);
      });
    }

    const message = messageFrom(error);
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: message || "DealIQ could not process this contract. Please try again." },
      { status: 500 }
    );
  }
}
