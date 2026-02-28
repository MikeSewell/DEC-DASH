# Requirements: DEC DASH 2.0

**Defined:** 2026-02-28
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v1.1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Dashboard Enhancements

- [x] **DASH-01**: KPI cards show year-over-year trend indicator (arrow + percentage change vs same month last year)
- [x] **DASH-02**: Trend data computed from QB historical P&L data (current month vs same month prior year)

### Calendar Enhancements

- [x] **CAL-01**: Calendar events display color-coded by event type (client sessions, board meetings, community events, grant deadlines)
- [x] **CAL-02**: Imminent events show countdown badges (e.g. "in 30 min", "in 2 hours")
- [x] **CAL-03**: Toast notification fires for events starting within 30-60 min when dashboard loads

### Alert Enhancements

- [x] **ALRT-01**: Admin console "Alerts" config section with editable thresholds (deadline window days, budget variance %, sync staleness hours) + gear icon shortcut on attention panel
- [x] **ALRT-02**: Alerts can be dismissed/acknowledged with persistence across sessions (stored in Convex per user)
- [ ] **ALRT-03**: New/changed alerts trigger in-app toast notifications via the existing toast system

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Dashboard

- **DASH-V2-01**: Donation performance trend charts from QB income accounts

### Newsletter

- **NEWS-V2-01**: Mobile-responsive email template with media queries where supported

## Out of Scope

| Feature | Reason |
|---------|--------|
| Donation performance charts | No clean QB donation data source yet — Kareem needs to identify which income accounts represent donations |
| Newsletter mobile template | Low priority vs dashboard/alert/calendar polish |
| Real-time push notifications | In-app alerts panel + sonner toasts sufficient |
| Two-way calendar editing | Read-only with link-out is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | Phase 5 | Complete |
| DASH-02 | Phase 5 | Complete |
| CAL-01 | Phase 6 | Complete |
| CAL-02 | Phase 6 | Complete |
| CAL-03 | Phase 6 | Complete |
| ALRT-01 | Phase 7 | Complete |
| ALRT-02 | Phase 7 | Complete |
| ALRT-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation*
