import { NextResponse } from "next/server";
import { getGoogleOAuthUrl } from "@/lib/auth/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode"); // e.g. "dev_mock" if requested

  const clientId = process.env.GOOGLE_CLIENT_ID;

  // If real Google Client ID is configured and not default placeholder, redirect to Google OAuth
  if (clientId && clientId !== "api_key" && clientId !== "") {
    const state = searchParams.get("state") || "pactiq_auth";
    const googleUrl = getGoogleOAuthUrl(state);
    return NextResponse.redirect(googleUrl);
  }

  // If Google client ID is not yet configured with real Google Cloud credentials,
  // provide a local dev authentication endpoint for testing
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";
  const devRedirect = new URL("/login?google_dev_demo=true", request.url);
  devRedirect.searchParams.set("returnUrl", returnUrl);
  return NextResponse.redirect(devRedirect);
}
