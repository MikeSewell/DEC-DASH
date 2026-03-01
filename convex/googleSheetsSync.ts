import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Run Google Sheets sync (called by cron) — grant tracker only
// Program data sync removed in Phase 20: client/program data now sourced from Convex tables directly
export const runSync = internalAction({
  handler: async (ctx) => {
    // Check if Sheets is configured
    const config = await ctx.runQuery(internal.googleSheetsInternal.getFullConfig);
    if (!config) {
      console.log("Google Sheets not configured, skipping sync");
      return;
    }

    try {
      await ctx.runAction(internal.googleSheetsActions.syncGrantTracker, {});
      console.log("Google Sheets grant sync completed");
    } catch (error) {
      console.error("Google Sheets grant sync failed:", error);
    }
  },
});
