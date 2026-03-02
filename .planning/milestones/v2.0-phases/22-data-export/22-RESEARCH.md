# Phase 22: Data Export - Research

**Researched:** 2026-03-02
**Domain:** Client data export to CSV and Excel from a Next.js + Convex app
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| XPRT-01 | Admin can export client list with enrollment and session data as CSV | Convex query (`exportAll`) assembles the join; `xlsx` already installed generates CSV via `XLSX.utils.json_to_sheet` + `sheet_to_csv`; browser download via `Blob` + `URL.createObjectURL` |
| XPRT-02 | Admin can export client list with enrollment and session data as Excel (.xlsx) | Same Convex query and `xlsx` package; `XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })` emits a Buffer/Uint8Array; same Blob download pattern with MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| XPRT-03 | Export includes demographics, enrollment history, and session counts per client | Convex query joins clients + enrollments + sessions in one backend call; one flat row per enrollment with session count aggregated per enrollment; clients with no enrollments still appear (one row, empty enrollment columns) |
</phase_requirements>

---

## Summary

Phase 22 adds a data export feature to the `/clients` page. The admin clicks an Export button that downloads a flat-table snapshot of all clients plus their enrollment history and per-enrollment session counts, in either CSV or Excel format.

The project already has `xlsx@0.18.5` installed and uses it in four CLI import scripts (`scripts/importIntake.ts`, `scripts/importCoparent.ts`, `scripts/importGrantMatrix.ts`, `scripts/seedClients.ts`). Those scripts show the read path (`XLSX.readFile`, `XLSX.utils.sheet_to_json`). The export path uses the complementary write API (`XLSX.utils.json_to_sheet`, `XLSX.utils.book_append_sheet`, `XLSX.write`), which is fully functional in a Next.js browser context — confirmed by local test.

The correct architecture is: one new Convex query (`clients.exportAll`) that assembles the full join on the server, returning a flat array of plain row objects. The frontend calls this query, then runs the `xlsx` transform and Blob download entirely in the browser. No new API route, no server-side streaming, no additional npm packages are needed. The dataset (350 clients, ~500 enrollments, ~1 000 sessions) is estimated at ~300 KB — well within Convex's 8 MB query result limit.

**Primary recommendation:** Add one Convex query + one frontend export utility function; no new dependencies needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` (SheetJS) | 0.18.5 (already installed) | JSON → XLSX/CSV serialization | Already used in 4 import scripts; browser-compatible; single API for both output formats |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `Blob` + `URL.createObjectURL` | Browser built-in | Trigger file download from memory | Standard client-side download pattern; no library needed |
| `date-fns` | 4.1.0 (already installed) | Format date fields for export | Already in project; use `format(new Date(ts), 'yyyy-MM-dd')` for timestamps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xlsx` client-side generation | Next.js API route streaming | API route adds latency, complexity, and a server roundtrip; client-side is simpler and fast enough for 350 rows |
| `xlsx` | `papaparse` (CSV only) | `papaparse` handles CSV but not XLSX; `xlsx` does both, already installed |
| `xlsx` | `exceljs` | `exceljs` is heavier, richer formatting; unnecessary for a plain data dump |
| Blob download | `file-saver` | `file-saver` is a thin wrapper around the same Blob pattern; not worth an additional dependency |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
convex/
└── clients.ts              # Add: exportAll query (joins clients + enrollments + sessions)
src/
├── lib/
│   └── exportUtils.ts      # New: buildExportRows(), downloadCsv(), downloadXlsx()
└── app/(dashboard)/
    └── clients/
        └── page.tsx         # Add: Export button + handler (admin only)
