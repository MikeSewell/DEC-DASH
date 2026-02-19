import { NextRequest, NextResponse } from "next/server";
import OAuthClient from "intuit-oauth";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

function getOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment: (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI!,
  });
}

function getBaseUrl(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  try {
    const oauthClient = getOAuthClient();
    // Reconstruct URL with public host so intuit-oauth validates the redirect_uri correctly
    const publicUrl = `${baseUrl}${request.nextUrl.pathname}${request.nextUrl.search}`;

    const authResponse = await oauthClient.createToken(publicUrl);
    const token = authResponse.getJson();

    // Store tokens in Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.mutation(api.quickbooks.saveTokens, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      realmId: token.realmId || request.nextUrl.searchParams.get("realmId") || "",
      tokenExpiry: Date.now() + token.expires_in * 1000,
    });

    // Redirect back to admin page with success
    return NextResponse.redirect(
      new URL("/admin?tab=quickbooks&connected=true", baseUrl)
    );
  } catch (error) {
    console.error("QB Callback error:", error);
    return NextResponse.redirect(
      new URL("/admin?tab=quickbooks&error=auth_failed", baseUrl)
    );
  }
}
