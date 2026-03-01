# Phase 8: KB KPI Extraction - Research

**Researched:** 2026-03-01
**Domain:** OpenAI Chat Completions structured output, Convex caching pattern, dashboard section registration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Extract from ALL uploaded KB documents in a single Chat Completions call
- Each extracted metric tracks which specific document it came from (per-metric source attribution)
- All extraction schema fields are nullable — skip metrics not found in documents (no hallucinated values)
- When multiple documents contain conflicting values for the same metric, use the most recent document's value but flag the conflict
- Documents include both formal reports (impact reports, grant reports) and informal operational docs (meeting notes, program descriptions)
- New "AI Insights" card style visually distinct from QB-sourced StatCards — subtle AI badge or different accent color
- Section titled "Organizational Metrics" (not "KB Insights" or technical jargon)
- Positioned after Executive Snapshot — second section in dashboard order
- Dynamic card count — only show cards for metrics that were actually extracted (non-null)
- Responsive grid layout adapting to however many cards are present
- "Extract Metrics" button in the Organizational Metrics section header (same pattern as KnowledgeBaseManager's "Upload File" button)
- Role-gated: admin + manager can trigger extraction; other roles see cached results only
- During extraction (5-30 seconds): button changes to "Extracting..." (disabled), existing cached cards remain visible
- When extraction completes, cards update reactively via Convex subscription
- No confirmation dialog needed; no safeguard against re-extraction
- Each card shows subtitle with source document name (e.g., "from Q4-Impact-Report.pdf")
- Section-level "Last extracted" timestamp (one line for whole section, not per card)
- Null metrics: don't show the card at all (dynamic card count, no "N/A" placeholders)
- Conflict indicator: small amber warning icon on cards where multiple documents had different values; tooltip shows alternate value and document name

### Claude's Discretion

- Specific extraction schema fields (6-8 fields covering client/program metrics and mission impact outcomes relevant to DEC's legal, co-parent, and fatherhood programs)
- AI Insights card visual styling (accent color choice, badge design, how to differentiate from StatCard)
- Grid layout specifics (responsive breakpoints, card sizing)
- Exact extraction prompt engineering for Chat Completions
- How to download/pass KB document content to Chat Completions (Convex storage download vs OpenAI file content)
- Loading skeleton design for first-ever extraction (before any cache exists)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KB-01 | Admin can trigger extraction of organizational metrics (client counts, program stats, impact numbers) from KB documents via Chat Completions with json_schema | Chat Completions structured output with `response_format: { type: "json_schema", json_schema: { strict: true, schema: {...} } }`; action pattern from `knowledgeBaseActions.ts` + `kbInsightsActions.ts` (new) |
| KB-02 | Extracted KPI values display as dashboard stat cards with the source document name and extraction timestamp | `kbSummaryCache` table stores per-metric `sourceDocument` + section-level `extractedAt`; `KBInsights.tsx` component registered in `SECTION_COMPONENTS` map |
| KB-03 | All extraction schema fields are nullable — returns null when a metric is not explicitly found in documents (no hallucinated values) | JSON schema with `"type": ["number", "null"]` (or `"string", "null"`) for every metric field; `strict: true` enforces schema; system prompt instructs model to use null rather than guess |
| KB-04 | Extraction results are cached in Convex kbSummaryCache table and served reactively to the dashboard | New `kbSummaryCache` table (singleton row, replaced on each extraction); `kbInsights.ts` query returns cached result; `useQuery` in `KBInsights.tsx` auto-updates when cache row changes |
</phase_requirements>

## Summary

Phase 8 builds a KB KPI extraction pipeline: an OpenAI Chat Completions call that reads all KB documents from Convex storage, extracts 6-8 nullable organizational metrics with per-metric source attribution, caches the result in a new `kbSummaryCache` Convex table, and displays the metrics as a new "Organizational Metrics" dashboard section.

The codebase already has all necessary plumbing in place. `knowledgeBaseActions.ts` shows exactly how to download files from Convex storage via `ctx.storage.getUrl()` and `fetch()`. The OpenAI SDK (v6.22.0) is already installed and uses the dynamic `import("openai")` pattern with `"use node"` directive required for all Convex actions that use npm packages. The dashboard section registration pattern is well established — add an ID to `DashboardSectionId` union type, add an entry to `DEFAULT_DASHBOARD_SECTIONS`, and register a component in `SECTION_COMPONENTS`. The codebase currently uses `response_format: { type: "json_object" }` (old pattern) but the installed OpenAI v6.22.0 supports the newer `json_schema` structured outputs with `strict: true`, which is what the requirements specify for KB-01/KB-03.

The key discretionary design decision is how to pass document content to Chat Completions. The `knowledgeBaseActions.ts` pattern downloads file blobs from Convex storage; for text-extractable files (PDF, DOCX, TXT, MD) the content must be converted to text and concatenated into the user message since Chat Completions does not support file references like Assistants API. Total context size (all KB documents concatenated) must stay under the model's context window — gpt-4o supports 128K tokens, which is sufficient for typical organizational document collections.

**Primary recommendation:** Download all KB files from Convex storage, extract text content, concatenate with document delimiters into a single user message, use `response_format: { type: "json_schema", json_schema: { strict: true, schema: ... } }` to guarantee nullable structured extraction, then persist to a singleton `kbSummaryCache` row.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai | 6.22.0 (installed) | Chat Completions call with structured output | Already installed; project standard for all AI actions |
| convex | (installed) | Backend queries/mutations/actions; reactive data | Project backend; `kbSummaryCache` table follows same pattern as `quickbooksCache` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdf-parse | checked separately | Extract text from PDF blobs | Only if PDF text extraction in action is needed; simpler alternative is treating PDF as binary and relying on model's PDF understanding via base64 — but this approach is complex and untested |
| No new frontend deps needed | — | All UI components already exist | StatCardSkeleton, StatCardGridSkeleton, Card, Badge, Spinner all present |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `response_format: json_schema` | `response_format: json_object` (current codebase pattern) | `json_object` doesn't enforce field-level nullability or schema shape; `json_schema` with `strict: true` is the correct choice for KB-01/KB-03 |
| Downloading all files to action context | Using OpenAI `openaiFileId` references | Chat Completions does not support file references; only Assistants API / file_search uses `openaiFileId`. Must download and embed text in message. |
| gpt-4o | gpt-4o-mini | gpt-4o handles complex document extraction better; cost is acceptable at manual-trigger frequency |
| Singleton cache row | Per-extraction rows with history | No history requirement in v1.2; simpler singleton (`db.replace` pattern like `quickbooksCache`); history deferred to KB-08 |

**Installation:**
```bash
# No new packages needed — openai already installed
```

## Architecture Patterns

### Recommended Project Structure

```
convex/
├── schema.ts                   # Add kbSummaryCache table
├── kbInsights.ts               # queries: getCache; mutations: saveCache (internal)
├── kbInsightsActions.ts        # action: extractMetrics (downloads files, calls OpenAI)
src/components/dashboard/
└── KBInsights.tsx              # New dashboard section component
src/lib/constants.ts            # Add "kb-insights" to DEFAULT_DASHBOARD_SECTIONS (position 2)
src/types/index.ts              # Add "kb-insights" to DashboardSectionId union
src/app/(dashboard)/dashboard/page.tsx  # Add KBInsights to SECTION_COMPONENTS map
```

### Pattern 1: Convex Node Action with OpenAI Structured Output

**What:** Action uses `"use node"` directive, dynamic import of openai, `getOpenAIApiKey()` helper, and `response_format: { type: "json_schema" }` to guarantee shape.
**When to use:** Any Convex action calling OpenAI. Mandatory pattern in this project.

```typescript
// Source: convex/knowledgeBaseActions.ts (download pattern) + convex/allocationActions.ts (OpenAI pattern)
"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";

export const extractMetrics = action({
  args: {},
  handler: async (ctx) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    // 1. Load all KB files
    const files = await ctx.runQuery(api.knowledgeBase.listFiles);
    if (files.length === 0) throw new Error("No KB documents uploaded");

    // 2. Download and extract text content per file
    const documentBlocks: string[] = [];
    for (const file of files) {
      const url = await ctx.storage.getUrl(file.storageId);
      if (!url) continue;
      const response = await fetch(url);
      // For TXT/MD/JSON/HTML: decode as text directly
      // For PDF/DOCX: pass raw bytes as base64 in a user message part (see Pattern 3)
      const text = await response.text();
      documentBlocks.push(`=== Document: ${file.fileName} ===\n${text}`);
    }

    // 3. Call Chat Completions with json_schema
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "kpi_extraction",
          strict: true,
          schema: KPI_SCHEMA,  // defined separately
        },
      },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: documentBlocks.join("\n\n") },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content ?? "{}");

    // 4. Persist to kbSummaryCache
    await ctx.runMutation(internal.kbInsights.saveCache, {
      metrics: result.metrics,
      extractedAt: Date.now(),
      documentCount: files.length,
    });

    return result;
  },
});
```

### Pattern 2: kbSummaryCache Schema (Singleton Row)

**What:** Singleton table pattern — replace the single row on each extraction. Follows same pattern as `quickbooksCache` (single row per `reportType`). Use Convex `db.replace` or delete-then-insert.
**When to use:** Data that is periodically regenerated and only the latest version is needed.

```typescript
// convex/schema.ts — add to defineSchema:
kbSummaryCache: defineTable({
  extractedAt: v.number(),
  documentCount: v.number(),
  metrics: v.array(v.object({
    key: v.string(),            // e.g. "total_clients_served"
    label: v.string(),          // e.g. "Total Clients Served"
    value: v.union(v.string(), v.null_()),  // null when not found
    unit: v.optional(v.string()),           // e.g. "clients", "%", "$"
    sourceDocument: v.union(v.string(), v.null_()),  // fileName
    conflictValue: v.optional(v.string()),  // alternate value from different doc
    conflictDocument: v.optional(v.string()), // which doc had conflicting value
  })),
}),
```

### Pattern 3: PDF/Binary File Handling for Chat Completions

**What:** Chat Completions does NOT support file IDs — must embed content. For PDFs, gpt-4o can accept base64-encoded PDF content via a `file` content part (multimodal). For plain text files, use `response.text()` directly.
**When to use:** Handling the mix of PDF, DOCX, TXT, MD files in the KB.

```typescript
// Multimodal content part for PDF files — gpt-4o supports this
// Source: OpenAI docs (confirmed: gpt-4o supports PDF via base64 in content parts)
const parts: Array<{ type: string; [key: string]: unknown }> = [];

for (const file of files) {
  const url = await ctx.storage.getUrl(file.storageId);
  if (!url) continue;
  const response = await fetch(url);

  if (file.fileType === "application/pdf" || file.fileName.endsWith(".pdf")) {
    // PDF: encode as base64, pass as file content part
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    parts.push({
      type: "text",
      text: `=== Document: ${file.fileName} ===`,
    });
    parts.push({
      type: "file",
      file: {
        filename: file.fileName,
        file_data: `data:application/pdf;base64,${base64}`,
      },
    });
  } else {
    // TXT, MD, JSON, HTML, CSV: decode as text
    const text = await response.text();
    parts.push({
      type: "text",
      text: `=== Document: ${file.fileName} ===\n${text}`,
    });
  }
}
```

**IMPORTANT CAVEAT (LOW confidence):** The `file` content part for PDFs is a newer OpenAI feature. If it causes issues with the SDK version or Convex's Node runtime, fallback is to use a PDF-to-text npm package (e.g., `pdf-parse`) as a Convex action dependency. Simpler safe alternative: treat all files as text with `response.text()` — PDFs will produce garbled output but TXT/MD/JSON files (most DEC KB content) will work correctly, and the model can still extract metrics from readable text.

**Recommended safe approach:** Start with `response.text()` for all file types. Add PDF multimodal handling only if DEC KB documents are predominantly PDFs with poor text extraction results.

### Pattern 4: Dashboard Section Registration (5-step checklist)

**What:** Adding a new dashboard section requires updates to 4 files.
**When to use:** Every new dashboard section.

```typescript
// Step 1: src/types/index.ts — extend DashboardSectionId union
export type DashboardSectionId =
  | "executive-snapshot"
  | "kb-insights"          // ADD THIS
  | "grant-budget"
  // ...rest unchanged

// Step 2: src/lib/constants.ts — insert at position 1 (after executive-snapshot)
export const DEFAULT_DASHBOARD_SECTIONS = [
  { id: "executive-snapshot", title: "Executive Snapshot", description: "..." },
  { id: "kb-insights", title: "Organizational Metrics", description: "AI-extracted metrics from KB documents" }, // ADD
  // ...rest unchanged
];

// Step 3: src/app/(dashboard)/dashboard/page.tsx — add to SECTION_COMPONENTS map
import KBInsights from "@/components/dashboard/KBInsights";
const SECTION_COMPONENTS: Record<DashboardSectionId, React.ComponentType> = {
  "executive-snapshot": ExecutiveSnapshot,
  "kb-insights": KBInsights,   // ADD
  // ...rest unchanged
};

// Step 4 + 5: Create convex/kbInsights.ts + convex/kbInsightsActions.ts
// Create src/components/dashboard/KBInsights.tsx
```

### Pattern 5: Role-Gated Action Trigger

**What:** In dashboard components (which don't take props), get current user via `useQuery(api.users.getCurrentUser)` and check role client-side before showing/enabling the extraction button. The Convex action itself doesn't enforce role (follows existing pattern in `allocationActions.ts` which takes `userId` as arg). Role enforcement is UI-level.

```typescript
// KBInsights.tsx — role-gated button pattern
const currentUser = useQuery(api.users.getCurrentUser);
const canExtract = currentUser?.role === "admin" || currentUser?.role === "manager";

// Button only shown/enabled for admin+manager:
{canExtract && (
  <button
    onClick={handleExtract}
    disabled={extracting}
    className="..."
  >
    {extracting ? "Extracting..." : "Extract Metrics"}
  </button>
)}
```

### Pattern 6: KPI JSON Schema Definition

**What:** The `json_schema` shape defines 6-8 nullable metric fields covering DEC's programs. Strict mode requires every field to be either the value or null — no missing fields allowed.

```typescript
// Recommended extraction schema for DEC (Claude's discretion)
const KPI_SCHEMA = {
  type: "object",
  properties: {
    metrics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          value: { type: ["string", "null"] },
          unit: { type: ["string", "null"] },
          sourceDocument: { type: ["string", "null"] },
          conflictValue: { type: ["string", "null"] },
          conflictDocument: { type: ["string", "null"] },
        },
        required: ["key", "label", "value", "unit", "sourceDocument", "conflictValue", "conflictDocument"],
        additionalProperties: false,
      },
    },
  },
  required: ["metrics"],
  additionalProperties: false,
};

// DEC-specific metric keys to extract:
// - total_clients_served (e.g. "247 clients")
// - active_clients (e.g. "89")
// - legal_clients_served (e.g. "124")
// - coparent_clients_served (e.g. "98")
// - program_completion_rate (e.g. "72%")
// - volunteers_engaged (e.g. "34")
// - grants_managed (e.g. "12")
// - community_events (e.g. "18")
```

### Anti-Patterns to Avoid

- **Using `response_format: { type: "json_object" }` instead of `json_schema`:** The old pattern (used in `allocationActions.ts`) doesn't enforce nullability or field presence. For KB-03, strict schema is required.
- **Streaming Chat Completions:** Convex actions don't support streaming to client. Use standard `await openai.chat.completions.create(...)` — this is already documented in REQUIREMENTS.md as out of scope.
- **Calling `ctx.storage.getUrl()` from a query instead of action:** `ctx.storage.getUrl()` only works in actions and mutations, not queries. The extraction must be an action.
- **Storing metrics as a JSON string:** Follow type-safe Convex pattern — store as a proper `v.array(v.object(...))` in the schema, not as a stringified JSON blob (unlike `sections` in `newsletters` table which predates this pattern).
- **Editing `_generated/api.d.ts` manually:** It's auto-generated by `npx convex dev`. After adding `kbInsights.ts` and `kbInsightsActions.ts`, run `npx convex dev --once` to regenerate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured JSON output from OpenAI | Manual prompt + JSON.parse + try/catch fallback | `response_format: { type: "json_schema", strict: true }` | Eliminates parse failures; model guaranteed to return valid schema |
| Role checking in Convex action | Custom auth check inside action | `useQuery(api.users.getCurrentUser)` in component + client-side role check (existing project pattern) | Actions in this project take `userId` arg; role enforcement is UI-side per existing pattern |
| Singleton cache pattern | Custom versioning/TTL logic | Delete-old/insert-new or `db.replace` on the single `kbSummaryCache` row | Follows `quickbooksCache` pattern; no TTL needed (manual trigger) |
| File text extraction | Custom parser | `response.text()` for text files; base64 encode for PDFs | Simpler; handles TXT/MD/JSON/HTML which are the most common KB file types |

**Key insight:** The project already has 90% of the infrastructure needed. This phase is primarily about wiring existing patterns together (storage download, OpenAI action, Convex cache, dashboard section) plus adding one new piece: `json_schema` structured output.

## Common Pitfalls

### Pitfall 1: DOCX/PDF Files Break with response.text()
**What goes wrong:** Binary files (PDF, DOCX) passed through `response.text()` produce garbled Unicode — the model gets garbage instead of content.
**Why it happens:** `response.text()` interprets binary as UTF-8 text, producing corrupted characters for non-text formats.
**How to avoid:** Check `file.fileType` or file extension before deciding how to handle. For PDFs, use the multimodal base64 approach (Pattern 3 above) or skip binary files with a warning. For DOCX, there's no clean solution without `pdf-parse` / `mammoth` npm dep — consider limiting KB KPI extraction to text-readable files (TXT, MD, JSON, HTML, CSV) in the prompt/UI.
**Warning signs:** Model returns all nulls despite documents containing clear metrics — inspect which file types are in the KB.

### Pitfall 2: Convex Schema Deployment Required Before Frontend
**What goes wrong:** `kbSummaryCache` doesn't exist in the DB until schema is deployed. Running `npx convex dev --once` interactively is required.
**Why it happens:** Convex validates table references at deploy time. Adding code that references `kbSummaryCache` before schema deployment will break the dev server.
**How to avoid:** Plan 08-01 MUST include schema deployment step. The STATE.md already flags this: "Run `npx convex dev --once` interactively after Phase 8-01 to deploy kbSummaryCache schema."
**Warning signs:** `_generated/api.d.ts` type errors for `kbSummaryCache` table.

### Pitfall 3: json_schema strict Mode Requires additionalProperties: false at Every Level
**What goes wrong:** OpenAI rejects the schema with a validation error if any nested object is missing `additionalProperties: false` when `strict: true`.
**Why it happens:** Strict mode enforces complete schema at every object level, not just top level.
**How to avoid:** Set `additionalProperties: false` on the top-level object AND on the nested `metrics` array item object. All fields must be in `required` array. Use `type: ["string", "null"]` (array) for nullable fields, not `oneOf: [{ type: "string" }, { type: "null" }]` — simpler and supported.
**Warning signs:** `BadRequestError: Invalid schema for response_format 'json_schema'` from OpenAI.

### Pitfall 4: Extraction Runs With Zero KB Files
**What goes wrong:** Action called when `listFiles` returns empty array — produces empty metrics or throws.
**Why it happens:** Admin triggers extraction before uploading any documents.
**How to avoid:** Check `files.length === 0` at action start and throw a descriptive error. In the UI, disable the "Extract Metrics" button when no KB files exist, or show a message.
**Warning signs:** Empty state crashes or confusing "0 metrics extracted" result.

### Pitfall 5: Large KB Collection Exceeds Context Window
**What goes wrong:** Many large PDFs concatenated as text exceed gpt-4o's 128K token limit.
**Why it happens:** DEC KB may grow to include lengthy grant reports, impact reports, etc.
**How to avoid:** Add a token budget check (rough estimate: 1 token ≈ 4 characters). If estimated tokens exceed 100K, truncate documents to first N characters each with a note. Alternatively, process only the most recently uploaded N documents. For now (Phase 8), document this limitation in a comment — DEC's current KB is small.
**Warning signs:** `openai.BadRequestError: maximum context length exceeded`.

### Pitfall 6: Singleton Cache Row Not Properly Replaced
**What goes wrong:** Each extraction inserts a new row, causing the query to return multiple rows.
**Why it happens:** Using `db.insert` instead of replace-or-update pattern.
**How to avoid:** In `kbInsights.ts` internal mutation `saveCache`: query for existing row first, then `db.patch(existingId, ...)` or `db.delete(existingId)` + `db.insert(...)`. Follow the pattern from `quickbooksCache` which uses `by_reportType` index to find the existing row.
**Warning signs:** `getCache` query returns undefined even after extraction (query using `.first()` but multiple rows exist).

## Code Examples

Verified patterns from existing codebase:

### Convex Storage Download (from knowledgeBaseActions.ts)
```typescript
// Source: convex/knowledgeBaseActions.ts:23-29
const fileUrl = await ctx.storage.getUrl(args.storageId);
if (!fileUrl) throw new Error("File not found in storage");
const response = await fetch(fileUrl);
const blob = await response.blob();
const file = new File([blob], args.fileName, { type: args.fileType });
```

### OpenAI Dynamic Import + API Key Pattern (project standard)
```typescript
// Source: convex/knowledgeBaseActions.ts:9-10, openaiHelpers.ts
const OpenAI = (await import("openai")).default;
const apiKey = await getOpenAIApiKey(ctx);
const openai = new OpenAI({ apiKey });
```

### Internal Mutation Call from Action (project standard)
```typescript
// Source: convex/allocationActions.ts — pattern for action → internal mutation
await ctx.runMutation(internal.kbInsights.saveCache, { metrics, extractedAt, documentCount });
```

### Reactive Cache Query in Frontend
```typescript
// Source: src/components/dashboard/ExecutiveSnapshot.tsx — useQuery auto-updates
const cache = useQuery(api.kbInsights.getCache);
// cache is undefined while loading, null when no data, object when data available
```

### Role-Gated Trigger Button Pattern
```typescript
// Source: src/components/categorize/CategorizeTab.tsx:34,104-115
const currentUser = useQuery(api.users.getCurrentUser);
const canTrigger = currentUser?.role === "admin" || currentUser?.role === "manager";
// Disable/hide button based on canTrigger
```

### Conflict Indicator (Amber Warning Icon with Tooltip)
```typescript
// Use native title attribute for tooltip (project uses title= throughout, no tooltip library)
{metric.conflictValue && (
  <span
    title={`Conflict: ${metric.conflictDocument} reported "${metric.conflictValue}"`}
    className="ml-1 text-warning cursor-help"
  >
    <svg className="h-3.5 w-3.5 inline" ...>⚠</svg>
  </span>
)}
```

### kbInsights.ts Query Structure
```typescript
// convex/kbInsights.ts
import { query } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getCache = query({
  handler: async (ctx) => {
    return await ctx.db.query("kbSummaryCache").first();
  },
});

export const saveCache = internalMutation({
  args: {
    metrics: v.array(v.object({
      key: v.string(),
      label: v.string(),
      value: v.union(v.string(), v.null_()),
      unit: v.union(v.string(), v.null_()),
      sourceDocument: v.union(v.string(), v.null_()),
      conflictValue: v.optional(v.string()),
      conflictDocument: v.optional(v.string()),
    })),
    extractedAt: v.number(),
    documentCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Replace singleton row
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("kbSummaryCache", args);
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `response_format: { type: "json_object" }` | `response_format: { type: "json_schema", json_schema: { strict: true } }` | OpenAI structured outputs released Aug 2024, SDK v4.55+ | Guarantees exact schema shape and nullability — no more parse errors or hallucinated fields |
| Assistants API file_search for KB queries | Chat Completions with file text in message | Project decision (STATE.md) | Deterministic, structured, no vector store overhead for extraction tasks |

**Deprecated/outdated in this project context:**
- `response_format: { type: "json_object" }` — still works but doesn't enforce schema. Use `json_schema` for new extraction code per KB-01/KB-03 requirements.

## Open Questions

1. **PDF text extraction quality**
   - What we know: `response.text()` on a PDF blob returns garbled binary. gpt-4o multimodal supports PDF base64 file content parts (newer API feature). `pdf-parse` npm package is an alternative.
   - What's unclear: Which file types are actually in DEC's current KB? If it's mostly TXT/MD files, `response.text()` works fine for all of them.
   - Recommendation: Start with `response.text()` for simplicity. Add a file type filter comment noting PDF binary issue. If KB contains critical PDFs, add the base64 multimodal approach in Plan 08-01.

2. **`v.null_()` vs `v.union(v.string(), v.null_())` in Convex v2 schema**
   - What we know: Convex uses `v.null_()` (with underscore) for null type. `v.optional()` makes a field omittable (undefined), not nullable.
   - What's unclear: Whether Convex schema validators require explicit `v.union(v.string(), v.null_())` vs just `v.optional(v.string())` for nullable fields (which allows null OR undefined).
   - Recommendation: Use `v.union(v.string(), v.null_())` for explicitly nullable fields where the value must be present but can be null. This matches the semantics needed.

3. **gpt-4o model vs gpt-4o-mini for extraction**
   - What we know: `allocationActions.ts` uses `gpt-4o`. Cost at manual trigger frequency is low.
   - What's unclear: Whether gpt-4o-mini is sufficient for structured document extraction.
   - Recommendation: Use `gpt-4o` (consistent with existing project choices; better at complex document parsing).

## Sources

### Primary (HIGH confidence)
- Codebase: `convex/knowledgeBaseActions.ts` — storage download pattern verified directly
- Codebase: `convex/allocationActions.ts` — Chat Completions + OpenAI action pattern verified directly
- Codebase: `src/components/dashboard/ExecutiveSnapshot.tsx` — StatCard component pattern verified directly
- Codebase: `src/lib/constants.ts` — DEFAULT_DASHBOARD_SECTIONS registration pattern verified directly
- Codebase: `src/types/index.ts` — DashboardSectionId union type verified directly
- Codebase: `src/app/(dashboard)/dashboard/page.tsx` — SECTION_COMPONENTS map pattern verified directly
- Codebase: `convex/schema.ts` — Convex schema patterns (`v.union`, `v.array`, `v.object`) verified directly
- Codebase: `convex/openaiHelpers.ts` — `getOpenAIApiKey()` helper verified directly
- Codebase: `src/components/categorize/CategorizeTab.tsx` — role-gated action trigger pattern verified directly
- Package: openai@6.22.0 (installed) — version confirmed from node_modules

### Secondary (MEDIUM confidence)
- OpenAI Structured Outputs: `response_format: { type: "json_schema", strict: true }` feature introduced Aug 2024, supported in openai SDK v4.55+; v6.22.0 is well above threshold
- gpt-4o PDF multimodal support via base64 file content parts: documented in OpenAI API reference (August 2025 knowledge); SDK v6 supports this syntax

### Tertiary (LOW confidence)
- PDF multimodal content part exact syntax: `{ type: "file", file: { filename, file_data } }` — implementation may vary from training knowledge; needs validation against SDK v6.22.0 TypeScript types before use

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new dependencies
- Architecture: HIGH — all patterns taken directly from existing codebase files
- Pitfalls: HIGH — identified from direct code inspection (schema patterns, singleton rows, binary files)
- PDF handling: LOW — verify multimodal file content part syntax against SDK types before using

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable patterns; OpenAI API changes rarely affect installed SDK version)
