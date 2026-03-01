# Architecture Research

**Domain:** Nonprofit CRM — Client/Enrollment/Session data model refactor with Google OAuth unification and analytics rewrite
**Researched:** 2026-03-01
**Confidence:** HIGH (based on direct codebase inspection of all relevant files; no external library uncertainty)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Frontend (Next.js 15 App Router)                    │
├──────────────────┬──────────────────┬───────────────────────────────┤
│  /clients page   │  /analytics page │  Dashboard KPI cards          │
│  (unified list,  │  DemographicsTab │  (active clients, sessions,   │
│  all programs,   │  ClientActivityTab│  intake trend)               │
│  no role-tab     │  OperationsTab   │                               │
│  split in UI)    │                  │                               │
└────────┬─────────┴────────┬─────────┴──────────────┬───────────────┘
         │                  │                          │
         │ useQuery          │ useQuery                │ useQuery
         ▼                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Convex Backend                                │
├──────────────────┬──────────────────┬───────────────────────────────┤
│  clients.ts      │  enrollments.ts  │  analytics.ts                 │
│  (MODIFIED:      │  (NEW: clientId  │  (MODIFIED: getAllDemographics │
│  remove programId│  + programId +   │   reads clients table;        │
│  filter; role    │  status + dates) │   getActiveClientCount reads  │
│  filter via      │                  │   enrollments; getSessionTrends│
│  enrollments)    │                  │   uses by_sessionDate index)  │
├──────────────────┼──────────────────┼───────────────────────────────┤
│  sessions.ts     │  programs.ts     │  googleSheetsSync.ts          │
│  (MODIFIED:      │  (unchanged)     │  (MODIFIED: remove program    │
│  add enrollmentId│                  │   sync; keep grant sync only) │
│  + by_sessionDate│                  │                               │
│  index)          │                  │                               │
└──────────────────┴──────────────────┴───────────────────────────────┘
         │                  │                          │
         ▼                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Convex Schema Tables                             │
├──────────────────────────────────────────────────────────────────────┤
│  clients         │  enrollments (NEW)│  sessions (MODIFIED)         │
│  (MODIFIED:      │  clientId         │  enrollmentId added (opt)    │
│  drop programId  │  programId        │  attendanceStatus added      │
│  enrollmentDate  │  status           │  by_sessionDate index added  │
│  status;         │  enrollmentDate   │  by_enrollmentId index added │
│  add gender,     │  exitDate         │  by_programId index added    │
│  referralSource, │  completionStatus │                              │
│  dateOfBirth,    │  notes            │                              │
│  phone, email)   │  createdAt        │                              │
├──────────────────┴───────────────────┴──────────────────────────────┤
│  programDataCache — REMOVED after migration and analytics rewrite    │
│  googleSheetsConfig — KEPT for grantsCache; program_* purpose       │
│    records removed but table stays (grant Sheets still configured)  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `clients` table | Permanent client identity (name, demographics) | MODIFIED: drop `programId`, `enrollmentDate`, `status`; add `gender`, `referralSource` |
| `enrollments` table | Program participation episodes | NEW |
| `sessions` table | Individual visit records | MODIFIED: add `enrollmentId`, `attendanceStatus`, new indexes |
| `programDataCache` table | Sheets-sourced demographics cache | REMOVED after analytics rewrite |
| `googleSheetsConfig` table | Sheets spreadsheet config | KEPT (grant Sheets only) |
| `analytics.ts` | Aggregate analytics queries | MODIFIED: `getAllDemographics` reads clients/enrollments directly |
| `clients.ts` | Client CRUD and list queries | MODIFIED: role filter via enrollments, not programId |
| `enrollments.ts` | Enrollment CRUD | NEW FILE |
| `sessions.ts` | Session CRUD | NEW FILE (formalize from ad-hoc patterns) |
| `googleSheetsActions.ts` | Sheets sync | MODIFIED: remove `syncProgramData` action |
| `googleSheetsSync.ts` | Cron sync orchestrator | MODIFIED: remove program sync calls |
| `googleCalendarActions.ts` | Calendar sync via service account | UNCHANGED |

---

