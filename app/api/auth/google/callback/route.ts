import { NextResponse } from "next/server";
import {
  exchangeGoogleCodeForTokens,
  fetchGoogleUserProfile,
  findOrCreateGoogleUser,
} from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    console.error("Google OAuth error or missing code:", error);
    return NextResponse.redirect(new URL("/login?error=google_cancelled", request.url));
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);
    if (!tokens.access_token) {
      throw new Error("Missing access token from Google");
    }

    const profile = await fetchGoogleUserProfile(tokens.access_token);
    const { user, isNewUser } = await findOrCreateGoogleUser(profile, tokens);

    await createSession(user.id);

    const target = isNewUser ? "/onboarding" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  } catch (err: unknown) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/login?error=google_auth_failed", request.url));
  }
}

export async function POST(request: Request) {
  // Support for direct JSON payload (e.g. Google One Tap or Dev Google auth)
  try {
    const body = await request.json();
    const { email, name, picture, sub } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid Google user data" }, { status: 400 });
    }

    const profile = {
      id: sub || `google_dev_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
      email: email.toLowerCase().trim(),
      name: name || email.split("@")[0],
      picture: picture || null,
      email_verified: true,
    };

    const { user, isNewUser } = await findOrCreateGoogleUser(profile);
    await createSession(user.id);

    const redirectTo = isNewUser ? "/onboarding" : "/dashboard";

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
  } catch (err: unknown) {
    console.error("Google POST login error:", err);
    const message = err instanceof Error ? err.message : "Google authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
