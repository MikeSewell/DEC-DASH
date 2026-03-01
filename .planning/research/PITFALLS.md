# Pitfalls Research

**Domain:** Nonprofit executive dashboard — Next.js 15 + Convex — v2.0 Data Foundation (schema refactor, data migration, Sheets removal, OAuth unification)
**Researched:** 2026-03-01 (v2.0 Data Foundation milestone; v1.0–v1.3 pitfalls preserved below)
**Confidence:** HIGH (codebase inspected directly; Convex migration patterns verified with official docs and stack.convex.dev)

---

# v2.0 Data Foundation — New Pitfalls

These pitfalls are specific to: Convex schema refactoring with existing data, migrating from Google Sheets to app-as-source-of-truth, introducing the Client → Enrollment → Session model, changing foreign key relationships, and unifying Google OAuth configuration.

---

## Critical Pitfalls

### Pitfall 1: Convex Schema Push Fails Because Existing Data Does Not Match the New Schema

**What goes wrong:**
You add new required fields or change an existing field's type in `schema.ts` and run `npx convex dev --once`. The push fails with a schema validation error because existing documents in the database do not match the new schema. The deployment is blocked until you either revert the schema or manually fix every existing document.

**Why it happens:**
Convex enforces strict schema validation on every push. The rule is: "Convex will not let you change the type to something that doesn't conform to the data in production" and "Convex will not let you remove a field from a schema if that field still has data in the database." This applies to the shared dev/prod deployment (`aware-finch-86`) — schema mismatches block deployment immediately. The most common triggers in v2.0: adding `enrollmentId: v.id("enrollments")` as a required field on sessions when existing sessions have `programId` instead; removing `programId` from the `clients` table when existing clients have that field populated; adding a non-optional `gender` field to `clients` when most existing records have it as `undefined`.

**How to avoid:**
Follow the three-step migration pattern for every schema change:

1. Add new fields as `v.optional(...)` first. Push this schema — existing documents pass validation because the field can be absent.
2. Run a migration mutation (internal mutation, no auth requirement) to backfill the new field on all existing documents. Use pagination: process 100 documents at a time to avoid Convex OCC transaction conflicts.
3. Only after all documents are backfilled, push a new schema making the field required. Now all documents conform.

Never make a field required in the same schema push that introduces it. Never remove a field while documents still contain it. Use `v.optional` as a staging area during migration.

**Warning signs:**
- `npx convex dev --once` fails with "Schema validation failed" or "Document does not match schema"
- Error message references a specific table and field name
- Any attempt to make an existing optional field required without running a migration first

**Phase to address:**
Schema Migration phase (Phase 1 of v2.0) — establish the three-step pattern as the explicit process before touching any field in `clients`, `sessions`, or adding `enrollments`.

---

### Pitfall 2: Removing `programId` From `clients` Breaks RBAC Filtering for Lawyers and Psychologists

**What goes wrong:**
The `clients.listWithPrograms` query, `clients.getStats`, and `clients.getStatsByProgram` all filter by `programId` to enforce role-based access — lawyers see only clients in legal programs, psychologists see only co-parent program clients. When `programId` moves from `clients` to the new `enrollments` table, these filters stop working. Lawyers and psychologists suddenly see all clients, creating a privacy breach. The filter logic uses `.withIndex("by_programId", ...)` which relies on the index that will be removed.

**Why it happens:**
The current RBAC model is baked into the `programId` field directly on `clients`. The query pattern is:
```
clients.filter(c => legalProgramIds.has(c.programId))
```
When the data model changes to Client → Enrollment (where one client can have multiple enrollments in different programs), this simple filter no longer works. You cannot filter clients by their program membership without a join through the `enrollments` table. The code in `clients.ts`, `analytics.ts`, and `clients/page.tsx` all assume `programId` is directly on the client record.

**How to avoid:**
Before removing `programId` from `clients`, audit every query and frontend component that uses it for RBAC filtering. Rewrite all role-based filters to join through `enrollments`:

```typescript
// Old pattern (breaks after migration)
clients.filter(c => c.programId && legalProgramIds.has(c.programId))

// New pattern (joins through enrollments)
const legalEnrollments = await ctx.db.query("enrollments")
  .filter(e => legalProgramIds.has(e.programId))
  .collect();
const legalClientIds = new Set(legalEnrollments.map(e => e.clientId));
clients.filter(c => legalClientIds.has(c._id))
```

This new pattern requires an index on `enrollments.by_programId`. Keep `programId` as `v.optional` on `clients` during the transition period so existing code doesn't break before the RBAC rewrite is complete.

**Warning signs:**
- Lawyers or psychologists can see clients from all programs after the migration
- `clients.listWithPrograms` returns unfiltered results when called with a role-scoped user
- `getStats` returns counts that include programs the user should not see
- TypeScript errors when `c.programId` is accessed on a client record after the field is removed

**Phase to address:**
Schema Migration phase — RBAC filter rewrite must happen in the same phase as the `enrollments` table introduction, before `programId` is removed from `clients`.

---

### Pitfall 3: Removing Google Sheets Sync Leaves `getAllDemographics` Returning Empty Data

**What goes wrong:**
`analytics.getAllDemographics` currently reads from `programDataCache`, which is populated by the Google Sheets sync cron. After the Sheets sync is removed and `programDataCache` is no longer populated, `getAllDemographics` returns `{ total: 0, ... }`. The Demographics tab on the analytics page shows the "No program data synced yet" empty state indefinitely. The analytics page appears broken to Kareem even though the new Convex-native data exists in the `clients` and `enrollments` tables — the query just isn't reading from the right source yet.

**Why it happens:**
`getAllDemographics` in `analytics.ts` was written to read `programDataCache` (the Sheets-synced table). `DemographicsTab.tsx` also checks `sheetsConfig === null` and shows a "Connect Google Sheets" message if Sheets is not configured. After removing Sheets, the sheetsConfig check returns `null`, and the demographics tab shows a Sheets-specific empty state with a link to `/admin` — a confusing message when the data is actually in Convex and Sheets is intentionally gone.

**How to avoid:**
The analytics rewrite must happen in the same phase as Sheets removal. The sequence:

1. Write the new `getAllDemographics` query reading from `clients` + `enrollments` tables.
2. Remove the `sheetsConfig === null` guard from `DemographicsTab.tsx` (or replace it with a data-is-empty guard).
3. Remove the Sheets cron job from `crons.ts`.
4. Delete the `programDataCache` table from `schema.ts` only after the new query is verified.

Do not remove the Sheets sync before the replacement analytics query is deployed and verified. Test the new query returns data before cutting over.

**Warning signs:**
- Demographics tab shows "Connect Google Sheets" or "No program data synced yet" after migration
- `getAllDemographics` returns `total: 0` when clients table has records
- `DemographicsTab.tsx` still imports `useSheetsConfig` after Sheets removal
- `programDataCache` table is empty but still exists and causes stale "0 records" confusion

**Phase to address:**
Sheets Removal + Analytics Rewrite phase — these are co-dependent and must be executed together, not sequentially.

---

### Pitfall 4: Cron Job Removal From `crons.ts` Requires Schema Cleanup in the Right Order

**What goes wrong:**
You remove the Sheets sync from `crons.ts` and push the schema. The cron job stops running. However, the `googleSheetsConfig` table and the `programDataCache` table still exist in the schema. If you then try to remove these tables from `schema.ts`, the push fails because existing documents are still in those tables. Alternatively, if you delete the table data first through the Convex dashboard, you may delete the `googleSheetsConfig` row that stores the admin-configured spreadsheet ID — making it harder to debug if you need to reference it later.

**Why it happens:**
Removing a Convex table requires two steps: (1) delete all documents from the table, then (2) remove the table definition from `schema.ts`. If you try to remove the table from the schema while documents exist, the push fails. The `googleSheetsConfig` table also has a reference in `alertConfig`'s `sheetsStalenessHours` field — the alert system currently checks `googleSheetsConfig` sync timestamps to generate a "Sheets stale" alert. Removing Sheets without updating the alerts module causes a runtime error in `alerts.ts`.

**How to avoid:**
Follow this specific order for Sheets removal:

1. Remove the `sheets-sync` cron from `crons.ts` and push — cron stops.
2. Update `alerts.ts` to remove the Sheets staleness check (the section at line 156 that queries `googleSheetsConfig`). Push.
3. Remove the `sheetsStalenessHours` field from `alertConfig` schema — but only after confirming no running `alertConfig` rows have this field populated, or mark it `v.optional` first.
4. Clear all documents from `programDataCache` via the Convex dashboard.
5. Clear all documents from `googleSheetsConfig` via the Convex dashboard.
6. Remove `programDataCache` and `googleSheetsConfig` table definitions from `schema.ts`. Push.
7. Remove the `googleSheetsConfig`, `googleSheetsInternal`, `googleSheetsActions`, `googleSheetsSync` backend files.
8. Remove frontend references: `useSheetsConfig`, `GoogleSheetsConfig` component, the Sheets admin tab.

