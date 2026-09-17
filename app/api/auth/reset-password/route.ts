import { NextResponse } from "next/server";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { markTokenAsUsed, validatePasswordResetToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    await ensureAuthSchema();

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
    }

    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const tokenCheck = await validatePasswordResetToken(token);
    if (!tokenCheck.valid || !tokenCheck.email) {
      return NextResponse.json({ error: tokenCheck.error || "Invalid or expired token." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenCheck.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await markTokenAsUsed(token);

    // Create session so user is logged in immediately after resetting
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully.",
      redirectTo: user.onboardingCompleted ? "/dashboard" : "/onboarding",
    });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
