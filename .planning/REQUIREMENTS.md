# Requirements: DEC DASH 2.0

**Defined:** 2026-03-02
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v3.0 Requirements

Requirements for dashboard redesign. Each maps to roadmap phases.

### Dummy Data

- [x] **DATA-01**: Dashboard renders hardcoded financial data (revenue, expenses, net income, cash on hand) when QB is not connected
- [ ] **DATA-02**: Dashboard renders hardcoded calendar events when Google Calendar is not configured
- [ ] **DATA-03**: Dashboard renders hardcoded KB metrics when no documents are uploaded
- [ ] **DATA-04**: Dashboard renders hardcoded donation performance data when income accounts aren't designated
- [x] **DATA-05**: P&L section shows valid numbers (fix $NaN bug) with dummy expense breakdown

### Theme

- [ ] **THEME-01**: User can toggle between dark and light theme via UI control
- [ ] **THEME-02**: Dark theme uses polished dark palette (inspired by old app: #0F0F0F bg, #1E1E1E surface, teal accents)
- [ ] **THEME-03**: Light theme retains current warm cream palette
- [ ] **THEME-04**: Theme preference persists across sessions

### Visual Elements

- [ ] **VIZ-01**: Funding goal thermometer visualization on dashboard
- [ ] **VIZ-02**: Expense category progress bars with percentage fills
- [ ] **VIZ-03**: Donation source cards with icons and amounts
- [ ] **VIZ-04**: Deadline calendar items with urgency color coding (red/yellow/green)
- [ ] **VIZ-05**: Dense metric cards with large values and hover lift effects

### Dashboard Polish

- [ ] **POLISH-01**: Dashboard sections are tighter with less vertical whitespace
- [ ] **POLISH-02**: Cards have gradient top border accent on hover (from old app)
- [ ] **POLISH-03**: Executive snapshot shows dense financial summary at top
- [ ] **POLISH-04**: Programs sections consolidated (not duplicated for each program type)

### Infrastructure

- [ ] **INFRA-01**: Calendar cron sync uses selected calendars from googleCalendarConfig

## Future Requirements

### Integration Reconnection

- **INTEG-01**: Reconnect QuickBooks OAuth and remove dummy data fallbacks
- **INTEG-02**: Connect Google Calendar with real service account
- **INTEG-03**: Upload KB documents and enable real metric extraction

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile responsive redesign | Web-first desktop dashboard, mobile deferred |
| New dashboard sections | Redesign existing sections, don't add new ones |
| Convex seed data | Hardcoded fallbacks only — seed data deferred to integration milestone |
| Dark mode for non-dashboard pages | Dashboard-focused milestone; other pages later |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 26 | Complete |
| DATA-02 | Phase 26 | Pending |
| DATA-03 | Phase 26 | Pending |
| DATA-04 | Phase 26 | Pending |
| DATA-05 | Phase 26 | Complete |
| THEME-01 | Phase 27 | Pending |
| THEME-02 | Phase 27 | Pending |
| THEME-03 | Phase 27 | Pending |
| THEME-04 | Phase 27 | Pending |
| VIZ-01 | Phase 28 | Pending |
| VIZ-02 | Phase 28 | Pending |
| VIZ-03 | Phase 28 | Pending |
| VIZ-04 | Phase 28 | Pending |
| VIZ-05 | Phase 28 | Pending |
| POLISH-01 | Phase 29 | Pending |
| POLISH-02 | Phase 29 | Pending |
| POLISH-03 | Phase 29 | Pending |
| POLISH-04 | Phase 29 | Pending |
| INFRA-01 | Phase 29 | Pending |

**Coverage:**
- v3.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation (phases 26-29)*