## New Schema Design

### Table: `enrollments` (NEW)

```typescript
enrollments: defineTable({
  clientId: v.id("clients"),
  programId: v.id("programs"),
  status: v.union(
    v.literal("active"),
    v.literal("completed"),
    v.literal("withdrawn")
  ),
  enrollmentDate: v.optional(v.number()),   // epoch ms
  exitDate: v.optional(v.number()),          // epoch ms, null while active
  completionStatus: v.optional(v.string()),  // "graduated", "transferred", etc.
  notes: v.optional(v.string()),
  createdAt: v.number(),
  createdBy: v.optional(v.id("users")),
})
  .index("by_clientId", ["clientId"])
  .index("by_programId", ["programId"])
  .index("by_status", ["status"])
```

**Rationale:** Separates program participation from client identity. A client can enroll in multiple programs over time. The `status` on the enrollment — not on the client — determines whether a client is currently active in a program. A client record is permanent; enrollments track the history.

### Table: `clients` (MODIFIED)

```typescript
// BEFORE (current)
clients: defineTable({
  firstName, lastName,
  programId: v.optional(v.id("programs")),   // REMOVE — moves to enrollments
  enrollmentDate: v.optional(v.number()),     // REMOVE — moves to enrollments
  status: v.union(...),                       // REMOVE — moves to enrollments
  zipCode, ageGroup, ethnicity, notes, createdAt,
})

// AFTER
clients: defineTable({
  firstName: v.string(),
  lastName: v.string(),
  // Demographics stay on clients — they describe the person, not the program episode
  zipCode: v.optional(v.string()),
  ageGroup: v.optional(v.string()),
  ethnicity: v.optional(v.string()),
  gender: v.optional(v.string()),            // ADD — was missing; only in programDataCache
  referralSource: v.optional(v.string()),    // ADD — was only in intake forms and cache
  dateOfBirth: v.optional(v.string()),       // ADD — was only in intake forms
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_lastName", ["lastName"])        // ADD — useful for name search
```

**Fields removed from `clients`:** `programId`, `enrollmentDate`, `status` — move to `enrollments`.

**Fields added to `clients`:** `gender`, `referralSource`, `dateOfBirth`, `phone`, `email` — currently only in `programDataCache` or intake forms; needed for analytics queries after Sheets removal.

### Table: `sessions` (MODIFIED)

```typescript
// BEFORE (current)
sessions: defineTable({
  clientId: v.id("clients"),
  programId: v.optional(v.id("programs")),
  sessionDate: v.number(),
  sessionType: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
}).index("by_clientId", ["clientId"])

// AFTER
sessions: defineTable({
  clientId: v.id("clients"),
  enrollmentId: v.optional(v.id("enrollments")),  // ADD — links session to program episode
  programId: v.optional(v.id("programs")),         // KEEP — denormalized for fast reporting
  sessionDate: v.number(),
  attendanceStatus: v.optional(v.union(            // ADD — present/absent/cancelled
    v.literal("present"),
    v.literal("absent"),
    v.literal("cancelled")
  )),
  sessionType: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
}).index("by_clientId", ["clientId"])
  .index("by_enrollmentId", ["enrollmentId"])   // ADD
  .index("by_sessionDate", ["sessionDate"])     // ADD — fixes full-table scan in analytics
  .index("by_programId", ["programId"])         // ADD — program-level session queries
```

**Why keep `programId` on sessions:** Allows fast program-level session count queries without joining through enrollments. Denormalized but pragmatic for reporting.

**Why add `by_sessionDate` index:** `getSessionVolume` and `getSessionTrends` currently do full table scans (confirmed in `analytics.ts`). The index enables `q.gte("sessionDate", thirtyDaysAgo)` range queries without loading all sessions.

---

## Recommended Project Structure

