import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "pactiq_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.SECRET_KEY || process.env.AUTH_SECRET || "pactiq_super_secret_jwt_key_development_2026_default";
  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore static assets, internal Next.js routes, API routes, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let sessionPayload: { userId?: string; onboardingCompleted?: boolean } | null = null;

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
        algorithms: ["HS256"],
      });
      sessionPayload = payload as { userId?: string; onboardingCompleted?: boolean };
    } catch {
      sessionPayload = null;
    }
  }

  const isAuthenticated = Boolean(sessionPayload?.userId);
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p)));

  // 1. If not authenticated and attempting to access protected route
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    // Expire invalid/stale cookie to prevent browser redirect loops
    if (sessionCookie) {
      response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
