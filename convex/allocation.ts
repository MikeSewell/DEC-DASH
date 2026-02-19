import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get latest allocation run
export const getLatestRun = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("allocationRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .first();
  },
});

// Get all allocations for a run
export const getAllocations = query({
  args: { runId: v.id("allocationRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenseAllocations")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

// Internal version for use in actions
export const getAllocationsInternal = internalQuery({
  args: { runId: v.id("allocationRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenseAllocations")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

// Get allocation stats for summary cards
export const getAllocationStats = query({
  args: { runId: v.id("allocationRuns") },
  handler: async (ctx, args) => {
    const allocations = await ctx.db
      .query("expenseAllocations")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();

    return {
      total: allocations.length,
      high: allocations.filter((a) => a.confidence === "high").length,
      medium: allocations.filter((a) => a.confidence === "medium").length,
      low: allocations.filter((a) => a.confidence === "low").length,
      approved: allocations.filter((a) => a.status === "approved").length,
      submitted: allocations.filter((a) => a.status === "submitted").length,
      pending: allocations.filter((a) => a.status === "pending").length,
      skipped: allocations.filter((a) => a.status === "skipped").length,
      errors: allocations.filter((a) => a.status === "error").length,
    };
  },
});

// Get grant profiles from cached budgets (for grant cards UI)
export const getGrantProfiles = query({
  handler: async (ctx) => {
    const budgetsCache = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "budgets"))
      .first();
    const expensesCache = await ctx.db
      .query("quickbooksCache")
      .withIndex("by_reportType", (q) => q.eq("reportType", "expenses"))
      .first();

    if (!budgetsCache) return [];

    const budgets: any[] = JSON.parse(budgetsCache.data).QueryResponse?.Budget ?? [];
    const allPurchases: any[] = expensesCache
      ? JSON.parse(expensesCache.data).QueryResponse?.Purchase ?? []
      : [];

    const today = new Date();

    // Build grant budgets
    const grantBudgets: Record<string, any> = {};
    for (const budget of budgets) {
      if (!budget.BudgetDetail) continue;
      const startDate = new Date(budget.StartDate);
      const endDate = new Date(budget.EndDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const percentTimeElapsed = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

      if (remainingDays < 0) continue;

      for (const detail of budget.BudgetDetail) {
        if (!detail.ClassRef?.value) continue;
        const classId = detail.ClassRef.value;
        const accountName = detail.AccountRef?.name;
        const accountId = detail.AccountRef?.value;
        const amount = detail.Amount || 0;
        if (accountName?.includes("Revenue") || accountName?.startsWith("4") || amount === 0) continue;

        if (!grantBudgets[classId]) {
          grantBudgets[classId] = {
            class_id: classId,
            class_name: detail.ClassRef.name,
            end_date: budget.EndDate,
            remaining_days: remainingDays,
            percent_time_elapsed: Math.round(percentTimeElapsed),
            categories: {} as Record<string, { account_id: string; account_name: string; total_budget: number }>,
          };
        }
        if (!grantBudgets[classId].categories[accountId]) {
          grantBudgets[classId].categories[accountId] = { account_id: accountId, account_name: accountName, total_budget: 0 };
        }
        grantBudgets[classId].categories[accountId].total_budget += amount;
      }
    }

    // Calculate spending
    const actualSpending: Record<string, Record<string, number>> = {};
    for (const purchase of allPurchases) {
      for (const line of purchase.Line || []) {
        if (line.DetailType !== "AccountBasedExpenseLineDetail") continue;
        const detail = line.AccountBasedExpenseLineDetail || {};
        const classId = detail.ClassRef?.value;
        const accountId = detail.AccountRef?.value;
        if (!classId || !accountId) continue;
        if (!actualSpending[classId]) actualSpending[classId] = {};
        if (!actualSpending[classId][accountId]) actualSpending[classId][accountId] = 0;
        actualSpending[classId][accountId] += line.Amount || 0;
      }
    }

    // Build profiles
    return Object.values(grantBudgets).map((grant: any) => {
      const classSpending = actualSpending[grant.class_id] || {};
      let totalBudget = 0;
      let totalSpent = 0;

      const categories = Object.values(grant.categories as Record<string, any>).map((cat: any) => {
        const spent = classSpending[cat.account_id] || 0;
        totalBudget += cat.total_budget;
        totalSpent += spent;
        return {
          account_name: cat.account_name,
          total_budget: Math.round(cat.total_budget * 100) / 100,
          amount_spent: Math.round(spent * 100) / 100,
          remaining: Math.round(Math.max(0, cat.total_budget - spent) * 100) / 100,
          percent_spent: Math.round(cat.total_budget > 0 ? (spent / cat.total_budget) * 100 : 0),
        };
      });

      const percentBudgetSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      const pacingDelta = percentBudgetSpent - grant.percent_time_elapsed;
      let pacingStatus = "on_track";
      if (pacingDelta > 10) pacingStatus = "ahead_of_pace";
      else if (pacingDelta < -15) pacingStatus = "behind_pace";

      return {
        class_id: grant.class_id,
        class_name: grant.class_name,
        end_date: grant.end_date,
        remaining_days: grant.remaining_days,
        total_budget: Math.round(totalBudget * 100) / 100,
        total_spent: Math.round(totalSpent * 100) / 100,
        total_remaining: Math.round(Math.max(0, totalBudget - totalSpent) * 100) / 100,
        percent_spent: Math.round(percentBudgetSpent),
        pacing_status: pacingStatus,
        categories,
      };
    });
  },
});

// User changes the final assignment dropdown
export const updateFinalAssignment = mutation({
  args: {
    allocationId: v.id("expenseAllocations"),
    finalClassId: v.string(),
    finalClassName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.allocationId, {
      finalClassId: args.finalClassId,
      finalClassName: args.finalClassName,
    });
  },
});

// Approve a single allocation
export const approveAllocation = mutation({
  args: { allocationId: v.id("expenseAllocations") },
  handler: async (ctx, args) => {
    const alloc = await ctx.db.get(args.allocationId);
    if (!alloc) throw new Error("Allocation not found");
    if (!alloc.finalClassId) throw new Error("No final assignment set");
    await ctx.db.patch(args.allocationId, { status: "approved" });
  },
});

// Bulk-approve all high-confidence allocations for a run
export const approveAllHighConfidence = mutation({
  args: { runId: v.id("allocationRuns") },
  handler: async (ctx, args) => {
    const allocations = await ctx.db
      .query("expenseAllocations")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();

    let count = 0;
    for (const alloc of allocations) {
      if (alloc.confidence === "high" && alloc.status === "pending" && alloc.finalClassId) {
        await ctx.db.patch(alloc._id, { status: "approved" });
        count++;
      }
    }
    return count;
  },
});

// Bulk update assignment for selected allocations
export const bulkUpdateAssignment = mutation({
  args: {
    allocationIds: v.array(v.id("expenseAllocations")),
    finalClassId: v.string(),
    finalClassName: v.string(),
  },
  handler: async (ctx, args) => {
    for (const id of args.allocationIds) {
      await ctx.db.patch(id, {
        finalClassId: args.finalClassId,
        finalClassName: args.finalClassName,
      });
    }
  },
});

// Reset all finalClass back to suggestedClass for a run
export const resetToAISuggestions = mutation({
  args: { runId: v.id("allocationRuns") },
  handler: async (ctx, args) => {
    const allocations = await ctx.db
      .query("expenseAllocations")
      .withIndex("by_runId", (q) => q.eq("runId", args.runId))
      .collect();

    for (const alloc of allocations) {
      if (alloc.status !== "submitted") {
        await ctx.db.patch(alloc._id, {
          finalClassId: alloc.suggestedClassId,
          finalClassName: alloc.suggestedClassName,
          status: "pending",
        });
      }
    }
  },
});

// Skip a single allocation
export const skipAllocation = mutation({
  args: { allocationId: v.id("expenseAllocations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.allocationId, { status: "skipped" });
  },
});
