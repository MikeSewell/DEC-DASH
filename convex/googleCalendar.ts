import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get config status (public — for admin UI and widget three-state check)
export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("googleCalendarConfig").first();
    if (!config) return null;
    return {
      _id: config._id,
      calendars: config.calendars,
      lastSyncAt: config.lastSyncAt,
      connectedAt: config.connectedAt ?? null,
      isExpired: config.tokenExpiry ? config.tokenExpiry < Date.now() : false,
    };
  },
});

// Get events for dashboard widget (today + 7 days)
export const getEvents = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("googleCalendarConfig").first();
    if (!config || config.calendars.length === 0) return null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const windowEnd = todayStart.getTime() + 8 * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("googleCalendarCache")
      .withIndex("by_startAt", (q) =>
        q.gte("startAt", todayStart.getTime()).lt("startAt", windowEnd)
      )
      .order("asc")
      .collect();

    return { events, lastSyncAt: config.lastSyncAt ?? null };
  },
});

// Save OAuth tokens from callback (singleton — delete old, insert new)
export const saveTokens = mutation({
  args: {
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("googleCalendarConfig").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("googleCalendarConfig", {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiry: args.tokenExpiry,
      connectedAt: Date.now(),
      calendars: [],
    });
  },
});

// Save selected calendars (patch existing config)
export const saveConfig = mutation({
  args: {
    calendars: v.array(v.object({
      calendarId: v.string(),
      displayName: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("googleCalendarConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, { calendars: args.calendars });
    }
  },
});

// Disconnect — clear config and all cached events
export const disconnect = mutation({
  handler: async (ctx) => {
    const config = await ctx.db.query("googleCalendarConfig").first();
    if (config) {
      await ctx.db.delete(config._id);
    }

    // Clear all cached events
    const events = await ctx.db.query("googleCalendarCache").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
  },
});