```
convex/
├── schema.ts                   # MODIFIED — add enrollments, modify clients/sessions
├── clients.ts                  # MODIFIED — remove programId queries, role filter via enrollments
├── enrollments.ts              # NEW — CRUD for enrollment records
├── sessions.ts                 # NEW — formalize session CRUD with attendanceStatus
├── analytics.ts                # MODIFIED — getAllDemographics reads clients table directly
├── googleSheetsActions.ts      # MODIFIED — remove syncProgramData
├── googleSheetsSync.ts         # MODIFIED — remove program sync calls
├── googleSheetsInternal.ts     # MODIFIED — remove upsertProgramParticipant
├── crons.ts                    # UNCHANGED — sheets-sync cron stays for grant sync

scripts/
├── migrateV2.ts               # NEW — one-time: backfill enrollments from existing clients
├── importFromSpreadsheet.ts   # NEW — import cleaned spreadsheet → new data model

src/
├── app/(dashboard)/clients/page.tsx          # MODIFIED — unified list, no role-tab split
├── app/(dashboard)/admin/page.tsx            # MODIFIED — remove program Sheets config section
├── components/analytics/DemographicsTab.tsx  # MODIFIED — remove sheetsConfig gate
├── hooks/useAnalytics.ts                     # MINOR — hook signatures unchanged
```

---

## Architectural Patterns

### Pattern 1: Enrollment-Centric Status

**What:** Client status ("active", "completed", "withdrawn") lives on the `enrollments` table, not `clients`. A client record is permanent. To determine if a client is currently active, check whether any enrollment has `status: "active"`.

**When to use:** Any time the UI needs to filter by active/inactive or count active participants. Always read enrollment status, never a status field on the client.

**Trade-offs:** One more join in list queries, but correct semantics. A client who completed Legal and later enrolled in Co-Parent doesn't lose their Legal program history. Analytics "active client count" reflects actual enrollment state.

**Example:**
```typescript
// Get active client count — join through enrollments
export const getActiveClientCount = query({
  args: {},
  handler: async (ctx) => {
    const activeEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    // Distinct client IDs with at least one active enrollment
    const activeClientIds = new Set(activeEnrollments.map((e) => e.clientId));
    return { count: activeClientIds.size };
  },
});
```

### Pattern 2: Demographics on Client Record

**What:** All demographic fields (`gender`, `ethnicity`, `ageGroup`, `zipCode`, `referralSource`) live on the `clients` table — not on `enrollments` or `programDataCache`. Demographics describe the person, not the program episode.

**When to use:** `getAllDemographics` in `analytics.ts` queries the `clients` table directly. No Sheets sync, no cache join needed for demographic breakdowns.

**Trade-offs:** Requires migration to populate `gender` and `referralSource` on existing client records (currently only in intake forms or programDataCache). One-time migration cost, permanently simpler queries afterward.

**Example:**
```typescript
// getAllDemographics — reads clients table directly, no Sheets dependency
export const getAllDemographics = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const total = clients.length;
    const ethnicityDistribution = toSortedDistribution(clients, (c) => c.ethnicity);
    const genderDistribution = toSortedDistribution(clients, (c) => c.gender);
    const ageDistribution = toSortedDistribution(clients, (c) => c.ageGroup);
    const referralSource = toSortedDistribution(clients, (c) => c.referralSource).slice(0, 10);
    return { total, ethnicityDistribution, genderDistribution, ageDistribution, referralSource };
  },
});
```

### Pattern 3: Role-Based Filtering via Enrollments

**What:** The existing role filtering (lawyers see legal clients only, psychologists see co-parent clients only) moves from a `programId` index query to an enrollments-based join in `clients.listWithPrograms`.

**When to use:** `clients.listWithPrograms` powers the `/clients` page. The unified list shows all programs together but still role-filters by enrollment program type.

**Trade-offs:** Slightly more join logic than the old `by_programId` direct index query. Worth it for correctness — a client enrolled in both programs appears for both roles.

**Example:**
```typescript
// In clients.listWithPrograms — role filtering via enrollments
if (user.role === "lawyer") {
  const legalProgramIds = new Set(
    programs.filter((p) => p.type === "legal").map((p) => p._id)
  );
  const legalEnrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_programId")
    .collect();
  const filtered = legalEnrollments.filter((e) => legalProgramIds.has(e.programId));
  const allowedClientIds = new Set(filtered.map((e) => e.clientId));
  clients = clients.filter((c) => allowedClientIds.has(c._id));
}
```

