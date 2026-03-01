# Phase 16: Schema Foundation - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the new Client → Enrollment → Session data model as additive optional schema changes in Convex. New enrollments table, demographic fields on clients, attendance status and enrollment link on sessions, and all new indexes. No CRUD mutations, no UI changes, no data migration — just table definitions and fields so Phases 17-21 can build on a stable schema. All existing code (clients page, sessions queries, analytics) must continue working unchanged.

</domain>

<decisions>
## Implementation Decisions

### Enrollment Statuses
- Full 5-state lifecycle: pending / active / on_hold / completed / withdrawn
- Multiple enrollments per client per program are allowed (re-enrollment creates a new record, not reopening an old one)
- Add exitReason field (optional string) for completed/withdrawn enrollments — valuable for nonprofit outcome reporting
- Status tracking via createdBy + updatedAt on the enrollment record; detailed status change history handled by the existing auditLogs table

### Demographic Fields
- Add 5 new optional fields to clients table: gender, referralSource, dateOfBirth, phone, email
- dateOfBirth stored as ISO date string ("YYYY-MM-DD") — simpler migration from intake form string data
- Ethnicity and zipCode already exist on clients — no changes needed for those
- Only the 5 required fields; no additional demographic fields beyond what DMOD-02 specifies

### Claude's Discretion
- Gender field type: string vs union type — decide based on existing intake form data patterns
- ReferralSource field type: string vs union type — decide based on intake form data variety

### Attendance Tracking
- 4 attendance statuses: attended / missed / excused / cancelled
- attendanceStatus is optional at the schema level (additive change — existing sessions untouched; Phase 17 mutations will enforce it in logic)
- Add optional duration field (number, in minutes) for grant reporting on total service hours delivered
- No facilitatorId field — createdBy is sufficient for tracking who ran the session

### Session-Enrollment Link
- enrollmentId is optional on sessions — allows standalone ad-hoc sessions not tied to any enrollment (e.g., walk-in consultations)
- Keep both clientId and enrollmentId on sessions — backward compatibility for existing queries and no joins needed to find the client
- programId lives directly on the enrollment record (per DMOD-01)
- Add by_enrollmentId index to sessions for fast enrollment-scoped queries
- Add by_sessionDate index to sessions for date-range queries (critical for Phase 19 analytics rewrite)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key constraint is that all changes are additive and optional so existing code continues working without modification.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireRole()` helper in convex/users.ts — enrollment CRUD (Phase 17) will use the same pattern
- `auditLog.log` internal mutation — already used by sessions.create and clients mutations; enrollment status changes will follow the same audit trail pattern
- Programs table with type union (coparent/legal/fatherhood/other) — enrollments link to programs via programId

### Established Patterns
- All date fields (enrollmentDate, sessionDate, createdAt) use Unix timestamps (numbers), except dateOfBirth which will be ISO string per discussion
- Status fields use Convex union types (v.union with v.literal) — see clients.status and programs.type
- Optional fields use v.optional() wrapper — the standard for additive schema changes
- Indexes follow by_fieldName convention (by_clientId, by_programId, by_status)

### Integration Points
- clients table (schema.ts:147) — add gender, referralSource, dateOfBirth, phone, email as optional fields
- sessions table (schema.ts:164) — add attendanceStatus, enrollmentId, duration as optional fields; add by_enrollmentId and by_sessionDate indexes
- New enrollments table — clientId, programId, status, enrollmentDate, exitDate, exitReason, notes, createdBy, updatedAt fields with by_clientId, by_programId, by_status indexes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-schema-foundation*
*Context gathered: 2026-03-01*
