# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Command Center

**Shipped:** 2026-02-28
**Phases:** 4 | **Plans:** 11 | **Commits:** 49

### What Was Built
- Table-based newsletter HTML with juice CSS inlining for cross-client email compatibility
- Live dashboard data population — KPI cards, charts, widgets rendering QuickBooks data with three-state loading
- Google Calendar integration — service account sync, admin config, agenda-list CalendarWidget
- Proactive alerts panel — grant deadlines, budget variance, sync status alerts with urgency ranking and toast notifications
- Reusable infrastructure: skeleton shimmer components, formatDollars utility, three-state loading pattern

### What Worked
- **Fix-before-expand strategy** paid off — fixing newsletter HTML and dashboard data first meant Calendar and Alerts phases built on a solid, trusted foundation
- **Phase dependency ordering** was clean — each phase shipped independent value while enabling the next
- **Reusing Google Sheets service account for Calendar** eliminated all auth setup — zero-config calendar integration
- **GSD workflow automation** kept planning overhead minimal — research → plan → execute → verify pipeline ran smoothly
- **Three-state loading pattern** (undefined/null/data) established once in Phase 2 and adopted naturally in Phases 3-4

### What Was Inefficient
- **SUMMARY.md one-liner extraction** didn't work via CLI — accomplishments had to be manually curated from summaries
- **Some decisions logged redundantly** in STATE.md — duplicate entries for QB token refresh and formatDollars decisions
- **Phase 2 had 4 plans** while other phases had 2-3 — could have been 3 plans with better grouping (skeleton components + three-state loading as one plan)

### Patterns Established
- **Three-state loading**: `undefined` = loading, `null` = not-configured, data = ready — used in all dashboard sections, calendar, and alerts
- **Singleton config tables**: Convex tables with `.first()` query for integration configs (QB, CC, Sheets, Calendar)
- **Per-section try/catch isolation**: Each alert section fails independently — one broken data source doesn't crash the panel
- **Server-side aggregation**: Single alerts query replaces multi-query fan-out — simpler client code
- **Skeleton shimmer components**: Reusable StatCardSkeleton, ChartSkeleton, TableSkeleton, ListSkeleton
- **Table-based email HTML**: All newsletter HTML uses nested tables with bgcolor fallbacks for Outlook compatibility

### Key Lessons
1. **Dual juice passes prevent CSS edge cases** — AI-polished HTML may strip inline styles, so re-inlining after OpenAI is essential
2. **QB token refresh needs || not ??** — empty string is also invalid as refresh token, so nullish coalescing misses that case
3. **Deterministic skeleton heights** prevent React hydration mismatches — never use Math.random() in SSR-rendered components
4. **Toast dedup via useRef** prevents notification spam — React re-renders can fire effects multiple times
5. **Calendar service account sharing is a silent failure** — no error, just empty results. This should be documented in admin UI

### Cost Observations
- Model mix: ~70% opus, ~20% sonnet, ~10% haiku (estimated)
- Sessions: ~8 across research, planning, execution, verification, audit
- Notable: Full milestone completed in single day with GSD workflow — 11 plans across 4 phases

---

## Milestone: v1.1 — Polish

**Shipped:** 2026-02-28
**Phases:** 3 | **Plans:** 4 | **Commits:** 7

### What Was Built
- Year-over-year trend arrows on KPI cards from QB prior-year P&L sync with shared parsePnlTotals helper
- Keyword-driven event type classification with colored pill badges, live 60s-refresh countdown badges
- Toast notifications for imminent calendar events (30-60 min window) with useRef dedup
- Configurable alert thresholds via admin Alerts tab (5 editable fields) with singleton table pattern
- Per-user alert dismissal with Convex persistence and client-side filtering
- Enhanced toast system with three-ref dedup (initialLoadDone, prevAlertIds, toastedIds) for new alert detection

### What Worked
- **Lean phases** — 3 phases with 4 plans total, each delivering focused value. No phase had more than 2 plans.
- **Singleton config pattern reuse** — alertConfig table followed the exact same `.first()` / upsert pattern as quickbooksConfig and constantContactConfig, making implementation fast
- **Toast dedup pattern reuse** — Phase 7's WhatNeedsAttention enhanced toasts built directly on the useRef(Set) pattern established in Phase 6's CalendarWidget
- **Client-side dismissal filtering** — clean separation of auth concerns, keeping getAlerts as a public query

