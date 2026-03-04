---
phase: 30-qb-budget-data-pipeline
plan: "01"
subsystem: convex-backend
tags: [schema, convex, budget, quickbooks, internal-mutations]
dependency_graph:
  requires: []
  provides: [budgetCache-table, upsertBudgetRecord, batchUpsertBudgetRecords, getAllBudgetRecords]
  affects: [convex/schema.ts, convex/budgetInternal.ts]
tech_stack:
  added: []
  patterns: [internalMutation-upsert-by-composite-index, json-string-batch-serialization]
key_files:
  created:
    - convex/budgetInternal.ts
  modified:
    - convex/schema.ts
decisions:
  - id: D1
    summary: "lineItems stored as JSON string (not array of objects) to avoid Convex nested-object schema complexity"
  - id: D2
    summary: "batchUpsertBudgetRecords accepts records as JSON string to avoid Convex argument size limits with deeply nested arrays"
  - id: D3
    summary: "grantId uses v.optional(v.id('grants')) for type-safe foreign key to grants table"
metrics:
  duration: "90 seconds"
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_changed: 2
---

# Phase 30 Plan 01: budgetCache Schema and Internal Mutations Summary

**One-liner:** Typed budgetCache Convex table (one row per budget+class) with composite-index upsert mutations for the QB budget sync pipeline.

## What Was Built

Added the storage foundation for the QB Budget Data Pipeline:

1. **`convex/schema.ts`** — `budgetCache` table with 22 total fields:
   - QB entity references: `budgetId`, `budgetName`, `classId`, `className`
   - Revenue figures: `revenueActual`, `revenueBudget`, `revenueVariance`, `revenuePercentUsed`
   - Expense figures: `expenseActual`, `expenseBudget`, `expenseVariance`, `expensePercentUsed`
   - Net figures: `netActual`, `netBudget`, `netVariance`, `netPercentUsed`
   - `lineItems` (JSON string of account-level breakdown)
   - `periodStart`, `periodEnd` (ISO date strings)
   - `grantId` (optional foreign key to `grants` table)
   - `syncedAt` (Unix timestamp)
   - Three indexes: `by_budgetId_classId` (composite), `by_grantId`, `by_syncedAt`

2. **`convex/budgetInternal.ts`** — Three internal functions:
   - `upsertBudgetRecord`: single-record upsert using composite index lookup (patch if exists, insert if not)
   - `batchUpsertBudgetRecords`: accepts JSON-serialized records array for bulk writes
   - `getAllBudgetRecords`: returns all cached records for sync freshness checks

## Decisions Made

| ID | Decision |
|----|----------|
| D1 | `lineItems` stored as JSON string — avoids Convex nested-object schema complexity, consistent with existing `quickbooksCache.data` pattern |
| D2 | `batchUpsertBudgetRecords` accepts `records: v.string()` (JSON) — avoids Convex argument size limits for deeply nested arrays |
| D3 | `grantId: v.optional(v.id("grants"))` — type-safe foreign key allows UI to do index scan by grant, filled during sync |

## Commits

| Hash | Message |
|------|---------|
| 85b8709 | feat(30-01): add budgetCache table to Convex schema |
| a9586ac | feat(30-01): create budgetInternal.ts with upsert mutations |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
