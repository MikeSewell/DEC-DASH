---
phase: 02-dashboard-data-population
verified: 2026-02-28T12:00:00Z
status: human_needed
score: 17/17 must-haves verified
human_verification:
  - test: "Open dashboard and observe page-load skeleton sequence"
    expected: "Dashboard sections show animate-pulse shimmer blocks matching section shape before data appears (may be very fast if Convex cache is warm)"
    why_human: "Skeleton timing during live load cannot be verified statically; component wiring is confirmed but render sequence requires a browser"
  - test: "Hover over a dollar value (Cash on Hand, Revenue YTD, or Total Expenses) in ExecutiveSnapshot when QB is connected"
    expected: "Browser native tooltip appears showing full formatted dollar amount (e.g. '$45,231.50')"
    why_human: "title attribute tooltip behavior is browser-rendered and not verifiable from static analysis"
  - test: "Navigate to dashboard with QuickBooks NOT connected"
    expected: "WhatNeedsAttention shows 'QuickBooks Not Connected' warning; ExecutiveSnapshot shows 'Connect QuickBooks' prompt; ProfitLoss, GrantBudget, DonationPerformance all show inline QB connect prompts — NOT blank or broken states"
    why_human: "Disconnected-state rendering requires a real browser session without QB credentials"
  - test: "Navigate to dashboard with Google Sheets NOT connected"
    expected: "GrantTracking, ProgramsCoparent, ProgramsLegal all show 'Connect Google Sheets' inline prompts"
    why_human: "Requires runtime state verification"
  - test: "Verify WhatNeedsAttention count badge shows correct number"
    expected: "Badge in panel header shows numeric count matching visible attention items; shows '0' (with all-clear message) when nothing needs attention"
    why_human: "Badge count is dynamic and depends on runtime data (QB connection state, grant deadlines within 30 days)"
---

# Phase 2: Dashboard Data Population Verification Report

