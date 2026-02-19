import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all newsletters
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("newsletters")
      .order("desc")
      .collect();
  },
});

// Get newsletter by ID
export const getById = query({
  args: { id: v.id("newsletters") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create newsletter
export const create = mutation({
  args: {
    title: v.string(),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("newsletters", {
      title: args.title,
      status: "draft",
      sections: JSON.stringify({
        dadOfMonthName: "",
        dadOfMonthStory: "",
        participantTestimonials: "",
        programHighlights: "",
        programUpdates: "",
        fatherhoodStat: "",
        additionalNotes: "",
      }),
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update newsletter
export const update = mutation({
  args: {
    id: v.id("newsletters"),
    title: v.optional(v.string()),
    sections: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("review"), v.literal("published"))
    ),
    generatedEmailHtml: v.optional(v.string()),
    generatedEmailSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete newsletter
export const remove = mutation({
  args: { id: v.id("newsletters") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Publish newsletter (set status + publishedAt)
export const publish = mutation({
  args: { id: v.id("newsletters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
