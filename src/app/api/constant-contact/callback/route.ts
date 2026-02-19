import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(
        new URL("/admin?tab=constant-contact&error=no_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(
      "https://authz.constantcontact.com/oauth2/default/v1/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.CC_CLIENT_ID}:${process.env.CC_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          code,
          redirect_uri: process.env.CC_REDIRECT_URI!,
          grant_type: "authorization_code",
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const token = await tokenResponse.json();

    // Store tokens in Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.mutation(api.constantContact.saveTokens, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiry: Date.now() + token.expires_in * 1000,
    });

    return NextResponse.redirect(
      new URL("/admin?tab=constant-contact&connected=true", request.url)
    );
  } catch (error) {
    console.error("CC Callback error:", error);
    return NextResponse.redirect(
      new URL("/admin?tab=constant-contact&error=auth_failed", request.url)
    );
  }
}
