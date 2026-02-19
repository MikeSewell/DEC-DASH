import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Run QuickBooks sync (called by cron)
export const runSync = internalAction({
  handler: async (ctx) => {
    // Check if QB is connected
    const config = await ctx.runQuery(internal.quickbooksInternal.getFullConfig);
    if (!config) {
      console.log("QuickBooks not connected, skipping sync");
      return;
    }

    try {
      await ctx.runAction(internal.quickbooksActions.syncAllData, {});
      console.log("QuickBooks sync completed successfully");
    } catch (error) {
      console.error("QuickBooks sync failed:", error);
    }
  },
});
