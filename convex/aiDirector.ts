import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get messages for a session (real-time)
export const getMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiDirectorMessages")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Get all sessions for a user
export const getSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("aiDirectorMessages").collect();

    // Group by sessionId, filter by userId, get first message as preview
    const sessionMap = new Map<
      string,
      { sessionId: string; preview: string; createdAt: number; messageCount: number }
    >();

    for (const msg of messages) {
      if (msg.userId !== args.userId) continue;

      const existing = sessionMap.get(msg.sessionId);
      if (!existing) {
        sessionMap.set(msg.sessionId, {
          sessionId: msg.sessionId,
          preview: msg.role === "user" ? msg.content.slice(0, 100) : "",
          createdAt: msg.createdAt,
          messageCount: 1,
        });
      } else {
        existing.messageCount++;
        if (!existing.preview && msg.role === "user") {
          existing.preview = msg.content.slice(0, 100);
        }
      }
    }

    return Array.from(sessionMap.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

// Save a message
export const saveMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiDirectorMessages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Delete a session (all messages)
export const deleteSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("aiDirectorMessages")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

// Get AI Director config
export const getConfig = query({
  handler: async (ctx) => {
    return await ctx.db.query("aiDirectorConfig").first();
  },
});
