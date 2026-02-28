---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Polish
status: in_progress
last_updated: "2026-02-28T16:09:16Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** v1.1 Polish — Phase 7 Plan 01 COMPLETE. Next: Phase 7 Plan 02 (frontend alert config admin tab + dismissal UI).

## Current Position

Phase: 7 — Alert Configuration & Persistence — In Progress (1/2 plans done)
Plan: 07-01-PLAN.md — COMPLETE (2/2 tasks, 4 files modified)
Status: 07-01 backend complete — alertConfig + alertDismissals tables + CRUD + dynamic getAlerts thresholds
Last activity: 2026-02-28 — Phase 7 Plan 01 executed (alertConfig/alertDismissals schema, CRUD modules, getAlerts refactored — ALRT-01, ALRT-02 satisfied)

Progress: ████████░░ 75% (2/3 phases complete, plan 07-01 done)

## v1.1 Phase Map

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 5 — Dashboard KPI Trends | Trend arrows + % change on KPI cards from QB historical P&L | DASH-01, DASH-02 | Complete (1/1 plans) |
| 6 — Calendar Enhancements | Color-coded events, countdown badges, event toasts | CAL-01, CAL-02, CAL-03 | Complete (1/1 plans) |
| 7 — Alert Configuration & Persistence | Configurable thresholds, dismissal persistence, sonner toasts | ALRT-01, ALRT-02, ALRT-03 | In Progress (plan 01 done, plan 02 pending) |

## Accumulated Context

### Decisions

- [Phase 05-dashboard-kpi-trends]: Cash on Hand excluded from trend indicators — point-in-time bank balance, not a P&L metric
- [Phase 05-dashboard-kpi-trends]: parsePnlTotals helper extracted to avoid code duplication between getProfitAndLoss and getTrends
- [Phase 05-dashboard-kpi-trends]: Prior-year P&L fetches same calendar month (Feb vs Feb) for apples-to-apples comparison
- [Phase 05-dashboard-kpi-trends]: trends=undefined included in skeleton loading gate to prevent flash of no-trend state
- [Phase 06-calendar-enhancements]: EVENT_TYPE_CONFIG added to constants.ts (not CalendarWidget.tsx) to keep it shareable and testable
- [Phase 06-calendar-enhancements]: classifyEventType uses first-match priority order — client > board > community > grant > general
- [Phase 06-calendar-enhancements]: calendarColorMap by calendar source removed; now all coloring driven by event type classification
- [Phase 06-calendar-enhancements]: Tasks 1 and 2 committed together — both modify CalendarWidget.tsx, implemented as one atomic file write
- [Phase 07-alert-configuration-persistence 07-01]: alertConfig as singleton table (not appSettings KV): typed fields, structured schema, native Convex patch semantics
- [Phase 07-alert-configuration-persistence 07-01]: Dismissal filtering is client-side in WhatNeedsAttention.tsx: keeps getAlerts a public unauthenticated query; getMyDismissals handles auth separately
- [Phase 07-alert-configuration-persistence 07-01]: Inline ?? fallbacks in alerts.ts instead of importing ALERT_DEFAULTS: avoids cross-file constant import, simpler
- [Phase 07-alert-configuration-persistence 07-01]: update mutation calls requireRole once, stores result as user variable

### Key Implementation Notes

- Phase 5 DONE: fetchPriorYearPnl added to syncAllData (15-min cron), getTrends query in quickbooks.ts, useTrends hook, trend arrows in ExecutiveSnapshot. Commits: f8ce452, 41996b1.
- Phase 6 DONE: EVENT_TYPE_CONFIG in constants.ts, classifyEventType + formatCountdown helpers, live now state (60s interval), colored type badges, pulsing countdown badges, useRef-deduped toast notifications. Commit: 83d8945.
- Phase 7 Plan 01 DONE: alertConfig + alertDismissals schema tables, convex/alertConfig.ts (get/update), convex/alertDismissals.ts (dismiss/undismiss/getMyDismissals), getAlerts dynamic thresholds. Commits: 0fe3e85, 6b92c72.
- Phase 7 Plan 02: Frontend — admin "Alerts" tab (9th tab) consuming alertConfig.get/update; dismiss buttons in WhatNeedsAttention consuming alertDismissals.dismiss/getMyDismissals; critical alert sonner toasts.

### Pending Todos

- Execute Phase 7 Plan 02: Alert frontend (admin config tab + dismissal UI)
- Run `npx convex dev --once` interactively to deploy schema changes (alertConfig + alertDismissals tables)
- Deploy to production: run npm run build + rsync to VPS + npx convex dev --once (interactively)

### Blockers/Concerns

- Google Calendar service account must be manually shared with each calendar before sync works — silent empty-result failure mode
- npx convex dev --once fails with auth error in non-interactive terminal — Convex deploys must be run interactively by user

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 07-01-PLAN.md — Phase 7 Plan 01 Alert Configuration & Persistence backend complete.
Resume file: None
