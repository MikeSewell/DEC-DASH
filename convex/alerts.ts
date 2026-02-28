import { query } from "./_generated/server";

export interface Alert {
  id: string; // deterministic, e.g. "deadline-{grant._id}-Q1 Report"
  type: "deadline" | "budget" | "sync" | "integration";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action?: { label: string; href: string };
  urgencyScore: number; // higher = more urgent, used for descending sort
}

export const getAlerts = query({
  handler: async (ctx): Promise<Alert[]> => {
    const alerts: Alert[] = [];
    const now = Date.now();

    // ─── Load alert thresholds from alertConfig singleton (fall back to defaults) ─
    const configRow = await ctx.db.query("alertConfig").first();
    const config = {
      deadlineWindowDays: configRow?.deadlineWindowDays ?? 30,
      budgetVariancePct: configRow?.budgetVariancePct ?? 90,
      qbStalenessHours: configRow?.qbStalenessHours ?? 1,
      sheetsStalenessHours: configRow?.sheetsStalenessHours ?? 2,
      calendarStalenessHours: configRow?.calendarStalenessHours ?? 2,
    };

    // ─── Section A: ALRT-01 — Grant deadline alerts (configurable window) ────
    try {
      const allGrants = await ctx.db.query("grants").collect();
      const reportLabels: Array<keyof typeof allGrants[0]> = [
        "q1ReportDate",
        "q2ReportDate",
        "q3ReportDate",
        "q4ReportDate",
      ];
      const labelNames: Record<string, string> = {
        q1ReportDate: "Q1 Report",
        q2ReportDate: "Q2 Report",
        q3ReportDate: "Q3 Report",
        q4ReportDate: "Q4 Report",
      };

      const windowMs = config.deadlineWindowDays * 24 * 60 * 60 * 1000;

      for (const grant of allGrants) {
        for (const field of reportLabels) {
          const dateStr = grant[field] as string | undefined;
          if (!dateStr) continue;

          const dateMs = new Date(dateStr).getTime();
          if (isNaN(dateMs)) continue;
          if (dateMs < now || dateMs > now + windowMs) continue;

          const daysLeft = Math.ceil((dateMs - now) / 86400000);
          const reportLabel = labelNames[field as string];

          alerts.push({
            id: `deadline-${grant._id}-${reportLabel}`,
            type: "deadline",
            severity: daysLeft <= 7 ? "critical" : "warning",
            title: `${reportLabel} Due — ${grant.fundingSource ?? "Grant"}`,
            description: `${grant.programName ?? ""} report due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`.trim(),
            action: { label: "View Grant", href: "/grants" },
            urgencyScore: 1000 - daysLeft,
          });
        }
      }
    } catch {
      // Section A failed — skip without crashing the entire query
    }

    // ─── Section B: ALRT-02 — Budget variance alerts (>90% threshold) ────────
    try {
      const cachedGrants = await ctx.db.query("grantsCache").collect();

      for (const g of cachedGrants) {
        if (g.amountSpent === undefined || g.totalAmount <= 0) continue;

        const pct = g.amountSpent / g.totalAmount;
        if (pct < config.budgetVariancePct / 100) continue;

        alerts.push({
          id: `budget-${g._id}`,
          type: "budget",
          severity: pct >= 1.0 ? "critical" : "warning",
          title: `Budget Alert — ${g.grantName}`,
          description: `${Math.round(pct * 100)}% of budget spent ($${g.amountSpent.toLocaleString()} of $${g.totalAmount.toLocaleString()})`,
          action: { label: "View Budget", href: "/grants" },
          urgencyScore: pct >= 1.0 ? 900 : 800,
        });
      }
    } catch {
      // Section B failed — skip without crashing the entire query
    }

    // ─── Section C: ALRT-03 — QuickBooks sync staleness ──────────────────────
    try {
      const qbCache = await ctx.db
        .query("quickbooksCache")
        .withIndex("by_fetchedAt")
        .order("desc")
        .first();

      if (qbCache) {
        const qbAgeMs = now - qbCache.fetchedAt;
        if (qbAgeMs > config.qbStalenessHours * 60 * 60 * 1000) {
          alerts.push({
            id: "sync-qb-stale",
            type: "sync",
            severity: "warning",
            title: "QuickBooks Data Is Stale",
            description: `Last synced ${Math.floor(qbAgeMs / 3600000)}h ${Math.floor((qbAgeMs % 3600000) / 60000)}m ago (threshold: ${config.qbStalenessHours}h)`,
            action: { label: "Admin", href: "/admin" },
            urgencyScore: 500,
          });
        }
      }
    } catch {
      // Section C failed — skip without crashing the entire query
    }

    // ─── Section D: ALRT-03 — QuickBooks not connected / token expired ────────
    try {
      const qbConfig = await ctx.db.query("quickbooksConfig").first();

      if (!qbConfig) {
        alerts.push({
          id: "integration-qb-missing",
          type: "integration",
          severity: "warning",
          title: "QuickBooks Not Connected",
          description:
            "Financial data unavailable — connect QuickBooks to see expenses, P&L, and cash on hand.",
          action: { label: "Connect", href: "/admin" },
          urgencyScore: 400,
        });
      } else if (qbConfig.tokenExpiry < now) {
        alerts.push({
          id: "integration-qb-expired",
          type: "integration",
          severity: "warning",
          title: "QuickBooks Token Expired",
          description:
            "Your QuickBooks session has expired. Reconnect to restore financial data sync.",
          action: { label: "Reconnect", href: "/admin" },
          urgencyScore: 450,
        });
      }
    } catch {
      // Section D failed — skip without crashing the entire query
    }

    // ─── Section E: ALRT-03 — Google Sheets sync staleness ───────────────────
    try {
      const sheetsConfigs = await ctx.db.query("googleSheetsConfig").collect();

      if (sheetsConfigs.length > 0) {
        const latestSheetSync = Math.max(
          ...sheetsConfigs.map((c) => c.lastSyncAt ?? 0)
        );

        if (latestSheetSync > 0 && now - latestSheetSync > config.sheetsStalenessHours * 60 * 60 * 1000) {
          alerts.push({
            id: "sync-sheets-stale",
            type: "sync",
            severity: "info",
            title: "Google Sheets Data Is Stale",
            description: `Last synced ${Math.floor((now - latestSheetSync) / 3600000)}h ago (threshold: ${config.sheetsStalenessHours}h)`,
            action: { label: "Admin", href: "/admin" },
            urgencyScore: 300,
          });
        }
      }
    } catch {
      // Section E failed — skip without crashing the entire query
    }

    // ─── Section F: ALRT-03 — Google Calendar sync staleness ─────────────────
    try {
      const calConfig = await ctx.db.query("googleCalendarConfig").first();

      if (
        calConfig?.lastSyncAt &&
        now - calConfig.lastSyncAt > config.calendarStalenessHours * 60 * 60 * 1000
      ) {
        alerts.push({
          id: "sync-calendar-stale",
          type: "sync",
          severity: "info",
          title: "Google Calendar Data Is Stale",
          description: `Last synced ${Math.floor((now - calConfig.lastSyncAt) / 3600000)}h ago (threshold: ${config.calendarStalenessHours}h)`,
          action: { label: "Admin", href: "/admin" },
          urgencyScore: 250,
        });
      }
    } catch {
      // Section F failed — skip without crashing the entire query
    }

    // ─── Final sort: most urgent first ───────────────────────────────────────
    alerts.sort((a, b) => b.urgencyScore - a.urgencyScore);

    return alerts;
  },
});
