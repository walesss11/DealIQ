import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "./initDb";

export interface GoogleUserProfile {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  email_verified?: boolean;
}

export function getGoogleOAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = getGoogleRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: state || "pactiq_auth",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getGoogleRedirectUri(): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

export async function exchangeGoogleCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = getGoogleRedirectUri();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth token exchange failed: ${errorText}`);
  }

  return res.json();
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Google user profile");
  }

  const data = await res.json();
  return {
    id: data.sub,
    email: data.email,
    name: data.name,
    picture: data.picture,
    email_verified: Boolean(data.email_verified),
  };
}

export async function findOrCreateGoogleUser(profile: GoogleUserProfile, tokens?: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
}) {
  await ensureAuthSchema();

  const email = profile.email.toLowerCase().trim();

  // 1. Check if user with this email already exists
  let user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (user) {
    // Check if Google account is linked
    const hasGoogleAccount = user.accounts.some(
      (a) => a.provider === "google" && a.providerAccountId === profile.id
    );

    if (!hasGoogleAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: "google",
          providerAccountId: profile.id,
          type: "oauth",
          accessToken: tokens?.access_token || null,
          refreshToken: tokens?.refresh_token || null,
          expiresAt: tokens?.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
          idToken: tokens?.id_token || null,
          scope: "openid email profile",
        },
      }).catch((err) => {
        console.warn("Could not link Google account:", err);
      });
    }

    // Update avatar/name if not set
    if (!user.image && profile.picture) {
      await prisma.user.update({
        where: { id: user.id },
        data: { image: profile.picture },
      }).catch(() => {});
    }

    return { user, isNewUser: false };
  }

  // 2. User does not exist, create new user and account
  user = await prisma.user.create({
    data: {
      email,
      name: profile.name || email.split("@")[0],
      image: profile.picture || null,
      emailVerified: profile.email_verified ? new Date() : null,
      onboardingCompleted: false,
      accounts: {
        create: {
          provider: "google",
          providerAccountId: profile.id,
          type: "oauth",
          accessToken: tokens?.access_token || null,
          refreshToken: tokens?.refresh_token || null,
          expiresAt: tokens?.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
          idToken: tokens?.id_token || null,
          scope: "openid email profile",
        },
      },
    },
    include: { accounts: true },
  });

  return { user, isNewUser: true };
}
