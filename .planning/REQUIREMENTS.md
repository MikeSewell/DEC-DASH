# Requirements: DEC DASH 2.0

**Defined:** 2026-03-02
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v2.1 Requirements

Requirements for the Polish & Deploy milestone. Each maps to roadmap phases.

### UI Fixes

- [ ] **UI-01**: Programs sidebar icon renders correctly without visual glitches
- [ ] **UI-02**: Programs `isActive` field removed from schema, backend, and frontend (field is meaningless)

### Calendar UX

- [ ] **CAL-01**: Admin can see a dropdown of all available Google calendars from the connected service account
- [ ] **CAL-02**: Admin can select/deselect multiple calendars to sync from the dropdown
- [ ] **CAL-03**: Selected calendars are saved and synced automatically

### Data Import

- [ ] **DATA-01**: Master spreadsheet imported into the app with client/enrollment data populated

### Deployment

- [ ] **DEPLOY-01**: v2.1 production build deployed to VPS and running via PM2
- [ ] **DEPLOY-02**: Convex schema changes deployed to production

## Future Requirements

### UX Improvements

- **UX-01**: Sync status indicator in admin showing last successful sync time + failures
- **UX-02**: Grant-to-QB-class explicit mapping instead of fuzzy matching

## Out of Scope

| Feature | Reason |
|---------|--------|
| Unify Google OAuth (Calendar + Sheets) | Both use service account; separate configs are fine |
| Google Calendar webhooks | Cron polling sufficient for event data |
| Two-way calendar editing | Read-only with link-out is sufficient |
| Multi-sheet support | Single grant spreadsheet is the only Sheets use case |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| CAL-01 | — | Pending |
| CAL-02 | — | Pending |
| CAL-03 | — | Pending |
| DATA-01 | — | Pending |
| DEPLOY-01 | — | Pending |
| DEPLOY-02 | — | Pending |

**Coverage:**
- v2.1 requirements: 8 total
- Mapped to phases: 0
- Unmapped: 8 ⚠️

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
