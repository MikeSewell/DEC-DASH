# Phase 2: Dashboard Data Population - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all KPI cards, charts, and widgets on the dashboard to render live data from QuickBooks, grants, and client tables. Add three-state loading (skeleton/disconnected/data) to every section. Build the "What Needs Attention" panel container with basic items. Add a Client Activity section. Sections load independently so one failed integration doesn't break the page.

Requirements: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, CMD-01, CMD-02, CMD-03, CMD-04

</domain>

<decisions>
## Implementation Decisions

### Loading & disconnected states
- Skeleton shimmer loading — animated gray blocks matching content shape while data loads
- When QuickBooks isn't connected, show an inline "Connect QuickBooks" prompt inside the affected card area — non-disruptive, other sections still visible
- Subtle "Updated X min ago" timestamp per section header — builds data trust without clutter
- Empty state: friendly message + action hint (e.g., "No active grants yet" with link to relevant page)

### KPI cards & number formatting
- Compact dollar formatting with hover detail — show "$45.2K" on card, full "$45,231.47" on hover tooltip
- Green/red color coding for positive/negative financial values — instant visual signal
- CMD-01 (Financial Snapshot) enhances the existing Executive Snapshot section rather than creating a separate one
- 3 main KPI cards at top of Executive Snapshot: Cash on Hand, Revenue YTD, Total Expenses

### "What Needs Attention" panel
- Phase 2 builds the panel UI with basic, hardcoded-logic items: upcoming grant deadlines from grants table, QB connection status. Phase 4 replaces the logic with the full alert engine.
- Panel sits at top of dashboard, before all other sections — first thing Kareem sees, like a morning briefing
- Always visible — if nothing needs attention, panel says so (core "command center" element)
- Item count badge in panel header (e.g., "What Needs Attention (3)")

### Client activity section
- Standalone dashboard section (reorderable/hideable like others)
- Metrics: total active clients, new clients this month, per-program breakdown (Legal vs Co-Parent) — matches CMD-02
- Default position: after financial sections (snapshot, P&L, grants), before demographics — money then people
- "View all clients" link in section header for navigation to /clients
- Per-program breakdown as inline badges below total — compact: "Total active: 47" with "Legal: 28 | Co-Parent: 19" as smaller text

### Claude's Discretion
- Exact skeleton shimmer animation style and timing
- Error state design and messaging when a data fetch fails
- Chart color palette adjustments (existing warm palette is established)
- Exact spacing, typography, and card sizing within sections
- How to handle the transition when Phase 4 replaces basic attention items with computed alerts

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The design system (warm palette, Fraunces headings, Nunito body, rounded cards with warm shadows) is already established and should be followed consistently.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-dashboard-data-population*
*Context gathered: 2026-02-28*