### What Was Inefficient
- **Phase 07 VERIFICATION.md never created** — milestone audit flagged this as a gap, though integration checker confirmed all code was wired
- **SUMMARY.md frontmatter requirements-completed fields** not consistently populated — Phase 5 and 6 summaries left the field empty
- **One-liner extraction via CLI** still returns empty — SUMMARY files use body text format, not frontmatter one_liner key

### Patterns Established
- **Singleton config upsert**: `.first()` query → patch if exists, insert if not — now used for QB, CC, and alert config
- **Client-side dismissal filtering**: Server returns all items, separate auth query returns dismissed keys, client filters by set difference
- **Three-ref toast dedup**: initialLoadDone + prevAlertIds + toastedIds for detecting new items in reactive data streams
- **EVENT_TYPE_CONFIG in constants.ts**: Keyword-based classification config kept in constants for reusability

### Key Lessons
1. **Always create VERIFICATION.md after phase execution** — skipping it creates audit gaps even when code is correct
2. **SUMMARY frontmatter fields must be populated during execution** — empty requirements-completed fields cause 3-source cross-reference failures
3. **Singleton table pattern is highly replicable** — new config tables can be stood up in minutes following the established pattern
4. **useRef dedup scales** — the pattern works for both simple (single Set) and complex (three-ref) toast dedup scenarios

### Cost Observations
- Model mix: ~60% opus, ~30% sonnet, ~10% haiku (estimated)
- Sessions: ~4 across planning, execution, verification, audit
- Notable: All 3 phases completed in a single day — lean scope enabled rapid iteration

---

## Milestone: v1.3 — Analytics

**Shipped:** 2026-03-01
**Phases:** 5 | **Plans:** 10 | **Commits:** 39

### What Was Built
- /analytics page with role-gated sidebar entry and tab navigation (Demographics, Client Activity, Operations)
- 3 dashboard KPI summary cards — active clients, session volume, intake trend with month-over-month delta
- Demographics tab with 6 charts — gender/ethnicity doughnuts, age groups, referral sources, outcome rates, zip code coverage
- Client Activity tab — 12-month session trend line chart, goal status cards with completion rate, intake volume grouped bar
- Operations tab — staff activity feed with timeAgo, per-user action count table, categorization acceptance rate and category distribution
- DonationPerformance rewrite — real QB income data via fetchIncomeTrend, multi-line chart with per-account breakdown, admin designation UI, empty states

### What Worked
- **Additive analytics module pattern** — convex/analytics.ts grew from 3 queries (Phase 11) to 10 queries (Phase 14) without conflicts or refactoring
- **Consistent tab patterns** — each analytics tab followed the same skeleton → hooks → chart component pattern, making Phases 12-14 nearly formulaic
- **Hooks file extension** — useAnalytics.ts grew to 10 hooks cleanly via simple additive exports
- **QB sync cycle reuse** — fetchIncomeTrend piggybacked on existing syncAllData cron rather than needing a separate schedule
- **Admin designation UI** — IncomeAccountConfig reused existing appSettings pattern for a clean read/write loop

### What Was Inefficient
- **SUMMARY.md one-liner extraction still broken** — CLI returns null for all 10 summaries; accomplishments had to be manually curated (3rd milestone in a row)
- **SUMMARY frontmatter requirements_completed** not populated in Phases 11, 12, 15 — bookkeeping gap flagged in audit as INFO severity
- **Phase numbering gap** — Phase 10 deferred from v1.2 left a numbering gap (11-15 instead of 10-14); cosmetic but slightly confusing
- **getSessionVolume full-table scan** — sessions table has no by_sessionDate index; works now but will degrade at scale

### Patterns Established
- **Analytics tab pattern**: skeleton guard → 2-3 hooks → chart components with Chart.js options → ChartSkeleton shared loading
- **Additive module growth**: analytics.ts and useAnalytics.ts extended via pure additions — no refactoring needed across 4 phases
- **timeAgo helper**: module-level utility in OperationsTab for human-readable relative timestamps
- **Show-more toggle**: useState(false) with slice-to-20 pattern for long audit log feeds
- **Configured/unconfigured empty states**: DonationPerformance checks `configured` flag to show instructive admin prompt vs chart

### Key Lessons
1. **Chart.js grouped bar requires stacked:false on BOTH axes** — declaring it on only x or y axis still stacks bars
2. **IIFE inside JSX** works well for derived data that's only used in one render branch (zip code sorting)
3. **Horizontal bar chart needs top-N cap** (8 categories) to prevent overflow on mobile
4. **TypeScript union types with Chart.js fill property** need explicit typing to avoid inference issues
5. **Admin designation UI should show immediate feedback** — closed-loop pattern (write config → read config → render chart) prevents stale-state confusion

