import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole } from "./users";

export const list = query({
  args: {
    fundingStage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.fundingStage) {
      return ctx.db
        .query("grants")
        .withIndex("by_fundingStage", (q) => q.eq("fundingStage", args.fundingStage!))
        .collect();
    }
    return ctx.db.query("grants").collect();
  },
});

export const getById = query({
  args: { id: v.id("grants") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allGrants = await ctx.db.query("grants").collect();

    const byStage: Record<string, number> = {};
    let totalAwarded = 0;
    let upcomingReports = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const grant of allGrants) {
      byStage[grant.fundingStage] = (byStage[grant.fundingStage] || 0) + 1;

      if (grant.fundingStage === "active" || grant.fundingStage === "committed") {
        totalAwarded += grant.amountAwarded ?? 0;
      }

      // Count upcoming report dates (next 30 days)
      for (const dateStr of [grant.q1ReportDate, grant.q2ReportDate, grant.q3ReportDate, grant.q4ReportDate]) {
        if (dateStr) {
          const d = new Date(dateStr);
          if (d >= now && d <= thirtyDaysFromNow) {
            upcomingReports++;
          }
        }
      }
    }

    return {
      total: allGrants.length,
      byStage,
      totalAwarded,
      upcomingReports,
    };
  },
});

/**
 * Get grants with upcoming report deadlines (within 30 days).
 * Returns grant name, funder, and specific deadline date for display in attention panel.
 */
export const getUpcomingDeadlines = query({
  args: {},
  handler: async (ctx) => {
    const allGrants = await ctx.db.query("grants").collect();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming: { grantId: string; fundingSource: string; programName: string; deadlineDate: string; reportLabel: string }[] = [];

    for (const grant of allGrants) {
      const quarters = [
        { date: grant.q1ReportDate, label: "Q1 Report" },
        { date: grant.q2ReportDate, label: "Q2 Report" },
        { date: grant.q3ReportDate, label: "Q3 Report" },
        { date: grant.q4ReportDate, label: "Q4 Report" },
      ];

      for (const q of quarters) {
        if (q.date) {
          const d = new Date(q.date);
          if (d >= now && d <= thirtyDaysFromNow) {
            upcoming.push({
              grantId: grant._id,
              fundingSource: grant.fundingSource ?? "Unknown Funder",
              programName: grant.programName ?? "Unknown Program",
              deadlineDate: q.date,
              reportLabel: q.label,
            });
          }
        }
      }
    }

    // Sort by soonest deadline first
    upcoming.sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime());

    return upcoming;
  },
});

// Public mutation for CLI import script (ConvexHttpClient can't call internal mutations)
export const importBatch = mutation({
  args: {
    grants: v.array(v.object({
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
    })),
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

export const update = mutation({
  args: {
    id: v.id("grants"),
    fundingStage: v.optional(v.string()),
    fundingSource: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "manager"]);
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("grants") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "manager"]);
    await ctx.db.delete(args.id);
  },
});
