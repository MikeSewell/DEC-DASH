import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get dashboard preferences for the current user.
 */
export const getPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prefs = await ctx.db
      .query("dashboardPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return prefs ?? null;
  },
});

/**
 * Save (upsert) dashboard preferences for the current user.
 */
export const savePrefs = mutation({
  args: {
    sectionOrder: v.array(v.string()),
    hiddenSections: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("dashboardPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sectionOrder: args.sectionOrder,
        hiddenSections: args.hiddenSections,
      });
    } else {
      await ctx.db.insert("dashboardPrefs", {
        userId,
        sectionOrder: args.sectionOrder,
        hiddenSections: args.hiddenSections,
      });
    }
  },
});