### Cost Observations
- Model mix: ~60% opus, ~30% sonnet, ~10% haiku (estimated)
- Sessions: ~3 across planning, execution, audit, completion
- Notable: 5 phases (10 plans) completed in a single session — analytics tabs were highly formulaic after Phase 11 established the pattern

---

## Milestone: v2.0 — Data Foundation

**Shipped:** 2026-03-02
**Phases:** 7 | **Plans:** 9 | **Commits:** 58

### What Was Built
- Client → Enrollment → Session relational data model with enrollments table, demographics on clients, attendance on sessions
- Enrollment CRUD (7 functions) + session attendance tracking with backward-compatible v2.0 fields, RBAC, and audit logging
- Data migration — 350 existing clients restructured to enrollment model, 345 demographics backfilled from intake forms
- Analytics queries rewritten to use Convex index scans instead of Sheets programDataCache
- Google Sheets program sync removed (cron, action, alerts, admin UI) while preserving grant sync and Calendar
- Legacy schema cleaned — programDataCache table removed, dead code deleted, client legacy fields stripped
- Admin CSV/Excel export of full client + enrollment + session dataset

### What Worked
- **Strict phase dependency ordering** — schema → backend → migration → analytics → frontend → cleanup → export. Each phase built on the last with zero rework.
- **v.optional first, tighten later** — all new schema fields deployed as optional, allowing incremental migration without breaking existing code
- **Dry-run/execute migration pattern** — preview mode caught zero issues but built confidence for the live run; idempotency confirmed on re-run
- **Co-dependent phase coordination** — analytics rewrite (Phase 19) and Sheets removal (Phase 20) deployed together as planned, no data gaps
- **Enrollment-based RBAC** — by_status index scan + Set intersection is cleaner and more correct than the old programId check, especially for multi-program clients
- **internalMutation for migrations** — CLI-only safety constraint prevented accidental frontend invocation

### What Was Inefficient
- **MIGR-01 never truly completed** — migration script restructured existing Convex data but the cleaned master spreadsheet was never provided. This gap was only caught at milestone completion, not during Phase 18 execution.
- **Programs "active" status** — user flagged this as meaningless during v2.0 work but it was never addressed; should have been a quick fix in Phase 20 or 21
- **SUMMARY.md one-liner extraction still broken** — 4th consecutive milestone where CLI returns null. The frontmatter field is simply not used.
- **Production deployment lagging** — v1.3 is still running on VPS; v2.0 schema is only on dev deployment. Gap widening.
- **Phase 17 plan file stale** — 17-01-PLAN.md was created but never captured in the handoff file, required manual discovery

### Patterns Established
- **Additive schema evolution**: Deploy v.optional fields, migrate data, tighten schema — zero-downtime data model changes
- **Enrollment-based RBAC**: by_status index → Set intersection → role-filtered client lists for multi-program support
- **Convex skip pattern for expensive queries**: State gate (null → non-null) prevents query execution on page load
- **Query-time normalization**: ETHNICITY_MAP in analytics.ts normalizes at read, not write — preserves raw intake data flexibility
- **Dead code cleanup after deprecation**: Phase 21 systematically removed all deprecated code paths after Phase 20 proved they were unused

### Key Lessons
1. **Verify user-dependent prerequisites before marking requirements complete** — MIGR-01 was checked off but the user never provided the cleaned spreadsheet
2. **Co-dependent phases should be planned as a single wave** — Phases 19+20 always needed to ship together; treating them as separate created an unnecessary checkpoint
3. **Schema evolution works in Convex** — the v.optional → migrate → tighten pattern is reliable and should be the default for all data model changes
4. **Export skip pattern avoids Convex read overhead** — gating a query on a non-null state value is more efficient than a boolean flag
5. **XLSX.write requires type: "buffer" not "array"** in xlsx 0.18.5 CE — type "array" returns undefined silently

### Cost Observations
- Model mix: ~60% opus, ~30% sonnet, ~10% haiku (estimated)
- Sessions: ~5 across research, planning, execution, milestone completion
- Notable: 7 phases completed in 2 days — strict dependency chain meant each phase unlocked the next with zero rework

---

## Milestone: v2.1 — Polish & Deploy

**Shipped:** 2026-03-02
**Phases:** 3 | **Plans:** 5 | **Files:** 42

