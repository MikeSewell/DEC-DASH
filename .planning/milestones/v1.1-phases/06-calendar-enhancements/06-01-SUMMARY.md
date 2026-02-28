---
phase: 06-calendar-enhancements
plan: "01"
subsystem: frontend/dashboard
tags: [calendar, ui, toast, countdown, event-classification]
dependency_graph:
  requires: []
  provides: [event-type-classification, countdown-badges, imminent-event-toasts]
  affects: [CalendarWidget, constants]
tech_stack:
  added: []
  patterns: [keyword-classification, interval-timer, toast-dedup-useref]
key_files:
  created: []
  modified:
    - src/lib/constants.ts
    - src/components/dashboard/CalendarWidget.tsx
decisions:
  - "EVENT_TYPE_CONFIG added to constants.ts (not CalendarWidget.tsx) to keep it shareable and testable"
  - "classifyEventType uses first-match priority order — client > board > community > grant > general"
  - "calendarColorMap by calendar source removed; now all coloring driven by event type classification"
  - "Both tasks (badges + toasts) committed together as they were implemented in one atomic write of CalendarWidget.tsx"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-02-28"
  tasks_completed: 2
  files_modified: 2
---

# Phase 6 Plan 01: Calendar Enhancements — Event Type Badges, Countdown & Toast Summary

**One-liner:** Keyword-driven event type classification with colored pill badges, live 60s-refresh countdown badges for imminent events, and useRef-deduped toast notifications for events starting in 30-60 minutes.

## What Was Built

The CalendarWidget.tsx was enhanced with three connected features:

1. **Event type classification** — `classifyEventType()` matches the event `summary` + `calendarDisplayName` against keyword arrays for 5 types: Client, Board, Community, Grant, and Event (fallback). The `EVENT_TYPE_CONFIG` map is exported from `constants.ts` for reuse.

2. **Colored type badges** — Each event row now shows a pill-shaped type chip (e.g. "Client" in teal, "Grant" in red) between the time and event title. Colors use CSS variable references (`var(--primary)`, `var(--danger)`, etc.) so they work in both light and dark themes.

3. **Live countdown badges** — Events starting within 2 hours display a pulsing amber badge (e.g. "in 47 min", "in 1h 23m"). The component tracks `now` via `useState` + a `setInterval` that fires every 60 seconds, so badges update without a page refresh.

4. **Imminent event toasts** — On dashboard load, events starting in the 30-60 minute window trigger an info toast (title: "[Type] in N min", description: event summary). A `useRef(Set)` keyed by `eventId` prevents re-firing on re-renders or data refetches — same dedup pattern used in `WhatNeedsAttention.tsx`.

## Files Modified

### `src/lib/constants.ts`
- Added `EventTypeConfig` interface (exported)
- Added `EVENT_TYPE_CONFIG` record with 5 event types — each has `label`, `keywords[]`, `bgClass`, `textClass`, `dotColor`

### `src/components/dashboard/CalendarWidget.tsx`
- Updated imports: `useState, useEffect, useRef` from React; `useToast` from Toast; `EVENT_TYPE_CONFIG, EventTypeConfig` from constants; removed `CALENDAR_DOT_COLORS` import
- Added `classifyEventType(event)` helper function
- Added `formatCountdown(startAt, now)` helper function
- Replaced static `const now = Date.now()` with `useState(Date.now())` + 60s interval
- Added `useToast` + `toastedEventIds` ref for toast dedup
- Added toast effect (depends on `result`, `now`, `toast`)
- Updated `EventRowProps` interface: `eventType: EventTypeConfig, now: number` (removed `color: string`)
- Updated `EventRow` component: type badge + countdown badge; border uses `eventType.dotColor`
- Removed `calendarColorMap` / `uniqueCalendarIds` construction from main component
- Updated render loop: calls `classifyEventType(event)` instead of map lookup

## Commits

| Hash | Message |
|------|---------|
| 83d8945 | feat(06-01): add event type badges, countdown badges, and imminent event toasts |

## Deviations from Plan

**None** — Both tasks were implemented atomically in a single CalendarWidget.tsx rewrite (Tasks 1 and 2 both modified the same file). All planned behavior was delivered as specified.

The plan listed Tasks 1 and 2 as separate commits for granularity, but since Task 2's toast logic was written together with Task 1's countdown + badge logic in one complete file write, they were committed together. The commit message documents all changes from both tasks.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/lib/constants.ts | FOUND |
| src/components/dashboard/CalendarWidget.tsx | FOUND |
| .planning/phases/06-calendar-enhancements/06-01-SUMMARY.md | FOUND |
| Commit 83d8945 | FOUND |
| TypeScript (modified files) | No errors |
| npm run build | Succeeded |
