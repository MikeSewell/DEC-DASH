import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const runSync = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.paypalInternal.getFullConfig);

    if (!config) {
      console.log("PayPal not configured, skipping sync");
      return;
    }

    console.log(`PayPal sync starting (${config.environment})`);
    try {
      await ctx.runAction(internal.paypalActions.syncPayPal, {});
      console.log("PayPal sync completed successfully");
    } catch (error) {
      console.error("PayPal sync failed:", error);
    }
  },
});
