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

// Save config (singleton pattern — patch or insert)
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
    } else {
      await ctx.db.insert("googleCalendarConfig", {
        calendars: args.calendars,
        configuredBy: "" as any, // matches Sheets pattern — no auth context in mutation
      });
    }
  },
});
