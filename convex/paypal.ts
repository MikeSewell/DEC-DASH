import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get config status (public — for admin UI and widget three-state check)
export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("paypalConfig").first();
    if (!config) return null;
    return {
      _id: config._id,
      environment: config.environment,
      connectedAt: config.connectedAt,
    };
  },
});

// Get cached PayPal data for dashboard
export const getData = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("paypalConfig").first();
    if (!config) return null;

    const cache = await ctx.db.query("paypalCache").first();
    if (!cache) return null;

    return {
      totalTransactions: cache.totalTransactions,
      totalIncoming: cache.totalIncoming,
      totalOutgoing: cache.totalOutgoing,
      netAmount: cache.netAmount,
      averageTransaction: cache.averageTransaction,
      monthlyBreakdown: JSON.parse(cache.monthlyBreakdown) as Array<{
        month: string;
        count: number;
        total: number;
        incoming: number;
        outgoing: number;
        net: number;
      }>,
      topPayers: JSON.parse(cache.topPayers) as Array<{
        name: string;
        email: string;
        total: number;
        transaction_count: number;
      }>,
      periodStart: cache.periodStart,
      periodEnd: cache.periodEnd,
      fetchedAt: cache.fetchedAt,
    };
  },
});

// Save config (admin — client ID + secret + environment)
export const saveConfig = mutation({
  args: {
    clientId: v.string(),
    clientSecret: v.string(),
    environment: v.union(v.literal("sandbox"), v.literal("production")),
  },
  handler: async (ctx, args) => {
    // Singleton — delete old config
    const existing = await ctx.db.query("paypalConfig").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("paypalConfig", {
      clientId: args.clientId,
      clientSecret: args.clientSecret,
      environment: args.environment,
      connectedAt: Date.now(),
    });
  },
});

// Disconnect — clear config and cached data
export const disconnect = mutation({
  handler: async (ctx) => {
    const config = await ctx.db.query("paypalConfig").first();
    if (config) {
      await ctx.db.delete(config._id);
    }

    const cache = await ctx.db.query("paypalCache").first();
    if (cache) {
      await ctx.db.delete(cache._id);
    }
  },
});