Skipping steps causes either blocked pushes or runtime errors in production.

**Warning signs:**
- Schema push fails with "table has existing documents" after removing a table definition
- `alerts.ts` throws a runtime error referencing `googleSheetsConfig` after the table is removed from the schema
- The Sheets admin tab in `/admin` still appears but its queries throw errors
- `sheetsStalenessHours` field referenced in `alertConfig.ts` default config causes a TypeScript error

**Phase to address:**
Sheets Removal phase — document the exact removal sequence before starting; each push must be validated before proceeding to the next step.

---

### Pitfall 5: Data Migration from Spreadsheet Creates Duplicate Clients Already in Convex

**What goes wrong:**
The one-time import script creates new `clients`, `enrollments`, and `sessions` records from the cleaned spreadsheet data. Many clients were previously imported into Convex via the existing `importLegalBatch` and `importCoparentBatch` mutations. The import script creates duplicates — two records for "John Smith" in the Legal program, one from the old import and one from the new migration. Demographics double-count; session analytics count sessions twice; the client list shows duplicates.

**Why it happens:**
The existing import scripts deduplicate by `firstName + lastName` within a single program. However, the new migration script is creating records with different field structures (demographics now on the `clients` record instead of the intake form, enrollments as a separate table). The deduplication logic may not fire correctly if the script checks for existing `clients` by name but finds the old record has different fields or is linked to the old `programId` structure. Additionally, the spreadsheet may contain names with slightly different spelling or casing than what was previously imported (e.g., "José" vs "Jose", "Smith Jr." vs "Smith").

**How to avoid:**
The migration script must check for existing clients before inserting:

1. Build an in-memory index of all existing clients by normalized name key: `${firstName.toLowerCase().trim()}_${lastName.toLowerCase().trim()}`.
2. For each spreadsheet row, check if a client with that name key already exists in Convex.
3. If the client exists: update their demographics fields (ethnicity, ageGroup, zipCode, referralSource) if the spreadsheet has richer data. Create an enrollment linking them to the program if one doesn't already exist.
4. If the client does not exist: create a new client record.
5. Run the script in a dry-run mode first that reports `{ wouldCreate, wouldUpdate, wouldSkip }` without writing anything.

Also verify the final client count matches expectations before deleting `programDataCache` data.

**Warning signs:**
- Client list shows visibly duplicate entries after migration
- `clients.getStats` total count is higher than expected (roughly 2x the real client count)
- Demographics charts show inflated totals
- The same person appears twice in the client list with slightly different data

**Phase to address:**
Data Migration phase — the dry-run validation must pass before any data is written. Do not run in production without reviewing the dry-run output.

---

### Pitfall 6: `sessions` Table Full-Table Scan Gets Slower After Session Records Are Added

**What goes wrong:**
`analytics.getSessionVolume` and `analytics.getSessionTrends` both call `await ctx.db.query("sessions").collect()` with no index — a full table scan. The existing codebase comment acknowledges this: "getSessionVolume does a full-table scan on sessions (no by_sessionDate index) — works at current scale." After the v2.0 migration imports historical session data from spreadsheets (potentially 500–2,000 historical session records), this query becomes measurably slower. After 12+ months of real use, it will be slow enough to cause noticeable UI lag on the analytics page.

**Why it happens:**
The `sessions` table schema currently has no `by_sessionDate` index. Convex queries without indexes must scan every document. At the current scale (likely <100 sessions), this is imperceptible. With historical migration data, session count jumps to the real operational total — potentially hundreds. Convex query performance degrades linearly with document count on un-indexed full scans.

**How to avoid:**
Add the `by_sessionDate` index to the `sessions` table in `schema.ts` during the v2.0 schema work. This is a non-destructive schema change — adding an index does not require migrating existing data:

```typescript
sessions: defineTable({
  ...existing fields...
}).index("by_clientId", ["clientId"])
  .index("by_sessionDate", ["sessionDate"])  // ADD THIS
```

Then update `getSessionVolume` and `getSessionTrends` to use the index:
```typescript
.withIndex("by_sessionDate", q => q.gte("sessionDate", thirtyDaysAgo))
```

This also enables enrollment-scoped session queries in the future (`by_enrollmentId`).

**Warning signs:**
- Analytics page loads noticeably slower after migration data is imported
- Convex function execution time for `getSessionTrends` increases from <10ms to >100ms
- Convex dashboard shows high read unit consumption on `getSessionTrends` queries

**Phase to address:**
Schema Migration phase — add the index proactively before importing historical data, not after performance degrades.

---

### Pitfall 7: `googleSheetsConfig` Table Has a `purpose` Field Used by Multi-Config Sync — Removing It Breaks Calendar Config Reference

