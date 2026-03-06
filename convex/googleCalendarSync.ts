import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const runSync = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.googleCalendarInternal.getFullConfig);

    // Skip if not OAuth-connected
    if (!config || !config.accessToken || !config.refreshToken) {
      console.log("Google Calendar not OAuth-connected, skipping sync");
      return;
    }

    if (config.calendars.length === 0) {
      console.log("Google Calendar connected but no calendars selected, skipping sync");
      return;
    }

    const calendarNames = config.calendars.map((c: { displayName: string }) => c.displayName).join(", ");
    console.log(`Google Calendar sync starting for ${config.calendars.length} selected calendar(s): ${calendarNames}`);
    try {
      await ctx.runAction(internal.googleCalendarActions.syncCalendars, {});
      console.log("Google Calendar sync completed successfully");
    } catch (error) {
      console.error("Google Calendar sync failed:", error);
    }
  },
});
