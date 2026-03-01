---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Analytics
status: in_progress
last_updated: "2026-03-01T04:52:00.000Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 10
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** Phase 12 — Demographics Tab

## Current Position

Phase: 12 of 15 (Demographics Tab)
Plan: 1 of 2 in current phase (in progress)
Status: In progress
Last activity: 2026-03-01 — 12-01 complete: demographics tab with gender/age/ethnicity/referral charts

Progress: [███░░░░░░░] 30% (v1.3) — 3/10 plans complete

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

## Accumulated Context

### Decisions

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

### Pending Todos

- Run npx convex dev --once to deploy any schema changes from v1.2 before starting v1.3
- Deploy v1.2 to production if not yet done
- Validate ROLE_NAV_MAP in constants.ts to confirm which roles get /analytics link (admin, manager, staff — not lawyer, psychologist, readonly)

### Blockers/Concerns

- QB monthly income JSON column shape needs validation before Phase 15 (DON charts)
- npx convex dev --once must be run interactively — schema deploys cannot be automated in CI

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 12-01-PLAN.md — demographics tab with gender/age doughnuts, ethnicity/referral bars live
Resume file: None