**What goes wrong:**
The `googleSheetsConfig` table has a `by_purpose` index and a `purpose` field that differentiates between multiple sync configurations (e.g., `"program_coparent"`, `"program_legal"`, grant tracker). The `googleCalendarConfig` table is a separate table — it is not related to Sheets. However, `googleSheetsActions.syncProgramData` queries `getConfigByPurpose` to find the right Sheets config row for each program type. If you partially remove Sheets infrastructure but leave `googleSheetsInternal.getConfigByPurpose` alive (because it's referenced somewhere), you create a broken dependency chain that is hard to trace.

Additionally, the `googleCalendarActions.ts` uses a separate service account credential (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) — the same env vars used by Sheets. The goal is to "unify Google OAuth" — but the Calendar integration currently uses a service account (no OAuth token rotation needed) while the hypothetical "unified" OAuth would use user-facing OAuth with refresh tokens. These are fundamentally different auth patterns.

**Why it happens:**
"Unify Google OAuth" may be interpreted as consolidating the service account credential configuration into a single admin config row — not replacing service account auth with user OAuth. The Sheets admin config stores `serviceAccountEmail` in `googleSheetsConfig`. Calendar config in `googleCalendarConfig` stores only calendar IDs (it reads service account credentials directly from env vars). After removing Sheets, there is no longer a UI-configurable home for `serviceAccountEmail`. The Calendar config also needs to display what service account is in use for the admin to verify it.

**How to avoid:**
Do not conflate "remove Sheets dependency" with "remove Google service account config." The service account credentials are still needed for Calendar. The correct scoping for "unify Google OAuth" in v2.0 is:

1. Remove the `googleSheetsConfig` table (Sheets-specific settings: spreadsheetId, sheetName, serviceAccountEmail per program).
2. Retain a single `googleOAuthConfig` or keep the service account email/key in env vars only (current pattern).
3. The Calendar admin tab should show the configured service account email (read from env vars, not the DB) for visibility.
4. Do not add a user-facing OAuth flow for Calendar — the service account pattern requires no token rotation and is more reliable for server-side cron use.

If the actual intent is to move service account config into the DB (like `googleSheetsConfig` currently does for `serviceAccountEmail`), add a dedicated `googleServiceAccountConfig` singleton table and update the Calendar config UI to use it.

**Warning signs:**
- After removing `googleSheetsConfig`, Calendar sync fails silently because its auth code imports from a now-deleted module
- `getConfigByPurpose` throws "table not found" errors if called from any code that still references it
- Admin UI shows no service account email after Sheets tab is removed, creating confusion about what credentials Calendar uses

**Phase to address:**
Google OAuth Unification phase — explicitly define scope before implementation: "remove Sheets-specific config" is not the same as "remove all Google service account config." The Calendar config UI should be updated to clearly show auth status without depending on Sheets config.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `programId` on `clients` as deprecated optional during transition | No RBAC breakage during migration | Two sources of truth for program membership; queries must handle both | Acceptable only for the duration of the migration phase; remove before v2.0 ships |
| Importing sessions without a `by_sessionDate` index | Faster initial migration, no index build time | Full-table scan degrades as session count grows; analytics slow down | Never — add the index in the same schema push as the table definition |
| Using `schemaValidation: false` to bypass migration failures | Unblocks deployment immediately | TypeScript types no longer match runtime data; silent type mismatches corrupt queries | Never in production; only acceptable as a last resort debugging step in dev, reverted immediately |
| Leaving `programDataCache` populated after new analytics queries are deployed | Provides a fallback data source | Stale Sheets data and live Convex data coexist; demographics can double-count or contradict | Never — clear `programDataCache` atomically when switching analytics to the new queries |
| Running the data migration script without a dry-run pass | Faster to implement | Duplicates or data errors are written to production and require manual cleanup | Never — always implement dry-run mode with output review before writing to production |

---

## Integration Gotchas

Common mistakes when removing or changing external service dependencies.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Sheets → Convex analytics | Removing Sheets sync before the replacement analytics query is verified | Deploy and verify new Convex-native demographics query returns correct data before removing `sheets-sync` cron |
| Convex cron removal | Removing cron function from `crons.ts` without removing its references in `alerts.ts` | Audit all files that reference the removed cron or table before pushing; `alerts.ts` checks `googleSheetsConfig` staleness |
| `clients.programId` removal | Removing the field from schema before all RBAC query rewrites are pushed | Keep `programId` as `v.optional` until every RBAC query using it has been replaced with enrollment-join logic |
| Spreadsheet data import | Importing raw spreadsheet values without normalizing (mixed case, trailing spaces, null strings) | Normalize all string fields: trim whitespace, normalize empty strings to `undefined`, standardize ethnicity/age group values to match the Convex schema enum values before import |
| Google service account auth | Confusing user-facing OAuth (token refresh flow) with service account auth (env vars, no tokens) | Calendar uses service account — no token rotation needed. Do not add a token refresh cron for Calendar the way QB has one for OAuth |

---

## Performance Traps

Patterns that work at small scale but fail as session/client data grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-table scan on `sessions` for analytics | Analytics page load increases from <50ms to >500ms after migration | Add `by_sessionDate` index to sessions table before importing historical data | At ~500 session records with current implementation |
| Full-table scan on `clients` for RBAC filtering | Client list loads slowly for lawyers/psychologists after unification | Add `by_enrollmentId` index on enrollments table; filter by enrollment first | At ~1,000 client records |
| Enrollment join done in memory (load all enrollments, filter in JS) | Acceptable at current scale; becomes slow when clients have multiple enrollments across programs | Use `enrollments.by_clientId` index for per-client enrollment lookups; use `enrollments.by_programId` for program-scoped filtering | At ~2,000 enrollment records |
| Migration script inserting records one-by-one in a loop without batching | Migration takes minutes instead of seconds; risks hitting Convex mutation timeouts | Insert in batches of 50 with `Promise.all`; use `internalMutation` to avoid auth overhead on each insert | Immediately with >200 records |

---

## Security Mistakes

Domain-specific security issues relevant to v2.0 changes.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Running data migration mutations without role gating | Any user can trigger a batch insert/update if the mutation is public | All migration mutations must be `internalMutation` — they should only be callable from CLI (`npx convex run`), not from the frontend |
| Migrating client PII from spreadsheet without audit log entries | No record of when data was imported, by whom, or what changed | Log a bulk import event to `auditLogs` at the start and end of each migration run: `{ action: "bulk_import", entityType: "clients", details: "imported 47 records from spreadsheet" }` |
| Keeping `importLegalBatch` and `importCoparentBatch` public mutations after migration | These unauthenticated batch insert mutations remain callable by anyone with the Convex URL | After migration is complete, convert these to `internalMutation` or add `requireRole` guards |
| Removing `sheetsStalenessHours` from `alertConfig` before removing the alert that uses it | TypeScript type mismatch; runtime reads `undefined` for a field expected to be a number; alert staleness thresholds silently fall back to `NaN` | Remove the staleness alert check in `alerts.ts` before removing the field from `alertConfig` schema |

---

## UX Pitfalls

Common user experience mistakes when migrating from one data source to another.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Switching Demographics tab from Sheets data to Convex data mid-release without coordinating expected counts | Kareem sees different total counts before and after release; may report a bug when counts are actually correct | Prepare Kareem for the number change before deployment; explain the data sources are different |
| Demographics tab shows empty state during the migration window (Sheets removed, Convex query not yet deployed) | Analytics page appears completely broken | Never remove Sheets and deploy analytics rewrite in separate deployments; do both in the same push |
| Unified client list no longer shows program tabs for lawyers/psychologists after removing `programId` | Role-restricted users lose their program-specific view before the enrollment-based filter is working | Do not remove program tab filtering from `clients/page.tsx` until enrollment-join RBAC is verified working for restricted roles |
| Data export is added but exports in a format Kareem cannot use | Admin runs export, gets a JSON file, does not know how to open it | Export as CSV with human-readable headers; for a nonprofit admin, Excel/CSV is far more useful than JSON |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in v2.0 but are missing critical pieces.

- [ ] **Schema migration:** Verify that ALL existing `sessions` records (not just new ones) have an `enrollmentId` after migration — spot-check 5 random sessions in the Convex dashboard
- [ ] **RBAC after migration:** Log in as a `lawyer` role user and verify they see ONLY legal program clients, not all clients
- [ ] **RBAC after migration:** Log in as a `psychologist` role user and verify they see ONLY co-parent program clients
- [ ] **Demographics tab:** Verify the Demographics tab shows real data after Sheets removal — check that `total > 0` and the values match known client counts
- [ ] **Sheets removal:** Verify `alerts.ts` no longer references `googleSheetsConfig` — running the alerts query after Sheets tables are removed should not throw
- [ ] **Sheets removal:** Verify the admin page no longer has a non-functional Google Sheets tab after the table is removed
- [ ] **Data migration:** Verify the imported client count matches the spreadsheet row count (minus header, minus blank rows, minus duplicates)
- [ ] **Session index:** Confirm `getSessionTrends` uses `by_sessionDate` index — check Convex function execution stats show low read units
- [ ] **Export:** Verify the data export produces a valid CSV that opens correctly in Excel with no encoding issues (test with names that have special characters like accents)

---

## Recovery Strategies

When v2.0 pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Schema push blocked by validation errors | LOW | Revert the schema change; make the new field `v.optional`; push the optional version; run migration; then make required |
| Duplicate clients created by migration script | MEDIUM | Query for clients with identical first+last name; manually delete duplicates via Convex dashboard; recheck analytics totals |
| RBAC breaks after `programId` removed (all users see all clients) | HIGH | Immediately revert to a schema with `programId` still present; the RBAC filter code must be rewritten before the field is removed; this is not a quick fix |
| Demographics tab empty after Sheets removal | LOW | Verify new `getAllDemographics` query is deployed; if not, redeploy with the replacement query; data is safe in the `clients` table |
| Sheets staleness alert errors after table removal | LOW | Push a patch to `alerts.ts` removing the Sheets staleness check; the error is at query time, not at data time — no data is lost |
| Migration script ran without dry-run, creating bad data | HIGH | Use Convex dashboard to bulk-delete records created after the migration timestamp; re-run with dry-run mode and verify before re-importing |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Schema push blocked by validation errors | Schema Migration (Phase 1) | Push schema with all new fields as `v.optional`; verify no validation errors |
| RBAC breaks after `programId` removal | Schema Migration (Phase 1) | Log in as lawyer and psychologist roles; verify filtered client lists |
| Session full-table scan performance | Schema Migration (Phase 1) | Confirm `by_sessionDate` index exists; verify analytics query uses it |
| `getAllDemographics` empty after Sheets removal | Sheets Removal + Analytics Rewrite (same phase) | Verify `total > 0` after deployment using real client data |
| Cron and table removal order | Sheets Removal phase | Follow documented 8-step removal sequence; validate at each step |
| Duplicate clients from migration | Data Migration phase | Always run dry-run first; review output before executing writes |
| Sheets staleness alert runtime errors | Sheets Removal phase | Remove alert check before removing table; test `getAlerts` query after Sheets table is gone |
| Import mutations remain public after migration | Data Migration phase (cleanup step) | Convert `importLegalBatch` and `importCoparentBatch` to internal after migration completes |
| Google service account confusion | OAuth Unification phase | Confirm Calendar sync still works after Sheets is removed; verify env vars are still present |

---

## Sources

**v2.0 Data Foundation sources:**
- Convex intro to migrations (three-step pattern, schema validation rules): [https://stack.convex.dev/intro-to-migrations](https://stack.convex.dev/intro-to-migrations)
- Convex stateful online migrations using mutations: [https://stack.convex.dev/migrating-data-with-mutations](https://stack.convex.dev/migrating-data-with-mutations)
- Convex lightweight zero-downtime migrations: [https://stack.convex.dev/lightweight-zero-downtime-migrations](https://stack.convex.dev/lightweight-zero-downtime-migrations)
- Convex schema documentation (validation rules, schemaValidation option): [https://docs.convex.dev/database/schemas](https://docs.convex.dev/database/schemas)
- Convex migrations component: [https://www.convex.dev/components/migrations](https://www.convex.dev/components/migrations)
- Convex table deletion via dashboard: [https://docs.convex.dev/dashboard/deployments/data](https://docs.convex.dev/dashboard/deployments/data)
- Google OAuth refresh token limits and expiry: [https://developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)
- Google OAuth service account vs user OAuth patterns: [https://developers.google.com/identity/protocols/oauth2/web-server](https://developers.google.com/identity/protocols/oauth2/web-server)
- Direct codebase inspection: `convex/schema.ts`, `convex/clients.ts`, `convex/sessions.ts`, `convex/analytics.ts`, `convex/googleSheetsSync.ts`, `convex/googleSheetsActions.ts`, `convex/alerts.ts`, `convex/crons.ts`, `convex/alertConfig.ts`, `src/components/analytics/DemographicsTab.tsx`, `src/app/(dashboard)/clients/page.tsx`, `src/hooks/useAnalytics.ts`

---
*v2.0 Data Foundation pitfalls research for: DEC DASH 2.0*
*Researched: 2026-03-01*

---

---

# v1.0–v1.3 Pitfalls (Preserved)

---

# v1.2 Intelligence Milestone — New Pitfalls

These pitfalls are specific to adding KB-powered KPI cards, an AI summary panel, and donation/income charts from QuickBooks to the existing dashboard.

---

## Critical Pitfalls

### Pitfall 1: OpenAI Structured Extraction Invents Values for Missing Fields

**What goes wrong:**
You pass a Zod/JSON schema to OpenAI and ask it to extract KPIs (e.g., "clients served", "sessions completed", "success rate") from uploaded KB documents. OpenAI returns a fully-populated JSON object even when the document does not contain those fields. KPI cards display confident-looking numbers that are fabricated.

**Why it happens:**
When `strict: true` is used with Structured Outputs, the model must conform to the schema — it cannot return an empty response. If the schema makes fields required but the source document does not contain those values, the model fills them in plausibly (hallucination), rather than leaving them null. This is a known behavior: the model "tries to adhere to the provided schema" and will invent values to satisfy required fields. The existing KB files in this system (PDFs of program reports, intake data) may have inconsistent structure across uploads — one document may have "112 clients served" and another may not mention client counts at all.

**How to avoid:**
1. Make all extracted fields `optional` (nullable) in the schema. Prompt explicitly: "Return null for any field not directly stated in the document. Do not estimate or infer values."
2. Post-validate extracted values against plausible ranges (e.g., client counts > 0 and < 10,000; reject negative values).
3. Store the source document name and a `confidence` field alongside each extracted KPI in Convex so the UI can show provenance ("From: Q3 2025 Program Report").
4. Do not use Assistants API file_search for structured extraction — it retrieves relevant chunks but cannot guarantee the extracted field came from an actual chunk. Use direct Chat Completions with the document text injected into the prompt for deterministic extraction.

**Warning signs:**
- Extracted KPI values are suspiciously round numbers (100, 500) when real program data has irregular counts
- The same metric returns different values on consecutive extractions from the same document
- KPI cards show values for metrics that do not exist in any uploaded document

**Phase to address:**
Phase 1 (KB KPI extraction) — before any KPI card renders extracted data to Kareem.

---

### Pitfall 2: AI Summary Generation Runs on Every Dashboard Load, Burning API Credits

**What goes wrong:**
A Convex action fetches all KB files, sends them to OpenAI to generate a "key takeaways" summary, and saves the result. This action is triggered on dashboard load or on a cron schedule without checking if the KB has changed. Result: OpenAI API costs spike. With 10 documents averaging 50 KB each, a single summary generation call can consume 50,000–100,000 input tokens at gpt-4o rates (~$0.50–$1.00 per call). If triggered every dashboard load, this is $15–$30/day for a light user — prohibitive for a nonprofit.

**Why it happens:**
The natural implementation pattern is: "user opens dashboard → fetch summary → display." This triggers an OpenAI call on every page load. Even if wrapped in a cron, a 15-minute cron firing independently of whether any document changed still wastes tokens when the KB is unchanged. The existing codebase's Sheets and QB syncs run on fixed cron intervals regardless of source changes, which is fine for API polling but is not appropriate for expensive LLM generation.

**How to avoid:**
1. Store the generated summary in Convex (`aiSummary` table with `generatedAt`, `kbFingerprint`, `content` fields).
2. Compute a fingerprint of the KB state: hash of all `knowledgeBase` document IDs + `uploadedAt` timestamps. Only regenerate if the fingerprint changes.
3. Expose manual regeneration only (a "Regenerate Summary" button), not automatic. The summary is a point-in-time snapshot of organizational highlights — it does not need to auto-update.
4. Cap maximum document content passed to OpenAI: if total KB size exceeds 100,000 tokens, summarize only the 5 most recently uploaded documents, or use a pre-extraction step to pull relevant sections.

**Warning signs:**
- OpenAI usage dashboard shows large spikes coinciding with dashboard open events
- Convex action logs show repeated `generateSummary` calls within minutes
- OpenAI API bill increases unexpectedly after shipping the AI summary feature

**Phase to address:**
Phase 2 (AI summary panel) — the trigger and caching strategy must be designed before the action is written.

---

### Pitfall 3: QuickBooks Has No "Donations" Entity — Income Account Mapping Is Org-Specific and Fragile

**What goes wrong:**
The DonationPerformance component already exists in the codebase and reads from a `donations` cache entry in `quickbooksCache`. The `quickbooks.ts` comment confirms: "QB doesn't have a dedicated donations entity. This will return null until a PayPal or other donation-platform integration is implemented." If you attempt to extract "donations" from the QB P&L report by looking for accounts named "Donations" or "Contributions," you will fail silently when DEC's chart of accounts uses different naming (e.g., "Individual Contributions," "Unrestricted Gifts," "Donor Revenue"). The account names are set by whoever configured QB and are not standardized.

**Why it happens:**
QuickBooks Online does not have a "donation" account type — contributions are classified under Income accounts with user-defined names. There is no API field that flags an account as "donation-related." The P&L report's `revenueByCategory` (already parsed in `getProfitAndLoss`) has the right data, but the key names are whatever DEC's bookkeeper named them in QB. The `revenueByCategory` from the existing `parsePnlTotals`/`extractCategories` functions returns a flat map of `{ accountName: amount }` — useful, but requires knowing which account names represent donation income vs. grant income vs. program fees.

**How to avoid:**
1. Do not hardcode account name strings like "Donations". Instead, expose all Income sub-accounts from `revenueByCategory` in the admin panel and let admin designate which accounts are "donation-type" income.
2. Store that designation in `appSettings` (e.g., `donation_income_accounts: ["Individual Contributions", "GoFundMe Transfers"]` as a JSON array).
3. The donation chart then sums only accounts matching that list, not all income.
4. For the monthly trend chart specifically: the current QB sync only fetches YTD P&L — it does not store month-by-month breakdowns. A monthly donations chart requires either: (a) fetching 12 separate monthly P&L reports (expensive: 12 QB API calls per sync), or (b) using the QB CustomerSales or TransactionList reports filtered by account. Option (b) is more surgical.

**Warning signs:**
- `DonationPerformance` component always shows the "no donation data" empty state even when QB is connected and has data
- QB income categories in the dashboard don't include any line that looks like "donations"
- Chart shows $0 donation history for months where grant income clearly flowed

**Phase to address:**
Phase 3 (donation performance charts) — the account mapping admin UI must be built before the chart fetches data, or the chart will show wrong values with no error.

---

### Pitfall 4: Monthly Donation Trend Chart Requires Per-Month P&L Fetches That Inflate the QB Sync Cost

**What goes wrong:**
The DonationPerformance chart expects `monthlyTotals: Record<string, number>` — a dictionary of `"2025-01": 1200, "2025-02": 3400, ...` for the last 12 months. The existing QB sync fetches only YTD aggregate P&L. Getting per-month data requires 12 separate QB API calls (one per month), each counting against the QB API rate limit (500 requests/minute for production apps, lower for sandbox). Adding 12 calls to the existing sync of ~10 calls means the cron could approach timeout limits, and any one failing call would leave a gap in the chart.

**Why it happens:**
The QuickBooks Reporting API's `ProfitAndLoss` endpoint returns data for a single date range per call. There is no "group by month" parameter that returns monthly subtotals in one call. Developers assume the existing P&L data structure is sufficient and try to infer monthly breakdowns from it — which is impossible since the YTD P&L only contains totals.

**How to avoid:**
1. Use QB's `ProfitAndLossDetail` report (not the summary) with a narrow date range and `summarize_column_by=Month` parameter — this returns a single report with monthly columns. This is one API call instead of 12.
2. Cache this as a separate `reportType: "profit_loss_monthly"` entry in `quickbooksCache`.
3. Parse the column structure: QB monthly P&L has one column per month in `Header.ColData`, making parsing more complex than the existing single-column parser — factor this into the implementation time estimate.
4. Only fetch the last 12 months, not all-time history.

**Warning signs:**
- QB sync duration increases noticeably after adding donation chart support
- Convex action logs show repeated `fetchProfitAndLoss` calls with different date params
- QB API returns 429 (rate limit) during sync

**Phase to address:**
Phase 3 (donation performance charts) — design the QB fetch strategy before writing the parser.

---

### Pitfall 5: KB Extraction Stored Results Go Stale When Documents Are Added or Deleted

**What goes wrong:**
Admin uploads a new impact report to the KB on Tuesday. The KPI cards on the dashboard still show values from the Monday extraction run. Admin deletes an outdated document. The extraction includes data from that deleted document. The dashboard shows KPIs that no longer reflect the current KB state.

**Why it happens:**
The existing KB system (`knowledgeBase.ts`) stores document metadata in Convex and syncs files to the OpenAI vector store — but there is no mechanism to trigger re-extraction when the KB changes. If extraction results are cached in a separate table, that cache has no relationship to the `knowledgeBase` table mutations (inserts/deletes). The OpenAI vector store may still contain deleted files' embeddings until explicitly removed (the `removeFromOpenAI` action exists, but there is no downstream trigger to invalidate KPI cache).

**How to avoid:**
1. Store extracted KPIs with a `kbSnapshotIds` array: the list of `knowledgeBase._id` values that were present when extraction ran.
2. In the KPI display query, compare `kbSnapshotIds` against the current `knowledgeBase` table contents. If they differ, show a "Data may be outdated — regenerate?" badge on the KPI cards.
3. Alternatively, trigger a re-extraction action from `knowledgeBase.saveFile` and `knowledgeBase.deleteFile` mutations (via `ctx.scheduler.runAfter`). This is simpler but can cause extraction to run on every document upload, which is expensive.
4. Recommended: manual regeneration + stale-state badge. Keep it simple — the KB does not change hourly.

**Warning signs:**
- KPI cards show data from a document that admin knows was deleted
- After uploading a new document with updated metrics, KPI cards don't change
- No visible indication to admin that KPI data predates the latest document upload

**Phase to address:**
Phase 1 (KB KPI extraction) — define the staleness model before building the cache.

---

### Pitfall 6: Adding Three New Dashboard Sections Creates Layout Congestion and Loading State Race Conditions

**What goes wrong:**
The dashboard already has 9 sections (ExecutiveSnapshot, GrantBudget, GrantTracking, DonationPerformance, ProfitLoss, ClientActivity, ProgramsCoparent, ProgramsLegal, CalendarWidget). Adding a KBI Cards section and an AI Summary Panel brings this to 11. The reorderable dashboard becomes visually dense; the summary panel — which requires an async Convex action, not a simple reactive query — cannot use the existing three-state loading pattern cleanly. The AI summary may take 3–8 seconds to generate on first load. Without proper handling, the dashboard appears frozen or shows a confusing spinner with no progress indication.

**Why it happens:**
The existing dashboard loading pattern (`undefined` = loading, `null` = not-configured, `data` = ready) works because all existing sections use `useQuery` from Convex, which resolves quickly once data is cached. AI summary generation is an async action, not a query — it cannot be polled with `useQuery` alone. If the summary is stored in a Convex table (the right approach), the query returns the cached value immediately, but the UI must also handle "cached but being regenerated" as a fourth state.

**How to avoid:**
1. Store AI summary as a Convex table row with a `status` field: `"idle" | "generating" | "ready" | "failed"`. The `useQuery` for the summary reads the current row including its status. The UI shows the last known summary while `status === "generating"`, with a subtle progress indicator.
2. Prevent more than one generation from running simultaneously: check `status === "generating"` before triggering the action; if already generating, show a "Regenerating..." state, not a second trigger.
3. For new KBI Cards section: add it to the `DashboardSectionId` type and `SECTION_COMPONENTS` map following the existing pattern. Keep it hideable like other sections.
4. Consider placing the AI Summary Panel outside the reorderable section list — it is qualitatively different (AI-generated narrative vs. data visualization) and Kareem may prefer it pinned above the data sections.

**Warning signs:**
- Multiple "Regenerate" clicks trigger multiple parallel OpenAI requests (duplicate cost, race condition in persisted result)
- Dashboard shows spinner indefinitely when summary generation fails (no error state)
- Adding new dashboard section ID breaks TypeScript without updating `DashboardSectionId` union type

**Phase to address:**
Phase 2 (AI summary panel) and Phase 1 (KBI Cards) — design the state model before building the components.

---

### Pitfall 7: OpenAI Assistants File Search Is Not Suitable for Deterministic KPI Extraction

**What goes wrong:**
The existing KB system uses the OpenAI Assistants API with `file_search` for the AI Director chat feature. You reuse this pattern for KPI extraction: create a thread, ask "what is the total number of clients served?", and parse the response. The answer varies on every run even from the same documents. Sometimes it returns a number. Sometimes it returns a narrative. Sometimes it returns a refusal. You cannot reliably parse structured data from Assistants API responses.

**Why it happens:**
The Assistants API with `file_search` is optimized for conversational retrieval — it retrieves relevant chunks and generates a natural-language response. It is not a structured extraction pipeline. The model's response format is not constrained to JSON, the chunk retrieval is non-deterministic (depends on embedding similarity at query time), and the same question may retrieve different chunks on consecutive calls. Structured Outputs (`response_format: { type: "json_schema" }`) is not supported in the Assistants API runs — it is only available in Chat Completions.

**How to avoid:**
Use a separate extraction pipeline from the AI Director: fetch document content directly from Convex storage (already stored as `storageId`), pass the raw text to Chat Completions with `response_format: { type: "json_schema" }`, and extract KPIs deterministically. Keep the Assistants API exclusively for the conversational AI Director feature. Do not mix use cases.

**Warning signs:**
- KPI extraction returns different numbers on back-to-back runs with no document changes
- Extraction response is narrative text instead of parseable JSON
- Extraction succeeds for some documents but fails (refusal) for others with no clear pattern

**Phase to address:**
Phase 1 (KB KPI extraction) — the extraction mechanism must be chosen before implementation begins.

---

### Pitfall 8: DEC's QB Configuration May Be "Nonprofit" Type, Changing P&L Report Naming

**What goes wrong:**
The existing `parsePnlTotals` function looks for rows where `group.includes("income")` and `group.includes("expense")`. If DEC's QuickBooks company type is set to "Nonprofit," QB generates a "Statement of Activity" instead of a "Profit and Loss" report — and the row group labels change. The "Income" section may be labeled "Revenue" or "Support & Revenue," and "Net Income" may become "Change in Net Assets." The existing parser silently returns `totalRevenue: 0` because none of the string matches fire.

**Why it happens:**
QuickBooks Online's nonprofit mode uses nonprofit accounting terminology (Statement of Activity, Support & Revenue, Change in Net Assets) rather than the standard business terminology (P&L, Income, Net Income). The API endpoint is the same (`/reports/ProfitAndLoss`), but the JSON structure's group label strings change. The codebase was written and tested against a standard QB setup, not explicitly against a nonprofit-mode QB account. DEC is a nonprofit — it is plausible their QB is configured this way.

**How to avoid:**
1. Before shipping v1.2: inspect the actual QB P&L JSON structure by logging the raw response from `fetchProfitAndLoss` in the sandbox environment. Confirm the group label strings match what the parser expects.
2. Make the group label matching more permissive: in addition to `"income"`, also match `"revenue"`, `"support"`. For `"netincome"`, also match `"change in net assets"`, `"net assets"`.
3. Add a logged warning when `totalRevenue === 0` after parsing a non-empty P&L response — this indicates a parsing miss.

**Warning signs:**
- `ExecutiveSnapshot` shows `$0` Revenue YTD even when QB has income transactions
- `revenueByCategory` is empty but QB shows income in the P&L when viewed in the QB UI
- The raw QB JSON response contains group labels that don't include the word "income"

**Phase to address:**
Phase 3 (donation charts) — any attempt to extract income account data will hit this before donation-specific parsing even starts. Audit the parser against real QB data first.

---

## Technical Debt Patterns (v1.2 additions)

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing KB extraction results as a single JSON blob in `appSettings` | No schema change needed | No queryability, no per-document provenance, hard to diff | Never for production; use a proper `kbExtraction` table |
| Triggering AI summary generation on every KB document upload | Summary always fresh | Each upload triggers an expensive OpenAI call; cost compounds with frequent uploads | Never acceptable; use manual trigger + staleness badge |
| Hardcoding donation account names (e.g., "Donations") in the parser | Quick to ship | Breaks when QB chart of accounts changes; wrong data with no error | Never acceptable; use admin-configurable account designation |
| Using monthly P&L fetches (12 separate API calls) instead of `summarize_column_by=Month` | Reuses existing fetch logic | 12x QB API load per sync; harder to keep in sync | Acceptable for quick prototype only; replace before launch |

---

## Integration Gotchas (v1.2 additions)

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Chat Completions + Structured Outputs | Making extracted fields `required` in schema | Make all fields `optional`/nullable; include prompt instruction to return null for absent fields |
| OpenAI Assistants API | Using `file_search` threads for structured KPI extraction | Use Chat Completions with `response_format: json_schema`; keep Assistants API for conversational use only |
| QuickBooks P&L API | Assuming "income" row group labels match across all QB configurations | Test against real DEC QB data; handle nonprofit-mode label variants ("Revenue", "Support & Revenue") |
| QuickBooks P&L API | Trying to get monthly donation totals from a YTD P&L response | Use `summarize_column_by=Month` parameter on `ProfitAndLoss` endpoint for a single multi-column response |
| Convex action vs. query | Using a Convex action for AI summary and polling it with `useQuery` | Store summary in a Convex table with a `status` field; the query reads from the table reactively |

---

## Performance Traps (v1.2 additions)

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending all KB documents to OpenAI in one extraction call | Works for 3-4 small PDFs; times out for larger KB | Limit total context per call; extract per-document and aggregate results | At ~5+ documents or any document > 50 pages |
| Triggering AI summary on dashboard mount | 3–8 second delay on every page load; OpenAI cost scales with traffic | Cache summary in Convex; only trigger via explicit button or on KB change | From day one — latency is visible immediately |
| Fetching 12 monthly P&L reports sequentially in one Convex action | Sync takes 30–60 seconds; risks Convex action timeout | Use `summarize_column_by=Month` single-call approach | Immediately — sequential API calls are slow |
| Mounting all 11 dashboard sections simultaneously with AI sections | Cold load triggers AI summary generation query; if not cached, shows spinner for the entire dashboard | Separate AI sections into their own Convex queries; use three-state pattern independently | From first deploy |

---

## Security Mistakes (v1.2 additions)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing full client intake data from KB documents to OpenAI for extraction | PII (names, dates of birth, case details) sent to OpenAI API | KB documents used for extraction should be aggregate reports only, not individual intake forms; add a document type tag to `knowledgeBase` and filter |
| Storing extracted KPIs without RBAC | Staff sees impact metrics that may reveal financial benchmarks or program capacity | Gate KBI Cards and AI summary to admin/manager roles (same as QB data) |
| Exposing the `generateSummary` action as a public Convex action | Any user can trigger unlimited OpenAI calls, creating runaway cost | Gate `generateSummary` behind `requireRole(["admin", "manager"])` in the action handler |

---

## UX Pitfalls (v1.2 additions)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| KPI cards showing AI-extracted numbers with no source attribution | Kareem cannot tell if "112 clients served" is real or fabricated | Show document source name and extraction date under each KPI card value |
| "Regenerate Summary" button with no loading state or feedback | Kareem clicks it, nothing visible happens for 5 seconds, clicks again triggering duplicate requests | Disable button during generation; show "Generating..." with spinner; re-enable on completion or error |
| Donation chart showing flat $0 line with no explanation | Looks like a bug when it's actually an account mapping issue | Show "Configure donation accounts →" empty state with admin link when no accounts are designated |
| 11 dashboard sections overwhelming the page | Executive cannot find key information; scroll fatigue | Suggest a default section order that places AI sections (KBI Cards, AI Summary) between ExecutiveSnapshot and GrantBudget; make them easily hideable |

---

## "Looks Done But Isn't" Checklist (v1.2 additions)

- [ ] **KB KPI extraction:** Verify with a real DEC document that extracted values match what is actually written in the document — do not only test with synthetic test documents
- [ ] **KB KPI extraction:** Verify the UI shows provenance (document name + extraction date) alongside each KPI value
- [ ] **AI summary panel:** Verify the "Regenerate" button is disabled while generation is in progress and re-enables on completion or error
- [ ] **AI summary panel:** Verify the panel shows the last known summary while regenerating, not a blank/spinner screen
- [ ] **Donation chart:** Verify the chart handles the case where no donation accounts have been designated (shows helpful empty state, not a broken chart)
- [ ] **Donation chart:** Verify monthly totals actually reflect individual income account filtering, not all income
- [ ] **QB P&L parsing:** Confirm the parser handles DEC's actual QB account labels by logging one real P&L response before building the parser
- [ ] **Cost guard:** Confirm `generateSummary` action is role-gated and cannot be triggered by anonymous or staff-level users

---

## Recovery Strategies (v1.2 additions)

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Extracted KPIs are hallucinated values | MEDIUM | Add source provenance display immediately; switch to `optional` schema fields; add explicit "return null if absent" prompt instruction; re-run extraction |
| AI summary costs spike from auto-triggering | LOW–MEDIUM | Remove auto-trigger from cron or mount; make it manual-only; check OpenAI usage dashboard for extent of overage |
| Donation chart shows wrong income accounts | LOW | Add account designation admin UI to `appSettings`; re-fetch with correct account filter; no data loss, just a config addition |
| Monthly P&L fetch hitting QB rate limits | LOW | Switch from 12 sequential calls to `summarize_column_by=Month` single call; update parser accordingly |
| Generation race condition (duplicate summaries) | LOW | Add `status: "generating"` guard before triggering action; delete duplicate rows in Convex dashboard |

---

## Pitfall-to-Phase Mapping (v1.2)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hallucinated KPI extraction values | Phase 1 (KB KPI extraction) | Run extraction on 3 real DEC documents; manually verify every extracted value against source text |
| Assistants API used for structured extraction | Phase 1 (KB KPI extraction) | Confirm implementation uses Chat Completions + json_schema, not Assistants threads |
| Stale extraction when KB changes | Phase 1 (KB KPI extraction) | Upload a new document; verify KPI stale indicator appears; regenerate; verify values update |
| AI summary cost runaway | Phase 2 (AI summary panel) | Confirm generation is triggered only by explicit button or KB-change event; confirm role gate |
| Generation race condition | Phase 2 (AI summary panel) | Click "Regenerate" 5 times rapidly; confirm only one OpenAI call fires |
| QB no donation entity / wrong account names | Phase 3 (donation charts) | Log real QB P&L JSON; confirm income account names; build admin account designation before chart |
| Monthly breakdown requires separate fetch strategy | Phase 3 (donation charts) | Confirm `summarize_column_by=Month` approach used; verify monthly totals sum to YTD total from existing P&L |
| QB nonprofit-mode label mismatch | Phase 3 (donation charts) | Test parser against real DEC QB response; confirm `totalRevenue > 0` when income exists |
| Dashboard layout congestion | Phase 1 or Phase 2 (whichever adds first new section) | Verify new section IDs added to `DashboardSectionId` type; verify section is hideable; test default section ordering on fresh user prefs |
| PII in extraction payload | Phase 1 (KB KPI extraction) | Confirm only aggregate reports (not intake forms) are used as extraction sources; add document type tagging to KB admin |

---

# v1.0–v1.1 Pitfalls (Preserved)

---

## Critical Pitfalls

### Pitfall 1: Google Calendar Service Account Cannot Access Calendars Without Explicit Sharing

**What goes wrong:**
The service account email is created and the API is enabled, but every calendar list or events API call returns an empty result or a 404. The service account authenticates successfully — it just has no calendars shared with it.

**Why it happens:**
Service accounts are not Google Workspace users. They do not automatically have access to any user's or organization's calendars. Google Calendar's ACL (access control list) model requires explicit sharing. Unlike a personal user who logs in via OAuth and can see their own calendars, a service account's "calendar list" is empty unless calendars have been shared to its email address (`something@project.iam.gserviceaccount.com`). Developers assume authentication = access and skip the sharing step.

**How to avoid:**
For each Google Calendar to integrate (client sessions, board meetings, community events), open Google Calendar settings → "Share with specific people" → add the service account email with "See all event details" permission. Then in code, enumerate the `calendarId` values directly — do not rely on `calendarList.list()` returning them automatically, because sharing a calendar no longer automatically inserts it into the service account's calendar list (confirmed by Google Calendar API docs). Store the calendar IDs explicitly in Convex `appSettings` so they can be configured without code changes.

**Warning signs:**
- `calendar.events.list()` returns 200 but with zero events even when calendars visibly have events
- `calendarList.list()` returns an empty `items` array
- No error thrown — just empty data

**Phase to address:**
Google Calendar integration phase. Must be verified before any event rendering code is written.

---

### Pitfall 2: Dashboard "undefined" vs "null" Conflation Breaks Empty States

**What goes wrong:**
Dashboard KPI cards and charts appear blank with no explanation — not loading spinners, not empty state messages — because components treat `undefined` (still loading) and `null` (QB not connected / no data) identically, or handle neither and render broken values like `"--"` or `NaN`.

**Why it happens:**
Convex `useQuery` returns `undefined` while the query is in-flight and the actual query result (including `null`) once resolved. Components that don't explicitly branch on `undefined` vs `null` skip the loading spinner and jump straight to a broken render. In this codebase, `ExecutiveSnapshot` correctly checks `=== undefined` for loading, but components like `ProfitLoss` receive `null` from `getProfitAndLoss` when QB is not connected and must handle that separately. The real issue is that `quickbooksCache` can be empty (QB never synced) vs. the QB connection existing but the cache being stale — these produce the same `null` return but have different root causes and should show different messages.

**How to avoid:**
For every dashboard component, implement the three-state pattern explicitly:
1. `data === undefined` → show spinner (Convex loading)
2. `data === null` → show integration "not connected" empty state with action button
3. `data.someField` being falsy → show data-specific empty state

The existing `ProfitLoss.tsx` does this correctly — use it as the template for any new dashboard sections. Never let a component silently render `$0` or `--` when the real state is "data not yet available."

**Warning signs:**
- KPI cards show `$0` or `--` when QB is connected and has data
- Charts render empty canvases rather than loading spinners
- Console warnings about rendering `NaN` or `undefined` values

**Phase to address:**
Dashboard data population fix phase.

---

### Pitfall 3: QuickBooks OAuth Refresh Token Rotation — Storing the Old Token

**What goes wrong:**
QB cron syncs work for ~100 days then permanently fail with `invalid_grant`. All QB-dependent dashboard data stops populating. The Convex logs show repeated token refresh failures, but the dashboard just shows stale data silently.

**Why it happens:**
QuickBooks OAuth 2.0 uses rotating refresh tokens: every successful refresh returns a new refresh token that invalidates the old one. The current `quickbooks.ts` `saveTokens` mutation stores the new token on initial OAuth connect, but the `quickbooksActions.ts` refresh logic must also persist the new refresh token returned on every sync. If the refresh succeeds but the new token is not written back to `quickbooksConfig`, the next sync attempts to use the already-rotated (now invalid) old token. Intuit's 2025 policy update introduced explicit expiry timestamps on refresh tokens, making this failure faster to hit.

**How to avoid:**
In `quickbooksActions.ts`, whenever a token refresh is performed, immediately call a mutation to update both `accessToken` and `refreshToken` in the `quickbooksConfig` table with the new values returned by the Intuit token endpoint. Treat refresh token updates as atomic — if the write fails, treat the sync as failed, do not proceed with stale tokens. Add a `tokenRefreshedAt` field to the config table to surface token age in the admin UI.

**Warning signs:**
- QB sync cron logs show 401 or `invalid_grant` errors
- Dashboard data freezes at a specific date (last successful sync before token invalidation)
- `quickbooksConfig.tokenExpiry` is in the past

**Phase to address:**
Dashboard data population fix phase (audit existing token refresh logic before adding new features).

---

### Pitfall 4: Convex Cron Failures Are Silent — Dashboard Data Goes Stale Without Alerting Anyone

**What goes wrong:**
The QB sync cron (15 min) or Sheets sync cron (30 min) fails silently — throws an error that's logged to Convex's internal logs but not surfaced anywhere in the dashboard. The Executive Director sees data that is hours or days old with no indication anything is wrong.

**Why it happens:**
The current `crons.ts` wraps sync actions in try-catch at the action level but has no alerting mechanism. Convex does log cron failures to the dashboard logs view, but that requires someone to actively check the Convex dashboard. There is no `lastSyncAt` surface in the UI for the QB integration (only for Sheets config), and no distinction between "syncing now" and "last synced 6 hours ago."

**How to avoid:**
Add `lastSyncSucceededAt` and `lastSyncError` fields to `quickbooksConfig`. Update them on every cron run (success or failure). Surface this in the dashboard admin panel and as an alert condition: if `lastSyncSucceededAt` is more than 2x the cron interval ago, show a warning banner in the relevant dashboard sections. This also enables the "proactive alerts" feature to detect stale data as an alert condition.

**Warning signs:**
- `fetchedAt` on cached QB data is hours old even though the cron runs every 15 min
- Convex logs show repeated action failures with no auto-recovery

**Phase to address:**
Dashboard data population fix + proactive alerts phase.

---

### Pitfall 5: Newsletter HTML Exceeds Constant Contact's 400 KB Limit on Complex Newsletters

**What goes wrong:**
A newsletter with all sections filled in (welcome message, milestones, testimonials, community events, partnerships, stats, volunteer box, social section) fails to send via Constant Contact's API. The error is generic ("campaign activity could not be saved") and does not mention the file size constraint.

**Why it happens:**
The `buildNewsletterHtml` in `newsletterTemplate.ts` generates a fully inline-styled table-based HTML email. With all 19 sections populated, the generated HTML plus the OpenAI-polished version can approach or exceed the 400 KB limit enforced by Constant Contact's custom code email endpoint. Additionally, the `generatedEmailHtml` column stores the full HTML string in Convex — very large newsletters can hit Convex's per-document size limits (1 MB per document maximum, but practically slower queries at >100 KB).

**How to avoid:**
Add a byte-length check before saving generated HTML to Convex and before sending to CC. If size exceeds 380 KB (a safe margin below the 400 KB limit), warn the user to shorten sections. Remove HTML comments from the generated output (the template has numerous `<!-- Section Name -->` comments that add size without value in production). Confirm the `[[trackingImage]]` tag is included in the generated HTML for accurate open rate tracking (currently missing from the template).

**Warning signs:**
- Large newsletters fail to save as CC campaign activities
- Constant Contact API returns 400 or 500 on campaign activity creation with full-content newsletters
- `generatedEmailHtml` stored in Convex is visibly very large (inspect in Convex dashboard)

**Phase to address:**
Newsletter template fix phase.

---

### Pitfall 6: Google Calendar Timezone Handling — Events Display at Wrong Times

**What goes wrong:**
Calendar events fetched from the Google Calendar API display in the wrong timezone on the dashboard. A 9 AM board meeting in the organization's local timezone (Pacific/Eastern) shows as 4 PM or 2 PM depending on UTC offset.

**Why it happens:**
Google Calendar API returns event `start.dateTime` as an ISO 8601 string with the event's original timezone offset (e.g., `2026-03-15T09:00:00-08:00`). When this is parsed with `new Date()` in JavaScript and displayed with `.toLocaleTimeString()` without a locale/timezone argument, it renders in the user's browser timezone — which may match, or may not. The deeper issue is that the Convex action fetching events converts the datetime to a Unix timestamp for storage, discarding timezone metadata. When the frontend renders the timestamp, there's no stored timezone to reference.

**How to avoid:**
Store event times as ISO 8601 strings with their original timezone offset rather than converting to Unix timestamps. Alternatively, store both the Unix timestamp and the `timeZone` field from the calendar event's `start` object. In the frontend, render event times using `toLocaleString('en-US', { timeZone: org_timezone })` where `org_timezone` is a stored org preference (e.g., `"America/Los_Angeles"`). Add an org timezone setting to `appSettings` during the calendar integration phase.

**Warning signs:**
- Displayed event times are off by exactly N hours (UTC offset)
- All-day events show as starting the day before (date boundary issue when converting to timestamps)

**Phase to address:**
Google Calendar integration phase — must handle timezone in the data model from the start; retrofitting is painful.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing QB raw JSON blobs in `quickbooksCache.data` as strings | Avoids schema changes per QB report format | No type safety; JSON.parse errors crash silently; querying data requires parsing in every query function | Acceptable for v1 caching layer; never for primary data |
| Using `grantsCache` (Sheets) and `grants` (Excel) as parallel tables without sync logic | Simpler implementation | Dashboard can show contradictory data from two sources; no single source of truth | Acceptable until a real sync strategy is designed |
| Hardcoded calendar IDs in code (if implemented this way) | Faster to ship | Cannot change calendars without a deployment; breaks when org restructures calendars | Never acceptable; use `appSettings` table instead |
| Alert thresholds hardcoded in queries | Simpler MVP | Cannot tune alerts without deployment; admin cannot configure sensitivity | Acceptable in phase 1; move to `appSettings` by phase 2 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Calendar API | Using `calendarList.list()` expecting to see shared calendars | Explicitly share each calendar to the service account email; store calendar IDs in `appSettings`; call `events.list()` with stored `calendarId` values |
| Google Calendar API | Fetching `maxResults` default (250) without pagination for active orgs | Always pass `maxResults` explicitly (250 is fine for this org scale); implement `pageToken` loop for completeness |
| Constant Contact newsletter | Missing `[[trackingImage]]` tag in generated HTML | Add `[[trackingImage]]` to the `<body>` of `buildNewsletterHtml` before the closing tag; CC needs this for open tracking |
| Constant Contact newsletter | Re-using a campaign activity ID without checking its current state | Before reusing `campaignActivityId`, check if the campaign was already sent — sent campaigns cannot be resent, only duplicated |
| QuickBooks token refresh | Not persisting the new refresh token returned by Intuit after each refresh | After every `refreshToken()` call, immediately run `ctx.runMutation` to write the new tokens back to `quickbooksConfig` |
| Google Sheets sync | Hardcoded column index offsets (e.g., `row[8]` for session count) | Document which sheet column maps to which field; if the sheet structure changes, all sync breaks silently |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all calendar events on every dashboard load | Dashboard slow to load; Convex action budget consumed quickly | Cache events in a Convex table with TTL (e.g., 30 min cron like Sheets); never fetch from Google directly on page load | Immediately — the Google Calendar API adds 200-800ms latency per call |
| Rendering all grant events in a single calendar widget with no date filtering | Calendar widget shows hundreds of events; UI hangs | Limit to upcoming 30-60 days by default; paginate | At ~50+ active grants with quarterly report deadlines |
| Dashboard renders all 7 sections simultaneously on load | Initial load triggers 7 parallel Convex query subscriptions | Already handled by section visibility; ensure hidden sections do not mount their components | Currently fine; becomes an issue if sections are always mounted regardless of visibility |
| QB P&L parser iterating nested row structure with any[] types | Type errors surface in production but not development | Add explicit type definitions for the QB report shape; use Zod for parse validation | At the first QB report format change |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Google service account private key in `appSettings` table (Convex DB) | Private key readable by any user who can query `appSettings`; DB breach exposes key | Keep the private key in Convex environment variables (`GOOGLE_PRIVATE_KEY`) — this is already the correct pattern in the codebase; never move it to the DB |
| Exposing calendar event attendee email addresses on the dashboard | Exposes client PII to any authenticated user regardless of role | Filter attendee data server-side in the Convex query; return only event summary, date/time, and calendar type — not attendee lists |
| Alert notifications revealing sensitive financial thresholds to all roles | Staff/readonly users seeing budget anomaly alerts that reveal QB data they shouldn't access | Gate alert data on the same RBAC rules as the underlying data; alerts about QB data visible only to admin/manager |
| Using `calendarId: "primary"` with domain-wide delegation | With domain-wide delegation enabled, this accesses the service account's own "primary" calendar (empty) — not the intended calendar | Always use explicit calendar IDs from the sharing approach; do not use domain-wide delegation unless Google Workspace admin access is available |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing an alert for every grant with a report due in the next 90 days | Executive sees 15 alerts every day; alert fatigue sets in immediately | Tier alerts: "Due within 7 days" = red urgent; "Due within 30 days" = yellow warning; "Due 31-90 days" = informational or hidden by default |
| Calendar widget showing raw Google Calendar event titles (internal naming conventions) | Executive sees "CONF-2026-Q1-Legal-Review" instead of "Legal Case Review" | Normalize event display names; allow renaming at the calendar category level |
| Newsletter preview showing the raw AI-polished HTML with placeholder artifacts | Executive sees `[RECENT_MILESTONE_2]` strings in the preview | Validate that all placeholder patterns are removed before saving `generatedEmailHtml`; the current OpenAI prompt does this but needs a post-process regex check as a safety net |
| Dashboard data showing "Last synced: 3 hours ago" with no action to refresh | Executive cannot tell if data is stale due to a bug or expected timing | Add a manual "Sync Now" button next to the last-synced timestamp; already exists for Sheets but not consistently for QB-dependent sections |

---

## "Looks Done But Isn't" Checklist

- [ ] **Google Calendar integration:** Verify events actually appear — calendars must be explicitly shared with the service account email before any code works; test with a real calendar, not a mocked response
- [ ] **Dashboard KPI cards:** Verify cards show real values, not `"--"`, after QB sync — check that `quickbooksCache` actually has data by inspecting the Convex dashboard data tab
- [ ] **Newsletter template:** Verify `[[trackingImage]]` is present in generated HTML (required by Constant Contact for open tracking); confirm the 400 KB limit is not exceeded with a fully-populated newsletter
- [ ] **Proactive alerts:** Verify alerts do not fire for already-resolved conditions on every page load — alerts need a "dismissed" or "acknowledged" state to avoid repeating
- [ ] **Calendar timezone display:** Verify a test event at 9 AM Pacific shows as 9 AM (not 5 PM UTC) for a user in Pacific timezone
- [ ] **Constant Contact campaign reuse:** Verify that calling send newsletter a second time creates a new send activity rather than trying to resend an already-sent campaign

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| QB refresh token rotated but not stored (all QB data stale) | MEDIUM | Delete `quickbooksConfig` record in Convex dashboard → have admin re-authorize QB OAuth → wait for next 15-min cron |
| Calendar service account not shared with calendars (zero events) | LOW | Share each Google Calendar with service account email → next cron sync will populate events |
| Newsletter HTML too large sent to CC (fails silently) | LOW | Edit newsletter sections to reduce content → regenerate HTML → retry send |
| Alert fatigue causing executive to ignore dashboard | HIGH | Requires full alert redesign: tiered severity, dismiss/acknowledge UI, configurable thresholds — prevent this at design phase |
| Dashboard sections showing wrong data due to `null`/`undefined` confusion | MEDIUM | Component-by-component audit against the three-state pattern (undefined/null/data); test with QB disconnected, then connected with empty cache, then connected with data |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Calendar service account not shared with calendars | Google Calendar integration | Manually create a test event in the shared calendar; verify it appears in the Convex-cached events list |
| Dashboard undefined/null state confusion | Dashboard data population fix | Test all 7 dashboard sections with QB disconnected, with QB connected but no cache, with QB connected and synced |
| QB refresh token not persisted after rotation | Dashboard data population fix | Inspect `quickbooksActions.ts` token refresh logic; confirm new tokens are written back; check `tokenExpiry` advances after a sync |
| Silent cron failures with stale data | Dashboard data population fix + proactive alerts | Add `lastSyncSucceededAt` tracking; verify the admin page surfaces sync health |
| Newsletter 400 KB limit exceeded | Newsletter template fix | Test full newsletter generation with all 19 fields populated; measure `generatedEmailHtml.length` before sending |
| Timezone display errors in calendar | Google Calendar integration | Test with a calendar event explicitly at 9:00 AM in local org timezone; verify display matches |
| Alert fatigue from ungated notifications | Proactive alerts phase | Design alert severity tiers before building any alert UI; require ED sign-off on threshold values |

---

## Sources

**v2.0 Data Foundation sources:**
- Convex intro to migrations: [https://stack.convex.dev/intro-to-migrations](https://stack.convex.dev/intro-to-migrations)
- Convex stateful online migrations: [https://stack.convex.dev/migrating-data-with-mutations](https://stack.convex.dev/migrating-data-with-mutations)
- Convex lightweight zero-downtime migrations: [https://stack.convex.dev/lightweight-zero-downtime-migrations](https://stack.convex.dev/lightweight-zero-downtime-migrations)
- Convex schema documentation: [https://docs.convex.dev/database/schemas](https://docs.convex.dev/database/schemas)
- Convex migrations component: [https://www.convex.dev/components/migrations](https://www.convex.dev/components/migrations)
- Convex table deletion: [https://docs.convex.dev/dashboard/deployments/data](https://docs.convex.dev/dashboard/deployments/data)
- Google OAuth token limits: [https://developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)

**v1.2 Intelligence sources:**
- OpenAI Structured Outputs hallucination behavior: [https://platform.openai.com/docs/guides/structured-outputs](https://platform.openai.com/docs/guides/structured-outputs)
- QuickBooks API limitations: [https://satvasolutions.com/blog/top-5-quickbooks-api-limitations-to-know-before-developing-qbo-app](https://satvasolutions.com/blog/top-5-quickbooks-api-limitations-to-know-before-developing-qbo-app)
- Convex action cache and invalidation strategy: [https://stack.convex.dev/caching-in](https://stack.convex.dev/caching-in)

**v1.0–v1.1 sources:**
- Google Calendar API sharing concepts: [https://developers.google.com/workspace/calendar/api/concepts/sharing](https://developers.google.com/workspace/calendar/api/concepts/sharing)
- QuickBooks refresh token rotation: [https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant](https://nango.dev/blog/quickbooks-oauth-refresh-token-invalid-grant)
- Convex `useQuery` undefined vs null patterns: [https://docs.convex.dev/client/react](https://docs.convex.dev/client/react)
- Convex cron job error handling: [https://docs.convex.dev/scheduling/cron-jobs](https://docs.convex.dev/scheduling/cron-jobs)

---
*Pitfalls research for: DEC DASH 2.0 — v2.0 Data Foundation milestone*
*Updated: 2026-03-01*
