import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

/**
 * List goals for a specific client.
 */
export const list = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientGoals")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

/**
 * Create a new goal for a client.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    goalDescription: v.string(),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("not_started")
    ),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const goalId = await ctx.db.insert("clientGoals", {
      clientId: args.clientId,
      goalDescription: args.goalDescription,
      status: args.status,
      targetDate: args.targetDate,
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_goal",
      entityType: "clientGoals",
      entityId: goalId,
      details: `Created goal for client ${args.clientId}: "${args.goalDescription}"`,
    });

    return goalId;
  },
});

/**
 * Update the status of a goal.
 */
export const updateStatus = mutation({
  args: {
    goalId: v.id("clientGoals"),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("not_started")
    ),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const existing = await ctx.db.get(args.goalId);
    if (!existing) throw new Error("Goal not found");

    const updates: Record<string, unknown> = {
      status: args.status,
    };
    if (args.completedAt !== undefined) {
      updates.completedAt = args.completedAt;
    }

    await ctx.db.patch(args.goalId, updates);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "update_goal_status",
      entityType: "clientGoals",
      entityId: args.goalId,
      details: `Updated goal status from "${existing.status}" to "${args.status}"`,
    });
  },
});
