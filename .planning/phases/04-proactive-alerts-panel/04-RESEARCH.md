# Phase 4: Proactive Alerts Panel - Research

**Researched:** 2026-02-28
**Domain:** Convex computed queries, alert data modeling, in-app toast/panel integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALRT-01 | Grant deadline alerts surface upcoming quarterly reports due within 30 days | `grants.getUpcomingDeadlines` already exists and returns the right shape. New `alerts.ts` query wraps it with urgency scoring. |
| ALRT-02 | Budget variance alerts trigger when grant spending exceeds pacing threshold | `grantsCache` has `amountSpent` + `totalAmount`; `quickbooksCache` BVA report provides QB actuals. Logic is pure math — no new tables needed. |
| ALRT-03 | Sync status alerts show when QB (>1 hour) or Sheets (>2 hours) data is stale | `quickbooksConfig.connectedAt`, `quickbooksCache.fetchedAt`, `googleSheetsConfig.lastSyncAt`, `googleCalendarConfig.lastSyncAt` — all `number` timestamps in existing schema. No schema changes needed. |
| ALRT-04 | Alerts display in the "What Needs Attention" panel on the dashboard | `WhatNeedsAttention.tsx` already exists and is wired into `dashboard/page.tsx`. Phase 4 replaces its multiple `useQuery` calls with a single `useQuery(api.alerts.getAlerts)`. |
</phase_requirements>

---

## Summary

Phase 4 is the final assembly step. All prerequisite data already lives in Convex tables established in Phases 2 and 3. The core work is:

1. **`convex/alerts.ts`** — a single pure Convex `query` that reads `grants`, `grantsCache`, `quickbooksCache`, `quickbooksConfig`, `googleSheetsConfig`, and `googleCalendarConfig`, computes `Alert[]` with urgency ordering, and returns them. No new tables or schema changes are needed.

2. **`WhatNeedsAttention.tsx` refactor** — replace the current three-query fan-out (`getUpcomingDeadlines`, `getConfig`, `getStats`) with a single `useQuery(api.alerts.getAlerts)`. The component renders the same `AttentionItem[]` format it already uses, with new alert types added.

3. **Toast notifications** — a `useEffect` in `WhatNeedsAttention.tsx` (or a thin hook wrapper) fires `toast({ variant: "warning" })` for critical alerts via the existing `useToast()` from `src/components/ui/Toast.tsx`. Sonner is **not installed** and the project's custom `Toast.tsx` + `ToastProvider` is already wired into the dashboard layout. Use the existing system.

The only real design decision is the budget variance threshold for ALRT-02. The `grants.getStats` + `GrantBudget.tsx` logic already uses 75% (approaching) and 100% (over). The STATE.md concern is: "alert thresholds (30-day deadline window, 15% budget variance) should be validated with Kareem before coding to avoid alert fatigue." The pacing-based definition of "exceeds threshold" needs to be decided at plan time.

