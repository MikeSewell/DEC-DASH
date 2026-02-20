import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const grantFields = {
  grantKey: v.string(),
  fundingStage: v.string(),
  fundingSource: v.string(),
  programType: v.optional(v.string()),
  programName: v.optional(v.string()),
  amountAwarded: v.optional(v.number()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  contactName: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  arStatus: v.optional(v.string()),
  dateFundsReceived: v.optional(v.string()),
  paymentSchedule: v.optional(v.string()),
  grantNumber: v.optional(v.string()),
  q1ReportDate: v.optional(v.string()),
  q2ReportDate: v.optional(v.string()),
  q3ReportDate: v.optional(v.string()),
  q4ReportDate: v.optional(v.string()),
  notes: v.optional(v.string()),
  importedAt: v.number(),
};

export const batchUpsert = internalMutation({
  args: {
    grants: v.array(v.object(grantFields)),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let updated = 0;

    for (const grant of args.grants) {
      const existing = await ctx.db
        .query("grants")
        .withIndex("by_grantKey", (q) => q.eq("grantKey", grant.grantKey))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, grant);
        updated++;
      } else {
        await ctx.db.insert("grants", grant);
        inserted++;
      }
    }

    return { inserted, updated };
  },
});

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("grants").collect();
    for (const grant of all) {
      await ctx.db.delete(grant._id);
    }
    return { deleted: all.length };
  },
});
