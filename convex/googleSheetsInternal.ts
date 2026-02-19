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

// Get Sheets config by purpose
export const getConfigByPurpose = internalQuery({
  args: { purpose: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleSheetsConfig")
      .withIndex("by_purpose", (q) => q.eq("purpose", args.purpose))
      .first();
  },
});

// Upsert a program participant from Sheets data
export const upsertProgramParticipant = internalMutation({
  args: {
    sheetRowId: v.string(),
    programType: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    gender: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    enrollmentDate: v.optional(v.string()),
    status: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    reasonForVisit: v.optional(v.string()),
    programOutcome: v.optional(v.string()),
    sessionCount: v.optional(v.number()),
    lastSyncAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("programDataCache")
      .withIndex("by_sheetRowId", (q) => q.eq("sheetRowId", args.sheetRowId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("programDataCache", args);
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
