import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getFullConfig = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("googleCalendarConfig").first();
  },
});

export const upsertEvent = internalMutation({
  args: {
    eventId: v.string(),
    calendarId: v.string(),
    calendarDisplayName: v.string(),
    summary: v.string(),
    startAt: v.number(),
    endAt: v.number(),
    isAllDay: v.boolean(),
    location: v.optional(v.string()),
    htmlLink: v.optional(v.string()),
    lastSyncAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleCalendarCache")
      .withIndex("by_eventId_calendarId", (q) =>
        q.eq("eventId", args.eventId).eq("calendarId", args.calendarId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("googleCalendarCache", args);
    }
  },
});

export const clearCalendarEvents = internalMutation({
  args: { calendarId: v.string() },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("googleCalendarCache")
      .withIndex("by_calendarId", (q) => q.eq("calendarId", args.calendarId))
      .collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
  },
});

export const updateLastSync = internalMutation({
  args: { configId: v.id("googleCalendarConfig") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, { lastSyncAt: Date.now() });
  },
});

export const cleanupDeselectedCalendars = internalMutation({
  args: { selectedCalendarIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const selectedSet = new Set(args.selectedCalendarIds);
    // Fetch all cached events and remove those whose calendarId is not in the selected set
    const allEvents = await ctx.db.query("googleCalendarCache").collect();
    let removed = 0;
    for (const event of allEvents) {
      if (!selectedSet.has(event.calendarId)) {
        await ctx.db.delete(event._id);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`Cleaned up ${removed} stale events from de-selected calendars`);
    }
  },
});