### Pattern 4: Google OAuth — Service Account Already Unified

**What:** Both Google Sheets (grants) and Google Calendar use the same service account credentials: `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` environment variables. There is no user OAuth token for Google — both integrations use a service account with read-only access to explicitly-shared resources.

**Current state:** Both `googleCalendarActions.ts` and `googleSheetsActions.ts` already read the same env vars directly. This is already unified at the env var level. No `googleOAuthToken` table, no callback routes, no user authorization flow exists.

**What "Unify Google OAuth" actually means in v2.0:** Remove the `googleSheetsConfig` records with `purpose: "program_legal"` and `purpose: "program_coparent"` (since those Sheets are no longer synced). Remove the admin UI sections that configure program Sheets. Grant Sheets config and Calendar config remain unchanged.

**What does NOT need to change:** The env vars, the `googleCalendarConfig` table, the `googleSheetsConfig` table (kept for grant Sheets), or either actions file's credential loading pattern.

### Pattern 5: Batched Migration via CLI Script

**What:** One-time data migration runs as a Node.js script using `ConvexHttpClient`, not as a single Convex mutation. Operations batch in groups of 50 across separate mutation calls.

**Why:** Convex mutations have a write limit per transaction (~8,000 writes). A single migration mutation touching hundreds of clients, creating enrollments, and patching demographics will hit this limit and fail partway through.

**Example pattern (from `scripts/seedClients.ts`):**
```typescript
// scripts/migrateV2.ts — batch enrollment creation
const BATCH_SIZE = 50;
for (let i = 0; i < clientsWithProgram.length; i += BATCH_SIZE) {
  const batch = clientsWithProgram.slice(i, i + BATCH_SIZE);
  const result = await client.mutation(api.enrollments.importBatch, {
    enrollments: batch.map((c) => ({
      clientId: c._id,
      programId: c.programId!,
      status: c.status,
      enrollmentDate: c.enrollmentDate,
    })),
  });
  console.log(`Batch ${i/BATCH_SIZE + 1}: ${result.created} created`);
}
```

---

## Data Flow

### Current Flow (v1.3 — what exists now)

```
Google Sheets (program data)
    ↓ (30-min cron: googleSheetsSync.runSync → syncProgramData)
programDataCache table
    ↓ (analytics.getAllDemographics)
DemographicsTab.tsx — gated: sheetsConfig === null → "Connect Google Sheets"

clients table (programId field)
    ↓ (clients.listWithPrograms — programId → programs join)
/clients page — role filtered by programId
```

### New Flow (v2.0 — after migration)

```
Cleaned spreadsheet (one-time import)
    ↓ (scripts/importFromSpreadsheet.ts or scripts/migrateV2.ts)
clients table (gender, referralSource, dateOfBirth populated)
+ enrollments table (clientId, programId, status, enrollmentDate)
+ sessions table (clientId, enrollmentId, sessionDate, attendanceStatus)

clients table (demographics fields)
    ↓ (analytics.getAllDemographics — no Sheets config check)
DemographicsTab.tsx — always shows data, "No client data yet" empty state only

enrollments table
    ↓ (clients.listWithPrograms — role filter via enrollment.programId)
/clients page — unified list, no program-tab split, role filtered via enrollments
```

### Google OAuth Data Flow (confirmed unchanged)

```
GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY (env vars)
    ↓ (read directly in both actions files — already unified)
googleCalendarActions.ts → Google Calendar API → googleCalendarCache table
googleSheetsActions.ts  → Google Sheets API   → grantsCache table
```

No token store, no user OAuth, no callback routes. Both already share the same service account.

### Key Data Flows

1. **Client creation (new flow):** `clients.create` inserts client identity → `enrollments.create` inserts enrollment with programId and status. Two separate mutations from the UI "Add Client" flow. The `/clients` page "Add Client" modal becomes a two-step form: client identity first, program enrollment second.

2. **Session logging (new flow):** `sessions.create` takes `clientId` + `enrollmentId` (optional for legacy compatibility) + `sessionDate` + `attendanceStatus`. The `/clients/[id]` detail page queries sessions via `by_clientId` index.

