import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const runSync = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.googleCalendarInternal.getFullConfig);
    if (!config || config.calendars.length === 0) {
      console.log("Google Calendar not configured, skipping sync");
      return;
    }
    try {
      await ctx.runAction(internal.googleCalendarActions.syncCalendars, {});
      console.log("Google Calendar sync completed");
    } catch (error) {
      console.error("Google Calendar sync failed:", error);
    }
  },
});
