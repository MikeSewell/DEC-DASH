import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Returns the last 12 calendar months as bucket descriptors,
 * ordered chronologically oldest → newest.
 */
function getLast12Months(): Array<{ label: string; start: number; end: number }> {
  const now = new Date();
  const months: Array<{ label: string; start: number; end: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    months.push({ label, start: d.getTime(), end: next.getTime() });
  }
  return months;
}

/**
 * Returns the count of active clients across all programs.
 * Uses the enrollments by_status index for an efficient equality scan,
 * then deduplicates by clientId (a client may have active enrollments
 * in multiple programs).
 */
export const getActiveClientCount = query({
  args: {},
  handler: async (ctx) => {
    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    // Deduplicate: a client may have active enrollments in multiple programs
    const uniqueClientIds = new Set(activeEnrollments.map((e) => e.clientId));
    return { count: uniqueClientIds.size };
  },
});

/**
 * Returns the count of sessions logged in the last 30 days.
 * Uses the by_sessionDate index for an efficient range scan instead of
 * a full table collect + in-memory filter.
 */
export const getSessionVolume = query({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("sessions")
      .withIndex("by_sessionDate", (q) => q.gte("sessionDate", thirtyDaysAgo))
      .collect();
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
 * Returns aggregate demographics across ALL clients from the clients table.
 * Used by the Demographics tab on the Analytics page.
 * Replaces the former programDataCache query — demographics now come directly
 * from migrated client records (Phase 18 backfilled gender, ethnicity, ageGroup,
 * referralSource for 345 of 350 clients).
 * outcomeDistribution returns [] — no programOutcome field on clients table;
 * the UI has a length > 0 guard that hides the chart automatically.
 */
export const getAllDemographics = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const total = clients.length;
    const active = clients.filter((c) => c.status === "active").length;
    const completed = clients.filter((c) => c.status === "completed").length;

    const toSortedDistribution = (field: (c: (typeof clients)[0]) => string | undefined) => {
      const map: Record<string, number> = {};
      for (const c of clients) {
        const val = field(c) || "Unknown";
        map[val] = (map[val] ?? 0) + 1;
      }
      return Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      total,
      active,
      completed,
      genderDistribution: toSortedDistribution((c) => c.gender),
      ethnicityDistribution: toSortedDistribution((c) => c.ethnicity),
      ageDistribution: toSortedDistribution((c) => c.ageGroup),
      outcomeDistribution: [] as Array<{ name: string; count: number }>,
      referralSource: toSortedDistribution((c) => c.referralSource).slice(0, 10),
    };
  },
});

/**
 * Returns session counts grouped by the last 12 calendar months.
 * Uses Promise.all + per-bucket by_sessionDate index range scans,
 * mirroring the proven getIntakeVolume pattern (no full table scan).
 */
export const getSessionTrends = query({
  args: {},
  handler: async (ctx) => {
    const buckets = getLast12Months();
    const months = await Promise.all(
      buckets.map(async ({ label, start, end }) => {
        const sessions = await ctx.db
          .query("sessions")
          .withIndex("by_sessionDate", (q) =>
            q.gte("sessionDate", start).lt("sessionDate", end)
          )
          .collect();
        return { label, count: sessions.length };
      })
    );
    return { months };
  },
});

/**
 * Returns aggregate goal status counts and overall completion rate.
 */
export const getGoalStats = query({
  args: {},
  handler: async (ctx) => {
    const goals = await ctx.db.query("clientGoals").collect();
    const total = goals.length;
    const inProgress = goals.filter((g) => g.status === "in_progress").length;
    const completed = goals.filter((g) => g.status === "completed").length;
    const notStarted = goals.filter((g) => g.status === "not_started").length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { inProgress, completed, notStarted, total, completionRate };
  },
});

/**
 * Returns legal and co-parent intake counts grouped by the last 12 calendar months.
 * Uses the by_createdAt index for efficient range queries.
 */
export const getIntakeVolume = query({
  args: {},
  handler: async (ctx) => {
    const buckets = getLast12Months();
    const months = await Promise.all(
      buckets.map(async ({ label, start, end }) => {
        const legalForms = await ctx.db
          .query("legalIntakeForms")
          .withIndex("by_createdAt", (q) =>
            q.gte("createdAt", start).lt("createdAt", end)
          )
          .collect();
        const coparentForms = await ctx.db
          .query("coparentIntakeForms")
          .withIndex("by_createdAt", (q) =>
            q.gte("createdAt", start).lt("createdAt", end)
          )
          .collect();
        return { label, legal: legalForms.length, coparent: coparentForms.length };
      })
    );
    return { months };
  },
});

/**
 * Returns the 50 most recent audit log entries with resolved user names.
 * Used by the Operations tab activity feed.
 */
export const getAuditFeed = query({
  args: {},
  handler: async (ctx) => {
    function formatAction(action: string, entityType: string, details?: string): string {
      const verb = action.charAt(0).toUpperCase() + action.slice(1);
      const entity = entityType.replace(/_/g, " ");
      return details ? `${verb} ${entity}: ${details}` : `${verb} ${entity}`;
    }

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(50);

    return Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          id: log._id as string,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          action: log.action,
          entityType: log.entityType,
          description: formatAction(log.action, log.entityType, log.details),
          createdAt: log.createdAt,
        };
      })
    );
  },
});

/**
 * Returns per-user action counts from the audit log, sorted descending,
 * along with the most active user and total action count.
 */
export const getStaffActionStats = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();

    const countMap: Map<string, { count: number; userId: Id<"users"> }> = new Map();
    for (const log of logs) {
      const key = log.userId as string;
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        countMap.set(key, { count: 1, userId: log.userId });
      }
    }

    const staffStatsRaw = await Promise.all(
      Array.from(countMap.entries()).map(async ([, { count, userId }]) => {
        const user = await ctx.db.get(userId);
        return {
          userId: userId as string,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          actionCount: count,
        };
      })
    );

    staffStatsRaw.sort((a, b) => b.actionCount - a.actionCount);

    const totalActions = logs.length;
    const mostActive =
      staffStatsRaw.length > 0
        ? {
            userId: staffStatsRaw[0].userId,
            userName: staffStatsRaw[0].userName,
            actionCount: staffStatsRaw[0].actionCount,
          }
        : null;

    return {
      staffStats: staffStatsRaw,
      mostActive,
      totalActions,
    };
  },
});

/**
 * Returns expense categorization acceptance rate, category distribution,
 * and confidence breakdown from the expenseAllocations table.
 */
export const getCategorizationStats = query({
  args: {},
  handler: async (ctx) => {
    const allocations = await ctx.db.query("expenseAllocations").collect();

    const totalAllocations = allocations.length;
    const totalCategorized = allocations.filter((a) => a.status !== "error").length;
    const accepted = allocations.filter(
      (a) => a.status === "approved" || a.status === "submitted"
    ).length;
    const acceptanceRate =
      totalCategorized === 0 ? 0 : Math.round((accepted / totalCategorized) * 100);

    const categoryMap: Map<string, number> = new Map();
    for (const a of allocations) {
      const category = a.finalClassName ?? a.suggestedClassName ?? "Uncategorized";
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    }
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    let high = 0;
    let medium = 0;
    let low = 0;
    for (const a of allocations) {
      if (a.confidence === "high") high += 1;
      else if (a.confidence === "medium") medium += 1;
      else if (a.confidence === "low") low += 1;
    }

    return {
      totalAllocations,
      accepted,
      acceptanceRate,
      categoryDistribution,
      confidenceBreakdown: { high, medium, low },
    };
  },
});