3. **Analytics demographics (rewritten flow):** `analytics.getAllDemographics` reads `clients` table directly — no Sheets config check, no `programDataCache` join. `analytics.getActiveClientCount` reads `enrollments` with `by_status` index filter. `analytics.getSessionTrends` uses `by_sessionDate` index range query instead of full table scan.

4. **Data export (new):** A Convex query returns all clients + enrollments + sessions as structured JSON. Frontend downloads via `JSON.stringify` → `Blob` → `<a>` click. No external library.

---

## Migration Path for Existing Data

### What Exists in the Database Now

From direct schema inspection:
- `clients` table: `firstName`, `lastName`, `programId` (optional), `enrollmentDate` (optional), `status` ("active"/"completed"/"withdrawn"), `zipCode`, `ageGroup`, `ethnicity`, `notes`, `createdAt`
- `sessions` table: `clientId`, `programId` (optional), `sessionDate`, `sessionType`, `notes`, `createdBy` — already exists with data
- `legalIntakeForms`: linked to `clientId` via `clientId` field; contains `ethnicity`, `zipCode`, `age`, `referralSource`
- `coparentIntakeForms`: linked to `clientId`; contains `ethnicity`, `zipCode`, `age`, `referralSource`
- `programDataCache`: Sheets-synced rows keyed by `sheetRowId` — contains `gender`, `ageGroup`, `ethnicity`, `zipCode`, `referralSource`, `programOutcome`, `sessionCount` — **no `clientId` link** (no reliable join to clients)

### Migration Steps (one-time, ordered)

**Step 1 — Additive schema deploy:** Add `enrollments` table. Add `gender`, `referralSource`, `dateOfBirth`, `phone`, `email` to `clients` as `v.optional` (existing data unaffected). Add `enrollmentId`, `attendanceStatus`, and new indexes to `sessions`. Mark `programId`, `enrollmentDate`, `status` on clients as still-optional (do NOT remove yet). Deploy via `npx convex dev --once`. This is a non-breaking change — existing code continues working.

**Step 2 — Create enrollments from existing clients:** `scripts/migrateV2.ts` reads all clients with a `programId`. For each, inserts one `enrollments` record: `{ clientId, programId, status: client.status, enrollmentDate: client.enrollmentDate, createdAt }`. Runs in batches of 50. Idempotent — checks if enrollment already exists before inserting. Log created vs. skipped counts.

**Step 3 — Populate missing demographics on clients:** For each client, check linked `legalIntakeForms` or `coparentIntakeForms` via `by_clientId` index. Patch `gender`, `referralSource`, `dateOfBirth`, `phone`, `email` from intake form data if null on the client record. Best-effort — not all clients have intake forms.

**Step 4 — Analytics backend rewrite deploy:** Updated `analytics.getAllDemographics` reads `clients` table. Updated `analytics.getActiveClientCount` reads `enrollments`. Updated `analytics.getSessionTrends` uses `by_sessionDate` index. Deploy. Verify counts match between old and new queries before removing Sheets sync.

**Step 5 — Frontend updates:** Update `DemographicsTab.tsx` to remove `useSheetsConfig()` check. Update `clients.listWithPrograms` to join via enrollments. Update `/clients` page for unified list.

**Step 6 — Remove Sheets program sync:** Remove `syncProgramData` from `googleSheetsActions.ts`. Remove those calls from `googleSheetsSync.ts`. Remove `upsertProgramParticipant` from `googleSheetsInternal.ts`. Remove program Sheets config sections from admin UI. Deploy.

**Step 7 — Schema cleanup deploy:** Remove `programId`, `enrollmentDate`, `status` from `clients` schema definition. Remove `programDataCache` table from schema. Deploy. Convex silently ignores orphaned fields on existing documents — no data loss.

### Migration Risk: Gender and Referral Source Data

The biggest data gap is that `gender` and `referralSource` currently exist only in `programDataCache` (keyed by Sheets row number, no `clientId` link). Name-matching `programDataCache` rows to `clients` records is fragile.