```

### Pattern 1: Convex Export Query

**What:** A single Convex `query` that assembles all three tables — clients, enrollments (with program name), and sessions (counted per enrollment) — and returns a flat array of serializable row objects.

**When to use:** Whenever the frontend needs data from multiple tables for a one-shot export; centralizes join logic, keeps the frontend thin.

**Example:**
```typescript
// convex/clients.ts — add alongside existing queries
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const clients = await ctx.db.query("clients").collect();
    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map((p) => [p._id, p]));

    const allEnrollments = await ctx.db.query("enrollments").collect();
    const allSessions = await ctx.db.query("sessions").collect();

    // Count sessions per enrollmentId
    const sessionCountByEnrollment = new Map<string, number>();
    for (const s of allSessions) {
      if (s.enrollmentId) {
        const key = s.enrollmentId as string;
        sessionCountByEnrollment.set(key, (sessionCountByEnrollment.get(key) ?? 0) + 1);
      }
    }

    // Group enrollments by clientId
    const enrollmentsByClient = new Map<string, typeof allEnrollments>();
    for (const e of allEnrollments) {
      const key = e.clientId as string;
      if (!enrollmentsByClient.has(key)) enrollmentsByClient.set(key, []);
      enrollmentsByClient.get(key)!.push(e);
    }

    // One row per enrollment; clients with no enrollments get one row with empty enrollment fields
    const rows: ExportRow[] = [];
    for (const client of clients) {
      const clientEnrollments = enrollmentsByClient.get(client._id as string) ?? [];
      if (clientEnrollments.length === 0) {
        rows.push(buildRow(client, null, null, 0));
      } else {
        for (const enrollment of clientEnrollments) {
          const program = programMap.get(enrollment.programId);
          const sessionCount = sessionCountByEnrollment.get(enrollment._id as string) ?? 0;
          rows.push(buildRow(client, enrollment, program ?? null, sessionCount));
        }
      }
    }
    return rows;
  },
});
```

### Pattern 2: Client-Side XLSX/CSV Generation

**What:** The frontend receives the query result (plain JS objects) and uses `xlsx` to serialize to XLSX buffer or CSV string, then triggers a browser download via Blob.

**When to use:** Always prefer client-side generation for exports derived from data already loaded from the API — avoids streaming complexity and server memory pressure.

**Example:**
```typescript
// src/lib/exportUtils.ts
import * as XLSX from "xlsx";

export type ExportRow = Record<string, string | number | null>;

export function buildWorkbook(rows: ExportRow[], sheetName = "Clients") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

