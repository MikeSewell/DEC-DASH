# Phase 9: AI Summary Panel - Research

**Researched:** 2026-03-01
**Domain:** OpenAI Chat Completions (summary generation) + Convex schema extension + React UI state
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Summary content & tone**
- Executive briefing tone — professional, concise, boardroom-ready (e.g., "Legal program served 47 clients in Q4, a 12% increase over Q3")
- Balanced mix of wins and areas needing attention — gives Kareem the full organizational picture
- Summary references the already-extracted KPI metrics AND raw document content for additional context — avoids contradicting the stat cards above
- No inline source citations in bullets — source docs are already shown on the metric cards

**Panel placement & layout**
- Summary panel lives inside the existing KBInsights section, below the metric cards — one unified "Organizational Metrics" section
- Card container with AI accent (gradient bg, AI badge) matching the metric card style — visually cohesive
- Always visible when the section is visible — not collapsible independently
- Separate "Regenerate" button from "Extract Metrics" — independent controls for summary vs metrics

**Regenerate UX & status**
- Status indicator uses text label + icon (e.g., "Ready - Generated 2h ago" or spinner + "Generating...") — matches the existing "Last extracted" pattern
- Inline error message below the button on failure — previous summary stays visible, user can retry (matches Phase 8 error pattern)
- No confirmation dialog — click Regenerate = generate immediately (matches Phase 8's Extract Metrics precedent)
- Role-gated: admin + manager can trigger regeneration; other roles see cached summary only

**Stale data display**
- Previous summary remains visible during regeneration with a subtle "Regenerating..." indicator — never shows blank screen (success criteria #4)
- Timestamp-only staleness display ("Generated 3 days ago") — informational, no color warning
- First-ever empty state: friendly prompt message like "Click Regenerate to create your first AI summary" with the button visible — guides first-time use

### Claude's Discretion
- Exact Chat Completions prompt engineering for summary generation
- Whether to use the same kbSummaryCache table (add summary fields) or create a separate table — ROADMAP.md notes "shares kbSummaryCache" so same table is preferred
- Model choice (gpt-4o matching extraction, or configurable via AI Config)
- Summary bullet formatting details (bold keywords, sentence structure)
- Loading/generating animation specifics

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUM-01 | Admin/manager can generate a 3-5 bullet organizational summary from KB documents | Chat Completions action follows the same document download pipeline as `extractMetrics`; plain text response (no json_schema needed); summary prompt injects both raw doc text and extracted KPI values |
| SUM-02 | Manual Regenerate button triggers summary refresh, gated to admin/manager roles | Client-side `canRegenerate` check matches Phase 8's `canExtract` pattern; `useAction(api.kbInsightsActions.generateSummary)` hook; button disabled during generation |
| SUM-03 | Generation status indicator shows current state (idle/generating/ready/failed) with "Generated X ago" timestamp | `summaryGenerating` boolean field added to kbSummaryCache; `timeAgo(cache.summaryGeneratedAt)` utility already in `@/lib/utils`; status derived from generating flag + error state |
| SUM-04 | Stale cached summary remains visible during regeneration (no blank screen) | `cache.summaryBullets` always rendered when present; `summaryGenerating` flag only adds a subtle overlay/indicator; delete-then-insert pattern is NOT used for summary — patch-only to preserve existing content during regeneration |
</phase_requirements>

---

## Summary

Phase 9 extends the existing Phase 8 infrastructure with a narrative AI summary panel. The implementation has two parts: a backend `generateSummary` Convex action (added alongside `extractMetrics` in `kbInsightsActions.ts`) and a frontend summary panel section added below the metric cards in `KBInsights.tsx`.

The most important architectural decision confirmed by research: use **Chat Completions with plain text output** (not Assistants API file_search). REQUIREMENTS.md SUM-01 mentions "Assistants API file_search" but STATE.md explicitly overrides this: "KB extraction must use Chat Completions with json_schema (NOT Assistants API file_search — non-deterministic, no structured output)". The same reasoning applies to the summary — for a deterministic, controllable narrative output, Chat Completions is the correct tool. The document download pipeline from `extractMetrics` is reused verbatim.

The `kbSummaryCache` table (singleton, no index, queried with `.first()`) gains three new fields: `summaryBullets` (array of strings), `summaryGeneratedAt` (number timestamp), and `summaryGenerating` (boolean). This extends the existing singleton rather than creating a new table — matching the "shares kbSummaryCache" directive. Crucially, summary regeneration uses `ctx.db.patch()` to update the existing row (NOT delete-then-insert) to preserve the previous summary content during generation (SUM-04 requirement).

**Primary recommendation:** Add `generateSummary` action to `kbInsightsActions.ts` using the existing document download + Chat Completions pattern. Extend `kbSummaryCache` schema with 3 new summary fields. Add summary panel below metric cards in `KBInsights.tsx` with independent state management following the `isExtracting` pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai (npm) | already installed | Chat Completions API for narrative summary generation | Same pattern as `extractMetrics`; dynamic import in "use node" action |
| Convex | already in use | Backend action + mutation + reactive query | All data flows through Convex; no new dependencies |
| React | already in use | Component state for `isGenerating`, `error` local state | useAction + useState follows established Phase 8 pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `timeAgo` from `@/lib/utils` | already in use | "Generated X ago" display | Used for `cache.summaryGeneratedAt` timestamp display |
| `cn` from `@/lib/utils` | already in use | Conditional className assembly | Button disabled states, conditional opacity |
| `StatCardSkeleton` | already in use | Loading skeleton | Not used for summary (previous content shown during regen instead) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Chat Completions plain text | Assistants API file_search | Assistants API is non-deterministic and does not support structured output — rejected per project decision |
| Extend kbSummaryCache table | Separate `kbNarrativeCache` table | Separate table adds complexity with no benefit; singleton pattern already proven; same table is preferred per CONTEXT.md |
| `ctx.db.patch()` for summary update | delete-then-insert | Delete-then-insert would erase previous bullets during generation, violating SUM-04; patch preserves stale content |

**Installation:** No new packages needed — `openai` and all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
convex/
├── schema.ts                 # Add summaryBullets, summaryGeneratedAt, summaryGenerating fields to kbSummaryCache
├── kbInsights.ts             # Add: getSummaryGenerating query, setSummaryGenerating internalMutation, saveSummary internalMutation
└── kbInsightsActions.ts      # Add: generateSummary action (alongside extractMetrics)

src/components/dashboard/
└── KBInsights.tsx            # Extend: add SummaryPanel sub-section below metric cards grid
```

### Pattern 1: Summary Action (mirrors extractMetrics)

**What:** Convex action with `"use node"` that downloads KB docs, builds document blocks, calls Chat Completions, saves result via internal mutation.
**When to use:** Any AI generation requiring npm packages (openai) in Convex.

```typescript
// convex/kbInsightsActions.ts — add generateSummary alongside extractMetrics
export const generateSummary = action({
  args: {},
  handler: async (ctx) => {
    // 1. Set generating flag (patch, not delete-insert)
    await ctx.runMutation(internal.kbInsights.setSummaryGenerating, { generating: true });

    try {
      const OpenAI = (await import("openai")).default;
      const apiKey = await getOpenAIApiKey(ctx);
      const openai = new OpenAI({ apiKey });

      // 2. Load all KB files (same as extractMetrics)
      const files = await ctx.runQuery(api.knowledgeBase.listFiles);
      if (files.length === 0) {
        await ctx.runMutation(internal.kbInsights.setSummaryGenerating, { generating: false });
        throw new Error("No KB documents uploaded.");
      }

      // 3. Download text content (same isBinaryContent check)
      const documentBlocks: string[] = [];
      for (const file of files) {
        const url = await ctx.storage.getUrl(file.storageId);
        if (!url) continue;
        const response = await fetch(url);
        const text = await response.text();
        if (text.length > 0 && !isBinaryContent(text)) {
          documentBlocks.push(
            `=== Document: ${file.fileName} ===\n${text}`
          );
        }
      }

      // 4. Inject extracted KPI metrics as context (avoids contradicting stat cards)
      const cache = await ctx.runQuery(api.kbInsights.getCache);
      const kpiContext = cache?.metrics
        ?.filter((m) => m.value !== null)
        .map((m) => `${m.label}: ${m.value} ${m.unit ?? ""}`.trim())
        .join(", ") ?? "";

      // 5. Chat Completions — plain text (no json_schema needed)
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.3,
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              kpiContext ? `Known KPI metrics (use as reference, do not contradict): ${kpiContext}` : "",
              `Summarize these ${documentBlocks.length} documents:\n\n${documentBlocks.join("\n\n")}`,
            ].filter(Boolean).join("\n\n"),
          },
        ],
      });

      const rawText = completion.choices[0].message.content ?? "";
      // Parse bullets: split on newlines, strip leading "- " or "• " or "* "
      const bullets = rawText
        .split("\n")
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter((l) => l.length > 0)
        .slice(0, 5); // enforce 3-5 max

      // 6. Persist using patch (preserves row, does not erase previous summary)
      await ctx.runMutation(internal.kbInsights.saveSummary, {
        summaryBullets: bullets,
        summaryGeneratedAt: Date.now(),
      });

      return { success: true, bulletCount: bullets.length };
    } catch (error) {
      await ctx.runMutation(internal.kbInsights.setSummaryGenerating, { generating: false });
      throw error;
    }
  },
});
```

### Pattern 2: Schema Extension (kbSummaryCache)

**What:** Add three optional fields to the existing `kbSummaryCache` table definition in `schema.ts`.
**Why optional:** The row may exist with only metrics (Phase 8) before any summary has been generated.

```typescript
// convex/schema.ts — extend kbSummaryCache definition
kbSummaryCache: defineTable({
  extractedAt: v.number(),
  documentCount: v.number(),
  extracting: v.boolean(),
  metrics: v.array(v.object({ /* existing shape */ })),
  // NEW — Phase 9 summary fields
  summaryBullets: v.optional(v.array(v.string())),
  summaryGeneratedAt: v.optional(v.number()),
  summaryGenerating: v.optional(v.boolean()),
}),
```

### Pattern 3: Patch-Based Summary Persistence (NOT delete-then-insert)

**What:** `saveSummary` internalMutation uses `ctx.db.patch()` to update the existing row, preserving all metric data.
**Why critical:** SUM-04 requires the previous summary to remain visible during regeneration. If the row were deleted, the `getCache` query would return `null`, blanking the UI.

```typescript
// convex/kbInsights.ts
export const saveSummary = internalMutation({
  args: {
    summaryBullets: v.array(v.string()),
    summaryGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        summaryGenerating: false,
      });
    } else {
      // Edge case: no row yet (metrics never extracted); create minimal row
      await ctx.db.insert("kbSummaryCache", {
        extractedAt: 0,
        documentCount: 0,
        extracting: false,
        metrics: [],
        ...args,
        summaryGenerating: false,
      });
    }
  },
});

