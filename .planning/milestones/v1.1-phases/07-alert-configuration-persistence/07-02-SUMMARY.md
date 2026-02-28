---
phase: 07-alert-configuration-persistence
plan: "02"
subsystem: frontend
tags: [alerts, admin, dismissals, toasts, convex-reactivity]
dependency_graph:
  requires: [07-01]
  provides: [alert-admin-ui, alert-dismissal-ui, alert-toast-system]
  affects: [admin-page, dashboard-panel]
tech_stack:
  added: []
  patterns: [useEffect-guarded-load, useRef-dedup-toasts, convex-reactive-filter]
key_files:
  created:
    - src/components/admin/AlertsConfig.tsx
  modified:
    - src/app/(dashboard)/admin/page.tsx
    - src/components/dashboard/WhatNeedsAttention.tsx
decisions:
  - "AlertsConfig uses useEffect-guarded load (same pattern as SettingsPanel) to avoid overwriting user edits on re-render"
  - "visibleAlerts computed client-side by filtering dismissedKeys from full alerts array — dismissal state does not affect server query"
  - "prevAlertIds ref gates toast behavior: first load toasts only critical, subsequent Convex updates toast all new IDs"
  - "Alerts tab inserted before audit-log in TABS array for logical grouping (integrations before system internals)"
metrics:
  duration_minutes: 12
  completed_date: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 7 Plan 02: Alert Frontend — Admin Config Tab, Dismissal UI, Enhanced Toasts Summary

**One-liner:** Admin Alerts tab with 5 editable thresholds, per-alert dismiss buttons persisted via Convex, and ref-deduped toast notifications for all new/changed alerts.

## What Was Built

### Task 1 — AlertsConfig Component and Admin Alerts Tab

Created `src/components/admin/AlertsConfig.tsx` — a form component that loads current alert thresholds from `api.alertConfig.get` and saves via `api.alertConfig.update`. Features:
- 5 number inputs (deadline window, budget variance, QB/Sheets/Calendar staleness) with labels and helper text
- `useEffect` with `loaded` guard initializes form fields from Convex data exactly once (prevents overwriting in-progress edits)
- Save button calls `update` mutation with all 5 values; shows "saved successfully" or "failed" message
- "Reset to Defaults" text button restores (30, 90, 1, 2, 2) in UI state without saving to Convex

Updated `src/app/(dashboard)/admin/page.tsx`:
- Added `"alerts"` to `AdminTab` union type
- Inserted Alerts tab with gear/cog SVG icon in `TABS` array (before audit-log)
- Added `case "alerts": return <AlertsConfig />` in `renderTabContent()`
- Imported `AlertsConfig` component

### Task 2 — Gear Icon, Dismiss Buttons, Enhanced Toasts in WhatNeedsAttention

Updated `src/components/dashboard/WhatNeedsAttention.tsx`:
- Added `useQuery(api.alertDismissals.getMyDismissals)` — returns `string[]` of dismissed alert keys for current user
- Added `useMutation(api.alertDismissals.dismiss)` — called when user clicks X on any alert
- `visibleAlerts` computed by filtering `alerts` against `dismissedKeys` — dismissed alerts are hidden without refetching
- `isLoading` now gates on both `alerts` and `dismissedKeys` being defined
- Gear icon `<Link href="/admin?tab=alerts">` added between panel title and count badge — routes to alert threshold config
- X dismiss button at far right of each alert row; calls `dismissAlert({ alertKey: alert.id })`
- Alert count badge uses `visibleAlerts.length` (excludes dismissed)
- Enhanced toast system using two `useRef` guards:
  - `initialLoadDone` — first render toasts only critical alerts (preserves original behavior)
  - `prevAlertIds` — tracks previous alert ID set; subsequent Convex updates toast any new IDs not previously seen
  - `toastedIds` — prevents duplicate toasts within same browser session
  - New alerts use `"info"` variant; critical alerts use `"warning"` variant

## Verification

All 10 verification criteria from the plan are satisfied:
1. Admin page has 9 tabs — "Alerts" tab present, accessible at /admin?tab=alerts
2. AlertsConfig form shows 5 number inputs pre-populated from Convex
3. Save button calls `api.alertConfig.update` with success/error message
4. Reset to Defaults restores (30, 90, 1, 2, 2) without saving
5. WhatNeedsAttention header has gear icon linking to /admin?tab=alerts
6. Each alert item has dismiss (X) button
7. Dismissed alerts filtered from view via `getMyDismissals` (persisted in Convex)
8. First load: critical alerts trigger warning toasts
9. Subsequent Convex updates: new alert IDs trigger toast
10. `npm run build` passes

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 5e6145b | feat(07-02): add AlertsConfig component and Alerts tab to admin page |
| Task 2 | a6ed3a1 | feat(07-02): add gear icon, dismiss buttons, and enhanced toasts to WhatNeedsAttention |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: src/components/admin/AlertsConfig.tsx
- FOUND: src/app/(dashboard)/admin/page.tsx (contains "alerts")
- FOUND: src/components/dashboard/WhatNeedsAttention.tsx (contains "alertDismissals")
- Commits 5e6145b and a6ed3a1 exist in git log
- Build passes (npm run build completed with no errors)
