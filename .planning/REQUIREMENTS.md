# Requirements: DEC DASH 2.0

**Defined:** 2026-03-01
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v1.3 Requirements

Requirements for v1.3 Analytics milestone. Each maps to roadmap phases.

### Dashboard Cards

- [ ] **DASH-01**: User sees an active client count card on the dashboard showing total active clients across all programs
- [ ] **DASH-02**: User sees a session volume card on the dashboard showing sessions logged in the last 30 days
- [ ] **DASH-03**: User sees an intake trend indicator on the dashboard showing new intakes this month vs. last month

### Analytics Page

- [ ] **PAGE-01**: User can navigate to /analytics from the sidebar (visible to admin, manager, staff roles)
- [ ] **PAGE-02**: Analytics page has tab navigation between Demographics, Client Activity, and Operations

### Demographics

- [ ] **DEMO-01**: User can view gender distribution chart on the Demographics tab
- [ ] **DEMO-02**: User can view ethnicity distribution chart on the Demographics tab
- [ ] **DEMO-03**: User can view age group distribution chart on the Demographics tab
- [ ] **DEMO-04**: User can view top referral sources on the Demographics tab
- [ ] **DEMO-05**: User can view program outcome rates (completed/in-progress/dropped) on the Demographics tab
- [ ] **DEMO-06**: User can view zip code coverage breakdown on the Demographics tab

### Client Activity

- [ ] **ACT-01**: User can view session volume trends over time (monthly chart) on the Client Activity tab
- [ ] **ACT-02**: User can view client goal status breakdown and completion rate on the Client Activity tab
- [ ] **ACT-03**: User can view intake volume trends (legal vs co-parent, monthly) on the Client Activity tab

### Operations

- [ ] **OPS-01**: User can view recent staff activity feed with human-readable descriptions on the Operations tab
- [ ] **OPS-02**: User can view per-staff action counts and most-active-user summary on the Operations tab
- [ ] **OPS-03**: User can view expense categorization acceptance rate on the Operations tab
- [ ] **OPS-04**: User can view expense category distribution chart on the Operations tab

### Donation Performance

- [ ] **DON-01**: Monthly income trend chart displays 12 months of QB income data on the dashboard
- [ ] **DON-02**: Income chart breaks down revenue by QB account category
- [ ] **DON-03**: Admin can designate which QB income accounts represent donation/income categories via admin settings
- [ ] **DON-04**: When no accounts are designated, chart shows a "Configure donation accounts in Admin" prompt

## Future Requirements

### Analytics Enhancements

- **DEMO-07**: Interactive program type filter on Demographics tab (legal vs co-parent vs all)
- **ACT-04**: Drill-down from session chart to individual client sessions
- **ACT-05**: Goal time-to-completion trend analysis
- **OPS-05**: Peak activity time heatmap on Operations tab
- **OPS-06**: Allocation confidence score histogram

### Donation Enhancements

- **DON-05**: Multi-month income forecast/projection
- **DON-06**: Scheduled weekly summary emails

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive geographic map for zip codes | High complexity, simple table/list sufficient for v1.3 |
| Real-time activity feed via WebSockets | Convex reactivity handles this natively; no custom WebSocket needed |
| Exportable analytics reports (PDF/CSV) | Defer to v1.4; screen visualization is the priority |
| Cross-tab linked filtering | Adds complexity; each tab is self-contained for v1.3 |
| Session scheduling/booking | DEC uses external tools for scheduling; out of product scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| PAGE-01 | — | Pending |
| PAGE-02 | — | Pending |
| DEMO-01 | — | Pending |
| DEMO-02 | — | Pending |
| DEMO-03 | — | Pending |
| DEMO-04 | — | Pending |
| DEMO-05 | — | Pending |
| DEMO-06 | — | Pending |
| ACT-01 | — | Pending |
| ACT-02 | — | Pending |
| ACT-03 | — | Pending |
| OPS-01 | — | Pending |
| OPS-02 | — | Pending |
| OPS-03 | — | Pending |
| OPS-04 | — | Pending |
| DON-01 | — | Pending |
| DON-02 | — | Pending |
| DON-03 | — | Pending |
| DON-04 | — | Pending |

**Coverage:**
- v1.3 requirements: 22 total
- Mapped to phases: 0
- Unmapped: 22 ⚠️

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after initial definition*
