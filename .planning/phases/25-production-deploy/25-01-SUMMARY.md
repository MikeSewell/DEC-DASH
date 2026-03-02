---
phase: 25-production-deploy
plan: 01
status: complete
started: 2026-03-02
completed: 2026-03-02
---

## Summary

Deployed the full v2.1 build to production VPS (187.77.19.63). Convex schema pushed via `npx convex dev --once`, Next.js standalone build compiled and rsynced to server, PM2 restarted successfully.

During human verification, discovered the "Programs" nav tab was pointing to `/clients` route. Renamed the route directory from `clients/` to `programs/` and updated all internal references for consistency.

## Key Files

### Modified
- `src/app/(dashboard)/programs/page.tsx` — renamed from clients/
- `src/app/(dashboard)/programs/[id]/page.tsx` — renamed from clients/[id]/
- `src/lib/constants.ts` — nav href and role map updated to /programs
- `src/app/(dashboard)/analytics/page.tsx` — redirect updated to /programs
- `src/components/dashboard/ClientActivity.tsx` — link updated to /programs

## Deviations

- **Route rename**: Plan didn't include renaming `/clients` to `/programs`, but user flagged the inconsistency during verification. The nav label said "Programs" but pointed to `/clients` — fixed to match.

## Self-Check: PASSED
- [x] Convex schema deployed to aware-finch-86
- [x] Next.js build compiled successfully (20 routes)
- [x] Files rsynced to VPS, PM2 online
- [x] HTTP response from production (307 redirect to login)
- [x] User verified production dashboard works
- [x] Route rename committed and redeployed
