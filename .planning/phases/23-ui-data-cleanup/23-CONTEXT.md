# Phase 23: UI & Data Cleanup - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the Programs sidebar icon (wrong icon, not a rendering bug), remove the meaningless `isActive` field from the programs schema and all UI surfaces, and import real client/enrollment data from a master spreadsheet the user will provide. The app should be visually polished and populated with real data after this phase.

</domain>

<decisions>
## Implementation Decisions

### Programs sidebar icon
- The current "Users" SVG icon is the wrong metaphor — replace with a grid/blocks icon (2x2 grid or similar)
- Keep it as an inline SVG in the `NavIcon` switch statement (consistent with all other sidebar icons)
- The sidebar label stays "Programs" — do not change to "Clients"

### isActive field removal
- No status concept at all — programs just exist or they get deleted. No archived state, no soft-delete.
- Drop the "Active" checkbox from the Add Program form on /clients
- Remove the "(Inactive)" badge text from program card display
- Remove `isActive` from: schema.ts (programs table), programs.ts (create/update mutations, getStats, seed), seedPrograms.ts, clients/page.tsx (form state, form UI, card display)
- No data migration — let old field data become inert in Convex. Just remove it from the schema.

### Master spreadsheet import
- User will provide the xlsx file and drop it into `scripts/`
- The file has multiple sheets with different data types (clients, sessions, demographics, etc.)
- Import flow: Claude reads the file structure, proposes column-to-field mapping, user confirms before the import script is finalized
- Deduplication strategy: Claude's discretion based on the data shape (existing scripts deduplicate by name — follow similar patterns where appropriate)
- Import script follows existing patterns: `scripts/importCoparent.ts` and `scripts/importIntake.ts` as references
- Data should be visible on the /clients page after import

### Claude's Discretion
- Exact grid/blocks SVG path for the new Programs icon
- Deduplication strategy for the spreadsheet import (informed by data structure)
- Any cleanup of related code when removing isActive (e.g., TypeScript interfaces, form state types)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NavIcon` component in `Sidebar.tsx`: switch statement with inline SVGs keyed by icon name — add new case or change "Users" case
- `scripts/importCoparent.ts`: Excel import pattern with xlsx parsing, deduplication by name, client creation, batch upserts
- `scripts/importIntake.ts`: Legal intake import pattern
- `scripts/importGrantMatrix.ts`: Grant import with sheet selection, date conversion, slug-based keys, batch upserts of 20

### Established Patterns
- All sidebar icons are inline SVGs with `w-5 h-5`, `fill="none"`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth={1.75}`
- Import scripts use `npx tsx scripts/importXxx.ts` to run
- Import scripts use ConvexHttpClient for direct mutation calls
- Programs are created via `programs:create` mutation which currently requires `isActive: boolean`

### Integration Points
- `convex/schema.ts` line 124: `isActive: v.boolean()` in programs table
- `convex/programs.ts`: create, update, seed, getStats all reference isActive
- `convex/seedPrograms.ts`: hardcodes `isActive: true`
- `src/app/(dashboard)/clients/page.tsx`: form state (`emptyProgramForm`), form checkbox, card display badge
- `src/lib/constants.ts` line 76: `{ label: "Programs", href: "/clients", icon: "Users" }` — icon name to change
- `src/components/layout/Sidebar.tsx`: NavIcon switch statement, case "Users"

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for each area.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-ui-data-cleanup*
*Context gathered: 2026-03-02*
