# Requirements: DEC DASH 2.0

**Defined:** 2026-03-01
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v2.0 Requirements

Requirements for Data Foundation milestone. Each maps to roadmap phases.

### Data Model

- [x] **DMOD-01**: Enrollments table exists with clientId, programId, status, enrollmentDate, exitDate, notes, createdBy
- [x] **DMOD-02**: Client records include gender, referralSource, dateOfBirth, phone, and email fields
- [x] **DMOD-03**: Sessions include attendanceStatus field (attended/missed/excused/cancelled)
- [x] **DMOD-04**: Sessions link to enrollments via enrollmentId
- [x] **DMOD-05**: Enrollments indexed by clientId, programId, and status

### Client Management

- [x] **CLNT-01**: All clients displayed in one unified list regardless of program type
- [x] **CLNT-02**: Lawyers see only clients with legal enrollments; psychologists see only co-parent enrollments
- [x] **CLNT-03**: Client detail page shows all enrollments across programs with intake forms
- [x] **CLNT-04**: Staff can create a new enrollment for an existing client in any program
- [x] **CLNT-05**: Staff can log individual sessions with date, attendance status, and notes per enrollment

### Data Migration

- [x] **MIGR-01**: Import script reads cleaned spreadsheet and creates client + enrollment records in Convex
- [x] **MIGR-02**: Import deduplicates by normalized name to prevent duplicate client records
- [x] **MIGR-03**: Import supports dry-run mode reporting what would be created/updated/skipped
- [x] **MIGR-04**: Demographics data (gender, ethnicity, zip, referralSource) populated from spreadsheet

### Analytics

- [x] **ANLY-01**: Demographics tab queries Convex clients table instead of Sheets programDataCache
- [x] **ANLY-02**: Session analytics queries use by_sessionDate index instead of full table scan
- [x] **ANLY-03**: Active client count derived from enrollments with status=active

### Infrastructure

- [x] **INFR-01**: Sheets program sync cron removed (grant sync preserved)
- [ ] **INFR-02**: programDataCache table cleared and removed from schema
- [ ] **INFR-03**: Legacy programId, enrollmentDate, status fields removed from clients schema
- [x] **INFR-04**: Google Sheets program config removed from admin UI
- [x] **INFR-05**: alerts.ts Sheets staleness check removed
- [x] **INFR-06**: Calendar auth verified working after Sheets config removal

### Export

- [ ] **XPRT-01**: Admin can export client list with enrollment and session data as CSV
- [ ] **XPRT-02**: Admin can export client list with enrollment and session data as Excel (.xlsx)
- [ ] **XPRT-03**: Export includes demographics, enrollment history, and session counts per client

## Future Requirements

Deferred to v2.1+. Tracked but not in current roadmap.

### Reporting

- **REPT-01**: New vs returning client KPI card on dashboard
- **REPT-02**: Program completion rate KPI card
- **REPT-03**: Missed session alerts (3+ consecutive misses)
- **REPT-04**: Enrollment-level session history UI (timeline view)

### Advanced Export

- **XPRT-04**: Exportable analytics reports (PDF) from /analytics page
- **XPRT-05**: Date-filtered export (export only clients enrolled within date range)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time check-in kiosk / QR codes | DEC cohort sizes make manual session logging fast enough |
| Automatic silent deduplication | Healthcare-adjacent data requires admin review of conflicts |
| Multi-level program hierarchy (programs > cohorts > sessions) | Enrollment IS the cohort equivalent — unnecessary complexity |
| Bulk session import from Excel | Historical session data lacks structure for the new model |
| Two-way Sheets sync | App is source of truth; data flows out (export), not in |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DMOD-01 | Phase 16 | Complete |
| DMOD-02 | Phase 16 | Complete |
| DMOD-03 | Phase 16 | Complete |
| DMOD-04 | Phase 16 | Complete |
| DMOD-05 | Phase 16 | Complete |
| CLNT-01 | Phase 20 | Complete |
| CLNT-02 | Phase 20 | Complete |
| CLNT-03 | Phase 20 | Complete |
| CLNT-04 | Phase 17 | Complete |
| CLNT-05 | Phase 17 | Complete |
| MIGR-01 | Phase 18 | Complete |
| MIGR-02 | Phase 18 | Complete |
| MIGR-03 | Phase 18 | Complete |
| MIGR-04 | Phase 18 | Complete |
| ANLY-01 | Phase 19 | Complete |
| ANLY-02 | Phase 19 | Complete |
| ANLY-03 | Phase 19 | Complete |
| INFR-01 | Phase 20 | Complete |
| INFR-02 | Phase 21 | Pending |
| INFR-03 | Phase 21 | Pending |
| INFR-04 | Phase 20 | Complete |
| INFR-05 | Phase 20 | Complete |
| INFR-06 | Phase 20 | Complete |
| XPRT-01 | Phase 22 | Pending |
| XPRT-02 | Phase 22 | Pending |
| XPRT-03 | Phase 22 | Pending |

**Coverage:**
- v2.0 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation*
