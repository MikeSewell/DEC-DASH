# Phase 8: KB KPI Extraction - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract organizational metrics from uploaded KB documents using OpenAI Chat Completions with json_schema structured output, and display them as stat cards in a new "Organizational Metrics" dashboard section. Admin/manager can trigger extraction; results cache in kbSummaryCache and load reactively. No streaming, no automated extraction on upload, no per-card AI narratives.

</domain>

<decisions>
## Implementation Decisions

### KPI definitions
- Extract from ALL uploaded KB documents in a single Chat Completions call
- Each extracted metric tracks which specific document it came from (per-metric source attribution)
- All extraction schema fields are nullable — skip metrics not found in documents (no hallucinated values)
- When multiple documents contain conflicting values for the same metric, use the most recent document's value but flag the conflict
- Documents include both formal reports (impact reports, grant reports with clear numbers) and informal operational docs (meeting notes, program descriptions)

### Card presentation
- New "AI Insights" card style visually distinct from QB-sourced StatCards — subtle AI badge or different accent color to signal document extraction origin
- Section titled "Organizational Metrics" (not "KB Insights" or technical jargon)
- Positioned after Executive Snapshot — second section in dashboard order
- Dynamic card count — only show cards for metrics that were actually extracted (non-null). Could be 3 cards or 8 depending on document content
- Responsive grid layout adapting to however many cards are present

### Extraction trigger UX
- "Extract Metrics" button in the Organizational Metrics section header (same pattern as KnowledgeBaseManager's "Upload File" button)
- Role-gated: admin + manager can trigger extraction; other roles see cached results only
- During extraction (5-30 seconds): button changes to "Extracting..." (disabled), existing cached cards remain visible and usable
- When extraction completes, cards update reactively via Convex subscription
- No safeguard against re-extraction — just disable button during active extraction. Cost is low enough.
- No confirmation dialog needed

### Data provenance display
- Each card shows a subtitle under the metric value with the source document name (e.g., "from Q4-Impact-Report.pdf")
- Section-level "Last extracted" timestamp (one line for the whole section, not repeated per card)
- Null metrics: don't show the card at all (dynamic card count, no "N/A" placeholders)
- Conflict indicator: small amber warning icon on cards where multiple documents had different values; tooltip shows the alternate value and document name

### Claude's Discretion
- Specific extraction schema fields (6-8 fields covering client/program metrics and mission impact outcomes relevant to DEC's legal, co-parent, and fatherhood programs)
- AI Insights card visual styling (accent color choice, badge design, how to differentiate from StatCard)
- Grid layout specifics (responsive breakpoints, card sizing)
- Exact extraction prompt engineering for Chat Completions
- How to download/pass KB document content to Chat Completions (Convex storage download vs OpenAI file content)
- Loading skeleton design for first-ever extraction (before any cache exists)

</decisions>

<specifics>
## Specific Ideas

- Section should feel different enough from Executive Snapshot that Kareem immediately understands these are AI-extracted numbers, not live QB data
- Source document attribution is a trust feature — Kareem needs to verify data provenance at a glance without hovering or clicking

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` component (`ExecutiveSnapshot.tsx:16`): icon + value + label + trend + accentColor + tooltip — reference for the new AI Insights card variant
- `StatCardSkeleton` (`skeletons/StatCardSkeleton.tsx`): loading skeleton for stat cards
- `DashboardSection` wrapper (`DashboardSection.tsx`): provides move up/down/hide controls for all dashboard sections
- `openaiHelpers.ts`: `getOpenAIApiKey()` retrieves API key from DB or env
- `knowledgeBase.ts`: `listFiles` query returns all KB documents (fileName, storageId, openaiFileId, etc.)
- `knowledgeBaseActions.ts`: existing pattern of downloading files from Convex storage and passing to OpenAI
- `Card` component (`ui/Card.tsx`): general-purpose card with title + action slot
- `Spinner` component for loading states

### Established Patterns
- OpenAI actions: `"use node"` directive, dynamic `import("openai")`, `getOpenAIApiKey()` helper
- Data caching: tables like `quickbooksCache`, `grantsCache` use `fetchedAt`/`lastSyncAt` timestamps
- Dashboard sections: register in `SECTION_COMPONENTS` map + `DEFAULT_DASHBOARD_SECTIONS` array + `DashboardSectionId` union type
- Role gating: `requireRole()` helper in `convex/users.ts`
- Convex reactive queries: `useQuery()` for automatic UI updates when data changes

### Integration Points
- `convex/schema.ts`: needs new `kbSummaryCache` table
- `src/types/index.ts`: needs new `DashboardSectionId` value (e.g., `"kb-insights"`)
- `src/lib/constants.ts`: needs new entry in `DEFAULT_DASHBOARD_SECTIONS`
- `src/app/(dashboard)/dashboard/page.tsx`: needs new component in `SECTION_COMPONENTS` map
- New files: `convex/kbInsights.ts` (queries/mutations), `convex/kbInsightsActions.ts` (Chat Completions action), `src/components/dashboard/KBInsights.tsx` (dashboard component)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-kb-kpi-extraction*
*Context gathered: 2026-03-01*
