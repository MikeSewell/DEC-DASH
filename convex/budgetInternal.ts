import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Upsert a single budget record by budgetId+classId composite key
export const upsertBudgetRecord = internalMutation({
  args: {
    budgetId: v.string(),
    budgetName: v.string(),
    classId: v.string(),
    className: v.string(),
    revenueActual: v.number(),
    revenueBudget: v.number(),
    revenueVariance: v.number(),
    revenuePercentUsed: v.number(),
    expenseActual: v.number(),
    expenseBudget: v.number(),
    expenseVariance: v.number(),
    expensePercentUsed: v.number(),
    netActual: v.number(),
    netBudget: v.number(),
    netVariance: v.number(),
    netPercentUsed: v.number(),
    lineItems: v.string(),
    periodStart: v.string(),
    periodEnd: v.string(),
    grantId: v.optional(v.id("grants")),
    syncedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("budgetCache")
      .withIndex("by_budgetId_classId", (q) =>
        q.eq("budgetId", args.budgetId).eq("classId", args.classId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("budgetCache", args);
    }
  },
});

// Batch upsert budget records from a JSON string array (avoids Convex argument size limits)
export const batchUpsertBudgetRecords = internalMutation({
  args: { records: v.string() }, // JSON stringified array of budget record objects
  handler: async (ctx, args) => {
    const records = JSON.parse(args.records) as Array<{
      budgetId: string;
      budgetName: string;
      classId: string;
      className: string;
      revenueActual: number;
      revenueBudget: number;
      revenueVariance: number;
      revenuePercentUsed: number;
      expenseActual: number;
      expenseBudget: number;
      expenseVariance: number;
      expensePercentUsed: number;
      netActual: number;
      netBudget: number;
      netVariance: number;
      netPercentUsed: number;
      lineItems: string;
      periodStart: string;
      periodEnd: string;
      grantId?: string;
      syncedAt: number;
    }>;

    for (const record of records) {
      const existing = await ctx.db
        .query("budgetCache")
        .withIndex("by_budgetId_classId", (q) =>
          q.eq("budgetId", record.budgetId).eq("classId", record.classId)
        )
        .first();

      // grantId needs special handling: it's a string ID that needs to stay as-is for Convex
      const doc = {
        ...record,
        grantId: record.grantId ? (record.grantId as any) : undefined,
      };

      if (existing) {
        await ctx.db.patch(existing._id, doc);
      } else {
        await ctx.db.insert("budgetCache", doc as any);
      }
    }
  },
});

// Get all budget cache records (used by sync action to check existing data)
export const getAllBudgetRecords = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("budgetCache").collect();
  },
});
