import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI!;
    const scope = "https://www.googleapis.com/auth/calendar.readonly";
    const state = "google-calendar-connect";

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Google Calendar Auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google Calendar authorization" },
      { status: 500 }
    );
  }
}
