---
phase: 04-proactive-alerts-panel
plan: "01"
subsystem: backend
tags: [alerts, convex, grants, quickbooks, google-sheets, google-calendar]
dependency_graph:
  requires: []
  provides: [convex/alerts.ts, api.alerts.getAlerts]
  affects: [dashboard, WhatNeedsAttention]
tech_stack:
  added: []
  patterns: [null-safe-section-isolation, urgency-score-ranking, deterministic-alert-ids]
key_files:
  created:
    - convex/alerts.ts
  modified:
    - convex/_generated/api.d.ts
decisions:
  - "Each alert section wrapped in independent try/catch — one failed table read cannot crash the entire query"
  - "Alert IDs use Convex document _id (not display names) for global uniqueness across table rows"
  - "QB staleness uses qbCache.fetchedAt (quickbooksCache) not qbConfig.connectedAt (quickbooksConfig) — connectedAt is OAuth connection time, fetchedAt is last data sync time"
  - "urgencyScore formula: deadline=1000-daysLeft, budget-over=900, budget-approaching=800, sync-qb=500, integration-expired=450, integration-missing=400, sync-sheets=300, sync-calendar=250"
metrics:
  duration: "~2 min"
  completed: "2026-02-28"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
requirements_satisfied: [ALRT-01, ALRT-02, ALRT-03]
---

# Phase 04 Plan 01: Alerts Backend Query Summary

**One-liner:** Server-side alert aggregation query reading 6 Convex tables into a ranked Alert[] array with per-section null-safety and deterministic urgency scoring.

## What Was Built

`convex/alerts.ts` — a single Convex query that reads grants, grantsCache, quickbooksCache, quickbooksConfig, googleSheetsConfig, and googleCalendarConfig to produce a priority-ranked `Alert[]` array. This is the server-side aggregation layer for the proactive alerts panel.

### Alert Categories Implemented

| Section | Alert Type | Source Table | Threshold | Urgency Score |
|---------|-----------|-------------|-----------|---------------|
| A | deadline | grants | Q1-Q4 report dates within 30 days | 1000 - daysLeft |
| B | budget | grantsCache | amountSpent/totalAmount >= 90% | 900 (over), 800 (approaching) |
| C | sync | quickbooksCache | fetchedAt older than 1 hour | 500 |
| D | integration | quickbooksConfig | missing config or expired token | 400-450 |
| E | sync | googleSheetsConfig | lastSyncAt older than 2 hours | 300 |
| F | sync | googleCalendarConfig | lastSyncAt older than 2 hours | 250 |

### Alert Interface

```typescript
export interface Alert {
  id: string;          // deterministic: "deadline-{_id}-Q1 Report", "budget-{_id}", "sync-qb-stale", etc.
  type: "deadline" | "budget" | "sync" | "integration";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  action?: { label: string; href: string };
  urgencyScore: number;
}
```

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create convex/alerts.ts with Alert interface and getAlerts query | 7595be3 | convex/alerts.ts |
| 2 | Deploy Convex and verify getAlerts query is accessible | d179ff3 | convex/_generated/api.d.ts |

## Verification Results

All 12 substantive checks passed:
- `convex/alerts.ts` exists and exports `Alert` interface + `getAlerts` query
- All 6 tables are queried: grants, grantsCache, quickbooksCache, quickbooksConfig, googleSheetsConfig, googleCalendarConfig
- QB staleness uses `qbCache.fetchedAt` (not `qbConfig.connectedAt`)
- Alert IDs use Convex document `_id` for uniqueness
- Alerts sorted by urgencyScore descending
- `api.alerts.getAlerts` accessible in generated API types (`convex/_generated/api.d.ts`)
- Convex deployment succeeded to `aware-finch-86`

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Per-section try/catch isolation** — Each of the 6 table reads is wrapped in its own try/catch block. If grants is empty or googleCalendarConfig is misconfigured, only that alert category is skipped. The query always returns a valid Alert[] (possibly empty) rather than throwing.

2. **Alert ID determinism using _id** — Alert IDs like `deadline-${grant._id}-Q1 Report` use Convex document IDs rather than display names. This ensures global uniqueness even when two grants share the same fundingSource name. Budget alerts use `budget-${g._id}` from grantsCache._id for the same reason.

3. **QB staleness vs QB missing are separate sections** — Section C (sync staleness) only fires when QB IS connected but data is old. Section D (integration alerts) fires when QB is NOT connected or the token expired. This avoids duplicate alerts.

4. **urgencyScore hierarchy** — Deadline alerts (970-999 range for 1-30 day window) always rank above budget (800-900), which rank above sync (300-500), which rank above integration (400-450). The one exception: integration-expired (450) ranks above sync-qb-stale (500) is intentional — expired token is more actionable than stale data.

## Self-Check

PASSED:
- [x] `convex/alerts.ts` — FOUND
- [x] Commit `7595be3` — FOUND
- [x] Commit `d179ff3` — FOUND
- [x] `api.alerts` in `convex/_generated/api.d.ts` — FOUND