export function downloadCsv(rows: ExportRow[], filename = "clients-export.csv") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function downloadXlsx(rows: ExportRow[], filename = "clients-export.xlsx") {
  const wb = buildWorkbook(rows);
  // 'buffer' type returns a Node Buffer in Node.js; in browser it's a Uint8Array-like
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Pattern 3: Export Button (Admin Only)

**What:** Add an Export dropdown button in the Clients page header (visible only when `userRole === "admin"`). When the user selects CSV or Excel, call `exportAll` via `useQuery` (lazy) or trigger a one-shot Convex query call, then invoke the appropriate download function.

**When to use:** Keep the export data fetch separate from the list query — `exportAll` fetches all clients/enrollments/sessions and should only run when the admin explicitly triggers it, not on every page load.

**Implementation note:** Because Convex `useQuery` subscribes immediately on render, use a pattern where the export query is only invoked after button click. Options:
1. Use a state flag to conditionally call `useQuery(api.clients.exportAll)` only after click — works but subscribes for updates (unnecessary for a one-shot export).
2. Use `ConvexHttpClient` directly in a click handler for a single fetch — avoids subscription overhead for an export.
3. Use a `useMutation` that returns data (not idiomatic) — avoid.

**Recommended:** Option 1 with `enabled` guard is idiomatic for Convex React. Use a `useState(false)` flag and call `useQuery(api.clients.exportAll)` only when flag is `true`. Once data arrives, trigger the download and reset the flag.

```typescript
// In clients/page.tsx
const [exportRequested, setExportRequested] = useState(false);
const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | null>(null);

const exportData = useQuery(
  api.clients.exportAll,
  exportRequested ? {} : "skip"  // Convex "skip" pattern — skips subscription
);

useEffect(() => {
  if (exportData && exportFormat) {
    if (exportFormat === "csv") downloadCsv(exportData, "dec-clients-export.csv");
    else downloadXlsx(exportData, "dec-clients-export.xlsx");
    setExportRequested(false);
    setExportFormat(null);
  }
}, [exportData, exportFormat]);
```

**Note on Convex `"skip"`:** Passing `"skip"` as the second argument to `useQuery` is the official Convex pattern to conditionally skip a query. Confirmed from project's Convex version (`^1.32.0`) behavior.

### Anti-Patterns to Avoid

- **Loading exportAll on every page render:** Do not call `useQuery(api.clients.exportAll)` unconditionally at the top of the component — it would re-run on every client list page load, fetching all sessions unnecessarily. Gate it behind user action.
- **Building rows in the frontend from multiple queries:** Do not fetch clients, enrollments, and sessions as separate `useQuery` calls and join them client-side for the export — the Convex backend join is cleaner and avoids race conditions between three reactive subscriptions.
- **Using a Next.js API route for the export:** Unnecessary complexity; the xlsx Blob download is browser-native and works cleanly for 300 KB of data.
- **Streaming export for 350 clients:** Data is small; no streaming needed. Streaming would add complexity for no benefit at this data size.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XLSX file serialization | Custom binary XLSX writer | `xlsx` (already installed) | XLSX format has complex zip+XML internals; SheetJS handles all of it |
| CSV escaping | Manual comma/quote escaping | `XLSX.utils.sheet_to_csv()` | Fields with commas, quotes, or newlines need RFC 4180 escaping; xlsx handles this |
| Browser file download | Complex server endpoint | Native `Blob` + `URL.createObjectURL` | Browser APIs handle this in 5 lines; no server involvement needed |
| Date formatting | Manual timestamp → string | `new Date(ts).toISOString().split('T')[0]` or `date-fns` `format()` | Already in project; consistent formatting |

**Key insight:** The entire export flow — data assembly, serialization, and file download — is a pure data transformation. No new infrastructure, no new packages.

---

## Common Pitfalls

### Pitfall 1: xlsx `type: "array"` vs `type: "buffer"` in browser

**What goes wrong:** `XLSX.write(wb, { bookType: 'xlsx', type: 'array' })` returns `undefined` in the SheetJS 0.18.x community edition — `type: 'array'` support was removed/broken in this version. Confirmed by local test.

**Why it happens:** SheetJS CE (0.18.x) vs SheetJS Pro have different supported output types.

**How to avoid:** Use `type: 'buffer'` — returns a Node.js `Buffer` in Node.js environments, which is also accepted by `new Blob([buf], ...)`. In the browser (webpack/Next.js bundling), `Buffer` is polyfilled and `Blob` accepts it. **Verified working** in local test: `XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })` produced a 15,965-byte Buffer.

**Warning signs:** If the Blob has 0 bytes or the download is corrupt, check the write type.

### Pitfall 2: Convex `useQuery` fires immediately on mount

**What goes wrong:** If `useQuery(api.clients.exportAll)` is placed unconditionally in the component, it fires on page load and fetches all sessions/enrollments even when the user never clicks Export.

**Why it happens:** Convex `useQuery` subscribes as soon as the component mounts.

**How to avoid:** Use the `"skip"` argument pattern: `useQuery(api.clients.exportAll, exportRequested ? {} : "skip")`. This tells Convex to not execute the query until `exportRequested` is `true`.

### Pitfall 3: Clients with multiple enrollments produce multiple rows

**What goes wrong:** If the export produces one row per client, enrollment data is lost for clients in multiple programs. If the export naively denormalizes, users may be confused by duplicate client rows.

**Why it happens:** The data model allows one client to have multiple enrollments (e.g., enrolled in both Legal and Co-Parent programs).

**How to avoid:** Explicitly design the row structure as "one row per enrollment" (not per client), and document this in the column header. Include a `Client ID` or `Client Name` column so clients with multiple enrollments are easily identifiable. Clients with zero enrollments get one row with empty enrollment columns (they should still appear in the export per XPRT-03's "all clients" requirement).

### Pitfall 4: Timestamps as Unix milliseconds in Excel

**What goes wrong:** Exporting `enrollmentDate: 1740000000000` into the spreadsheet shows an unreadable number.

**Why it happens:** Convex stores dates as Unix milliseconds.

**How to avoid:** In the `buildRow` helper in the Convex query (or in `exportUtils.ts`), convert all timestamps to ISO date strings before building the row object: `new Date(enrollment.enrollmentDate).toISOString().split('T')[0]` → `"2025-03-01"`.

### Pitfall 5: `requireRole` in a Convex `query` vs `mutation`

**What goes wrong:** `requireRole` expects `QueryCtx | MutationCtx`. Calling it in a `query` is valid — the existing function signature already accepts both. No issue.

**Why it happens:** Some projects restrict role checks to mutations only. In this project, `requireRole` is correctly typed for both. Verified in `convex/users.ts` line 10.

**How to avoid:** No action needed — the existing `requireRole` works fine in `query` handlers.

---

## Code Examples

Verified patterns from local testing and codebase inspection:

### ExportRow type definition (in convex/clients.ts)

```typescript
type ExportRow = {
  "Client ID": string;
  "First Name": string;
  "Last Name": string;
  "Date of Birth": string;
  "Phone": string;
  "Email": string;
  "Zip Code": string;
  "Age Group": string;
  "Ethnicity": string;
  "Gender": string;
  "Referral Source": string;
  "Program Name": string;
  "Enrollment Status": string;
  "Enrollment Date": string;
  "Exit Date": string;
  "Total Sessions": number;
};
```

### Generating a CSV string (browser-safe)

```typescript
// Verified working in local test (xlsx 0.18.5)
import * as XLSX from "xlsx";
const ws = XLSX.utils.json_to_sheet(rows);
const csv = XLSX.utils.sheet_to_csv(ws);
// csv is a plain string — wrap in Blob and download
const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
```

### Generating an XLSX buffer (browser-safe)

```typescript
// Verified: type: 'buffer' works in xlsx 0.18.5 (type: 'array' does NOT work)
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Clients");
const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
// buf is a Buffer (Node polyfill in browser) — accepted by Blob
const blob = new Blob([buf], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
```

### Browser download trigger

```typescript
// Standard pattern — no library needed
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Convex "skip" pattern for on-demand query

```typescript
// Official Convex pattern for conditional query execution
const data = useQuery(api.clients.exportAll, shouldFetch ? {} : "skip");
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side CSV generation (Express/API route) | Client-side generation with xlsx + Blob | ~2020 for SPAs | No server memory for file, instant download, simpler code |
| `file-saver` library for download | Native `URL.createObjectURL` | Browser support matured ~2018 | One fewer dependency |
| SheetJS Pro `type: 'array'` | SheetJS CE `type: 'buffer'` | SheetJS CE 0.18.x | Must use `buffer` type in community edition |

**Deprecated/outdated:**
- `type: 'array'` in `XLSX.write()`: Returns `undefined` in xlsx 0.18.5 CE. Use `type: 'buffer'` instead.
- `FileSaver.js`: Not needed — native Blob/URL APIs handle this.

---

## Open Questions

1. **Enrollment deduplication display for multi-enrolled clients**
   - What we know: The data model allows one client to have multiple enrollments (legal + co-parent)
   - What's unclear: Does the user expect one row per client (with program columns combined), or one row per enrollment?
   - Recommendation: One row per enrollment is cleaner and loses no data. Document the column headers clearly. This matches grant reporting needs (you want counts per program).

2. **Export scope: all clients or role-filtered?**
   - What we know: XPRT-03 says "all clients regardless of program." The export is admin-only. Lawyers/psychologists do not have access to Export (it's admin-gated).
   - What's unclear: Should the query do role-based filtering or always return all clients?
   - Recommendation: Since only admins can export (per requirements), `requireRole(ctx, "admin")` in the query means it always returns the full dataset. No role-based filtering needed.

3. **Filename convention**
   - What we know: Not specified in requirements
   - What's unclear: Should the filename include the export date?
   - Recommendation: Include date in filename for traceability: `dec-clients-2026-03-02.csv` / `dec-clients-2026-03-02.xlsx`. Generate with `new Date().toISOString().split('T')[0]`.

---

## Sources

### Primary (HIGH confidence)

- Local codebase inspection — `convex/schema.ts`: confirmed clients/enrollments/sessions table structure, all fields available for export
- Local codebase inspection — `package.json`: confirmed `xlsx@0.18.5` already installed
- Local Node.js test — xlsx `type: 'buffer'` confirmed working; `type: 'array'` confirmed broken in 0.18.5
- Local codebase inspection — `scripts/importGrantMatrix.ts`, `scripts/importIntake.ts`: confirmed xlsx read-path usage patterns
- Local codebase inspection — `convex/users.ts`: confirmed `requireRole` accepts `QueryCtx`, usable in query handlers
- Local codebase inspection — `src/app/(dashboard)/clients/page.tsx`: confirmed Button/Card/Modal component patterns and admin-gating pattern

### Secondary (MEDIUM confidence)

- Local codebase inspection — `convex/clients.ts` `listWithPrograms`: confirmed the join pattern for clients + enrollments + programs; `exportAll` follows the same structure
- Convex `"skip"` pattern: inferred from Convex React docs pattern; consistent with how `useQuery` works in `^1.32.0`

### Tertiary (LOW confidence)

- Estimated data size (~300 KB): calculated from 350 known clients + estimated enrollments/sessions; actual may vary
- Convex 8 MB query result limit: from general Convex documentation knowledge; should be verified if dataset grows significantly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — xlsx already installed and verified working via local test
- Architecture: HIGH — pattern matches existing project conventions (query-based joins, existing admin-only gating)
- Pitfalls: HIGH — `type: 'array'` vs `type: 'buffer'` verified by local test; other pitfalls inferred from codebase structure

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable domain — xlsx 0.18.x CE has been frozen; Convex patterns stable)
