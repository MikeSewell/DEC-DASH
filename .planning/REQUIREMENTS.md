# Requirements: DEC DASH 2.0

**Defined:** 2026-03-02
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v3.0 Requirements

Requirements for dashboard redesign. Each maps to roadmap phases.

### Dummy Data

- [x] **DATA-01**: Dashboard renders hardcoded financial data (revenue, expenses, net income, cash on hand) when QB is not connected
- [x] **DATA-02**: Dashboard renders hardcoded calendar events when Google Calendar is not configured
- [x] **DATA-03**: Dashboard renders hardcoded KB metrics when no documents are uploaded
- [x] **DATA-04**: Dashboard renders hardcoded donation performance data when income accounts aren't designated
- [x] **DATA-05**: P&L section shows valid numbers (fix $NaN bug) with dummy expense breakdown

### Theme

- [x] **THEME-01**: User can toggle between dark and light theme via UI control
- [x] **THEME-02**: Dark theme uses polished dark palette (inspired by old app: #0F0F0F bg, #1E1E1E surface, teal accents)
- [x] **THEME-03**: Light theme retains current warm cream palette
- [x] **THEME-04**: Theme preference persists across sessions

### Visual Elements

- [x] **VIZ-01**: Funding goal thermometer visualization on dashboard
- [x] **VIZ-02**: Expense category progress bars with percentage fills
- [x] **VIZ-03**: Donation source cards with icons and amounts
- [x] **VIZ-04**: Deadline calendar items with urgency color coding (red/yellow/green)
- [x] **VIZ-05**: Dense metric cards with large values and hover lift effects

### Dashboard Polish

- [x] **POLISH-01**: Dashboard sections are tighter with less vertical whitespace
- [x] **POLISH-02**: Cards have gradient top border accent on hover (from old app)
- [x] **POLISH-03**: Executive snapshot shows dense financial summary at top
- [x] **POLISH-04**: Programs sections consolidated (not duplicated for each program type)

### Infrastructure

- [x] **INFRA-01**: Calendar cron sync uses selected calendars from googleCalendarConfig

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
| DATA-02 | Phase 26 | Complete |
| DATA-03 | Phase 26 | Complete |
| DATA-04 | Phase 26 | Complete |
| DATA-05 | Phase 26 | Complete |
| THEME-01 | Phase 27 | Complete |
| THEME-02 | Phase 27 | Complete |
| THEME-03 | Phase 27 | Complete |
| THEME-04 | Phase 27 | Complete |
| VIZ-01 | Phase 28 | Complete |
| VIZ-02 | Phase 28 | Complete |
| VIZ-03 | Phase 28 | Complete |
| VIZ-04 | Phase 28 | Complete |
| VIZ-05 | Phase 28 | Complete |
| POLISH-01 | Phase 29 | Complete |
| POLISH-02 | Phase 29 | Complete |
| POLISH-03 | Phase 29 | Complete |
| POLISH-04 | Phase 29 | Complete |
| INFRA-01 | Phase 29 | Complete |

**Coverage:**
- v3.0 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation (phases 26-29)*
