import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "@/lib/auth/initDb";

export async function POST(request: NextRequest) {
  try {
    await ensureAuthSchema();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = "ADMIN" } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const targetEmail = email.trim().toLowerCase();
    const targetRole = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error: `No user found with email "${targetEmail}". The user must sign up to PactIQ first before they can be promoted to Admin.`,
        },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { role: targetRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userRole: true,
        createdAt: true,
      },
    });

    // Record in Audit Log
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_email, action, target_user_id, target_user_email, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        currentUser.id,
        currentUser.email,
        "PROMOTE_ADMIN",
        targetUser.id,
        targetUser.email,
        `Promoted to ${targetRole} by ${currentUser.email}`
      );
    } catch (logErr) {
      console.warn("Could not write to admin_audit_logs:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully promoted ${updatedUser.name || updatedUser.email} to ${targetRole}.`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error("Promote admin route error:", error);
    const message = error instanceof Error ? error.message : "Failed to promote user to admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
