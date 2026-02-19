import { NextResponse } from "next/server";
import OAuthClient from "intuit-oauth";

function getOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment: (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI!,
  });
}

export async function GET() {
  try {
    const oauthClient = getOAuthClient();
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
      state: "quickbooks-connect",
    });
    return NextResponse.redirect(authUri);
  } catch (error) {
    console.error("QB Auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate QuickBooks authorization" },
      { status: 500 }
    );
  }
}