export const setSummaryGenerating = internalMutation({
  args: { generating: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      await ctx.db.patch(existing._id, { summaryGenerating: args.generating });
    } else if (args.generating) {
      // Insert placeholder so UI can show "Generating..." even before any data
      await ctx.db.insert("kbSummaryCache", {
        extractedAt: 0,
        documentCount: 0,
        extracting: false,
        metrics: [],
        summaryGenerating: true,
      });
    }
  },
});
```

### Pattern 4: Frontend Summary Panel (extends KBInsights.tsx)

**What:** Add `isGenerating` local state + `summaryAction` hook alongside the existing `extracting` / `extractAction` pattern. Render a summary panel below the metric cards grid.

```typescript
// src/components/dashboard/KBInsights.tsx — additions

const summaryAction = useAction(api.kbInsightsActions.generateSummary);
const [generating, setGenerating] = useState(false);
const [summaryError, setSummaryError] = useState<string | null>(null);

const isGenerating = generating || (cache?.summaryGenerating ?? false);
const canRegenerate =
  currentUser?.role === "admin" || currentUser?.role === "manager";

const hasSummary = cache?.summaryBullets && cache.summaryBullets.length > 0;

const handleGenerateSummary = async () => {
  setGenerating(true);
  setSummaryError(null);
  try {
    await summaryAction({});
  } catch (err) {
    setSummaryError(err instanceof Error ? err.message : "Summary generation failed");
  } finally {
    setGenerating(false);
  }
};

