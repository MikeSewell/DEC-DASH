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

export async function GET(request: NextRequest) {
  try {
    const oauthClient = getOAuthClient();
    const url = request.url;

    const authResponse = await oauthClient.createToken(url);
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
      new URL("/admin?tab=quickbooks&connected=true", request.url)
    );
  } catch (error) {
    console.error("QB Callback error:", error);
    return NextResponse.redirect(
      new URL("/admin?tab=quickbooks&error=auth_failed", request.url)
    );
  }
}
