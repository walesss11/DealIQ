import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: contractId } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!contract || contract.versions.length === 0) {
      return NextResponse.json({ error: "Contract or version not found." }, { status: 404 });
    }

    // Set contract status back to processing so worker/analyze endpoint will pick it up
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: "processing" },
    });

    return NextResponse.json({
      success: true,
      message: "Analysis re-run queued successfully.",
      contractId,
    });
  } catch (error: unknown) {
    console.error("Admin contract rerun API error:", error);
    return NextResponse.json({ error: "Failed to queue re-run" }, { status: 500 });
  }
}
