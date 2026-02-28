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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~8 | 4 | First milestone — established GSD workflow patterns |

### Cumulative Quality

| Milestone | Audit Score | Requirements | Tech Debt |
|-----------|-------------|-------------|-----------|
| v1.0 | 22/22 | 100% satisfied | 3 INFO items, 1 orphaned export |

### Top Lessons (Verified Across Milestones)

1. Fix existing broken features before adding new ones — solid foundation enables faster feature work
2. Three-state loading prevents UX flash states and should be the default pattern for all data-dependent UI