// Summary panel JSX (below metric cards, inside same <div className="space-y-4">)
```

### Pattern 5: System Prompt for Summary Generation

**What:** A focused executive briefing prompt instructing the model to produce exactly 3-5 bullets, avoid hallucination, and reference KPI context.

```typescript
const SUMMARY_SYSTEM_PROMPT = `You are an executive briefing assistant for the Dads' Education Center (DEC), a nonprofit.

Generate exactly 3-5 concise bullet points summarizing organizational highlights from the provided documents. Each bullet should be boardroom-ready — factual, specific, and useful for stakeholder conversations.

RULES:
1. Use only information explicitly stated in the documents. Do not invent or estimate.
2. If KPI metrics are provided, reference them directly (e.g., "47 clients served in Q4") — do not contradict them.
3. Include both wins and areas needing attention for a balanced picture.
4. Each bullet: one to two sentences, start with a bold keyword or program name, no source citations.
5. Return ONLY the bullet points, one per line, starting with "- ".
6. Write 3-5 bullets — no more, no fewer.`;
```

### Anti-Patterns to Avoid

- **Using delete-then-insert for summary persistence:** Erases the existing summary row during generation, causing a blank screen mid-refresh (violates SUM-04).
- **Using json_schema response_format for summary:** Unnecessary complexity — plain text with line parsing is sufficient and more flexible.
- **Auto-triggering summary on component mount:** Costs $0.50-$1.00 per call at gpt-4o rates; manual Regenerate only.
- **Reusing the `extracting` flag for summary generation:** Two independent operations need independent flags; `summaryGenerating` is separate from `extracting`.
- **Calling `getExtracting` as a separate query for summary:** Add `summaryGenerating` to the same `getCache` row — one reactive query covers all state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Generated X ago" text | Custom timestamp formatter | `timeAgo(cache.summaryGeneratedAt)` from `@/lib/utils` | Already implemented, handles all edge cases |
| Spinner during generation | Custom CSS animation | `animate-spin` Tailwind class — exact same SVG as Extract Metrics button | Already used in Phase 8, visually consistent |
| Bullet parsing | Complex regex | `.split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(l => l.length > 0)` | LLM output is predictable; simple split sufficient |
| Role check | RBAC middleware | `currentUser?.role === "admin" || currentUser?.role === "manager"` | Client-side gate matches Phase 8 `canExtract` exactly |
| Loading skeleton during initial regen | Skeleton component | Show stale summary + opacity reduction overlay | SUM-04 requires previous content to stay visible |

**Key insight:** Every visual and data pattern needed already exists in Phase 8. Phase 9 is additive — no new component primitives, no new libraries, no new query patterns.

---

## Common Pitfalls

### Pitfall 1: Blanking the Summary During Regeneration

**What goes wrong:** If `saveSummary` uses delete-then-insert, the `getCache` query returns `null` during the gap between delete and insert. The frontend shows an empty/loading state instead of the previous summary.
**Why it happens:** `saveCache` for metrics uses delete-then-insert (safe there because there's no "stale metrics visible during regen" requirement). Copying that pattern blindly breaks SUM-04.
**How to avoid:** `saveSummary` MUST use `ctx.db.patch()` — update the `summaryBullets` and `summaryGenerating` fields on the existing row without deleting it.
**Warning signs:** "Click Regenerate → summary disappears → reappears" in testing.

### Pitfall 2: Sharing the `extracting` Flag

**What goes wrong:** Using `cache?.extracting` to gate the Regenerate button, or using `setSummaryGenerating` to also affect `extracting`, causing Extract Metrics button to appear disabled during summary generation (or vice versa).
**Why it happens:** Both operations share the same singleton row; tempting to reuse one flag.
**How to avoid:** Add a dedicated `summaryGenerating` field. The UI checks `cache?.summaryGenerating` for the Regenerate button and `cache?.extracting` for the Extract Metrics button — fully independent.
**Warning signs:** Extract Metrics button shows spinner when Regenerate is clicked.

### Pitfall 3: Schema Not Deployed Before Testing

**What goes wrong:** Adding `summaryBullets`, `summaryGeneratedAt`, `summaryGenerating` to `schema.ts` but forgetting to run `npx convex dev --once`. Convex validation errors on `patch()` calls with unknown fields.
**Why it happens:** Schema changes require a Convex deployment to take effect.
**How to avoid:** Schema update in Task 1 of 09-01; deployment step must be performed by user interactively (noted gotcha from Phase 8 execution).
**Warning signs:** `Error: Value does not match validator` from Convex mutations.

### Pitfall 4: LLM Returns More Than 5 Bullets

**What goes wrong:** Despite the prompt saying "3-5 bullets", the model occasionally returns 6+ bullets (especially with many documents).
**Why it happens:** Models don't always follow numeric constraints precisely.
**How to avoid:** Hard-clip the parsed array: `.slice(0, 5)`. Accept 3-5 as the range — if fewer than 3 come back, display what's there without error.
**Warning signs:** More than 5 bullets render in the panel on first test.

### Pitfall 5: Binary/PDF Documents Sent to Summary

**What goes wrong:** PDFs stored in Convex storage return garbled binary when fetched with `response.text()`. Including this in the prompt wastes tokens and confuses the model.
**Why it happens:** Phase 8 already solved this with `isBinaryContent()` helper.
**How to avoid:** Reuse `isBinaryContent` (already exported-compatible from `kbInsightsActions.ts` — define it once, reference in both functions or keep per-function).
**Warning signs:** Summary contains nonsensical characters or errors about encoding.

---

## Code Examples

### Existing Pattern: document download pipeline (from kbInsightsActions.ts)

```typescript
// Already in extractMetrics — reuse verbatim for generateSummary
const files = await ctx.runQuery(api.knowledgeBase.listFiles);
const documentBlocks: string[] = [];
for (const file of files) {
  const url = await ctx.storage.getUrl(file.storageId);
  if (!url) continue;
  const response = await fetch(url);
  const text = await response.text();
  if (text.length > 0 && !isBinaryContent(text)) {
    documentBlocks.push(
      `=== Document: ${file.fileName} ===\n${text}`
    );
  }
}
```

### Existing Pattern: extracting flag lifecycle (from kbInsights.ts)

```typescript
// setExtracting uses patch when row exists, insert when not (same approach for setSummaryGenerating)
export const setExtracting = internalMutation({
  args: { extracting: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      await ctx.db.patch(existing._id, { extracting: args.extracting });
    } else if (args.extracting) {
      await ctx.db.insert("kbSummaryCache", {
        extracting: true, extractedAt: 0, documentCount: 0, metrics: [],
      });
    }
  },
});
```

### Existing Pattern: role-gated button with inline spinner (from KBInsights.tsx)

```typescript
{canExtract && (
  <button
    onClick={handleExtract}
    disabled={isExtracting}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5",
      "px-4 py-1.5 text-sm font-medium text-primary",
      "hover:bg-primary/10 transition-colors",
      "disabled:opacity-50 disabled:cursor-not-allowed"
    )}
  >
    {isExtracting ? (
      <><SpinnerSVG /> Extracting...</>
    ) : (
      "Extract Metrics"
    )}
  </button>
)}
```

### New Pattern: Summary panel JSX structure

```tsx
{/* AI Summary Panel — below metric cards */}
<div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-surface to-primary/[0.03] p-5 shadow-[var(--warm-shadow-sm)]">
  {/* Panel header */}
  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <SparkleIcon /> AI Summary
      </div>
      {isGenerating && (
        <span className="text-xs text-muted flex items-center gap-1">
          <SpinnerSVG className="h-3 w-3" /> Regenerating...
        </span>
      )}
    </div>
    <div className="flex items-center gap-3">
      {cache?.summaryGeneratedAt && (
        <span className="text-xs text-muted">
          Generated {timeAgo(cache.summaryGeneratedAt)}
        </span>
      )}
      {canRegenerate && (
        <button onClick={handleGenerateSummary} disabled={isGenerating} className={cn(/* same pill style */)}>
          {isGenerating ? "Regenerating..." : "Regenerate"}
        </button>
      )}
    </div>
  </div>

  {/* Content area */}
  {hasSummary ? (
    <ul className={cn("space-y-2", isGenerating && "opacity-60 transition-opacity")}>
      {cache.summaryBullets!.map((bullet, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground leading-relaxed">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  ) : (
    /* Empty state — first-ever generation */
    <div className="flex flex-col items-center justify-center py-8 text-muted text-center">
      <SparkleIcon className="h-8 w-8 opacity-40 mb-2" />
      <p className="text-sm font-medium">No summary generated yet</p>
      <p className="text-xs mt-1 max-w-xs">
        {canRegenerate
          ? "Click Regenerate to create your first AI summary"
          : "An admin or manager can generate a summary from KB documents"}
      </p>
    </div>
  )}

  {/* Inline error */}
  {summaryError && (
    <p className="text-xs text-danger mt-3">{summaryError}</p>
  )}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Assistants API file_search (SUM-01 original spec) | Chat Completions plain text | Phase 8 decision recorded in STATE.md | More deterministic output; avoids file_search non-determinism; no vector store dependency |
| Separate table for summary cache | Extend existing kbSummaryCache singleton | CONTEXT.md decision | Simpler — one `getCache` query serves both metrics and summary; no additional index |
| delete-then-insert for all cache updates | patch for summary, delete-then-insert for metrics only | Phase 9 design | Summary patch preserves stale content during regen (SUM-04); metrics delete-then-insert is still correct for a full replacement |

**Deprecated/outdated:**
- Assistants API file_search for KB summary: SUM-01 requirement text references this but project STATE.md overrides it with Chat Completions — Chat Completions is authoritative for Phase 9.

---

## Open Questions

1. **Should `isBinaryContent` be extracted to a shared utility or kept duplicated?**
   - What we know: It exists in `kbInsightsActions.ts` as a private function. `generateSummary` needs the same logic.
   - What's unclear: The function is small enough (~5 lines) that duplication is acceptable, but it could live in `openaiHelpers.ts`.
   - Recommendation: Keep it co-located in `kbInsightsActions.ts` — define once at the top of the file, both `extractMetrics` and `generateSummary` use it. No import needed.

2. **What model to use for summary generation — hardcoded gpt-4o or respecting AI Config?**
   - What we know: `extractMetrics` hardcodes `gpt-4o`. The AI Config tab stores an OpenAI API key but not a model selector.
   - What's unclear: Whether the summary should be configurable.
   - Recommendation: Hardcode `gpt-4o` to match `extractMetrics`. If configurable model becomes a requirement, it's a future enhancement. Simpler now.

3. **Exact `temperature` for summary generation**
   - What we know: `extractMetrics` uses `temperature: 0` for deterministic structured extraction. Summary is narrative — slight variety is acceptable.
   - Recommendation: Use `temperature: 0.3` — low enough for consistent tone, high enough for natural-sounding prose. Avoids robotic repetition across regenerations.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `/convex/kbInsightsActions.ts` — Verified document download pipeline, Chat Completions pattern, `isBinaryContent`, error reset pattern
- Codebase: `/convex/kbInsights.ts` — Verified singleton row queries, patch vs insert patterns, `setExtracting` lifecycle
- Codebase: `/convex/schema.ts` — Verified current `kbSummaryCache` table structure; confirmed all fields optional strategy for extension
- Codebase: `/src/components/dashboard/KBInsights.tsx` — Verified `isExtracting` combined state pattern, role gate, inline error, `timeAgo` usage
- Codebase: `.planning/STATE.md` — Confirmed Chat Completions over Assistants API for both extraction and summary; confirmed patch-based update needed for SUM-04

### Secondary (MEDIUM confidence)

- Codebase: `/convex/aiDirectorActions.ts` — Cross-reference for Assistants API usage pattern (confirms it exists but is NOT appropriate for deterministic summary)
- `.planning/phases/09-ai-summary-panel/09-CONTEXT.md` — User decisions and locked constraints

### Tertiary (LOW confidence)

- None — all claims are verifiable from codebase inspection or established decisions in STATE.md/CONTEXT.md.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and in active use
- Architecture: HIGH — patterns are direct extensions of Phase 8 code, verified from source files
- Pitfalls: HIGH — derived from actual Phase 8 execution notes and structural constraints (SUM-04 delete-vs-patch is a logical certainty)

**Research date:** 2026-03-01
**Valid until:** Stable — no external library changes; valid until Convex or OpenAI SDK major versions change (estimate: 90 days)
