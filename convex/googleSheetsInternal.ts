import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get full Sheets config (internal only)
export const getFullConfig = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("googleSheetsConfig").first();
  },
});

// Upsert a grant from Sheets data
export const upsertGrant = internalMutation({
  args: {
    sheetRowId: v.string(),
    grantName: v.string(),
    funder: v.string(),
    totalAmount: v.number(),
    amountSpent: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cultivating")
    ),
    restrictions: v.optional(v.string()),
    deadlines: v.optional(v.string()),
    notes: v.optional(v.string()),
    lastSyncAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grantsCache")
      .withIndex("by_sheetRowId", (q) => q.eq("sheetRowId", args.sheetRowId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("grantsCache", args);
    }
  },
});

// Update last sync timestamp
export const updateLastSync = internalMutation({
  args: { configId: v.id("googleSheetsConfig") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, { lastSyncAt: Date.now() });
  },
});
