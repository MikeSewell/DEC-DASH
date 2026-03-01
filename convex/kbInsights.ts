import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the singleton kbSummaryCache row.
 * Returns null if no extraction has been run yet.
 */
export const getCache = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("kbSummaryCache").first();
  },
});

/**
 * Get the extracting boolean from the singleton row.
 * Returns false if no row exists (used by frontend to show/hide "Extracting..." state).
 */
export const getExtracting = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("kbSummaryCache").first();
    return row?.extracting ?? false;
  },
});

const metricSchema = v.object({
  key: v.string(),
  label: v.string(),
  value: v.union(v.string(), v.null()),
  unit: v.union(v.string(), v.null()),
  sourceDocument: v.union(v.string(), v.null()),
  conflictValue: v.optional(v.string()),
  conflictDocument: v.optional(v.string()),
});

/**
 * Replace the singleton kbSummaryCache row with fresh extraction results.
 * Uses delete-then-insert pattern (consistent with existing codebase singleton pattern).
 * Called internally from kbInsightsActions.extractMetrics.
 */
export const saveCache = internalMutation({
  args: {
    metrics: v.array(metricSchema),
    extractedAt: v.number(),
    documentCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("kbSummaryCache", {
      ...args,
      extracting: false,
    });
  },
});

/**
 * Set the extracting flag on the singleton row.
 * If extracting=true and no row exists, inserts a minimal placeholder row
 * so the frontend can show "Extracting..." before any extraction has completed.
 * Called internally to manage UI state during extraction.
 */
export const setExtracting = internalMutation({
  args: {
    extracting: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      await ctx.db.patch(existing._id, { extracting: args.extracting });
    } else if (args.extracting) {
      // Insert minimal placeholder so frontend can show "Extracting..." state
      await ctx.db.insert("kbSummaryCache", {
        extracting: true,
        extractedAt: 0,
        documentCount: 0,
        metrics: [],
      });
    }
  },
});

/**
 * Toggle the summaryGenerating flag on the singleton row.
 * Independent from the extracting flag — does NOT touch extracting or metrics.
 * If generating=true and no row exists, inserts a minimal placeholder so the
 * frontend can show "Generating..." before any summary has been produced.
 * Called internally from kbInsightsActions.generateSummary.
 */
export const setSummaryGenerating = internalMutation({
  args: {
    generating: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      await ctx.db.patch(existing._id, { summaryGenerating: args.generating });
    } else if (args.generating) {
      // Insert minimal placeholder so frontend can show "Generating..." state
      await ctx.db.insert("kbSummaryCache", {
        summaryGenerating: true,
        extracting: false,
        extractedAt: 0,
        documentCount: 0,
        metrics: [],
      });
    }
  },
});

/**
 * Persist generated summary bullets to the singleton row using ctx.db.patch().
 * CRITICAL: Uses patch (NOT delete-then-insert) to preserve existing metric data
 * so that regenerating a summary does not blank the KPI cards (SUM-04 requirement).
 * Also clears the summaryGenerating flag.
 * Called internally from kbInsightsActions.generateSummary on success.
 */
export const saveSummary = internalMutation({
  args: {
    summaryBullets: v.array(v.string()),
    summaryGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("kbSummaryCache").first();
    if (existing) {
      // Patch preserves extractedAt, documentCount, metrics, extracting — only updates summary fields
      await ctx.db.patch(existing._id, {
        summaryBullets: args.summaryBullets,
        summaryGeneratedAt: args.summaryGeneratedAt,
        summaryGenerating: false,
      });
    } else {
      // Edge case: summary generated before any metric extraction
      await ctx.db.insert("kbSummaryCache", {
        extractedAt: 0,
        documentCount: 0,
        extracting: false,
        metrics: [],
        summaryBullets: args.summaryBullets,
        summaryGeneratedAt: args.summaryGeneratedAt,
        summaryGenerating: false,
      });
    }
  },
});