**Recommended approach:** If the cleaned master spreadsheet is available (referenced in milestone requirements), use `scripts/importFromSpreadsheet.ts` to import clients with full demographics directly, deduplicating against existing clients by name match. This is cleaner than a DB-level fuzzy join. If the spreadsheet is not available, accept that `gender` and `referralSource` will be null on migrated clients and will populate only for new clients going forward.

---

## Integration Points

### Existing Modules: What Changes vs. What Stays

| Module | Change Type | What Changes |
|--------|-------------|-------------|
| `convex/schema.ts` | MODIFIED | Add `enrollments`; add fields to `clients`; add indexes + field to `sessions`; remove `programDataCache` |
| `convex/clients.ts` | MODIFIED | `listWithPrograms`: role filter via enrollments; `getStats`/`getActiveClientCount` via enrollments; `create`/`update`: remove programId/status/enrollmentDate args |
| `convex/analytics.ts` | MODIFIED | `getAllDemographics`: reads clients table; `getActiveClientCount`: reads enrollments by_status; `getSessionTrends`/`getSessionVolume`: use by_sessionDate index |
| `convex/enrollments.ts` | NEW | `list`, `create`, `update`, `remove`, `listByClient`, `importBatch` (internal, for migration) |
| `convex/sessions.ts` | NEW | Formalized CRUD with `attendanceStatus`; extract from ad-hoc creation patterns |
| `convex/googleSheetsActions.ts` | MODIFIED | Remove `syncProgramData` action and program calls in `triggerSync` |
| `convex/googleSheetsSync.ts` | MODIFIED | Remove program sync calls; keep grant sync only |
| `convex/googleSheetsInternal.ts` | MODIFIED | Remove `upsertProgramParticipant` mutation |
| `convex/crons.ts` | UNCHANGED | `sheets-sync` cron stays — still syncs grants |
| `convex/googleCalendarActions.ts` | UNCHANGED | Already uses env vars directly; no Sheets config dependency |
| `convex/googleCalendarInternal.ts` | UNCHANGED | |
| `convex/googleCalendarSync.ts` | UNCHANGED | |
| `src/components/analytics/DemographicsTab.tsx` | MODIFIED | Remove `useSheetsConfig()` check; remove "Connect Google Sheets" empty state gate; always shows data |
| `src/hooks/useAnalytics.ts` | MINOR | `useAllDemographics` return shape gains `genderDistribution` field |
| `src/hooks/useGrantTracker.ts` | UNCHANGED | Still uses `api.googleSheets.*` for grants |
| `src/app/(dashboard)/clients/page.tsx` | MODIFIED | Unified list; no program-type tab by role; show enrollment program per client |
| `src/app/(dashboard)/admin/page.tsx` | MODIFIED | Remove Google Sheets "Program Sync" tab sections; keep grant Sheets config |
| `scripts/migrateV2.ts` | NEW | Backfill enrollments from existing client.programId + demographics from intake forms |
| `scripts/importFromSpreadsheet.ts` | NEW | Import cleaned spreadsheet → clients + enrollments + sessions in new data model |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `enrollments.ts` ↔ `clients.ts` | `clientId` foreign key | `clients.remove` must check for existing enrollments before deleting (mirrors how `programs.remove` currently checks for `clients`) |
| `sessions.ts` ↔ `enrollments.ts` | `enrollmentId` field (optional) | Sessions can exist without enrollment link for legacy data compatibility |
| `analytics.ts` ↔ `clients.ts` | Direct table reads | No shared functions; analytics reads `clients` and `enrollments` tables directly |
| `analytics.ts` ↔ `programDataCache` | REMOVED after migration | |
| `DemographicsTab.tsx` ↔ `googleSheets.ts` | REMOVED | `useSheetsConfig()` call deleted; demographics no longer gated on Sheets config |

---

## Build Order (Phase Dependencies)

Phases must be ordered to avoid Convex schema violations and broken intermediate states.

**Phase 1 — Schema Foundation (deploy first, unblocks everything)**
Add `enrollments` table, add fields to `clients` and `sessions`, add new indexes. Run `npx convex dev --once`. Non-breaking additive change — existing code continues working after deploy.

