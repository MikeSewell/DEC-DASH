import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get full CC config (internal only)
export const getFullConfig = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("constantContactConfig").first();
  },
});

// Update CC tokens
export const updateTokens = internalMutation({
  args: {
    configId: v.id("constantContactConfig"),
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
