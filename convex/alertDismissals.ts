import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Dismiss an alert for the current user.
 * No-ops if already dismissed (idempotent).
 */
export const dismiss = mutation({
  args: { alertKey: v.string() },
  handler: async (ctx, { alertKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already dismissed
    const existing = await ctx.db
      .query("alertDismissals")
      .withIndex("by_userId_alertKey", (q) =>
        q.eq("userId", userId).eq("alertKey", alertKey)
      )
      .first();
    if (existing) return; // already dismissed

    await ctx.db.insert("alertDismissals", {
      userId,
      alertKey,
      dismissedAt: Date.now(),
    });
  },
});

/**
 * Un-dismiss an alert for the current user.
 * No-ops if not currently dismissed (idempotent).
 */
export const undismiss = mutation({
  args: { alertKey: v.string() },
  handler: async (ctx, { alertKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("alertDismissals")
      .withIndex("by_userId_alertKey", (q) =>
        q.eq("userId", userId).eq("alertKey", alertKey)
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

/**
 * Get all dismissed alertKeys for the current user.
 * Returns a string[] of alertKey values — frontend uses this to filter the alerts list client-side.
 * Returns empty array if not authenticated.
 */
export const getMyDismissals = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const dismissals = await ctx.db
      .query("alertDismissals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return dismissals.map((d) => d.alertKey);
  },
});
