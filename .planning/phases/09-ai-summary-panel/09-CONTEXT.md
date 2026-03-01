# Phase 9: AI Summary Panel - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a 3-5 bullet AI-generated narrative summary of organizational highlights from KB documents to the dashboard, with a manual "Regenerate" button. This complements Phase 8's quantitative metric cards with a qualitative digest. No automated generation on upload, no streaming, no editing of summaries.

</domain>

<decisions>
## Implementation Decisions

### Summary content & tone
- Executive briefing tone — professional, concise, boardroom-ready (e.g., "Legal program served 47 clients in Q4, a 12% increase over Q3")
- Balanced mix of wins and areas needing attention — gives Kareem the full organizational picture
- Summary references the already-extracted KPI metrics AND raw document content for additional context — avoids contradicting the stat cards above
- No inline source citations in bullets — source docs are already shown on the metric cards

### Panel placement & layout
- Summary panel lives inside the existing KBInsights section, below the metric cards — one unified "Organizational Metrics" section
- Card container with AI accent (gradient bg, AI badge) matching the metric card style — visually cohesive
- Always visible when the section is visible — not collapsible independently
- Separate "Regenerate" button from "Extract Metrics" — independent controls for summary vs metrics

### Regenerate UX & status
- Status indicator uses text label + icon (e.g., "Ready - Generated 2h ago" or spinner + "Generating...") — matches the existing "Last extracted" pattern
- Inline error message below the button on failure — previous summary stays visible, user can retry (matches Phase 8 error pattern)
- No confirmation dialog — click Regenerate = generate immediately (matches Phase 8's Extract Metrics precedent)
- Role-gated: admin + manager can trigger regeneration; other roles see cached summary only

### Stale data display
- Previous summary remains visible during regeneration with a subtle "Regenerating..." indicator — never shows blank screen (success criteria #4)
- Timestamp-only staleness display ("Generated 3 days ago") — informational, no color warning
- First-ever empty state: friendly prompt message like "Click Regenerate to create your first AI summary" with the button visible — guides first-time use

### Claude's Discretion
- Exact Chat Completions prompt engineering for summary generation
- Whether to use the same kbSummaryCache table (add summary fields) or create a separate table — ROADMAP.md notes "shares kbSummaryCache" so same table is preferred
- Model choice (gpt-4o matching extraction, or configurable via AI Config)
- Summary bullet formatting details (bold keywords, sentence structure)
- Loading/generating animation specifics

</decisions>

<specifics>
## Specific Ideas

- Summary panel should feel like a natural extension of the Organizational Metrics section — not a separate widget bolted on
- The narrative complements the numbers: metric cards show "47 clients served", summary says "Legal program hit a Q4 milestone with 47 clients, up 12% over Q3"
- Kareem uses these summaries for stakeholder conversations and board prep — they need to be shareable as-is

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KBInsights.tsx` (196 lines): Existing section component with metric cards, AI badge styling, role-gating, extracting state pattern — summary panel extends this directly
- `kbInsights.ts`: `getCache` query, `saveCache` internal mutation — summary data can piggyback on the same singleton pattern
- `kbInsightsActions.ts`: `extractMetrics` action with OpenAI Chat Completions pattern, document download pipeline — summary action follows the same structure
- `StatCardSkeleton`: Loading skeleton pattern reusable for summary skeleton
- `timeAgo` utility in `@/lib/utils`: Already used for "Last extracted" timestamp display

### Established Patterns
- OpenAI actions: `"use node"` directive, dynamic `import("openai")`, `getOpenAIApiKey()` helper
- Singleton cache: delete-then-insert pattern (kbSummaryCache, quickbooksCache)
- Role gating: client-side `currentUser?.role === "admin" || role === "manager"` check
- Reactive updates: `useQuery()` for automatic UI refresh when Convex data changes
- Error handling: inline error text below buttons with try/catch in async handlers

### Integration Points
- `convex/schema.ts`: Add summary fields to existing `kbSummaryCache` table (or new table)
- `convex/kbInsights.ts`: Add summary-specific queries/mutations
- `convex/kbInsightsActions.ts`: Add `generateSummary` action alongside existing `extractMetrics`
- `src/components/dashboard/KBInsights.tsx`: Extend with summary panel section below metric cards

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-ai-summary-panel*
*Context gathered: 2026-03-01*