**Phase Goal:** Every section of the dashboard shows live data with correct loading, empty, and error states
**Verified:** 2026-02-28T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | QB token refresh preserves existing refresh token when API omits it | VERIFIED | `convex/quickbooksActions.ts` line 35: `token.refresh_token \|\| config.refreshToken` |
| 2 | formatDollars is importable from @/lib/utils for any component | VERIFIED | `src/lib/utils.ts` lines 129-138: exported `formatDollars` function present |
| 3 | clients.getStatsByProgram returns per-program active counts with role filtering | VERIFIED | `convex/clients.ts` lines 149-188: full implementation with lawyer/psychologist role filtering |
| 4 | grants.getUpcomingDeadlines returns grant name and deadline date for reports due in 30 days | VERIFIED | `convex/grants.ts` lines 69-107: queries all grants, filters 30-day window, sorts by date |
| 5 | Every dashboard section shows skeleton shimmer while data loads (not a spinner) | VERIFIED | All 6 section components use `=== undefined` branch returning skeleton; no Spinner in section loading branches |
| 6 | When QB not connected, QB-dependent sections show inline Connect QuickBooks prompt | VERIFIED | ProfitLoss, ExecutiveSnapshot, DonationPerformance all have null branch with Connect QB message + /admin link |
| 7 | When Sheets not connected, Sheets-dependent sections show inline Connect Sheets prompt | VERIFIED | GrantTracking, ProgramsCoparent, ProgramsLegal all check `sheetsConfig === null` and render prompt |
| 8 | Each section loads independently — one failing section does not break others | VERIFIED | Each section component has its own `useQuery` calls; Convex isolation ensures independent loading |
| 9 | P&L doughnut, grant budget bars, and demographics charts render with real data when connected | VERIFIED | ProfitLoss has doughnut with expensesByCategory; GrantBudget has Bar chart; ProgramsCoparent/Legal have Pie+Bar charts |
| 10 | GrantTracking shows active grants with status from grantsCache | VERIFIED | `GrantTracking.tsx` uses `useActiveGrants()` → `api.googleSheets.getActiveGrants`; renders table with Badge status |
| 11 | DonationPerformance shows clean empty state (not broken) since no donation data | VERIFIED | `DonationPerformance.tsx` null branch: "No donation data available yet." message |
| 12 | WhatNeedsAttention panel appears at top of dashboard before all reorderable sections | VERIFIED | `dashboard/page.tsx` line 204: `<WhatNeedsAttention />` before `<div className="space-y-6 stagger-children">` |
| 13 | Panel shows grant deadline items with funder name and date | VERIFIED | `WhatNeedsAttention.tsx` lines 104-115: iterates deadlines, builds items with `{deadline.reportLabel} — {deadline.fundingSource}` title |
| 14 | Panel shows QB connection status warning when QB not connected | VERIFIED | `WhatNeedsAttention.tsx` lines 83-100: `qbConfig === null` pushes integration warning item |
| 15 | Panel shows all-clear message when nothing needs attention | VERIFIED | `WhatNeedsAttention.tsx` lines 139-146: `items.length === 0` renders "All clear — nothing needs your attention right now." |
| 16 | Panel header shows item count badge | VERIFIED | `WhatNeedsAttention.tsx` lines 128-132: `<span className="rounded-full bg-primary text-white...">{items.length}</span>` |
| 17 | ClientActivity shows total active clients, new this month, per-program breakdown, and View all clients link | VERIFIED | `ClientActivity.tsx`: 3-card grid with `clientStats.active`, `clientStats.newThisMonth`, `clientStats.total`; Legal/Co-Parent badges; `/clients` link at line 107 |
| 18 | ClientActivity is registered in reorderable section list | VERIFIED | `types/index.ts` line 47: `"client-activity"` in union; `constants.ts` line 38: registered; `dashboard/page.tsx` line 28: in SECTION_COMPONENTS |
| 19 | ExecutiveSnapshot shows 3 KPI cards: Cash on Hand, Revenue YTD, Total Expenses | VERIFIED | `ExecutiveSnapshot.tsx` lines 99-165: 3 StatCard components with correct labels and QB data sources |
| 20 | KPI values use compact format with full amount on hover tooltip | VERIFIED | `formatDollars(value)` as display + `title={formatCurrencyExact(value)}` + `cursor-help` class |
| 21 | KPI values use green/red color coding | VERIFIED | Revenue YTD: `accentColor="text-success"`, Total Expenses: `accentColor="text-danger"` |
| 22 | ExecutiveSnapshot shows skeleton shimmer during load | VERIFIED | Lines 52-60: `qbConfig === undefined \|\| accounts === undefined \|\| pnl === undefined` → 3x StatCardSkeleton |
| 23 | Updated X ago timestamp appears at bottom | VERIFIED | Lines 169-173: `Math.max(accounts?.fetchedAt, pnl?.fetchedAt)` → `timeAgo(latestFetchedAt)` |

