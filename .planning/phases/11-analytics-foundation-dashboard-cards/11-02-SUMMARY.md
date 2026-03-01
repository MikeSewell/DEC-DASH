---
phase: 11-analytics-foundation-dashboard-cards
plan: "02"
subsystem: dashboard
tags: [analytics, dashboard, convex, kpi-cards, client-metrics]
dependency_graph:
  requires: []
  provides: [convex/analytics.ts, src/hooks/useAnalytics.ts, src/components/dashboard/AnalyticsCards.tsx]
  affects: [src/types/index.ts, src/lib/constants.ts, src/app/(dashboard)/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [convex-query, react-hooks, dashboard-section-registration]
key_files:
  created:
    - convex/analytics.ts
    - src/hooks/useAnalytics.ts
    - src/components/dashboard/AnalyticsCards.tsx
  modified:
    - src/types/index.ts
    - src/lib/constants.ts
    - src/app/(dashboard)/dashboard/page.tsx
decisions:
  - "Used StatCardGridSkeleton count=3 directly (same pattern as ClientActivity.tsx) since it accepts a count prop"
  - "Inline StatCard component in AnalyticsCards.tsx (not shared) matching the pattern established in ClientActivity.tsx"
  - "analytics-cards inserted after client-activity in DEFAULT_DASHBOARD_SECTIONS order"
  - "Intake trend uses by_createdAt index range queries for efficient month filtering"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 11 Plan 02: Analytics Dashboard Cards Summary

**One-liner:** Three live KPI dashboard cards (active clients, 30-day session volume, intake trend) backed by dedicated Convex aggregate queries and registered in the dashboard section system.

## What Was Built

Three new Convex queries in `convex/analytics.ts` expose real-time aggregate metrics from the clients, sessions, legalIntakeForms, and coparentIntakeForms tables. A hooks file wraps these queries with typed React hooks. The `AnalyticsCards` dashboard section component renders three KPI cards with loading skeletons and a trend indicator on the intake card. The section is fully registered in the dashboard section system (DashboardSectionId type, DEFAULT_DASHBOARD_SECTIONS, SECTION_COMPONENTS map).

## Tasks Completed

### Task 1: Convex Analytics Queries + React Hooks
- **Commit:** ecc64d4
- **Files:** convex/analytics.ts, src/hooks/useAnalytics.ts
- `getActiveClientCount` — filters clients table by `status === "active"`, returns `{ count }`
- `getSessionVolume` — filters sessions by `sessionDate >= 30 days ago`, returns `{ count, periodLabel }`
- `getIntakeTrend` — uses `by_createdAt` index range queries for efficient month filtering across both intake tables, returns `{ thisMonth, lastMonth, changePercent, positive }`
- Convex deployment verified with `npx convex dev --once`

### Task 2: AnalyticsCards Component + Registration
- **Commit:** 7ce9e54
- **Files:** src/components/dashboard/AnalyticsCards.tsx, src/types/index.ts, src/lib/constants.ts, src/app/(dashboard)/dashboard/page.tsx
- Component (148 lines) renders 3-column grid with loading skeleton via `StatCardGridSkeleton count={3}`
- Card 1: Active Clients (Users icon, text-primary)
- Card 2: Sessions (30 days) (Calendar icon, text-accent)
- Card 3: New Intakes This Month with percentage change trend vs last month (TrendingUp icon, text-success)
- "View analytics" link at bottom right pointing to `/analytics`
- `analytics-cards` added to `DashboardSectionId` type union
- Entry added to `DEFAULT_DASHBOARD_SECTIONS` after `client-activity`
- Import and map entry added to `SECTION_COMPONENTS` in dashboard page

## Verification Results

- `npx convex dev --once` — deployed successfully (6.19s)
- `npm run build` — compiled successfully with zero errors
- `convex/analytics.ts` exports `getActiveClientCount`, `getSessionVolume`, `getIntakeTrend`
- `src/hooks/useAnalytics.ts` exports `useActiveClientCount`, `useSessionVolume`, `useIntakeTrend`
- `AnalyticsCards.tsx` — 148 lines (above 80-line minimum)
- `analytics-cards` confirmed in constants.ts, types/index.ts, and dashboard/page.tsx

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] convex/analytics.ts created and deployed
- [x] src/hooks/useAnalytics.ts created
- [x] src/components/dashboard/AnalyticsCards.tsx created (148 lines)
- [x] src/types/index.ts modified — analytics-cards in DashboardSectionId
- [x] src/lib/constants.ts modified — analytics-cards in DEFAULT_DASHBOARD_SECTIONS
- [x] src/app/(dashboard)/dashboard/page.tsx modified — AnalyticsCards imported and mapped
- [x] Commit ecc64d4 exists
- [x] Commit 7ce9e54 exists

## Self-Check: PASSED
