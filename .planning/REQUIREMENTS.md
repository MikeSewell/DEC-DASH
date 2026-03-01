# Requirements: DEC DASH 2.0

**Defined:** 2026-03-01
**Core Value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.

## v2.0 Requirements

Requirements for Data Foundation milestone. Each maps to roadmap phases.

### Data Model

- [ ] **DMOD-01**: Enrollments table exists with clientId, programId, status, enrollmentDate, exitDate, notes, createdBy
- [ ] **DMOD-02**: Client records include gender, referralSource, dateOfBirth, phone, and email fields
- [ ] **DMOD-03**: Sessions include attendanceStatus field (attended/missed/excused/cancelled)
- [ ] **DMOD-04**: Sessions link to enrollments via enrollmentId
- [ ] **DMOD-05**: Enrollments indexed by clientId, programId, and status

### Client Management

- [ ] **CLNT-01**: All clients displayed in one unified list regardless of program type
- [ ] **CLNT-02**: Lawyers see only clients with legal enrollments; psychologists see only co-parent enrollments
- [ ] **CLNT-03**: Client detail page shows all enrollments across programs with intake forms
- [ ] **CLNT-04**: Staff can create a new enrollment for an existing client in any program
- [ ] **CLNT-05**: Staff can log individual sessions with date, attendance status, and notes per enrollment

### Data Migration

- [ ] **MIGR-01**: Import script reads cleaned spreadsheet and creates client + enrollment records in Convex
- [ ] **MIGR-02**: Import deduplicates by normalized name to prevent duplicate client records
- [ ] **MIGR-03**: Import supports dry-run mode reporting what would be created/updated/skipped
- [ ] **MIGR-04**: Demographics data (gender, ethnicity, zip, referralSource) populated from spreadsheet

### Analytics

- [ ] **ANLY-01**: Demographics tab queries Convex clients table instead of Sheets programDataCache
- [ ] **ANLY-02**: Session analytics queries use by_sessionDate index instead of full table scan
- [ ] **ANLY-03**: Active client count derived from enrollments with status=active

### Infrastructure

- [ ] **INFR-01**: Sheets program sync cron removed (grant sync preserved)
- [ ] **INFR-02**: programDataCache table cleared and removed from schema
- [ ] **INFR-03**: Legacy programId, enrollmentDate, status fields removed from clients schema
- [ ] **INFR-04**: Google Sheets program config removed from admin UI
- [ ] **INFR-05**: alerts.ts Sheets staleness check removed
- [ ] **INFR-06**: Calendar auth verified working after Sheets config removal

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
| DMOD-01 | — | Pending |
| DMOD-02 | — | Pending |
| DMOD-03 | — | Pending |
| DMOD-04 | — | Pending |
| DMOD-05 | — | Pending |
| CLNT-01 | — | Pending |
| CLNT-02 | — | Pending |
| CLNT-03 | — | Pending |
| CLNT-04 | — | Pending |
| CLNT-05 | — | Pending |
| MIGR-01 | — | Pending |
| MIGR-02 | — | Pending |
| MIGR-03 | — | Pending |
| MIGR-04 | — | Pending |
| ANLY-01 | — | Pending |
| ANLY-02 | — | Pending |
| ANLY-03 | — | Pending |
| INFR-01 | — | Pending |
| INFR-02 | — | Pending |
| INFR-03 | — | Pending |
| INFR-04 | — | Pending |
| INFR-05 | — | Pending |
| INFR-06 | — | Pending |
| XPRT-01 | — | Pending |
| XPRT-02 | — | Pending |
| XPRT-03 | — | Pending |

**Coverage:**
- v2.0 requirements: 26 total
- Mapped to phases: 0
- Unmapped: 26 ⚠️

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after initial definition*
