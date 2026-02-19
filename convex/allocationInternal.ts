import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createRun = internalMutation({
  args: {
    startedBy: v.id("users"),
    totalExpenses: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("allocationRuns", {
      status: "running",
      startedAt: Date.now(),
      startedBy: args.startedBy,
      totalExpenses: args.totalExpenses,
      totalProcessed: 0,
    });
  },
});

export const updateRun = internalMutation({
  args: {
    runId: v.id("allocationRuns"),
    status: v.optional(v.union(v.literal("running"), v.literal("completed"), v.literal("failed"))),
    completedAt: v.optional(v.number()),
    totalProcessed: v.optional(v.number()),
    totalSubmitted: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { runId, ...updates } = args;
    const patch: Record<string, unknown> = {};
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.completedAt !== undefined) patch.completedAt = updates.completedAt;
    if (updates.totalProcessed !== undefined) patch.totalProcessed = updates.totalProcessed;
    if (updates.totalSubmitted !== undefined) patch.totalSubmitted = updates.totalSubmitted;
    if (updates.errorMessage !== undefined) patch.errorMessage = updates.errorMessage;
    await ctx.db.patch(runId, patch);
  },
});

export const saveAllocations = internalMutation({
  args: {
    allocations: v.array(v.object({
      runId: v.id("allocationRuns"),
      purchaseId: v.string(),
      lineId: v.string(),
      syncToken: v.string(),
      vendorName: v.string(),
      accountName: v.string(),
      amount: v.number(),
      txnDate: v.string(),
      memo: v.optional(v.string()),
      suggestedClassId: v.optional(v.string()),
      suggestedClassName: v.optional(v.string()),
      suggestedScore: v.optional(v.number()),
      confidence: v.string(),
      explanation: v.string(),
      scoringDetail: v.optional(v.string()),
      runnerUpClassName: v.optional(v.string()),
      runnerUpScore: v.optional(v.number()),
      qualifyingGrants: v.optional(v.string()),
      finalClassId: v.optional(v.string()),
      finalClassName: v.optional(v.string()),
      action: v.string(),
      status: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    for (const alloc of args.allocations) {
      await ctx.db.insert("expenseAllocations", alloc);
    }
  },
});

export const updateAllocationStatus = internalMutation({
  args: {
    allocationId: v.id("expenseAllocations"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    if (args.submittedAt !== undefined) patch.submittedAt = args.submittedAt;
    await ctx.db.patch(args.allocationId, patch);
  },
});

export const getRunningRun = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("allocationRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .filter((q) => q.eq(q.field("status"), "running"))
      .first();
  },
});
