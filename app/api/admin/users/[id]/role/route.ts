import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "@/lib/auth/initDb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureAuthSchema();

    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdminUser(currentUser)) {
      return NextResponse.json({ error: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!["USER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Safety guard: prevent self-demotion
    if (targetUser.id === currentUser.id && role === "USER") {
      return NextResponse.json(
        { error: "You cannot revoke your own admin privileges." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
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
      const actionType = role === "USER" ? "REVOKE_ADMIN" : "CHANGE_ROLE";
      await prisma.$executeRawUnsafe(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_email, action, target_user_id, target_user_email, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        currentUser.id,
        currentUser.email,
        actionType,
        targetUser.id,
        targetUser.email,
        `Role changed from ${targetUser.role || "USER"} to ${role} by ${currentUser.email}`
      );
    } catch (logErr) {
      console.warn("Could not write to admin_audit_logs:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Updated privileges for ${updatedUser.name || updatedUser.email} to ${role}.`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    console.error("Change user role route error:", error);
    const message = error instanceof Error ? error.message : "Failed to change user role.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
