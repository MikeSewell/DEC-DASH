import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Internal mutation to insert an audit log entry.
 * Called by other mutations whenever data changes.
 */
export const log = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      details: args.details,
      createdAt: Date.now(),
    });
  },
});

/**
 * Query recent audit logs with optional filters.
 * Admin only.
 */
export const getLogs = query({
  args: {
    limit: v.optional(v.number()),
    entityType: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Check admin role
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const email = identity.email;
    if (!email) throw new Error("No email in identity");
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!currentUser) throw new Error("User not found");
    if (currentUser.role !== "admin") throw new Error("Insufficient permissions");

    const limit = args.limit ?? 50;

    let logsQuery = ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt")
      .order("desc");

    const allLogs = await logsQuery.collect();

    let filtered = allLogs;

    if (args.entityType) {
      filtered = filtered.filter((log) => log.entityType === args.entityType);
    }
    if (args.userId) {
      filtered = filtered.filter((log) => log.userId === args.userId);
    }

    return filtered.slice(0, limit);
  },
});
