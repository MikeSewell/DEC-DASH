import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get Sheets config status
export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("googleSheetsConfig").first();
    if (!config) return null;
    return {
      _id: config._id,
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      serviceAccountEmail: config.serviceAccountEmail,
      lastSyncAt: config.lastSyncAt,
    };
  },
});

// Get all grants from cache
export const getGrants = query({
  handler: async (ctx) => {
    return await ctx.db.query("grantsCache").collect();
  },
});

// Get active grants only
export const getActiveGrants = query({
  handler: async (ctx) => {
    const grants = await ctx.db.query("grantsCache").collect();
    return grants.filter((g) => g.status === "active");
  },
});

// Get grant deadlines (upcoming)
export const getGrantDeadlines = query({
  handler: async (ctx) => {
    const grants = await ctx.db.query("grantsCache").collect();
    const deadlines: { grantName: string; deadline: string; grantId: string }[] = [];

    for (const grant of grants) {
      if (grant.deadlines) {
        try {
          const parsed = JSON.parse(grant.deadlines) as string[];
          for (const d of parsed) {
            if (new Date(d) >= new Date()) {
              deadlines.push({
                grantName: grant.grantName,
                deadline: d,
                grantId: grant.sheetRowId,
              });
            }
          }
        } catch {
          // Skip malformed deadlines
        }
      }
      // Also check endDate as a deadline
      if (grant.status === "active" && new Date(grant.endDate) >= new Date()) {
        deadlines.push({
          grantName: grant.grantName,
          deadline: grant.endDate,
          grantId: grant.sheetRowId,
        });
      }
    }

    return deadlines.sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
  },
});

// Get grant by sheet row ID
export const getGrantById = query({
  args: { sheetRowId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("grantsCache")
      .withIndex("by_sheetRowId", (q) => q.eq("sheetRowId", args.sheetRowId))
      .first();
  },
});

// Save Sheets config
export const saveConfig = mutation({
  args: {
    spreadsheetId: v.string(),
    sheetName: v.string(),
    serviceAccountEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("googleSheetsConfig").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("googleSheetsConfig", {
      spreadsheetId: args.spreadsheetId,
      sheetName: args.sheetName,
      serviceAccountEmail: args.serviceAccountEmail,
      configuredBy: "" as any,
    });
  },
});
