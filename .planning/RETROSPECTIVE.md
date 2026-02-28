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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 4 | First milestone — established GSD workflow patterns |
| v1.1 | ~4 | 3 | Lean polish milestone — reused established patterns for fast delivery |

### Cumulative Quality

| Milestone | Audit Score | Requirements | Tech Debt |
|-----------|-------------|-------------|-----------|
| v1.0 | 22/22 | 100% satisfied | 3 INFO items, 1 orphaned export |
| v1.1 | 13/13 truths (Ph 5+6) | 8/8 requirements (code verified) | 1 dead export, missing Ph 07 VERIFICATION.md |

### Top Lessons (Verified Across Milestones)

1. Fix existing broken features before adding new ones — solid foundation enables faster feature work
2. Three-state loading prevents UX flash states and should be the default pattern for all data-dependent UI
3. Singleton config table pattern is highly replicable — new config tables can follow `.first()` / upsert in minutes
4. Always create VERIFICATION.md after phase execution — even when code is correct, missing docs create audit gaps
