---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Analytics
status: unknown
last_updated: "2026-03-01T07:26:55.568Z"
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 14
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** Phase 15 — Donation Performance Charts

## Current Position

Phase: 15 of 15 (Donation Performance Charts) — In Progress
Plan: 1 of 2 in current phase (complete)
Status: Plan 15-01 complete
Last activity: 2026-03-01 — 15-01 complete: QB income trend data pipeline, getIncomeTrend/getIncomeAccounts queries, hooks, admin account designation UI

Progress: [█████████░] 90% (v1.3) — 9/10 plans complete

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (v1.3)
- Average duration: ~2 min
- Total execution time: ~4 min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 11    | 01   | 2min     | 2     | 4     |
| 11    | 02   | 2min     | 2     | 6     |
| 12    | 01   | 3min     | 2     | 5     |
| 12    | 02   | 3min     | 1     | 2     |
| 13    | 01   | 2min     | 2     | 2     |
| 13    | 02   | 3min     | 2     | 2     |
| 14    | 01   | 2min     | 2     | 2     |
| 14    | 02   | 2min     | 2     | 2     |
| 15    | 01   | 4min     | 2     | 4     |

## Accumulated Context

### Decisions

From 12-02:
- IIFE inside JSX for sortedZips computation — keeps derived data local without component-scope variables
- Zip code card always renders container so empty state message has proper visual framing
- OUTCOME_COLORS Record<string, string> with fallback to PALETTE[0] for unknown statuses
- makeOutcomeData at module level for consistency with makeDoughnutData/makeBarData

From 12-01:
- Used Doughnut (not Pie) for gender and age charts — cutout 55% for modern look
- Inline helper functions copied from ProgramsLegal.tsx (not shared) — only 2 consumers doesn't justify shared util
- getAllDemographics returns outcomeDistribution even though not rendered in 12-01 — included for Plan 12-02 reuse
- Chart cards wrapped in rounded-2xl border + warm-shadow-sm for visual consistency with dashboard cards

From 11-02:
- Used StatCardGridSkeleton count=3 directly (same pattern as ClientActivity.tsx) — count prop confirmed
- Inline StatCard component in AnalyticsCards.tsx (not shared) matching ClientActivity.tsx pattern
- analytics-cards inserted after client-activity in DEFAULT_DASHBOARD_SECTIONS order
- Intake trend uses by_createdAt index range queries for efficient month filtering

From 11-01:
- AnalyticsTab uses 'client-activity' (with dash) to match URL-safe naming convention consistent with DashboardSectionId
- Lawyer/psychologist exclusion from /analytics achieved via existing ROLE_NAV_MAP without changes — '/analytics' not in their allowed list
- Analytics placeholder uses per-tab conditional rendering (not CSS hide) to keep DOM clean

Carried from v1.2:
- getProgramDemographics() already exists in convex/googleSheets.ts — Demographics tab is mostly frontend
- Sessions table exists but needs aggregate queries; clientGoals needs getStats(); coparentIntake needs getStats()
- Audit log analytics query needed; allocation stats query exists but needs historical acceptance-rate view
- QB income account names unknown — admin designation UI is prerequisite for DON charts
- Phase 10 (Donation) deferred from v1.2 → now Phase 15 in v1.3
- [Phase 13]: getLast12Months() shared helper before first export — not exported, used by getSessionTrends and getIntakeVolume
- [Phase 13]: getSessionTrends uses collect-all + in-memory filter; sessions table has no createdAt index (only by_clientId)
- [Phase 13]: getIntakeVolume uses Promise.all() + by_createdAt index range queries for efficient per-month intake counts
- [Phase 13]: getGoalStats returns completionRate: 0 when total=0 to avoid NaN division
- [Phase 13]: Single ChartSkeleton loading state covers all three hooks — simpler than partial renders, consistent with DemographicsTab
- [Phase 13]: Grouped bar chart uses stacked:false on both axes — Chart.js requires both declarations for side-by-side display
- [Phase 14]: formatAction helper placed inside getAuditFeed handler (not module-level) since only used there
- [Phase 14]: getCategorizationStats acceptance rate uses totalCategorized (status !== error) as denominator — pending/approved/submitted/skipped all count as categorized
- [Phase 14]: getStaffActionStats resolves all unique userIds via Promise.all after counting to avoid N+1 per log entry
- [Phase 14]: timeAgo helper at module level in OperationsTab (not inline) — cleaner and readable
- [Phase 14]: Single ChartSkeleton loading guard covers all three hooks in OperationsTab — consistent with other tab patterns
- [Phase 14]: Show-more toggle uses useState(false), slices to 20 initially — reduces visual noise for large audit logs
- [Phase 14]: Top-8 category cap on horizontal bar chart — prevents overflow on mobile screens
- [Phase 14]: PlaceholderContent removed from analytics page — all three analytics tabs now render real components
- [Phase 15]: extractMonthlyIncomeRows as module-level helper for recursive QB P&L row parsing
- [Phase 15]: getIncomeTrend returns configured:false when no accounts designated — enables instructive empty state in chart
- [Phase 15]: IncomeAccountConfig uses initialized flag pattern to prevent resetting user selections on re-renders

### Pending Todos

- Run npx convex dev --once to deploy any schema changes from v1.2 before starting v1.3
- Deploy v1.2 to production if not yet done
- Validate ROLE_NAV_MAP in constants.ts to confirm which roles get /analytics link (admin, manager, staff — not lawyer, psychologist, readonly)

### Blockers/Concerns

- npx convex dev --once must be run interactively — schema deploys cannot be automated in CI

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 15-01-PLAN.md — QB income trend data pipeline: fetchIncomeTrend action, getIncomeTrend/getIncomeAccounts queries, hooks, IncomeAccountConfig admin UI
Resume file: None
