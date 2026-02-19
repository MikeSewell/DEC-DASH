import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.CC_CLIENT_ID!;
    const redirectUri = process.env.CC_REDIRECT_URI!;
    const scope = "contact_data campaign_data offline_access";
    const state = "constant-contact-connect";

    const authUrl = new URL(
      "https://authz.constantcontact.com/oauth2/default/v1/authorize"
    );
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("CC Auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Constant Contact authorization" },
      { status: 500 }
    );
  }
}
