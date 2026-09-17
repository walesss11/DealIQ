import { NextResponse } from "next/server";
import { ensureAuthSchema } from "@/lib/auth/initDb";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    await ensureAuthSchema();

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Please provide your email and password." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.passwordHash) {
      // User might have signed up with Google OAuth
      const hasGoogle = user.accounts.some((a) => a.provider === "google");
      if (hasGoogle) {
        return NextResponse.json(
          { error: "This account was created with Google. Please click 'Continue with Google'." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);

    const redirectTo = "/dashboard";

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
      },
      redirectTo,
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "Failed to sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
