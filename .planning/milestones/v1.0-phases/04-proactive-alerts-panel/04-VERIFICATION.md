---
phase: 04-proactive-alerts-panel
verified: 2026-02-28T14:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Open dashboard and check that WhatNeedsAttention panel renders alerts from live Convex data"
    expected: "Panel shows ranked alerts (or all-clear state if no conditions are triggered), count badge is visible, and critical alerts fire amber toast once per session"
    why_human: "Alert trigger conditions depend on real DB state — grants with upcoming deadlines, QB connection status, cache timestamps. Cannot verify actual rendering from static code alone."
---

# Phase 04: Proactive Alerts Panel Verification Report

**Phase Goal:** The dashboard surfaces what needs Kareem's attention — grant deadlines, budget warnings, sync failures — without him having to dig for it
**Verified:** 2026-02-28T14:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Grant deadlines within 30 days produce deadline-type alerts with days-remaining counts | VERIFIED | `convex/alerts.ts` L21-60: queries `grants` table, checks q1-q4ReportDate within `now..now+thirtyDaysMs`, computes `daysLeft`, builds deadline alerts with urgencyScore=1000-daysLeft |
| 2 | Grants with >90% budget spent produce budget-type alerts with percentage and dollar amounts | VERIFIED | `convex/alerts.ts` L63-84: queries `grantsCache`, checks `pct >= 0.9`, formats `${Math.round(pct*100)}% of budget spent ($X of $Y)` |
| 3 | QuickBooks cache older than 1 hour produces a sync staleness alert | VERIFIED | `convex/alerts.ts` L87-110: queries `quickbooksCache` with `by_fetchedAt` desc, checks `qbAgeMs > 60*60*1000`, produces `sync-qb-stale` alert |
| 4 | Google Sheets config with lastSyncAt older than 2 hours produces a sync staleness alert | VERIFIED | `convex/alerts.ts` L143-165: collects all `googleSheetsConfig` rows, takes `Math.max(...map(lastSyncAt))`, checks `> 2*60*60*1000` |
| 5 | Missing QuickBooks config produces an integration-missing alert | VERIFIED | `convex/alerts.ts` L113-141: `if (!qbConfig)` produces `integration-qb-missing`; `else if (qbConfig.tokenExpiry < now)` produces `integration-qb-expired` |
| 6 | Alerts are sorted by urgencyScore descending (most urgent first) | VERIFIED | `convex/alerts.ts` L191: `alerts.sort((a, b) => b.urgencyScore - a.urgencyScore)` |
| 7 | Each data source read is null-safe — missing sources skip their alert category without crashing | VERIFIED | All 6 sections (A-F) wrapped in independent `try { } catch { // Section X failed — skip }` blocks |
| 8 | WhatNeedsAttention uses a single useQuery(api.alerts.getAlerts) instead of 3 separate queries | VERIFIED | `WhatNeedsAttention.tsx` L79: `const alerts = useQuery(api.alerts.getAlerts)`. No `getUpcomingDeadlines`, `getConfig`, or `getStats` remain in file. |
| 9 | Alert[] items render in the panel with correct severity styling (critical=red, warning=amber, info=primary) | VERIFIED | `WhatNeedsAttention.tsx` L66-76: `severityStyles` record maps `critical` → red left-border, `warning` → amber, `info` → primary/teal |
| 10 | Critical-severity alerts fire a toast notification via useToast() exactly once per alert ID per browser session | VERIFIED | `WhatNeedsAttention.tsx` L81,88-90: `useRef(new Set<string>())` dedup guard; `toastedIds.current.has(alert.id)` prevents re-firing across Convex re-renders |
| 11 | Panel shows skeleton while alerts === undefined, all-clear when alerts is empty array, items when populated | VERIFIED | `WhatNeedsAttention.tsx` L82,118-128: `isLoading = alerts === undefined` → `<ListSkeleton>`, `alerts.length === 0` → all-clear with CheckCircleIcon, else items list |
| 12 | New alert types (budget, sync) display with appropriate icons alongside existing deadline and integration types | VERIFIED | `WhatNeedsAttention.tsx` L42-64: `ChartBarIcon` for budget, `RefreshIcon` for sync; `ItemIcon` dispatches all 4 types |
| 13 | Panel loads even if some data sources are temporarily unavailable (null-safe query handles gracefully) | VERIFIED | Backend per-section try/catch (alerts.ts) combined with frontend `alerts === undefined` loading guard — if any section throws, only that category is skipped |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `convex/alerts.ts` | Alert type definition + getAlerts query | VERIFIED | 195 lines; exports `Alert` interface and `getAlerts` query; 6 table reads; try/catch isolation per section |
| `src/components/dashboard/WhatNeedsAttention.tsx` | Refactored alerts panel consuming api.alerts.getAlerts | VERIFIED | 167 lines; single useQuery; 4 icon types; 3 severity styles; toast dedup via useRef |
| `convex/_generated/api.d.ts` | alerts module registered in generated API | VERIFIED | L14: `import type * as alerts from "../alerts.js"`; L69: `alerts: typeof alerts` in fullApi |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `convex/alerts.ts` | grants table | `ctx.db.query("grants").collect()` | WIRED | L21: confirmed |
| `convex/alerts.ts` | grantsCache table | `ctx.db.query("grantsCache").collect()` | WIRED | L64: confirmed |
| `convex/alerts.ts` | quickbooksCache table | `.withIndex("by_fetchedAt").order("desc").first()` | WIRED | L89-92: confirmed |
| `convex/alerts.ts` | quickbooksConfig table | `ctx.db.query("quickbooksConfig").first()` | WIRED | L114: confirmed |
| `convex/alerts.ts` | googleSheetsConfig table | `ctx.db.query("googleSheetsConfig").collect()` | WIRED | L145: confirmed |
| `convex/alerts.ts` | googleCalendarConfig table | `ctx.db.query("googleCalendarConfig").first()` | WIRED | L170: confirmed |
| `WhatNeedsAttention.tsx` | `convex/alerts.ts` | `useQuery(api.alerts.getAlerts)` | WIRED | L79: confirmed; `api.alerts` in generated types at api.d.ts L69 |
| `WhatNeedsAttention.tsx` | `src/components/ui/Toast.tsx` | `useToast()` with critical alert guard | WIRED | L6,80-97: `useToast` imported and called; `variant: "warning"` for critical |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| ALRT-01 | 04-01 | Grant deadline alerts surface upcoming quarterly reports due within 30 days | SATISFIED | `alerts.ts` Section A: scans q1-q4ReportDate fields of all grants, filters within 30-day window, emits deadline alerts with daysLeft count |
| ALRT-02 | 04-01 | Budget variance alerts trigger when grant spending exceeds pacing threshold | SATISFIED | `alerts.ts` Section B: reads grantsCache amountSpent/totalAmount, triggers at >=90% with dollar and percentage details |
| ALRT-03 | 04-01 | Sync status alerts show when QuickBooks or Google Sheets sync is stale (>1h QB, >2h Sheets) | SATISFIED | `alerts.ts` Sections C-F: QB cache staleness (1h), QB not connected/expired, Sheets staleness (2h), Calendar staleness (2h) |
| ALRT-04 | 04-02 | Alerts display in the "What Needs Attention" panel on the dashboard | SATISFIED | `WhatNeedsAttention.tsx` imported and used at `src/app/(dashboard)/dashboard/page.tsx` L19,206; panel renders all 4 alert types from single `api.alerts.getAlerts` query |

