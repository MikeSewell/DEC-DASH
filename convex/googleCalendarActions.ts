"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Refresh the access token using the refresh token
const refreshAccessToken = async (refreshToken: string): Promise<{ access_token: string; expires_in: number }> => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token refresh failed: ${response.status} — ${errorBody}`);
  }

  return response.json();
};

// Get authenticated config — refresh token if expired
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAuthenticatedConfig(ctx: any) {
  const config = await ctx.runQuery(internal.googleCalendarInternal.getFullConfig);
  if (!config || !config.accessToken || !config.refreshToken) {
    throw new Error("Google Calendar not connected — no OAuth tokens found");
  }

  // Check if token is expired (with 5 min buffer)
  const isExpired = config.tokenExpiry ? config.tokenExpiry < Date.now() + 5 * 60 * 1000 : true;

  if (isExpired) {
    console.log("Google Calendar access token expired, refreshing...");
    const newToken = await refreshAccessToken(config.refreshToken);
    const newExpiry = Date.now() + newToken.expires_in * 1000;

    await ctx.runMutation(internal.googleCalendarInternal.updateTokens, {
      configId: config._id,
      accessToken: newToken.access_token,
      tokenExpiry: newExpiry,
    });

    return { ...config, accessToken: newToken.access_token, tokenExpiry: newExpiry };
  }

  return config;
}

export const syncCalendars = internalAction({
  handler: async (ctx) => {
    const { google } = await import("googleapis");

    const config = await getAuthenticatedConfig(ctx);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: config.accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

    for (const { calendarId, displayName } of config.calendars) {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100,
          showDeleted: false,
        });

        const events = response.data.items ?? [];

        // Clear stale events for this calendar before re-inserting
        await ctx.runMutation(internal.googleCalendarInternal.clearCalendarEvents, { calendarId });

        for (const event of events) {
          if (!event.id || !event.summary) continue;
          const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);
          await ctx.runMutation(internal.googleCalendarInternal.upsertEvent, {
            eventId: event.id,
            calendarId,
            calendarDisplayName: displayName,
            summary: event.summary,
            startAt: isAllDay
              ? new Date(event.start!.date!).getTime()
              : new Date(event.start!.dateTime!).getTime(),
            endAt: isAllDay
              ? new Date(event.end!.date!).getTime()
              : new Date(event.end!.dateTime!).getTime(),
            isAllDay,
            location: event.location ?? undefined,
            htmlLink: event.htmlLink ?? undefined,
            lastSyncAt: Date.now(),
          });
        }
      } catch (err) {
        console.error(`Failed to sync calendar ${calendarId}:`, err);
      }
    }

    // Clean up stale events from de-selected calendars
    const selectedCalendarIds = new Set(config.calendars.map((c: { calendarId: string }) => c.calendarId));
    await ctx.runMutation(internal.googleCalendarInternal.cleanupDeselectedCalendars, {
      selectedCalendarIds: [...selectedCalendarIds],
    });

    await ctx.runMutation(internal.googleCalendarInternal.updateLastSync, { configId: config._id });
  },
});

// Public action — allows admin UI "Sync Now" button
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.googleCalendarActions.syncCalendars, {});
  },
});

// Public action — discovers all calendars accessible to the connected Google account
export const listAvailableCalendars = action({
  handler: async (ctx): Promise<Array<{ id: string; summary: string }>> => {
    try {
      const { google } = await import("googleapis");

      const config = await getAuthenticatedConfig(ctx);

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: config.accessToken });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const response = await calendar.calendarList.list();

      const items = response.data.items ?? [];

      const calendars = items
        .filter((item) => Boolean(item.id))
        .map((item) => ({
          id: item.id!,
          summary: item.summary ?? item.id!,
        }))
        .sort((a, b) => a.summary.localeCompare(b.summary));

      return calendars;
    } catch (err) {
      console.error("Failed to list available calendars:", err);
      return [];
    }
  },
});
