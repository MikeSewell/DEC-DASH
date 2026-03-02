# Handoff: Programs Page Overhaul (continued)

## Status
Programs page restructured. Overview tab with program cards + demographics charts working. Needs user review and feedback.

## What's Done This Session
- ✓ Restructured Programs page: 2 tabs (Programs | Clients) instead of 3 (Clients | Demographics | Client Activity)
- ✓ Programs tab is now default landing view
- ✓ Program selector cards at top: "All Programs" + per-program cards with participant counts
- ✓ Clicking a program card filters all demographics charts below to that program
- ✓ Clicking again (or "All Programs") shows global view
- ✓ Demographics charts (ethnicity, gender, age, referral, zip) shown directly on overview — no drill-down needed
- ✓ Removed "Enrolled" card from Clients tab stats
- ✓ Removed all attendance rate / completion rate / returning / sessions stats (meaningless — data comes from sign-in sheets)
- ✓ Removed "Iceberg AI" references — all now "AI Director"
- ✓ `getProgramOverview` query made optional (works with or without programId)
- ✓ Zip codes removed from stat cards (data quality issues: "Unknown" counted, junk entries, out-of-area zips)
- ✓ Build passes clean

## Key Data Quality Notes
- 428 clients imported, only 414 have zip codes in spreadsheet
- 156 clients have "Unknown" as zip in database
- 2 junk zips: "914 L" (typo), "V6G1E" (Canadian)
- 82 Bay Area zips (94xxx/95xxx) = actual service area
- 33 out-of-area zips scattered nationally
- No session records exist — all client data from sign-in sheet import
- Attendance/completion/returning metrics are meaningless for this data

## Files Modified
- `src/components/analytics/ProgramOverviewTab.tsx` — NEW, main Programs tab component
- `src/app/(dashboard)/clients/page.tsx` — restructured tabs, removed DemographicsTab/ClientActivityTab imports
- `convex/analytics.ts` — `getProgramOverview` args changed to optional programId
- `src/components/analytics/DemographicsTab.tsx` — added overview stats (now orphaned, replaced by ProgramOverviewTab)
- `src/components/analytics/ClientActivityTab.tsx` — orphaned (no longer imported)
- `.planning/PROJECT.md` — removed "Iceberg AI" reference
- `DEC-DASH-Features-Pricing.md` — removed "Iceberg AI" reference

## Orphaned Files (can be deleted)
- `src/components/analytics/DemographicsTab.tsx`
- `src/components/analytics/ClientActivityTab.tsx`

## What May Need Attention Next
- User feedback on the new Programs overview layout
- Whether zip code chart should filter to Bay Area only or show all
- Whether AI Director chat should be able to query zip/demographic data (user mentioned this)
- Phase 24: Calendar Multi-Select (next on roadmap)
- Phase 25: Production Deploy
