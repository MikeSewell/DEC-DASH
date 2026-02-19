import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get CC connection status
export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("constantContactConfig").first();
    if (!config) return null;
    return {
      _id: config._id,
      connectedAt: config.connectedAt,
      isExpired: config.tokenExpiry < Date.now(),
    };
  },
});

// Save CC OAuth tokens from callback
export const saveTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("constantContactConfig").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("constantContactConfig", {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiry: args.tokenExpiry,
      connectedAt: Date.now(),
      connectedBy: "" as any,
    });
  },
});

// Disconnect Constant Contact
export const disconnect = mutation({
  handler: async (ctx) => {
    const config = await ctx.db.query("constantContactConfig").first();
    if (config) {
      await ctx.db.delete(config._id);
    }
  },
});
