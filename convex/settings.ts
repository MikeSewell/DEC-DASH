import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireRole } from "./users";

/**
 * Get a setting value by key.
 */
export const get = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting ?? null;
  },
});

/**
 * Upsert a setting value by key. Admin only.
 */
export const set = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("appSettings", {
        key: args.key,
        value: args.value,
      });
    }
  },
});