### What Was Built
- Programs sidebar icon fixed (Grid 2x2) and isActive field removed from schema, backend, and UI
- Master spreadsheet imported — 428 clients with enrollments populated in Convex (78 net new from this import)
- Calendar multi-select backend — listAvailableCalendars action querying Google Calendar API + useListCalendars hook
- GoogleCalendarConfig rewritten with checkbox multi-select picker, stale calendar detection, and auto-sync on save
- Route renamed `/clients` → `/programs` for nav label consistency
- Full v2.1 deployed to production VPS — Convex schema + Next.js standalone build, PM2 online

### What Worked
- **Small focused milestone** — 3 phases, 5 plans, all shipped in a single day. Tight scope with clear deliverables.
- **Human verification checkpoint caught real issues** — the `/clients` → `/programs` route rename was discovered during production verification, not during planning
- **Deploy plan with human checkpoint** — splitting automated deploy (Task 1) from visual verification (Task 2) ensured both machine and human validation
- **Pattern reuse across phases** — import script followed the established importIntake/importCoparent/importGrantMatrix pattern; calendar hooks followed useCalendarSync pattern

### What Was Inefficient
- **SUMMARY.md one-liner extraction still broken** — 5th consecutive milestone where CLI returns null
- **PM2 restart counter ambiguity** — verification flagged restart_time=29 as a gap; had to reset counter to pass
- **DEPLOY-01/DEPLOY-02 not checked off in REQUIREMENTS.md** — traceability table showed "Pending" even after successful deploy
- **Route naming inconsistency** — `/clients` route existed since early phases but was never renamed when nav label changed to "Programs" in Phase 20

### Patterns Established
- **Human verification checkpoints for deploy plans** — automated deploy + manual browser verification as separate tasks
- **Intent-driven admin API calls** — "Fetch Calendars" button instead of auto-fetch on mount reduces unnecessary API usage
- **PM2 counter reset after deploy** — `pm2 reset` clears restart counter after iterative deploys for clean verification

### Key Lessons
1. **Route names should match nav labels** — if the sidebar says "Programs", the URL should be `/programs`, not `/clients`
2. **Deploy verification needs a human in the loop** — automated smoke tests (HTTP 307) don't catch visual regressions or missing routes
3. **PM2 restart counter is misleading** — `restart_time` counts all restarts including intentional ones; `unstable_restarts` is the real crash indicator
4. **Traceability tables should be updated when requirements are satisfied** — not just at milestone completion

### Cost Observations
- Model mix: ~50% opus, ~40% sonnet, ~10% haiku (estimated)
- Sessions: ~2 (planning + execution/completion)
- Notable: Smallest milestone yet — focused scope enabled same-day ship

---

## Milestone: v3.0 — Dashboard Redesign

**Shipped:** 2026-03-02
**Phases:** 4 | **Plans:** 8 | **Commits:** 40

