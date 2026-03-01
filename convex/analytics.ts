import { query } from "./_generated/server";

/**
 * Returns the count of active clients across all programs.
 */
export const getActiveClientCount = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const active = clients.filter((c) => c.status === "active");
    return { count: active.length };
  },
});

/**
 * Returns the count of sessions logged in the last 30 days.
 */
export const getSessionVolume = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const allSessions = await ctx.db.query("sessions").collect();
    const recent = allSessions.filter((s) => s.sessionDate >= thirtyDaysAgo);
    return { count: recent.length, periodLabel: "Last 30 days" };
  },
});

/**
 * Returns intake trend comparing new intakes this month vs. last month
 * across both legalIntakeForms and coparentIntakeForms.
 */
export const getIntakeTrend = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    // Legal intake forms
    const legalThisMonth = await ctx.db
      .query("legalIntakeForms")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startOfCurrentMonth))
      .collect();

    const legalLastMonth = await ctx.db
      .query("legalIntakeForms")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", startOfPrevMonth).lt("createdAt", startOfCurrentMonth)
      )
      .collect();

    // Coparent intake forms
    const coparentThisMonth = await ctx.db
      .query("coparentIntakeForms")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", startOfCurrentMonth))
      .collect();

    const coparentLastMonth = await ctx.db
      .query("coparentIntakeForms")
      .withIndex("by_createdAt", (q) =>
        q.gte("createdAt", startOfPrevMonth).lt("createdAt", startOfCurrentMonth)
      )
      .collect();

    const thisMonth = legalThisMonth.length + coparentThisMonth.length;
    const lastMonth = legalLastMonth.length + coparentLastMonth.length;

    let changePercent: number;
    if (lastMonth === 0 && thisMonth > 0) {
      changePercent = 100;
    } else if (lastMonth === 0 && thisMonth === 0) {
      changePercent = 0;
    } else {
      changePercent = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }

    // More intakes = positive for a nonprofit serving clients
    const positive = thisMonth >= lastMonth;

    return { thisMonth, lastMonth, changePercent, positive };
  },
});

/**
 * Returns aggregate demographics across ALL program types in programDataCache.
 * Used by the Demographics tab on the Analytics page.
 */
export const getAllDemographics = query({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db.query("programDataCache").collect();

    const total = participants.length;
    const active = participants.filter((p) => p.status?.toLowerCase() === "active").length;
    const completed = participants.filter((p) => p.status?.toLowerCase() === "completed").length;

    const toSortedDistribution = (field: (p: (typeof participants)[0]) => string | undefined) => {
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
    const referralSource = toSortedDistribution((p) => p.referralSource).slice(0, 10);

    return {
      total,
      active,
      completed,
      genderDistribution,
      ethnicityDistribution,
      ageDistribution,
      outcomeDistribution,
      referralSource,
    };
  },
});