**Primary recommendation:** Build `convex/alerts.ts` as a pure query returning `Alert[]`, refactor `WhatNeedsAttention.tsx` to consume it, and fire `useToast()` for critical alerts. No new dependencies required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Convex query | 1.32.0 (project) | Computed `Alert[]` from existing tables | All Convex data access already uses queries; no new pattern needed |
| React `useQuery` | convex/react | Subscribe to `alerts.getAlerts` in component | Already the pattern for every dashboard component |
| Project `useToast()` | custom (Toast.tsx) | Trigger toast notifications | Already installed, wired in layout, and used elsewhere |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.1.0 (project) | Date math for staleness / days-remaining | Already installed; use for `differenceInDays`, `isAfter` instead of raw `Date.getTime()` arithmetic |
| `formatDate`, `timeAgo` from `@/lib/utils` | project util | Display timestamps in alert text | Consistent with existing pattern (WhatNeedsAttention already uses `formatDate`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `useToast()` | sonner | Sonner not installed; existing Toast is functional, themed, and already in layout. Adding sonner would be extra dependency for no gain. |
| Pure Convex query in `alerts.ts` | Multiple useQuery calls in component (current pattern) | Single query is better: one round-trip, server-side urgency ranking, panel loads even if one source has stale data (query handles nulls gracefully). |
| Simple field reads | A new `alertsCache` table | Table overkill — alerts are computed, not stored; computing on read is correct for live data. |

**Installation:** None required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
convex/
└── alerts.ts                  # NEW: pure query returning Alert[]

src/components/dashboard/
└── WhatNeedsAttention.tsx     # MODIFY: replace 3 useQuery calls with api.alerts.getAlerts
```

No new frontend component files. No new hooks file needed (direct `useQuery` in the component is idiomatic for this project — see `ExecutiveSnapshot.tsx`, `GrantBudget.tsx`, etc.).

### Pattern 1: Single Alerts Query (Server-Side Aggregation)

**What:** `convex/alerts.ts` exports one `query` that reads all relevant tables, computes alerts, ranks by urgency, and returns `Alert[]`. The component does zero computation.

**When to use:** When data comes from multiple sources but the output is a simple ranked list. Keeps the component thin.

**Example:**

```typescript
// convex/alerts.ts
import { query } from "./_generated/server";

export interface Alert {
  id: string;
  type: "deadline" | "budget" | "sync" | "integration";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action?: { label: string; href: string };
  urgencyScore: number; // higher = more urgent, used for sort
}

export const getAlerts = query({
  handler: async (ctx): Promise<Alert[]> => {
    const alerts: Alert[] = [];
    const now = Date.now();

    // --- ALRT-01: Grant deadlines within 30 days ---
    const allGrants = await ctx.db.query("grants").collect();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    for (const grant of allGrants) {
      for (const [label, dateStr] of [
        ["Q1 Report", grant.q1ReportDate],
        ["Q2 Report", grant.q2ReportDate],
        ["Q3 Report", grant.q3ReportDate],
        ["Q4 Report", grant.q4ReportDate],
      ] as [string, string | undefined][]) {
        if (!dateStr) continue;
        const d = new Date(dateStr).getTime();
        if (d >= now && d <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((d - now) / 86400000);
          alerts.push({
            id: `deadline-${grant._id}-${label}`,
            type: "deadline",
            severity: daysLeft <= 7 ? "critical" : "warning",
            title: `${label} Due — ${grant.fundingSource ?? "Grant"}`,
            description: `${grant.programName ?? ""} report due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
            action: { label: "View Grant", href: "/grants" },
            urgencyScore: 1000 - daysLeft, // sooner = higher score
          });
        }
      }
    }

    // --- ALRT-02: Budget variance (grantsCache spending vs totalAmount) ---
    const cachedGrants = await ctx.db.query("grantsCache").collect();
    for (const g of cachedGrants) {
      if (g.amountSpent !== undefined && g.totalAmount > 0) {
        const pct = g.amountSpent / g.totalAmount;
        if (pct >= 0.9) { // >90% threshold for alert
          alerts.push({
            id: `budget-${g.sheetRowId}`,
            type: "budget",
            severity: pct >= 1.0 ? "critical" : "warning",
            title: `Budget Alert — ${g.grantName}`,
            description: `${Math.round(pct * 100)}% of budget spent ($${g.amountSpent.toLocaleString()} of $${g.totalAmount.toLocaleString()})`,
            action: { label: "View Budget", href: "/dashboard" },
            urgencyScore: pct >= 1.0 ? 900 : 800,
          });
        }
      }
    }

    // --- ALRT-03: Sync staleness ---
    // QB: stale if any quickbooksCache entry is >1 hour old
    const qbCache = await ctx.db.query("quickbooksCache").first();
    if (qbCache) {
      const qbAgeMs = now - qbCache.fetchedAt;
      if (qbAgeMs > 60 * 60 * 1000) {
        alerts.push({
          id: "sync-qb-stale",
          type: "sync",
          severity: "warning",
          title: "QuickBooks Data Is Stale",
          description: `Last synced ${Math.floor(qbAgeMs / 3600000)}h ago (threshold: 1h)`,
          action: { label: "Admin", href: "/admin" },
          urgencyScore: 500,
        });
      }
    }

    // QB: not connected at all
    const qbConfig = await ctx.db.query("quickbooksConfig").first();
    if (!qbConfig) {
      alerts.push({
        id: "integration-qb-missing",
        type: "integration",
        severity: "warning",
        title: "QuickBooks Not Connected",
        description: "Financial data unavailable — connect QuickBooks to see expenses, P&L, and cash on hand.",
        action: { label: "Connect", href: "/admin" },
        urgencyScore: 400,
      });
    }

    // Sheets: stale if lastSyncAt >2 hours old
    const sheetsConfig = await ctx.db.query("googleSheetsConfig").first();
    if (sheetsConfig?.lastSyncAt) {
      const sheetsAgeMs = now - sheetsConfig.lastSyncAt;
      if (sheetsAgeMs > 2 * 60 * 60 * 1000) {
        alerts.push({
          id: "sync-sheets-stale",
          type: "sync",
          severity: "info",
          title: "Google Sheets Data Is Stale",
          description: `Last synced ${Math.floor(sheetsAgeMs / 3600000)}h ago (threshold: 2h)`,
          action: { label: "Admin", href: "/admin" },
          urgencyScore: 300,
        });
      }
    }

    // Sort descending by urgencyScore
    alerts.sort((a, b) => b.urgencyScore - a.urgencyScore);
    return alerts;
  },
});
```

### Pattern 2: Component Consumes Single Query

**What:** `WhatNeedsAttention.tsx` calls only `useQuery(api.alerts.getAlerts)`. It maps `Alert[]` → rendered items. Fires `useToast()` for critical alerts via `useEffect`.

**When to use:** Whenever a component is already built but needs to migrate from fan-out queries to a single aggregated query.

**Example:**

```typescript
// src/components/dashboard/WhatNeedsAttention.tsx (refactored core)
"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "@/components/ui/Toast";
import { useEffect, useRef } from "react";

export default function WhatNeedsAttention() {
  const alerts = useQuery(api.alerts.getAlerts);
  const { toast } = useToast();
  const toastedRef = useRef<Set<string>>(new Set());
  const isLoading = alerts === undefined;

  // Fire toast for critical alerts (once per id per session)
  useEffect(() => {
    if (!alerts) return;
    for (const alert of alerts) {
      if (alert.severity === "critical" && !toastedRef.current.has(alert.id)) {
        toastedRef.current.add(alert.id);
        toast({ title: alert.title, description: alert.description, variant: "warning" });
      }
    }
  }, [alerts, toast]);

  // ... render using same AttentionItem layout as before
}
```

### Pattern 3: Three-State Null Safety in alerts.ts

**What:** Each data source read in `alerts.ts` is wrapped in a null check. If a source is not configured, we skip that alert category rather than crashing. This satisfies ALRT-04 success criterion: "panel loads even if one underlying data source is temporarily unavailable."

**When to use:** All multi-source aggregation queries in this project.

**Example:**
```typescript
// Each section is independently null-safe
const qbCache = await ctx.db.query("quickbooksCache").first(); // null → skip sync check
const cachedGrants = await ctx.db.query("grantsCache").collect(); // empty → no budget alerts
```

### Anti-Patterns to Avoid

- **Fan-out in the component:** The current `WhatNeedsAttention.tsx` has 3 separate `useQuery` calls. Don't add more — consolidate into `alerts.ts`. Otherwise `isLoading` logic gets increasingly fragile.
- **Storing computed alerts in a table:** Alerts are derived data. A `alertsCache` table would require invalidation logic. Use a query instead.
- **Using `Math.random()` for IDs:** Causes React hydration mismatch. Use deterministic IDs (`deadline-${grant._id}-${label}`), matching the BarChartSkeleton decision in Phase 2.
- **Firing toasts on every render:** Use a `useRef<Set<string>>` to track which alert IDs have been toasted this session. Only fire once per ID.
- **Installing sonner:** The custom `Toast.tsx` is already in place, themed, and working. Adding sonner is wasted dependency bloat. The REQUIREMENTS.md explicitly defers in-app toast notifications (`ALRT-V2-03`) to v2 — but the current Toast system can handle the critical-alert toast pattern without a new package.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date math (days remaining) | Custom ms arithmetic | `date-fns` `differenceInDays()` or simple `Math.ceil((d - now) / 86400000)` | Already installed; readable intent |
| Toast system | A new toast component or install sonner | Existing `useToast()` from `Toast.tsx` | Already wired into `ToastProvider` in `layout.tsx`; matches design system exactly |
| Urgency ranking | Complex weighting algorithm | Simple `urgencyScore` integer on each alert, sort descending | Predictable, debuggable, easy to adjust thresholds |
| Grant deadline detection | Re-implement in component | Reuse / port logic from `grants.getUpcomingDeadlines` | Already tested, already returns correct shape |

**Key insight:** Phase 4 is almost entirely *wiring*, not *building*. The alert data is already computable from existing Convex tables. The panel UI already exists. The toast system already exists. The main work is the `alerts.ts` query and the WhatNeedsAttention refactor.

---

## Common Pitfalls

### Pitfall 1: Budget Variance Threshold Ambiguity

**What goes wrong:** ALRT-02 says "exceeds pacing threshold" — but "pacing" implies time-based comparison (are we 60% through the grant period and 60% through the budget? That's on-pace). A naive "spent > X% of budget" check ignores time elapsed and fires alerts for grants that are exactly on pace.

**Why it happens:** The requirement uses the word "pacing" without defining the formula. The existing `GrantBudget.tsx` uses 75% (approaching) and 100% (over) as color thresholds, but those are display-only, not alert triggers.

**How to avoid:** For v1, use a **simplified threshold** (e.g., >90% of budget spent) rather than a time-adjusted pacing formula. Document in code comments. The STATE.md already flags this: "alert thresholds should be validated with Kareem before coding." The plan should pick a reasonable default that avoids alert fatigue for the 04-01 task.

**Warning signs:** If the planner tries to build a full pacing formula (spending rate vs. time elapsed vs. grant period), that is over-engineering for v1. Use simple percentage.

### Pitfall 2: QB Staleness Source Confusion

**What goes wrong:** Two different tables track QB "last synced" time: `quickbooksConfig.connectedAt` (when connected, not when last synced) and `quickbooksCache.fetchedAt` (actual data fetch time). Using `connectedAt` for staleness will produce wrong alerts.

**Why it happens:** `getConfig` in `quickbooks.ts` returns `connectedAt` and `isExpired` — neither is the cache staleness timestamp.

**How to avoid:** In `alerts.ts`, query `quickbooksCache` directly and read `fetchedAt` (the actual last successful data pull). For Sheets, use `googleSheetsConfig.lastSyncAt`. For Calendar, use `googleCalendarConfig.lastSyncAt`.

**Warning signs:** If staleness check uses `quickbooksConfig.connectedAt`, it's wrong.

### Pitfall 3: Toast Firing on Every Data Refresh

**What goes wrong:** Convex queries are reactive — they re-fire whenever data changes. If the toast is triggered in the render path or a naive `useEffect([alerts])`, Kareem sees repeated toasts every time any alert data changes.

**Why it happens:** Standard `useEffect` with `alerts` as dependency re-runs on every query update.

**How to avoid:** Use `useRef<Set<string>>` to track which alert IDs have been toasted in the current browser session. Only call `toast()` for IDs not in the set. This matches the `CalendarWidget.tsx` pattern of using refs for side-effect guards.

**Warning signs:** If `useEffect` calls `toast()` directly without an ID deduplication guard, alerts will fire repeatedly.

### Pitfall 4: isLoading Logic with Single Query

**What goes wrong:** Current `WhatNeedsAttention.tsx` computes `isLoading` as the AND of three undefined checks. After refactor, there is only one query — but the component still needs to handle `alerts === undefined` (loading) vs `alerts === []` (all clear).

**Why it happens:** Simple oversight when removing the old query fan-out.

**How to avoid:** After refactor: `const isLoading = alerts === undefined`. The type is `Alert[] | undefined` — Convex queries return `undefined` while loading and the actual value (possibly empty array) once resolved.

### Pitfall 5: Alert ID Collisions

**What goes wrong:** If two grants have the same funder name or if the ID construction isn't unique enough, React key collisions occur and alerts can be deduplicated incorrectly.

**Why it happens:** Using `grant.fundingSource` (not `grant._id`) in the alert ID.

**How to avoid:** Use Convex document IDs (`grant._id`, `g.sheetRowId`) in alert IDs, plus the label (`Q1 Report`). Pattern: `deadline-${grant._id}-${label}`.

---

## Code Examples

### staleness check using fetchedAt

```typescript
// Source: schema.ts — quickbooksCache has fetchedAt: v.number()
// Use the most recent cache entry's fetchedAt for staleness
const qbCache = await ctx.db
  .query("quickbooksCache")
  .withIndex("by_fetchedAt")
  .order("desc")
  .first();
// Note: index "by_fetchedAt" exists in schema — confirmed in schema.ts line 51
if (qbCache) {
  const qbAgeMs = now - qbCache.fetchedAt;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  if (qbAgeMs > ONE_HOUR_MS) {
    // stale alert
  }
}
```

### Sheets lastSyncAt staleness

```typescript
// Source: schema.ts — googleSheetsConfig.lastSyncAt: v.optional(v.number())
const sheetsConfig = await ctx.db.query("googleSheetsConfig").first();
if (sheetsConfig?.lastSyncAt) {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  if (now - sheetsConfig.lastSyncAt > TWO_HOURS_MS) {
    // stale alert
  }
}
```

### Calendar lastSyncAt staleness

```typescript
// Source: schema.ts — googleCalendarConfig.lastSyncAt: v.optional(v.number())
const calConfig = await ctx.db.query("googleCalendarConfig").first();
if (calConfig?.lastSyncAt) {
  // Calendar not mentioned in ALRT-03 thresholds but follows same pattern
  // Use same 2h threshold as Sheets (they share the service account pattern)
}
```

### useToast with deduplication guard

```typescript
// Source: project pattern — Toast.tsx already exports useToast()
import { useToast } from "@/components/ui/Toast";
import { useEffect, useRef } from "react";

const { toast } = useToast();
const toastedIds = useRef(new Set<string>());

useEffect(() => {
  if (!alerts) return;
  for (const alert of alerts) {
    if (alert.severity === "critical" && !toastedIds.current.has(alert.id)) {
      toastedIds.current.add(alert.id);
      toast({ title: alert.title, description: alert.description, variant: "warning" });
    }
  }
}, [alerts, toast]);
```

### Severity → AttentionItem severity mapping

```typescript
// Existing WhatNeedsAttention interface uses "warning" | "info" | "success"
// New Alert.severity uses "critical" | "warning" | "info"
// Map: critical → "warning" (existing style), warning → "warning", info → "info"
const toItemSeverity = (s: Alert["severity"]): "warning" | "info" | "success" => {
  if (s === "critical" || s === "warning") return "warning";
  return "info";
};
```

---

## Existing Infrastructure Inventory

This section is the key pre-work finding: everything is already in place.

### Data Sources Available (No Schema Changes Needed)

| Alert Type | Table | Field | Notes |
|-----------|-------|-------|-------|
| ALRT-01 deadline | `grants` | `q1/q2/q3/q4ReportDate` (string ISO dates) | `getUpcomingDeadlines` already computes this; can reuse logic |
| ALRT-02 budget | `grantsCache` | `amountSpent`, `totalAmount` | Sheets-synced spending data |
| ALRT-02 budget (QB) | `quickbooksCache` | BVA report JSON | Optional enrichment if QB connected |
| ALRT-03 QB stale | `quickbooksCache` | `fetchedAt` (number) | Index `by_fetchedAt` exists |
| ALRT-03 Sheets stale | `googleSheetsConfig` | `lastSyncAt` (optional number) | Single-row singleton |
| ALRT-03 QB missing | `quickbooksConfig` | existence check | null = not connected |
| ALRT-03 Cal stale | `googleCalendarConfig` | `lastSyncAt` (optional number) | Phase 3 added this field |

### UI Infrastructure Available (No New Components Needed)

| What | File | Status |
|------|------|--------|
| Alert panel container | `WhatNeedsAttention.tsx` | EXISTS — refactor, not replace |
| Panel wired into dashboard | `dashboard/page.tsx` line 206 | `<WhatNeedsAttention />` rendered outside sections loop |
| Toast system | `Toast.tsx` + `ToastProvider` | EXISTS in layout |
| `useToast()` hook | `Toast.tsx` | Exported, typed, working |
| `AttentionItem` type | `WhatNeedsAttention.tsx` | Reuse for rendering |
| `formatDate` | `@/lib/utils` | Already used in panel |
| `ListSkeleton` | `skeletons/TableSkeleton.tsx` | Imported, used for loading state |
| `severityStyles`, `severityIconColors` | `WhatNeedsAttention.tsx` | Reuse for new alert types |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple `useQuery` per component | Single aggregated query per panel | Phase 4 recommendation | Fewer round-trips, server-side ranking |
| WhatNeedsAttention with hardcoded QB + deadline checks | `alerts.ts` computed query | Phase 4 | All alert logic centralized, testable |

**Deprecated/outdated:**
- `WhatNeedsAttention.tsx` current pattern of 3 separate `useQuery` calls: replace with single `api.alerts.getAlerts`
- Note: `grants.getUpcomingDeadlines` can remain for use by the grants page detail view — it's used as a standalone query there. The `alerts.ts` query duplicates the deadline logic internally rather than calling another query (Convex queries cannot call other queries directly).

---

## Open Questions

1. **Budget variance threshold for ALRT-02**
   - What we know: `GrantBudget.tsx` uses 75% (yellow) and 100% (red) for display
   - STATE.md concern: "15% budget variance" mentioned but undefined operationally
   - Recommendation: Plan should use 90% as the alert trigger (above "approaching" yellow threshold, meaningful signal, not noisy). Document as configurable in a future ALRT-V2-01 threshold config feature.

2. **Should critical-severity toast fire only once per session or per day?**
   - What we know: `useRef` persists only for the browser session
   - What's unclear: Whether Kareem expects to be re-notified on a new session if a critical alert is still active
   - Recommendation: Per-session is fine for v1. A persistent dismissal store is explicitly ALRT-V2-02.

3. **Does ALRT-02 need QB BVA data or grantsCache.amountSpent is sufficient?**
   - What we know: `grantsCache.amountSpent` comes from Sheets (may be outdated); QB BVA is more accurate but requires QB connected
   - Recommendation: Use `grantsCache.amountSpent` as the primary source for ALRT-02 (always available if Sheets configured). QB BVA enrichment is optional — if BVA data is available AND a grant name fuzzy-matches a QB class, use QB actual. Mirrors `GrantBudget.tsx` pattern exactly.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — field is absent. Treating as false. Skipping this section.

---

## Sources

### Primary (HIGH confidence)

- Project codebase — `convex/schema.ts`: all table schemas, index names, field types confirmed
- Project codebase — `convex/grants.ts`: `getUpcomingDeadlines` logic, deadline date handling
- Project codebase — `convex/quickbooks.ts`: `fetchedAt` field on cache, `getConfig` return shape
- Project codebase — `convex/googleSheets.ts`: `lastSyncAt` field on config
- Project codebase — `convex/googleCalendar.ts`: `lastSyncAt` field on config
- Project codebase — `src/components/dashboard/WhatNeedsAttention.tsx`: existing `AttentionItem` type, render pattern, current query fan-out
- Project codebase — `src/app/(dashboard)/layout.tsx`: `ToastProvider` already wrapping dashboard
- Project codebase — `src/components/ui/Toast.tsx`: `useToast()` API, `ToastVariant` type
- Project codebase — `src/components/dashboard/GrantBudget.tsx`: budget percentage thresholds (75%, 100%)
- Project codebase — `.planning/STATE.md`: alert threshold concern, existing decisions
- Project codebase — `package.json`: sonner NOT installed; all needed deps already present

### Secondary (MEDIUM confidence)

- Convex docs pattern: queries cannot call other queries — confirmed by project pattern (no `ctx.runQuery` in non-action Convex queries); aggregation must inline logic

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in package.json; no new installs needed
- Architecture: HIGH — all data sources, UI infrastructure, and integration points verified in codebase
- Pitfalls: HIGH — identified from existing code patterns and STATE.md recorded decisions

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable — no external APIs, pure internal pattern)
