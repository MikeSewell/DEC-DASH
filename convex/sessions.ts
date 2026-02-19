import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

/**
 * List sessions with optional filter by clientId.
 */
export const list = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    if (args.clientId) {
      return await ctx.db
        .query("sessions")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId!))
        .collect();
    }
    return await ctx.db.query("sessions").collect();
  },
});

/**
 * Create a new session.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    programId: v.optional(v.id("programs")),
    sessionDate: v.number(),
    sessionType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const sessionId = await ctx.db.insert("sessions", {
      clientId: args.clientId,
      programId: args.programId,
      sessionDate: args.sessionDate,
      sessionType: args.sessionType,
      notes: args.notes,
      createdBy: currentUser._id,
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_session",
      entityType: "sessions",
      entityId: sessionId,
      details: `Created session for client ${args.clientId}`,
    });

    return sessionId;
  },
});

/**
 * Get active sessions from the last 30 days.
 */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const allSessions = await ctx.db.query("sessions").collect();

    return allSessions.filter((s) => s.sessionDate >= thirtyDaysAgo);
  },
});
