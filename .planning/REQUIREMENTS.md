# Requirements: DEC DASH 2.0

**Defined:** 2026-02-28
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v1.1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Dashboard Enhancements

- [ ] **DASH-01**: KPI cards show year-over-year trend indicator (arrow + percentage change vs same month last year)
- [ ] **DASH-02**: Trend data computed from QB historical P&L data (current month vs same month prior year)

### Calendar Enhancements

- [ ] **CAL-01**: Calendar events display color-coded by event type (client sessions, board meetings, community events, grant deadlines)
- [ ] **CAL-02**: Imminent events show countdown badges (e.g. "in 30 min", "in 2 hours")
- [ ] **CAL-03**: Toast notification fires for events starting within 30-60 min when dashboard loads

### Alert Enhancements

- [ ] **ALRT-01**: Admin console "Alerts" config section with editable thresholds (deadline window days, budget variance %, sync staleness hours) + gear icon shortcut on attention panel
- [ ] **ALRT-02**: Alerts can be dismissed/acknowledged with persistence across sessions (stored in Convex per user)
- [ ] **ALRT-03**: New/changed alerts trigger in-app toast notifications via sonner

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
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| CAL-01 | TBD | Pending |
| CAL-02 | TBD | Pending |
| CAL-03 | TBD | Pending |
| ALRT-01 | TBD | Pending |
| ALRT-02 | TBD | Pending |
| ALRT-03 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 8 total
- Mapped to phases: 0
- Unmapped: 8 (pending roadmap)

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial definition*
