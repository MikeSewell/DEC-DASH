import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get full config (internal only - exposes tokens)
export const getFullConfig = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("quickbooksConfig").first();
  },
});

// Update tokens after refresh
export const updateTokens = internalMutation({
  args: {
    configId: v.id("quickbooksConfig"),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiry: args.tokenExpiry,
    });
  },
});

// Get cached data string by report type (for use in actions)
export const getCachedData = internalQuery({
  args: { reportType: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", args.reportType))
      .first();
    return cached?.data ?? null;
  },
});

// Cache a report
export const cacheReport = internalMutation({
  args: {
    reportType: v.string(),
    data: v.string(),
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete existing cache for this report type
    const existing = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", args.reportType))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("quickbooksCache", {
      reportType: args.reportType,
      data: args.data,
      fetchedAt: Date.now(),
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
    });
  },
});
