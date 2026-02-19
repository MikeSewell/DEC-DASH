import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get dashboard preferences for the current user.
 */
export const getPrefs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = identity.email;
    if (!email) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return null;

    const prefs = await ctx.db
      .query("dashboardPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const email = identity.email;
    if (!email) throw new Error("No email in identity");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("dashboardPrefs")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sectionOrder: args.sectionOrder,
        hiddenSections: args.hiddenSections,
      });
    } else {
      await ctx.db.insert("dashboardPrefs", {
        userId: user._id,
        sectionOrder: args.sectionOrder,
        hiddenSections: args.hiddenSections,
      });
    }
  },
});