**Phase 2 — Enrollment Backend**
New `enrollments.ts` file: `list`, `create`, `update`, `remove`, `listByClient`, `importBatch` (internal mutation for migration). Follows existing `clients.ts` CRUD pattern with `requireRole` + audit log.

**Phase 3 — Sessions Backend**
New `sessions.ts` file: formalize session CRUD with `attendanceStatus`. Add queries using new `by_sessionDate` and `by_enrollmentId` indexes.

**Phase 4 — Migration Script**
`scripts/migrateV2.ts`: read all clients with `programId`, create enrollment records via `enrollments.importBatch` in batches of 50. Patch demographics from intake forms. Run once. Verify counts in Convex dashboard.

**Phase 5 — Analytics Backend Rewrite**
Update `analytics.getAllDemographics` to read `clients` table. Update `getActiveClientCount` to read `enrollments`. Update `getSessionVolume` and `getSessionTrends` to use `by_sessionDate` index range query. Deploy and verify against known client counts.

**Phase 6 — Frontend: Unified Client List and Analytics**
Update `clients.listWithPrograms` to join via enrollments for role filtering. Update `/clients` page for unified list display. Remove `useSheetsConfig()` from `DemographicsTab.tsx`. Remove "Connect Google Sheets" empty state gate.

**Phase 7 — Remove Sheets Program Sync**
Remove `syncProgramData` from `googleSheetsActions.ts`, `googleSheetsSync.ts`, `googleSheetsInternal.ts`. Remove program Sheets config sections from admin UI. Deploy. Only after analytics rewrite is confirmed working.

**Phase 8 — Schema Cleanup**
Remove `programId`, `enrollmentDate`, `status` from `clients` schema definition. Remove `programDataCache` table from schema. Deploy. Convex silently handles orphaned fields on existing documents.

**Phase 9 — Data Export**
Add `clients.exportAll` query returning clients + enrollments + sessions as structured JSON. Wire to frontend download button.

---

## Anti-Patterns

### Anti-Pattern 1: Keeping programDataCache and Bridging It to Clients by Name Match

**What people do:** Keep `programDataCache` running, rewrite analytics to do a fuzzy name join between `programDataCache` rows and `clients` records to get `gender` and `referralSource`.

**Why it's wrong:** `programDataCache` rows have no `clientId` — they are Sheets rows keyed by row number. Name matching is fragile (nicknames, parsing differences, duplicates). Keeping the cache means keeping the Sheets sync cron, config records, and all sync infrastructure — defeating the purpose of v2.0 (app as source of truth). The join complexity is higher than migrating the fields once.

**Do this instead:** Migrate `gender` and `referralSource` to the `clients` table during the one-time migration. Query `clients` directly in `getAllDemographics`. Accept that some historical clients may have null values for fields not captured in intake forms.

---

### Anti-Pattern 2: Putting Status on the Client Instead of the Enrollment

**What people do:** Keep `status` on the `clients` table — treating a client as globally "active" or "completed."

**Why it's wrong:** A client who completes Legal and later enrolls in Co-Parent would need their status toggled back to "active," destroying the completed state. A client in two programs simultaneously has an ambiguous single status. The active client count on the dashboard becomes semantically wrong.

**Do this instead:** `status` lives on `enrollments`. A client is "active in a program" when they have an enrollment with `status: "active"`. `getActiveClientCount` queries `enrollments` filtered by status, collects distinct `clientId` values. The `/clients` unified list derives "active" badge from whether the client has any active enrollment.

---

### Anti-Pattern 3: Building a New googleOAuthConfig Table to "Unify" Google Auth

**What people do:** Create a new `googleOAuthConfig` table to store unified Google credentials shared between Calendar and Sheets.

**Why it's wrong:** Both services already read `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` directly from environment variables — confirmed by direct inspection of both `googleCalendarActions.ts` and `googleSheetsActions.ts`. There is no user OAuth token for Google. A new config table adds schema complexity for zero functional gain.

**Do this instead:** Nothing. The service account credentials are already unified at the env var level. "Unify Google OAuth" means removing the program-specific Sheets config records and their admin UI, not adding infrastructure.

