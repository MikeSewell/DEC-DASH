import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getFullConfig = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("paypalConfig").first();
  },
});

export const upsertCache = internalMutation({
  args: {
    totalTransactions: v.number(),
    totalIncoming: v.number(),
    totalOutgoing: v.number(),
    netAmount: v.number(),
    averageTransaction: v.number(),
    monthlyBreakdown: v.string(),
    topPayers: v.string(),
    transactionDetails: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    fetchedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Singleton — delete old cache and insert fresh
    const existing = await ctx.db.query("paypalCache").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("paypalCache", args);
  },
});
