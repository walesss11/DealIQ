import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { ensureAuthSchema } from "./initDb";

export const SESSION_COOKIE_NAME = "pactiq_session";
const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SECRET_KEY || process.env.AUTH_SECRET || "pactiq_super_secret_jwt_key_development_2026_default";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  onboardingCompleted?: boolean;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_DURATION_SECONDS;

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (typeof payload.userId === "string" && typeof payload.email === "string") {
      return {
        userId: payload.userId,
        email: payload.email,
        name: typeof payload.name === "string" ? payload.name : null,
        onboardingCompleted: Boolean(payload.onboardingCompleted),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function createSession(userId: string): Promise<string> {
  await ensureAuthSchema();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    onboardingCompleted: user.onboardingCompleted,
  });

  // Also create/update database session record
  const expires = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken: token,
      expires,
    },
  }).catch((err) => {
    console.warn("Could not save database session record:", err);
  });

  await setSessionCookie(token);
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { sessionToken: token },
    }).catch(() => {});
  }

  await clearSessionCookie();
}

export async function getCurrentUser() {
  await ensureAuthSchema();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.userId) return null;

    let user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      onboardingCompleted: boolean;
      userRole: string | null;
      role: string;
      contractTypes: string | null;
      priorities: string | null;
      contractExperience: string | null;
      onboardingStep: number;
      createdAt: Date;
      updatedAt: Date;
    } | null = null;

    try {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          onboardingCompleted: true,
          userRole: true,
          role: true,
          contractTypes: true,
          priorities: true,
          contractExperience: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch {
      // Fallback if client cached old schema without 'role'
      const fallback = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          onboardingCompleted: true,
          userRole: true,
          contractTypes: true,
          priorities: true,
          contractExperience: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (fallback) {
        user = {
          ...fallback,
          role: (fallback as unknown as { role?: string }).role || "USER",
        };
      }
    }

    if (!user) {
      // User ID from token does not exist in DB (stale/orphaned session). Clear cookie.
      try {
        await clearSessionCookie();
      } catch {}
      return null;
    }

    return user;
  } catch (err) {
    console.error("Error retrieving current user session:", err);
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
