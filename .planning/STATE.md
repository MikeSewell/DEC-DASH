---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-28T13:05:49.029Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 11
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** Phase 4 — Proactive Alerts Panel (COMPLETE)

## Current Position

Phase: 4 of 4 (Proactive Alerts Panel) — COMPLETE
Plan: 2 of 2 in current phase (COMPLETE)
Status: ALL PHASES COMPLETE — milestone v1.0 achieved
Last activity: 2026-02-28 — Plan 04-02 complete (WhatNeedsAttention refactored to single api.alerts.getAlerts query, toast notifications, 4 icon types, 3 severity styles)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~3 min
- Total execution time: ~0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-newsletter-template-fix | 2/2 | ~9 min | ~5 min |
| 02-dashboard-data-population | 4/4 | ~12 min | ~3 min |
| 03-google-calendar-integration | 3/3 | ~9 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 2 min, 4 min, 5 min, 3 min, 3 min
- Trend: stable

*Updated after each plan completion*
| Phase 02-dashboard-data-population P01 | 3 | 2 tasks | 5 files |
| Phase 02-dashboard-data-population P02 | 3 | 2 tasks | 9 files |
| Phase 03-google-calendar-integration P01 | 2 | 2 tasks | 6 files |
| Phase 03-google-calendar-integration P02 | 3 | 2 tasks | 5 files |
| Phase 03-google-calendar-integration P03 | 4 | 2 tasks | 2 files |
| Phase 04-proactive-alerts-panel P01 | 2 | 2 tasks | 2 files |
| Phase 04-proactive-alerts-panel P02 | 2 | 2 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Newsletter fix before dashboard fix — fully isolated, zero risk, restores broken feature immediately
- [Roadmap]: Dashboard fix before Calendar/Alerts — must trust data foundation before building on top of it
- [Roadmap]: Google Calendar uses existing service account credentials (same as Sheets) — no new auth setup needed
- [Phase 01-newsletter-template-fix]: bgcolor HTML attribute alongside background-color CSS for Outlook Word renderer fallback compatibility
- [Phase 01-newsletter-template-fix]: Two juice passes (pre-AI and post-AI) in generateEmailHtml ensure stored HTML is fully inlined regardless of OpenAI output
- [Phase 01-newsletter-template-fix]: juiceMod.default ?? juiceMod cast pattern for CJS/ESM interop of juice module in Convex node runtime
- [Phase 01-newsletter-template-fix]: Size indicator is informational only — does not block sending; thresholds at 87.5% (350KB) and 97.5% (390KB) of 400KB CC limit
- [Phase 01-newsletter-template-fix]: Preview accuracy note hidden during edit mode to reduce UI clutter
- [Phase 02-dashboard-data-population]: QB token refresh uses || (not ??) fallback because empty string is also invalid as refresh token
- [Phase 02-dashboard-data-population]: formatDollars extracted from ExecutiveSnapshot to @/lib/utils — same logic, shared across all dashboard stat cards
- [Phase 02-dashboard-data-population]: getUpcomingDeadlines returns full objects (grantId, fundingSource, programName, deadlineDate, reportLabel) enabling rich WhatNeedsAttention display without second query
- [Phase 02-dashboard-data-population]: QB token refresh uses || (not ??) fallback: empty string is also invalid as refresh token, so || correctly handles both undefined and empty string cases
- [Phase 02-dashboard-data-population]: formatDollars extracted to @/lib/utils shared utility — same compact format logic (K/.3M) used by all dashboard stat cards
- [Phase 02-dashboard-data-population]: getUpcomingDeadlines returns full objects enabling rich WhatNeedsAttention panel display without a second Convex query
- [Phase 02-dashboard-data-population]: useSheetsConfig() from useGrantTracker hook used in section components — keeps hook abstraction consistent, avoids raw useQuery in UI components
- [Phase 02-dashboard-data-population]: BarChartSkeleton uses deterministic height formula instead of Math.random() to prevent React hydration mismatches
- [Phase 02-dashboard-data-population]: DonationPerformance stays clean empty state — no donation reportType exists in QB integration, so clean null state is correct behavior
- [Phase 02-dashboard-data-population]: WhatNeedsAttention rendered outside DashboardSection wrapper — not reorderable, always visible above sections loop
- [Phase 02-dashboard-data-population]: qbConfig === null (not undefined) correctly detects QB not-connected vs still-loading
- [Phase 02-dashboard-data-population]: client-activity registered after profit-loss in DEFAULT_DASHBOARD_SECTIONS — money-then-people ordering
- [Phase 02-dashboard-data-population]: StatCardGridSkeleton not reused for 3-card ExecutiveSnapshot (hardcodes grid-cols-4) — 3x StatCardSkeleton inline in sm:grid-cols-3 wrapper instead
- [Phase 02-dashboard-data-population]: Grant imports removed from ExecutiveSnapshot — grant data displayed in dedicated GrantBudgetSection/GrantTrackingSection on dashboard
- [Phase 02-dashboard-data-population]: Total Expenses colored text-danger (red) per CMD-01 color coding — negative financial signal distinct from Revenue (green)
- [Phase 03-google-calendar-integration]: saveConfig uses patch-or-insert to preserve lastSyncAt across saves
- [Phase 03-google-calendar-integration]: clearCalendarEvents runs per-calendar so one failure does not wipe another calendar's data
- [Phase 03-google-calendar-integration]: getEvents returns null when not configured — three-state pattern: undefined=loading, null=not-configured, data=events
- [Phase 03-google-calendar-integration]: GoogleCalendarConfig uses local calendars state array initialized from config via useEffect on mount — mirrors GoogleSheetsConfig pattern
- [Phase 03-google-calendar-integration]: CALENDAR_DOT_COLORS exported as const tuple for deterministic index-based color assignment in dashboard calendar widget
- [Phase 03-google-calendar-integration]: "calendar" placed last in DEFAULT_DASHBOARD_SECTIONS as supplementary to core financial/program data
- [Phase 03-google-calendar-integration]: calendarColorMap built from events array unique calendarIds — avoids needing a second config query in the widget
- [Phase 03-google-calendar-integration]: EventRow conditionally wraps in anchor tag only when htmlLink exists — avoids unnecessary anchor wrapping
- [Phase 03-google-calendar-integration]: Today empty state detected when first visible event's dayKey differs from todayKey — simple inline detection without pre-iterating all days
- [Phase 04-proactive-alerts-panel]: Per-section try/catch isolation in getAlerts — one failed table read cannot crash entire alert query, always returns valid Alert[]
- [Phase 04-proactive-alerts-panel]: Alert IDs use Convex document _id for global uniqueness — avoids collisions when two grants share same fundingSource name
- [Phase 04-proactive-alerts-panel]: QB staleness uses qbCache.fetchedAt not qbConfig.connectedAt — fetchedAt reflects last data sync, connectedAt reflects OAuth connection time
- [Phase 04-proactive-alerts-panel]: useRef dedup guard for toasts ensures critical alerts fire exactly once per browser session
- [Phase 04-proactive-alerts-panel]: Toast variant 'warning' used for critical-severity alerts — Toast system has no 'critical' variant
- [Phase 04-proactive-alerts-panel]: Single api.alerts.getAlerts query replaces 3-query fan-out in WhatNeedsAttention — server aggregation avoids query coordination complexity

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2 RESOLVED]: QB refresh token rotation latent production bug — FIXED in 02-01 with || config.refreshToken fallback
- [Phase 3]: Google Calendar service account must be manually shared with each calendar before any code will work — silent empty-result failure mode
- [Phase 4]: Alert thresholds (30-day deadline window, 15% budget variance) should be validated with Kareem before coding to avoid alert fatigue
- [Phase 2 ongoing]: npx convex dev --once fails with auth error in non-interactive terminal — Convex deploys must be run interactively by user

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 04-proactive-alerts-panel/04-02-PLAN.md — WhatNeedsAttention refactored to single api.alerts.getAlerts query with useToast() critical alert notifications (useRef dedup guard), 4 icon types (deadline/integration/budget/sync), 3 severity styles (critical/warning/info). ALL PHASES COMPLETE.
Resume file: None