No orphaned requirements found. All 4 ALRT IDs appear in both plan frontmatter and REQUIREMENTS.md traceability table. REQUIREMENTS.md shows all 4 as Phase 4 / Complete.

### Anti-Patterns Found

No anti-patterns detected. Scan performed on `convex/alerts.ts` and `src/components/dashboard/WhatNeedsAttention.tsx`:
- No TODO/FIXME/HACK/placeholder comments
- No stub return values (`return null`, `return {}`, `return []` without data)
- No empty handlers or console.log-only implementations
- No fake/hardcoded data masquerading as real queries

### Human Verification Required

#### 1. Dashboard Alert Panel Rendering

**Test:** Open the running dashboard (npm run dev), sign in, navigate to the dashboard page.
**Expected:** The "What Needs Attention" panel shows a count badge. If any grants have report dates within 30 days the panel shows deadline alerts ranked by urgency. If QuickBooks is not connected, an integration alert appears. Critical alerts (7-day deadline or over-budget) fire an amber toast exactly once.
**Why human:** Alert trigger conditions depend on live Convex database state. If no grants have upcoming deadlines and QB is connected with fresh data, the panel correctly shows "All clear" — which is success, not failure. Only a human with knowledge of the current DB state can distinguish "correctly empty" from "broken."

#### 2. Toast fires exactly once per session

**Test:** Trigger a critical alert condition (grant within 7 days, or budget over 100%), reload the page, verify the toast appears. Navigate to another dashboard tab and back — toast should NOT re-appear.
**Expected:** Toast fires on first page load with alert data, does not repeat within the same browser session.
**Why human:** The useRef dedup guard is correct in code, but session persistence across navigation can only be confirmed by a human interacting with the live app.

### Gaps Summary

No gaps. All must-haves from both plan 04-01 and 04-02 are fully implemented and wired.

**Backend (04-01):** `convex/alerts.ts` is a complete, substantive 195-line Convex query reading all 6 required tables with per-section try/catch isolation. Alert IDs use Convex document `_id` for uniqueness. QB staleness correctly uses `qbCache.fetchedAt` from quickbooksCache (not `qbConfig.connectedAt`). Urgency scoring hierarchy is fully implemented: deadline (970-999) > budget-over (900) > budget-approaching (800) > sync-QB (500) > integration-expired (450) > integration-missing (400) > sync-sheets (300) > sync-calendar (250). Final sort is descending.

**Frontend (04-02):** `WhatNeedsAttention.tsx` is fully refactored — 3-query fan-out replaced by single `useQuery(api.alerts.getAlerts)`. All 4 alert type icons implemented (CalendarIcon, PlugIcon, ChartBarIcon, RefreshIcon). All 3 severity levels styled (critical=red, warning=amber, info=primary). Toast notification fires once per critical alert ID per browser session via `useRef<Set<string>>` deduplication. Loading/empty/populated states all handled. Component wired into dashboard page.

**Generated API:** `convex/_generated/api.d.ts` includes `alerts` module (commits `7595be3` → `d179ff3` → `d737231` all verified in git log).

---

_Verified: 2026-02-28T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
