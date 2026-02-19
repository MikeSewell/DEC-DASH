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

// Get program demographics from cache
export const getProgramDemographics = query({
  args: { programType: v.string() },
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("programDataCache")
      .withIndex("by_programType", (q) => q.eq("programType", args.programType))
      .collect();

    const total = participants.length;
    const active = participants.filter((p) => p.status?.toLowerCase() === "active").length;
    const completed = participants.filter((p) => p.status?.toLowerCase() === "completed").length;

    const sessionCounts = participants
      .map((p) => p.sessionCount)
      .filter((s): s is number => s !== undefined);
    const avgSessions =
      sessionCounts.length > 0
        ? sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length
        : 0;

    const toSortedDistribution = (field: (p: typeof participants[0]) => string | undefined) => {
      const map: Record<string, number> = {};
      for (const p of participants) {
        const val = field(p) || "Unknown";
        map[val] = (map[val] ?? 0) + 1;
      }
      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    const genderDistribution = toSortedDistribution((p) => p.gender);
    const ethnicityDistribution = toSortedDistribution((p) => p.ethnicity);
    const ageDistribution = toSortedDistribution((p) => p.ageGroup);
    const outcomeDistribution = toSortedDistribution((p) => p.programOutcome);
    const reasonForVisit = toSortedDistribution((p) => p.reasonForVisit).slice(0, 10);
    const referralSource = toSortedDistribution((p) => p.referralSource).slice(0, 10);

    return {
      total,
      active,
      completed,
      avgSessions: Math.round(avgSessions * 10) / 10,
      genderDistribution,
      ethnicityDistribution,
      ageDistribution,
      outcomeDistribution,
      reasonForVisit,
      referralSource,
    };
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
