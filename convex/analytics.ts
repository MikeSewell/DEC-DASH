import { query } from "./_generated/server";
import { v } from "convex/values";
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
 * Normalize free-text ethnicity values into standard categories.
 * Intake forms had no dropdown — users typed whatever they wanted,
 * producing 50+ variations (Black, AA, African American, etc.).
 */
const ETHNICITY_MAP: Record<string, string> = {
  // Black / African American
  "black": "Black / African American",
  "aa": "Black / African American",
  "african american": "Black / African American",
  "african-american": "Black / African American",
  "(black)": "Black / African American",
  "black hispanic": "Black / African American",
  // Hispanic / Latino
  "hispanic": "Hispanic / Latino",
  "hispanic or latino": "Hispanic / Latino",
  "hispanic or latine": "Hispanic / Latino",
  "latin american": "Hispanic / Latino",
  "latino": "Hispanic / Latino",
  "mex": "Hispanic / Latino",
  // White
  "white": "White",
  "caucasian": "White",
  "white non hispanic": "White",
  "european": "White",
  "european american": "White",
  // Asian
  "asian": "Asian",
  "chinese": "Asian",
  "hmong": "Asian",
  "east indian": "Asian",
  // Native American / Pacific Islander
  "american indian or alaska native": "Native American / Pacific Islander",
  "native hawaiian or other pacific islander": "Native American / Pacific Islander",
  // Multiracial
  "mixed": "Multiracial",
  "latin mixed": "Multiracial",
  "mixed race": "Multiracial",
  "bi-racial": "Multiracial",
  "biracial": "Multiracial",
};

function normalizeEthnicity(raw: string | undefined): string {
  if (!raw) return "Unknown";
  const key = raw.trim().toLowerCase();
  return ETHNICITY_MAP[key] ?? raw.trim();
}

/**
 * Cap a distribution to the top N entries, rolling the rest into "Other".
 */
function topN(
  dist: Array<{ name: string; count: number }>,
  n: number,
): Array<{ name: string; count: number }> {
  if (dist.length <= n) return dist;
  const top = dist.slice(0, n);
  const otherCount = dist.slice(n).reduce((sum, d) => sum + d.count, 0);
  if (otherCount > 0) top.push({ name: "Other", count: otherCount });
  return top;
}

/**
 * Returns aggregate demographics from the clients table.
 * Accepts optional programId to filter by program, or returns all clients.
 * Ethnicity values are normalized from free-text intake data into standard categories.
 */
