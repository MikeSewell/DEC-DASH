import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./users";

// Default thresholds used when no config row exists
export const ALERT_DEFAULTS = {
  deadlineWindowDays: 30,
  budgetVariancePct: 90,
  qbStalenessHours: 1,
  sheetsStalenessHours: 2,
  calendarStalenessHours: 2,
} as const;

/**
 * Get current alert configuration thresholds.
 * Returns defaults if no config row exists yet.
 */
export const get = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("alertConfig").first();
    if (!config) return ALERT_DEFAULTS;
    return {
      deadlineWindowDays: config.deadlineWindowDays,
      budgetVariancePct: config.budgetVariancePct,
      qbStalenessHours: config.qbStalenessHours,
      sheetsStalenessHours: config.sheetsStalenessHours,
      calendarStalenessHours: config.calendarStalenessHours,
    };
  },
});

/**
 * Update alert configuration thresholds. Admin/manager only.
 * Upserts the singleton config row.
 */
export const update = mutation({
  args: {
    deadlineWindowDays: v.number(),
    budgetVariancePct: v.number(),
    qbStalenessHours: v.number(),
    sheetsStalenessHours: v.number(),
    calendarStalenessHours: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin", "manager");
    const existing = await ctx.db.query("alertConfig").first();
    const data = { ...args, updatedAt: Date.now(), updatedBy: user._id };
    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("alertConfig", data);
    }
  },
});