---

### Anti-Pattern 4: One Large Migration Mutation

**What people do:** Write a single Convex mutation that reads all clients, creates enrollments, patches demographics, and clears `programDataCache` in one transaction.

**Why it's wrong:** Convex mutations have a write limit per transaction. With hundreds of clients, creating that many enrollment records plus demographic patches in one call will exceed the limit and fail partway through, leaving the database in a partial state.

**Do this instead:** Use `scripts/migrateV2.ts` as a CLI script with `ConvexHttpClient`, batching operations in groups of 50 via separate mutation calls (each has its own transaction boundary). Make the script idempotent — check if an enrollment already exists before creating. Log progress per batch.

---

### Anti-Pattern 5: Removing programId from Sessions During Schema Cleanup

**What people do:** Drop `programId` from the `sessions` table since sessions now link through `enrollments`.

**Why it's wrong:** Several analytics queries group sessions by program type. Joining `sessions → enrollments → programs` on every analytics aggregation is slower and more complex than keeping the denormalized `programId` on sessions. The existing session creation code already sets `programId`.

**Do this instead:** Keep `programId` on sessions as a denormalized field. Set it from the enrollment's `programId` at session creation time. Fast program-level session count queries work without triple-join. The redundancy is acceptable — the `programId` on a session records which program it belonged to at the time of the session, which is semantically correct even if an enrollment is later transferred.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (~200-500 clients) | Full table scans on `clients` are fine. New `by_sessionDate` index on sessions handles range queries well. `enrollments` full scan acceptable for aggregation queries. |
| 1k-5k clients | `by_lastName` index on clients covers name search. `by_status` index on enrollments covers active count without full scan. Queries remain efficient. |
| 10k+ clients | Paginate `listWithPrograms`. Add `by_status_programId` composite index on enrollments. Consider caching demographic aggregates in a summary table updated on client create/update. |

### Scaling Priorities

1. **First bottleneck (resolved in v2.0):** `getSessionVolume` and `getSessionTrends` full table scans on sessions. Solved by `by_sessionDate` index added in schema migration.

2. **Second bottleneck (future):** `getAllDemographics` full table scan on `clients`. At 500 clients this is fine. At 10k+, cache aggregate counts in a `demographicsCache` table updated via Convex reactive mutations when client demographics change.

---

## Sources

**All HIGH confidence — from direct codebase inspection:**

- `convex/schema.ts` — confirmed all 26 table structures; `clients` has `programId`/`enrollmentDate`/`status`; `sessions` has no `by_sessionDate` index; `programDataCache` exists with no `clientId` field
- `convex/analytics.ts` — confirmed `getAllDemographics` reads `programDataCache`; `getSessionVolume` does full table scan (`ctx.db.query("sessions").collect()`)
- `convex/clients.ts` — confirmed `listWithPrograms` role filtering uses `by_programId` index on clients
- `convex/googleSheetsActions.ts` — confirmed `syncProgramData` reads `GOOGLE_SERVICE_ACCOUNT_EMAIL` env var directly; same var as Calendar
- `convex/googleCalendarActions.ts` — confirmed Calendar also reads `GOOGLE_SERVICE_ACCOUNT_EMAIL` env var directly; no shared config table between Calendar and Sheets
- `convex/googleSheetsInternal.ts` — confirmed `upsertProgramParticipant` writes to `programDataCache` with no `clientId` field
- `convex/crons.ts` — confirmed `sheets-sync` cron runs `googleSheetsSync.runSync`
- `convex/googleSheetsSync.ts` — confirmed program sync and grant sync are both called from `runSync`
- `scripts/seedClients.ts` — confirmed batched migration pattern (`ConvexHttpClient` + batch size 20 in groups)
- `src/components/analytics/DemographicsTab.tsx` — confirmed `useSheetsConfig()` gate; "Connect Google Sheets" empty state blocks analytics when no Sheets config exists

---

*Architecture research for: DEC DASH 2.0 v2.0 Data Foundation — Client/Enrollment/Session refactor, Google OAuth unification, analytics rewrite*
*Researched: 2026-03-01*