### What Was Built
- Dummy data fallbacks for all dashboard sections (QB financials, calendar, KB metrics, donations) with $NaN bug fix in P&L
- Dark/light theme toggle with old-app-inspired dark palette (#0F0F0F bg, #1E1E1E surface, #26A69A teal) and flash-free localStorage persistence
- Theme-aware Chart.js components — all charts dynamically adapt to dark/light mode via useChartConfig hook pattern
- Funding thermometer with animated CSS fill, expense category progress bars, enlarged stat card values
- Donation source cards with icons and amounts, urgency color coding on calendar events and grant deadlines
- Tighter dashboard spacing, gradient hover accents on cards, executive snapshot row, consolidated programs view
- Calendar cron sync fix — respects admin-selected calendars and cleans up stale events from de-selected ones

### What Worked
- **Hardcoded fallbacks over seed data** — no backend/schema changes needed, fallback constants are simple to maintain and easy to replace with real data later
- **Flash-prevention IIFE pattern** — synchronous `<head>` script sets theme class before body parse, eliminating any white flash on dark mode
- **useChartConfig hook pattern** — converting module-level chart constants to a hook that reads resolvedTheme at render time was clean and repeatable across all chart components
- **Phase ordering** — dummy data (26) → theme (27) → visuals (28) → polish (29) ensured each phase built on stable ground
- **CSS variable passthrough for gradients** — FundingThermometer uses inline `var(--primary)` since Tailwind can't resolve CSS variables in gradient utilities

### What Was Inefficient
- **SUMMARY.md one-liner extraction still broken** — 6th consecutive milestone where CLI returns null; frontmatter `one_liner` key simply not used in summaries
- **SUMMARY.md formats inconsistent** — v3.0 summaries use `# Dependency graph` as first heading instead of plan title, making automated parsing harder
- **Task counts not recorded in summaries** — `task_count` fields empty across all 8 summaries; milestone stats show 0 tasks despite significant work
- **Dark mode scoped to dashboard only** — sidebar and non-dashboard pages remain light-only; creates visual inconsistency when navigating

### Patterns Established
- **Hardcoded fallback pattern**: `const FALLBACK_* = {...}` module-level constants imported by dashboard components, gated by `data ?? FALLBACK_*`
- **Flash-free theme persistence**: IIFE in `<head>` reads localStorage, sets `.dark` class on `<html>`, useTheme hook initializes from localStorage in useState initializer
- **useChartConfig hook**: Module-level chart config constants → hook that branches on `resolvedTheme` → returns dark/light-appropriate colors at render time
- **CSS variable gradient workaround**: Use `style={{ background: 'linear-gradient(var(--primary), ...)' }}` when Tailwind can't resolve CSS vars in gradient utilities
- **Inline function component**: ProgramsConsolidated defined inline in page.tsx with local tab state — no unnecessary file extraction

### Key Lessons
1. **`|| 0` is safer than `?? 0` for NaN protection** — NaN is not nullish, so nullish coalescing passes it through while `||` catches it
2. **Flash prevention requires synchronous script** — useEffect-based theme application always produces a visible flash; only a blocking `<head>` IIFE eliminates it
3. **Chart colors must react to theme** — static module-level chart configs don't update when theme changes; converting to a hook that captures resolvedTheme is the correct pattern
4. **Tailwind purges dynamic class names** — `w-${pct}%` won't work; must use inline `style={{ width: ... }}` for computed values
5. **Cleanup runs after sync, not during** — stale event cleanup must wait for the full sync loop to complete to avoid premature deletion on partial failures

### Cost Observations
- Model mix: ~60% opus, ~30% sonnet, ~10% haiku (estimated)
- Sessions: ~3 across planning, execution, audit, completion
- Notable: 4 phases (8 plans) completed in a single day — each phase was well-scoped with clear boundaries

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 4 | First milestone — established GSD workflow patterns |
| v1.1 | ~4 | 3 | Lean polish milestone — reused established patterns for fast delivery |
| v1.3 | ~3 | 5 | Largest milestone by phase count — formulaic tab pattern enabled rapid execution |
| v2.0 | ~5 | 7 | Data model refactor — strict dependency chain, schema evolution pattern |
| v2.1 | ~2 | 3 | Smallest milestone — focused polish + deploy, same-day ship |
| v3.0 | ~3 | 4 | Visual redesign — theme toggle, fallback data, rich dashboard elements |

### Cumulative Quality

| Milestone | Audit Score | Requirements | Tech Debt |
|-----------|-------------|-------------|-----------|
| v1.0 | 22/22 | 100% satisfied | 3 INFO items, 1 orphaned export |
| v1.1 | 13/13 truths (Ph 5+6) | 8/8 requirements (code verified) | 1 dead export, missing Ph 07 VERIFICATION.md |
| v1.3 | 22/22 | 100% satisfied | 5 INFO items (skeleton mismatch, full-table scan, frontmatter bookkeeping, type gap) |
| v2.0 | No audit | 26/26 checked (MIGR-01 partial) | Spreadsheet import pending, programs "active" removal, production deploy behind |
| v2.1 | No audit | 8/8 satisfied | Cron sync calendar filter deferred, one-liner extraction still broken |
| v3.0 | 19/19 passed | 19/19 complete | Dark mode dashboard-only, one-liner extraction still broken, task counts not recorded |

### Top Lessons (Verified Across Milestones)

1. Fix existing broken features before adding new ones — solid foundation enables faster feature work
2. Three-state loading prevents UX flash states and should be the default pattern for all data-dependent UI
3. Singleton config table pattern is highly replicable — new config tables can follow `.first()` / upsert in minutes
4. Always create VERIFICATION.md after phase execution — even when code is correct, missing docs create audit gaps
5. Formulaic UI patterns (skeleton → hooks → chart component) compound across phases — Phase 14 was nearly copy-paste from Phase 12
6. SUMMARY frontmatter fields must be populated during execution — 4 milestones of broken one-liner extraction confirms the CLI depends on it
7. Verify user-dependent prerequisites before marking requirements complete — checked-off requirements may have external dependencies
8. Schema evolution via v.optional → migrate → tighten is reliable for zero-downtime data model changes in Convex
9. Flash-free theme toggle requires a synchronous `<head>` IIFE — useEffect is too late and always causes a visible flash
10. Chart.js chart colors must be captured in a hook, not at module level — theme changes don't trigger re-evaluation of module-level constants
