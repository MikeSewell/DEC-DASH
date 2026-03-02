---
phase: 22
plan: "22-01"
subsystem: "data-export"
tags: [export, csv, excel, clients, convex, xlsx]
dependency_graph:
  requires: []
  provides: [client-data-export, exportAll-query, exportUtils]
  affects: [clients-page, convex/clients.ts]
tech_stack:
  added: []
  patterns: [convex-skip-pattern, browser-blob-download, xlsx-buffer-type]
key_files:
  created:
    - src/lib/exportUtils.ts
  modified:
    - convex/clients.ts
    - src/app/(dashboard)/clients/page.tsx
decisions:
  - "XLSX.write uses type: buffer (not type: array) — type: array returns undefined in xlsx 0.18.5 CE"
  - "Export query uses Convex skip pattern so it never fires on page load — only fires when exportFormat state is non-null"
  - "Export button gated by userRole === admin (not isAdminOrManager) per plan spec"
  - "One row per enrollment; clients with zero enrollments emit one row with empty enrollment columns"
  - "No new npm packages — xlsx@0.18.5 was already installed"
metrics:
  duration: "150s"
  completed: "2026-03-02"
  tasks_completed: 2
  files_changed: 3
requirements_met:
  - XPRT-01
  - XPRT-02
  - XPRT-03
---

# Phase 22 Plan 01: Client Data Export (CSV + Excel) Summary

**One-liner:** Admin-only client export via Convex skip-pattern query producing date-stamped CSV/Excel files with full enrollment+session joins using xlsx@0.18.5 buffer mode.

## What Was Built

An admin-only Export dropdown button on the `/clients` page (Clients tab only) that downloads all clients with their demographics, enrollment history, and per-enrollment session counts as a CSV or Excel file.

### Backend (`convex/clients.ts`)

Added `exportAll` query:
- Gated by `requireRole(ctx, "admin")` as first line
- Joins clients + programs + enrollments + sessions in a single pass using in-memory Maps
- Returns 16-column flat array with human-readable keys (matching ExportRow type)
- One row per enrollment; clients with zero enrollments emit one row with empty enrollment/program/session columns
- `enrollmentDate` and `exitDate` (Unix ms) formatted as `YYYY-MM-DD` strings
- `dateOfBirth` passed through from client record (already ISO string)
- No `"use node"` directive needed — pure Convex query, no npm packages

### Frontend utilities (`src/lib/exportUtils.ts`)

New file with three functions:
- `downloadCsv(rows, filename)` — uses `XLSX.utils.json_to_sheet` + `XLSX.utils.sheet_to_csv`, triggers Blob download
- `downloadXlsx(rows, filename)` — uses `XLSX.write(wb, { bookType: "xlsx", type: "buffer" })`, triggers Blob download
- `triggerDownload(blob, filename)` — creates `<a>` element, clicks it, revokes URL

### Frontend page (`src/app/(dashboard)/clients/page.tsx`)

- Added `exportFormat` and `showExportMenu` state variables
- Added `exportData = useQuery(api.clients.exportAll, exportFormat ? {} : "skip")` — query only fires after user clicks a download option
- Added `useEffect` that runs when `exportData && exportFormat` — triggers download then resets `exportFormat` to null (unsubscribes query)
- Added Export dropdown button before Add Program/Add Client buttons, visible only when `userRole === "admin"` AND `pageView === "clients"`
- Dropdown uses fixed full-screen overlay (z-40) behind the menu (z-50) for outside-click dismissal
- Button shows loading spinner while export is in flight (`exportFormat !== null`)
- Filename format: `dec-clients-YYYY-MM-DD.csv` / `dec-clients-YYYY-MM-DD.xlsx`

## Verification Results

All plan verification criteria confirmed:
- `convex/clients.ts` exports `exportAll` query with `requireRole(ctx, "admin")` as first line
- `exportAll` returns array with 16 keys matching ExportRow type
- Clients with zero enrollments produce one row with empty enrollment columns
- Clients with multiple enrollments produce one row per enrollment
- `enrollmentDate` appears as `YYYY-MM-DD` string not Unix number
- `src/lib/exportUtils.ts` exists with `downloadCsv` and `downloadXlsx` exports
- `XLSX.write` uses `type: "buffer"` not `type: "array"`
- No new npm packages added
- Export button appears only for admin users on the Clients tab
- `npm run build` passes with no TypeScript errors

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| T1 | 1ef62bc | feat(22-01): add exportAll query and exportUtils client-side helpers |
| T2 | ae0b9aa | feat(22-01): add Export button to clients page (admin only) |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `convex/clients.ts` modified — exportAll query added at line 634
- [x] `src/lib/exportUtils.ts` created with downloadCsv/downloadXlsx
- [x] `src/app/(dashboard)/clients/page.tsx` modified with export state+button+query
- [x] Commit 1ef62bc exists
- [x] Commit ae0b9aa exists
- [x] `npm run build` passes
