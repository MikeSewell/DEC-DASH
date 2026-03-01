---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Intelligence
status: unknown
last_updated: "2026-03-01T02:25:53.806Z"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** When Kareem opens this app each morning, he immediately sees the financial picture, client activity, upcoming deadlines, and what needs his attention — without switching tools or digging through data.
**Current focus:** v1.2 Intelligence — Phase 9: AI Summary Panel

## Current Position

Phase: 9 of 10 (AI Summary Panel) — IN PROGRESS
Plan: 1 of 2 in current phase (09-01 auto tasks complete — schema + backend; awaiting npx convex dev --once)
Status: 09-01 checkpoint:human-action — user must run npx convex dev --once to deploy schema
Last activity: 2026-03-01 — 09-01 schema extended, mutations and generateSummary action added

Progress: [###░░░░░░░] 50% (3/6 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 1 (v1.2)
- Average duration: 20 min
- Total execution time: 20 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8. KB KPI Extraction | 2/2 | 22 min | 11 min |
| 9. AI Summary Panel | 1/2 | 3 min | 3 min |
| 10. Donation Performance Charts | 0/2 | — | — |

*Updated after each plan completion*

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 08 P01 | 20 min | 3 tasks | 4 files |
| Phase 08 P02 | 2 | 2 tasks | 4 files |
| Phase 09 P01 | 3 min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Archived to PROJECT.md Key Decisions table.
Key decisions affecting v1.2:
- KB extraction must use Chat Completions with json_schema (NOT Assistants API file_search — non-deterministic, no structured output)
- All KPI schema fields nullable — returns null when metric not found (prevents hallucination)
- AI summary uses manual Regenerate only — no auto-trigger on load (cost runaway risk $0.50-$1.00/call)
- QB income designation admin UI required before donation chart (account names are org-specific, can't hardcode)

From 09-01 execution:
- saveSummary uses ctx.db.patch() (not delete-insert) — preserves existing metrics row during regeneration (SUM-04)
- summaryGenerating and extracting are separate Convex flags — independent pipelines, no cross-contamination
- generateSummary injects extracted KPI metrics as LLM context — prevents bullets contradicting stat cards
- Plain-text Chat Completions at temperature 0.3 — no json_schema needed for bullet list output

From 08-01 execution:
- Convex uses v.null() not v.null_() — this version's API differs from plan spec; auto-fixed during Task 1
- kbSummaryCache singleton table uses no index (queried with .first(), like quickbooksConfig pattern)
- conflictValue/conflictDocument are v.optional(v.string()) in Convex but type: ["string", "null"] in KPI_SCHEMA (OpenAI strict mode requires all fields in required array)
- [Phase 08]: v.null() not v.null_() — Convex current API uses v.null() for nullable validators; plan spec was incorrect
- [Phase 08]: conflictValue/conflictDocument: v.optional(v.string()) in Convex schema but type: [string,null] in KPI_SCHEMA — OpenAI strict mode requires all fields in required array
- [Phase 08]: MetricCard as inline component: simple enough for co-location in KBInsights.tsx
- [Phase 08]: Combined extracting state: isExtracting = local || cache.extracting for responsive UX across sessions

### Pending Todos

- Run npx convex dev --once to deploy kbSummaryCache schema changes (summaryBullets, summaryGeneratedAt, summaryGenerating)
- Execute Phase 9 09-02 (AI Summary Panel frontend — KBInsights.tsx AI summary section)
- Validate real QB P&L JSON shape (summarize_column_by=Month) before writing income parser in Phase 10-01
- Deploy to production after milestone: npm run build + rsync + pm2 restart

### Blockers/Concerns

- QB monthly P&L JSON column shape confirmed via community sources but not validated against DEC's QB config — must inspect one real API response before writing parser (Phase 10-01)
- DEC's QB income account names are unknown — admin designation UI (Phase 10-01) is required prerequisite before chart shows real data
- npx convex dev --once fails in non-interactive terminal — schema deploys must be run by user interactively

## Session Continuity

Last session: 2026-03-01
Stopped at: 09-01 checkpoint:human-action — schema extension + generateSummary action committed; user must run npx convex dev --once
Resume file: None
