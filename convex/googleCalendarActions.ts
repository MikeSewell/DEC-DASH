"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

export const syncCalendars = internalAction({
  handler: async (ctx) => {
    const { google } = await import("googleapis");

    const config = await ctx.runQuery(internal.googleCalendarInternal.getFullConfig);
    if (!config) throw new Error("Google Calendar not configured");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const calendar = google.calendar({ version: "v3", auth });

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
        // Per-calendar errors logged but don't abort other calendars
        console.error(`Failed to sync calendar ${calendarId}:`, err);
      }
    }

    await ctx.runMutation(internal.googleCalendarInternal.updateLastSync, { configId: config._id });
  },
});

// Public action — allows admin UI "Sync Now" button
export const triggerSync = action({
  handler: async (ctx) => {
    await ctx.runAction(internal.googleCalendarActions.syncCalendars, {});
  },
});
