# Roadmap: DEC DASH 2.0

## Milestones

- ✅ **v1.0 Command Center** — Phases 1-4 (shipped 2026-02-28)
- [ ] **v1.1 Polish** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Command Center (Phases 1-4) — SHIPPED 2026-02-28</summary>

- [x] Phase 1: Newsletter Template Fix (2/2 plans) — completed 2026-02-28
- [x] Phase 2: Dashboard Data Population (4/4 plans) — completed 2026-02-28
- [x] Phase 3: Google Calendar Integration (3/3 plans) — completed 2026-02-28
- [x] Phase 4: Proactive Alerts Panel (2/2 plans) — completed 2026-02-28

Full details: `milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Polish

- [ ] **Phase 5: Dashboard KPI Trends** — Year-over-year trend indicators on KPI cards from QB historical data
- [ ] **Phase 6: Calendar Enhancements** — Color-coded events, countdown badges, and toast notifications for imminent events
- [ ] **Phase 7: Alert Configuration & Persistence** — Configurable thresholds, dismissal persistence, and sonner toast notifications

## Phase Details

### Phase 5: Dashboard KPI Trends
**Goal**: KPI cards show meaningful trend context so Kareem can see at a glance whether key metrics are improving or declining year-over-year
**Depends on**: Nothing (v1.0 complete; QB integration already live)
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. Each KPI card displays a directional arrow (up/green or down/red) with a percentage change value
  2. Trend percentage reflects current month vs same month in the prior year using QB P&L data
  3. When QB is not connected or historical data is unavailable, KPI cards render without trend indicators (graceful fallback, no errors)
  4. Trend indicators respect the three-state loading pattern — skeleton shown while data loads, no flash of wrong state
**Plans**: TBD

### Phase 6: Calendar Enhancements
**Goal**: The CalendarWidget makes event type and urgency instantly readable so Kareem can scan upcoming commitments without reading every event title
**Depends on**: Phase 5 (parallel work possible, but 5 establishes QB pattern used across dashboard)
**Requirements**: CAL-01, CAL-02, CAL-03
**Success Criteria** (what must be TRUE):
  1. Calendar events display distinct color chips or badges by type — client sessions, board meetings, community events, and grant deadlines each have a unique color
  2. Events within 2 hours show a live countdown badge (e.g. "in 47 min") that updates without page refresh
  3. When the dashboard loads and an event starts within 30-60 minutes, a toast notification fires once per session per event
  4. Color coding and countdown badges display correctly with both the existing dark and any future light calendar themes
**Plans**: TBD

### Phase 7: Alert Configuration & Persistence
**Goal**: Alerts are configurable and actionable — Kareem can tune thresholds to reduce noise and dismiss alerts he has addressed, with persistence across sessions
**Depends on**: Phase 5 (alerts panel already shipped in v1.0; this enhances it)
**Requirements**: ALRT-01, ALRT-02, ALRT-03
**Success Criteria** (what must be TRUE):
  1. Admin console has an "Alerts" tab where admin/manager users can edit deadline window days, budget variance percentage, and sync staleness hours
  2. A gear icon on the WhatNeedsAttention panel links directly to the Alerts admin config tab
  3. Dismissed alerts do not reappear on subsequent dashboard loads or sessions (dismissal stored per-user in Convex)
  4. Newly surfaced or changed alerts trigger a sonner toast notification so Kareem is aware without looking at the panel
  5. Alert config changes take effect on the next alert query without requiring a page reload
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Newsletter Template Fix | v1.0 | 2/2 | Complete | 2026-02-28 |
| 2. Dashboard Data Population | v1.0 | 4/4 | Complete | 2026-02-28 |
| 3. Google Calendar Integration | v1.0 | 3/3 | Complete | 2026-02-28 |
| 4. Proactive Alerts Panel | v1.0 | 2/2 | Complete | 2026-02-28 |
| 5. Dashboard KPI Trends | v1.1 | 0/? | Not started | - |
| 6. Calendar Enhancements | v1.1 | 0/? | Not started | - |
| 7. Alert Configuration & Persistence | v1.1 | 0/? | Not started | - |