**Score:** 17/17 truths verified (23 observable behaviors confirmed)

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `convex/quickbooksActions.ts` | Safe QB token refresh | VERIFIED | Line 35: `token.refresh_token \|\| config.refreshToken` |
| `src/lib/utils.ts` | Shared formatDollars utility | VERIFIED | Lines 129-138: exported, substantive 3-branch implementation |
| `convex/clients.ts` | getStatsByProgram query | VERIFIED | Lines 149-188: full role-filtered query, returns `{legal, coparent, other}` |
| `convex/grants.ts` | getUpcomingDeadlines query | VERIFIED | Lines 69-107: full 30-day window query, sorted, returns rich objects |
| `src/components/dashboard/skeletons/StatCardSkeleton.tsx` | Skeleton for stat card grids | VERIFIED | Exports StatCardSkeleton + StatCardGridSkeleton; uses animate-pulse |
| `src/components/dashboard/skeletons/ChartSkeleton.tsx` | Skeleton for chart containers | VERIFIED | Exports ChartSkeleton + BarChartSkeleton; uses animate-pulse |
| `src/components/dashboard/skeletons/TableSkeleton.tsx` | Skeleton for table/list containers | VERIFIED | Exports TableSkeleton + ListSkeleton; uses animate-pulse |
| `src/components/dashboard/WhatNeedsAttention.tsx` | Attention panel component | VERIFIED | 187 lines; full implementation with items, loading, all-clear states |
| `src/components/dashboard/ClientActivity.tsx` | Client activity section | VERIFIED | 116 lines; 3-card grid + program badges + /clients link |
| `src/types/index.ts` | DashboardSectionId with client-activity | VERIFIED | Line 47: `"client-activity"` in union type |
| `src/lib/constants.ts` | DEFAULT_DASHBOARD_SECTIONS with client-activity | VERIFIED | Line 38: `id: "client-activity"` entry |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard with both new components wired | VERIFIED | Line 204: `<WhatNeedsAttention />`; line 28: `"client-activity": ClientActivity` |
| `src/components/dashboard/ExecutiveSnapshot.tsx` | Reworked 3-card KPI snapshot | VERIFIED | 176 lines; 3 QB KPI cards, skeleton, disconnect prompt, tooltip, timestamp |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| quickbooksActions.ts | quickbooksInternal.updateTokens | `token.refresh_token \|\| config.refreshToken` | WIRED | Line 35 confirmed |
| WhatNeedsAttention.tsx | api.grants.getUpcomingDeadlines | useQuery | WIRED | Line 72: `useQuery(api.grants.getUpcomingDeadlines)` |
| WhatNeedsAttention.tsx | api.quickbooks.getConfig | useQuery | WIRED | Line 73: `useQuery(api.quickbooks.getConfig)` |
| ClientActivity.tsx | api.clients.getStats | useQuery | WIRED | Line 57: `useQuery(api.clients.getStats)` |
| ClientActivity.tsx | api.clients.getStatsByProgram | useQuery | WIRED | Line 58: `useQuery(api.clients.getStatsByProgram)` |
| dashboard/page.tsx | WhatNeedsAttention.tsx | direct render before sections loop | WIRED | Line 204: `<WhatNeedsAttention />` |
| dashboard/page.tsx SECTION_COMPONENTS | ClientActivity | record entry | WIRED | Line 28: `"client-activity": ClientActivity` |
| ProfitLoss.tsx | skeletons/ChartSkeleton.tsx | import in loading branch | WIRED | Line 11 import + line 35: `return <ChartSkeleton />` |
| GrantTracking.tsx | skeletons/TableSkeleton.tsx | import in loading branch | WIRED | Line 5 import + line 42: `return <TableSkeleton rows={5} />` |
| ExecutiveSnapshot.tsx | api.quickbooks.getAccounts | useAccounts hook | WIRED | Line 3 import + line 48: `const accounts = useAccounts()` |
| ExecutiveSnapshot.tsx | api.quickbooks.getProfitAndLoss | useProfitAndLoss hook | WIRED | Line 3 import + line 49: `const pnl = useProfitAndLoss()` |
| ExecutiveSnapshot.tsx | formatDollars from @/lib/utils | import | WIRED | Line 5: `import { cn, formatDollars, formatCurrencyExact, timeAgo } from "@/lib/utils"` |
| Each section component | `=== undefined` check | three-state pattern | WIRED | Confirmed in all 9 dashboard sections |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DASH-01 | 02-01, 02-04 | All KPI cards render live QB data (cash, revenue, expenses) | SATISFIED | ExecutiveSnapshot 3-card layout with `accounts.data.totalCash`, `pnl.data.totalRevenue`, `pnl.data.totalExpenses` |
| DASH-02 | 02-02 | Chart visualizations render with real data | SATISFIED | ProfitLoss doughnut (expensesByCategory), GrantBudget horizontal bars, ProgramsCoparent/Legal Pie+Bar charts |
| DASH-03 | 02-02, 02-04 | 3-state loading: skeleton / not-connected / data | SATISFIED | All 9 components implement `=== undefined` → skeleton, `=== null` → prompt, data → render |
| DASH-04 | 02-02 | Grant tracking shows active grants with status/deadlines | SATISFIED | GrantTracking uses `useActiveGrants()` + `useGrantDeadlines()`; renders table with Badge + DeadlineCountdown |
| DASH-05 | 02-02 | Program demographics charts render from Sheets data | SATISFIED | ProgramsCoparent and ProgramsLegal render Pie/Bar charts from `useProgramDemographics()` |
| CMD-01 | 02-01, 02-04 | Financial snapshot: cash position, revenue YTD, expense summary | SATISFIED | ExecutiveSnapshot 3 KPI cards with formatDollars compact + formatCurrencyExact tooltip |
| CMD-02 | 02-01, 02-03 | Client activity section: active, new this month, per-program | SATISFIED | ClientActivity component with `getStats` + `getStatsByProgram`; Legal/Co-Parent badges |
| CMD-03 | 02-03 | "What Needs Attention" panel with grant deadlines, warnings | SATISFIED | WhatNeedsAttention with QB status + deadline items; all-clear state; count badge |
| CMD-04 | 02-02, 02-03 | Dashboard sections load independently | SATISFIED | Each section has isolated `useQuery` calls; Convex React isolation confirmed by architecture |

