import { query } from "./_generated/server";
import { v } from "convex/values";

// List all budget cache records sorted by className.
// Primary query for the Grant Budget dashboard section.
// Filters out "All" aggregate records when per-class records exist (same logic as getBudgetSummary).
export const listBudgetRecords = query({
  handler: async (ctx) => {
    const records = await ctx.db.query("budgetCache").collect();

    // Filter out "All" records when per-class records exist for the same budgetId
    const budgetIdsWithClasses = new Set<string>();
    for (const r of records) {
      if (r.className !== "All") {
        budgetIdsWithClasses.add(r.budgetId);
      }
    }
    const filtered = records.filter(
      (r) => !(r.className === "All" && budgetIdsWithClasses.has(r.budgetId))
    );

    // Sort by className for consistent UI display
    filtered.sort((a, b) => a.className.localeCompare(b.className));
    return filtered;
  },
});

// Get the budget record matched to a specific grant.
// Used by grant detail pages to show budget vs actual for a specific grant.
export const getBudgetByGrantId = query({
  args: { grantId: v.id("grants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("budgetCache")
      .withIndex("by_grantId", (q) => q.eq("grantId", args.grantId))
      .first();
  },
});

// Aggregate all budget records into a summary with totals and burn rate.
// Returns null when no records exist (three-state loading pattern: undefined=loading, null=empty, data=ready).
export const getBudgetSummary = query({
  handler: async (ctx) => {
    const records = await ctx.db.query("budgetCache").collect();
    if (records.length === 0) return null;

    // Filter out "All" records when per-class records exist for the same budgetId
    // to prevent double-counting (the "All" record aggregates all class values)
    const budgetIdsWithClasses = new Set<string>();
    for (const r of records) {
      if (r.className !== "All") {
        budgetIdsWithClasses.add(r.budgetId);
      }
    }
    const filtered = records.filter(
      (r) => !(r.className === "All" && budgetIdsWithClasses.has(r.budgetId))
    );

    let totalRevenueActual = 0;
    let totalRevenueBudget = 0;
    let totalExpenseActual = 0;
    let totalExpenseBudget = 0;

    for (const r of filtered) {
      totalRevenueActual += r.revenueActual;
      totalRevenueBudget += r.revenueBudget;
      totalExpenseActual += r.expenseActual;
      totalExpenseBudget += r.expenseBudget;
    }

    const budgetRemaining = totalExpenseBudget - totalExpenseActual;
    const budgetRemainingPct =
      totalExpenseBudget > 0
        ? Math.round((budgetRemaining / totalExpenseBudget) * 1000) / 10
        : 0;
    const burnRate =
      totalExpenseBudget > 0
        ? Math.round((totalExpenseActual / totalExpenseBudget) * 1000) / 10
        : 0;

    // Find the latest syncedAt across all records
    const lastSyncedAt = Math.max(...records.map((r) => r.syncedAt));

    return {
      totalRevenueActual,
      totalRevenueBudget,
      totalExpenseActual,
      totalExpenseBudget,
      budgetRemaining,
      budgetRemainingPct,
      burnRate,
      recordCount: filtered.length,
      lastSyncedAt,
      // Period from any record (they all share the same sync period)
      periodStart: records[0]?.periodStart ?? "",
      periodEnd: records[0]?.periodEnd ?? "",
    };
  },
});
