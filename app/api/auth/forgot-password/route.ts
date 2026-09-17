import { NextResponse } from "next/server";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import { createPasswordResetToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    await ensureAuthSchema();

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Even if user not found, return success for security (prevents user enumeration), but generate token if exists
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions.",
      });
    }

    const token = await createPasswordResetToken(email);

    // In local development or production, we can also return the direct link in dev
    const resetUrl = `/reset-password?token=${token}`;

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive password reset instructions.",
      devResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process password reset request." }, { status: 500 });
  }
}
