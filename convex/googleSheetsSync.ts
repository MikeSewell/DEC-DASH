import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Run Google Sheets sync (called by cron)
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

    try {
      await ctx.runAction(internal.googleSheetsActions.syncProgramData, {
        programType: "coparent",
      });
      await ctx.runAction(internal.googleSheetsActions.syncProgramData, {
        programType: "legal",
      });
      console.log("Google Sheets program sync completed");
    } catch (error) {
      console.error("Google Sheets program sync failed:", error);
    }
  },
});