export const getAllDemographics = query({
  args: { programId: v.optional(v.id("programs")) },
  handler: async (ctx, { programId }) => {
    let clients = await ctx.db.query("clients").collect();

    // If programId provided, filter clients via enrollments join
    let scopedEnrollments = programId
      ? await ctx.db
          .query("enrollments")
          .withIndex("by_programId", (q) => q.eq("programId", programId))
          .collect()
      : null;

    if (programId && scopedEnrollments) {
      const enrolledClientIds = new Set(scopedEnrollments.map((e) => e.clientId));
      clients = clients.filter((c) => enrolledClientIds.has(c._id));
    }

    const total = clients.length;

    // Active/completed counts from enrollments (scoped to programId if provided)
    const allEnrollments = scopedEnrollments
      ? scopedEnrollments
      : await ctx.db.query("enrollments").collect();
    const activeClientIds = new Set(
      allEnrollments.filter((e) => e.status === "active").map((e) => e.clientId)
    );
    const completedClientIds = new Set(
      allEnrollments.filter((e) => e.status === "completed").map((e) => e.clientId)
    );
    const active = clients.filter((c) => activeClientIds.has(c._id)).length;
    const completed = clients.filter((c) => completedClientIds.has(c._id)).length;

    const toSortedDistribution = (field: (c: (typeof clients)[0]) => string) => {
      const map: Record<string, number> = {};
      for (const c of clients) {
        const val = field(c);
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
      genderDistribution: toSortedDistribution((c) => c.gender || "Unknown"),
      ethnicityDistribution: topN(toSortedDistribution((c) => normalizeEthnicity(c.ethnicity)), 8),
      ageDistribution: topN(toSortedDistribution((c) => c.ageGroup || "Unknown"), 8),
      referralSource: toSortedDistribution((c) => c.referralSource || "Unknown").slice(0, 10),
      zipDistribution: topN(toSortedDistribution((c) => c.zipCode || "Unknown"), 12),
    };
  },
});

/**
 * Returns executive-level program overview stats.
 * Designed for the Programs tab — high-level metrics an ED cares about.
 */
export const getProgramOverview = query({
  args: { programId: v.optional(v.id("programs")) },
  handler: async (ctx, { programId }) => {
    // All enrollments — filtered by program if specified, otherwise all
    const enrollments = programId
      ? await ctx.db
          .query("enrollments")
          .withIndex("by_programId", (q) => q.eq("programId", programId))
          .collect()
      : await ctx.db.query("enrollments").collect();

    const enrolledClientIds = new Set(enrollments.map((e) => e.clientId));
    const totalParticipants = enrolledClientIds.size;
    const completedCount = new Set(
      enrollments.filter((e) => e.status === "completed").map((e) => e.clientId)
    ).size;

    // All sessions — filtered by program if specified, otherwise all
    const allSessions = await ctx.db.query("sessions").collect();
    const programSessions = programId
      ? allSessions.filter(
          (s) => s.programId === programId || enrolledClientIds.has(s.clientId)
        )
      : allSessions;

    const totalSessions = programSessions.length;

    // Sessions per client — how many people came back more than once
    const sessionsPerClient: Record<string, number> = {};
    for (const s of programSessions) {
      const key = s.clientId as string;
      sessionsPerClient[key] = (sessionsPerClient[key] ?? 0) + 1;
    }
    const clientsWithSessions = Object.keys(sessionsPerClient).length;
    const multiSessionClients = Object.values(sessionsPerClient).filter((c) => c > 1).length;
    const avgSessionsPerClient = clientsWithSessions > 0
      ? Math.round((totalSessions / clientsWithSessions) * 10) / 10
      : 0;

    // Retention: completed / total (program completion rate)
    const completionRate = totalParticipants > 0
      ? Math.round((completedCount / totalParticipants) * 100)
      : 0;

    // Sessions in last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSessions = programSessions.filter((s) => s.sessionDate >= thirtyDaysAgo).length;

    // Attendance breakdown
    const attended = programSessions.filter((s) => s.attendanceStatus === "attended").length;
    const missed = programSessions.filter((s) => s.attendanceStatus === "missed").length;
    const attendanceRate = (attended + missed) > 0
      ? Math.round((attended / (attended + missed)) * 100)
      : null;

    // Zip code reach
    const clients = await Promise.all(
      Array.from(enrolledClientIds).map((id) => ctx.db.get(id))
    );
    const uniqueZips = new Set(clients.filter(Boolean).map((c) => c!.zipCode).filter(Boolean));

    return {
      totalParticipants,
      completedCount,
      totalSessions,
      recentSessions,
      multiSessionClients,
      avgSessionsPerClient,
      completionRate,
      attendanceRate,
      zipCodeReach: uniqueZips.size,
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
 * Returns detailed legal program metrics from legalIntakeForms.
 * Attorney representation %, court dates, restraining orders, order types,
 * compliance, child support, safety concerns, new vs modified orders.
 */
export const getLegalInsights = query({
  args: { programId: v.optional(v.id("programs")) },
  handler: async (ctx, { programId }) => {
    let forms = await ctx.db.query("legalIntakeForms").collect();

    // If programId provided, filter forms to clients enrolled in that program
    if (programId) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_programId", (q) => q.eq("programId", programId))
        .collect();
      const enrolledClientIds = new Set(enrollments.map((e) => String(e.clientId)));
      forms = forms.filter((f) => f.clientId && enrolledClientIds.has(String(f.clientId)));
    }

    const total = forms.length;
    if (total === 0) return null;

    function countYesNo(field: (f: typeof forms[number]) => string | undefined) {
      let yes = 0, no = 0;
      for (const f of forms) {
        const val = (field(f) ?? "").toLowerCase().trim();
        if (val === "yes" || val === "y") yes++;
        else if (val === "no" || val === "n") no++;
      }
      return { yes, no, total: yes + no, pct: (yes + no) > 0 ? Math.round((yes / (yes + no)) * 100) : 0 };
    }

    const attorney = countYesNo((f) => f.hasAttorney);
    const restrainingOrder = countYesNo((f) => f.hasRestrainingOrder);
    const safetyConcerns = countYesNo((f) => f.safetyFears);
    const custodyFollowed = countYesNo((f) => f.custodyOrderFollowed);

    // Upcoming court dates count
    const now = new Date();
    let upcomingCourtDates = 0;
    for (const f of forms) {
      if (f.upcomingCourtDate) {
        const d = new Date(f.upcomingCourtDate);
        if (d >= now) upcomingCourtDates++;
      }
    }

    // Existing court orders breakdown
    const orderTypes: Record<string, number> = {};
    for (const f of forms) {
      const val = (f.existingCourtOrders ?? "").trim();
      if (val) {
        orderTypes[val] = (orderTypes[val] ?? 0) + 1;
      }
    }
    const orderTypeList = Object.entries(orderTypes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Child support orders
    const childSupport = countYesNo((f) => f.childSupportOrders);

    // Payment status breakdown
    const paymentStatuses: Record<string, number> = {};
    for (const f of forms) {
      const val = (f.paymentStatus ?? "").trim();
      if (val) {
        paymentStatuses[val] = (paymentStatuses[val] ?? 0) + 1;
      }
    }
    const paymentStatusList = Object.entries(paymentStatuses)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Seeking new vs modified orders
    const seekingTypes: Record<string, number> = {};
    for (const f of forms) {
      const val = (f.seekingTo ?? "").trim();
      if (val) {
        seekingTypes[val] = (seekingTypes[val] ?? 0) + 1;
      }
    }
    const seekingTypeList = Object.entries(seekingTypes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      attorney,
      restrainingOrder,
      safetyConcerns,
      custodyFollowed,
      upcomingCourtDates,
      orderTypeList,
      childSupport,
      paymentStatusList,
      seekingTypeList,
    };
  },
});

/**
 * Returns detailed CPC program metrics from coparentIntakeForms.
 * Parent types, co-parent informed %, session completion distribution, unique families.
 */
export const getCpcInsights = query({
  args: { programId: v.optional(v.id("programs")) },
  handler: async (ctx, { programId }) => {
    let forms = await ctx.db.query("coparentIntakeForms").collect();

    // If programId provided, filter to enrolled clients
    if (programId) {
      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_programId", (q) => q.eq("programId", programId))
        .collect();
      const enrolledClientIds = new Set(enrollments.map((e) => String(e.clientId)));
      forms = forms.filter((f) => f.clientId && enrolledClientIds.has(String(f.clientId)));
    }

    const total = forms.length;
    if (total === 0) return null;

    // Parent types (role field — "Mom" / "Dad" / etc.)
    const roleTypes: Record<string, number> = {};
    for (const f of forms) {
      const val = (f.role ?? "Unknown").trim();
      roleTypes[val] = (roleTypes[val] ?? 0) + 1;
    }
    const roleList = Object.entries(roleTypes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Co-parent informed
    let informedYes = 0, informedNo = 0;
    for (const f of forms) {
      const val = (f.coParentInformed ?? "").toLowerCase().trim();
      if (val === "yes" || val === "y") informedYes++;
      else if (val === "no" || val === "n") informedNo++;
    }
    const informedTotal = informedYes + informedNo;
    const informedPct = informedTotal > 0 ? Math.round((informedYes / informedTotal) * 100) : 0;

    // Session completion distribution
    const buckets = { "0": 0, "1-2": 0, "3-4": 0, "5+": 0 };
    for (const f of forms) {
      const raw = f.sessionsCompleted ?? "0";
      const n = parseInt(raw, 10);
      if (isNaN(n) || n === 0) buckets["0"]++;
      else if (n <= 2) buckets["1-2"]++;
      else if (n <= 4) buckets["3-4"]++;
      else buckets["5+"]++;
    }
    const sessionDistribution = Object.entries(buckets).map(([name, count]) => ({ name, count }));

    // Unique families (by co-parent name as proxy)
    const families = new Set<string>();
    for (const f of forms) {
      const name = (f.fullName ?? "").trim().toLowerCase();
      const coParent = (f.coParentName ?? "").trim().toLowerCase();
      if (name && coParent) {
        // Normalize family key so both partners map to same family
        const key = [name, coParent].sort().join("|");
        families.add(key);
      } else if (name) {
        families.add(name);
      }
    }

    return {
      total,
      roleList,
      coParentInformed: { yes: informedYes, no: informedNo, total: informedTotal, pct: informedPct },
      sessionDistribution,
      uniqueFamilies: families.size,
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