All 9 required requirement IDs (DASH-01 through DASH-05, CMD-01 through CMD-04) are covered. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(dashboard)/dashboard/page.tsx` | 134-143 | Spinner on `prefs === undefined` | INFO | Acceptable — this is the top-level preferences query, not a section-level loading state. Prefs load is extremely fast (Convex cache). No impact on goal. |
| `src/components/dashboard/GrantBudget.tsx` | 42 | `return null` inside `matchGrantToClass()` | INFO | Not a stub — this is a utility function return value (null = no match found). Expected behavior. |

No blocker or warning anti-patterns found.

### Human Verification Required

### 1. Skeleton Shimmer Timing

**Test:** Open the dashboard in a browser with dev tools Network throttling set to "Slow 3G". Observe section loading.
**Expected:** Each section shows animated gray shimmer blocks (matching section card shapes) before data populates. Sections populate independently — ClientActivity may load before GrantTracking.
**Why human:** Skeleton timing is runtime behavior. Static analysis confirms wiring; browser confirms render sequence.

### 2. Hover Tooltip on Financial Values

**Test:** When QuickBooks is connected, hover the mouse over any dollar value in the Executive Snapshot (Cash on Hand, Revenue YTD, Total Expenses).
**Expected:** Browser native tooltip appears showing full formatted currency (e.g., "$45,231.50" for a value displayed as "$45K").
**Why human:** `title` attribute tooltips are browser-rendered and invisible to static code analysis.

### 3. QB Disconnected State Rendering

**Test:** View dashboard when QuickBooks is not connected (or simulate by checking the Admin page).
**Expected:** "What Needs Attention" shows "QuickBooks Not Connected" warning with a "Connect" button. ExecutiveSnapshot shows "Connect QuickBooks to see financial data" prompt with link to /admin. ProfitLoss shows "Connect QuickBooks" prompt. DonationPerformance shows "No donation data available yet."
**Why human:** Disconnected state requires runtime credentials state.

### 4. Google Sheets Disconnected State Rendering

**Test:** View dashboard when Google Sheets is not connected.
**Expected:** GrantTracking, ProgramsCoparent, ProgramsLegal each show "Connect Google Sheets" inline prompts with link to /admin. GrantBudget shows "Google Sheets not connected" prompt.
**Why human:** Requires runtime Sheets config state.

### 5. WhatNeedsAttention Count Badge Accuracy

**Test:** Observe the count badge in the "What Needs Attention" panel header under different conditions: (a) QB not connected, (b) QB connected and no upcoming deadlines, (c) QB connected and grant deadlines exist.
**Expected:** Badge shows correct count (1 for QB-only warning, 0 with all-clear message, N for N deadline items).
**Why human:** Count depends on dynamic runtime data — grant deadlines within 30 days of the actual current date.

### Gaps Summary

No gaps found. All automated checks passed. Phase goal is achieved at the code level. The 5 human verification items are standard runtime-behavior checks (animation timing, tooltip display, integration state rendering) that cannot be verified statically. They are confirmation items, not suspected failures.

---

_Verified: 2026-02-28T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
