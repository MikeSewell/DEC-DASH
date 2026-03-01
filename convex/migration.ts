/**
 * Data Migration: Client → Enrollment Model + Demographics Backfill
 *
 * Phase 18 — One-time migration to transform the flat client-with-programId model
 * to the relational Client-Enrollment-Session model (v2.0 Data Foundation).
 *
 * Usage:
 *   Dry run (no writes):   npx convex run migration:migrateAll '{"dryRun":true}'
 *   Execute (write mode):  npx convex run migration:migrateAll
 *
 * IMPORTANT: Always run the dry-run first and review the report before executing.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Map client status → enrollment status (exhaustive mapping)
const CLIENT_TO_ENROLLMENT_STATUS: Record<string, "active" | "completed" | "withdrawn"> = {
  active: "active",
  completed: "completed",
  withdrawn: "withdrawn",
};

export const migrateAll = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // ── 1. Admin user lookup ──────────────────────────────────────────────────
    const allUsers = await ctx.db.query("users").collect();
    const adminUser = allUsers.find((u) => u.role === "admin");
    if (!adminUser) {
      throw new Error(
        "No admin user found — cannot set createdBy on enrollments. " +
        "Ensure at least one user with role='admin' exists before running migration."
      );
    }

    // ── 2. Fetch all clients ──────────────────────────────────────────────────
    const clients = await ctx.db.query("clients").collect();

    // ── 3. Per-client loop ────────────────────────────────────────────────────
    let enrollmentsCreated = 0;
    let demographicsUpdated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const client of clients) {
      // 3a. Skip clients with no programId
      if (!client.programId) {
        skipped++;
        warnings.push(
          `SKIP: ${client.firstName} ${client.lastName} — no programId`
        );
        continue;
      }

      // 3b. Check for existing enrollment (idempotency guard)
      const existingEnrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
        .collect();

      const alreadyEnrolled = existingEnrollments.some(
        (e) => e.programId === client.programId
      );

      if (!alreadyEnrolled) {
        // 3c. Create enrollment
        enrollmentsCreated++;
        if (!dryRun) {
          const enrollmentStatus =
            CLIENT_TO_ENROLLMENT_STATUS[client.status] ?? "active";

          await ctx.db.insert("enrollments", {
            clientId: client._id,
            programId: client.programId,
            status: enrollmentStatus,
            enrollmentDate: client.enrollmentDate ?? client.createdAt,
            createdBy: adminUser._id,
            updatedAt: Date.now(),
          });
        }
      } else {
        // Already enrolled — count as skipped for enrollment step
        skipped++;
      }

      // 3d. Demographics backfill — fetch linked intake forms
      const legalIntake = await ctx.db
        .query("legalIntakeForms")
        .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
        .first();

      const coparentIntake = await ctx.db
        .query("coparentIntakeForms")
        .withIndex("by_clientId", (q) => q.eq("clientId", client._id))
        .first();

      // Only patch fields where client value is currently falsy (null/undefined/"")
      // and intake form has a non-empty value
      const patch: Record<string, string> = {};

      const referralSource =
        legalIntake?.referralSource ?? coparentIntake?.referralSource;
      if (!client.referralSource && referralSource) {
        patch.referralSource = referralSource;
      }

      const dateOfBirth =
        legalIntake?.dateOfBirth ?? coparentIntake?.dateOfBirth;
      if (!client.dateOfBirth && dateOfBirth) {
        patch.dateOfBirth = dateOfBirth;
      }

      const ethnicity = legalIntake?.ethnicity ?? coparentIntake?.ethnicity;
      if (!client.ethnicity && ethnicity) {
        patch.ethnicity = ethnicity;
      }

      const zipCode = legalIntake?.zipCode ?? coparentIntake?.zipCode;
      if (!client.zipCode && zipCode) {
        patch.zipCode = zipCode;
      }

      const email = legalIntake?.email ?? coparentIntake?.email;
      if (!client.email && email) {
        patch.email = email;
      }

      // phone: legalIntakeForms does NOT have phone — coparentIntake only
      const phone = coparentIntake?.phone;
      if (!client.phone && phone) {
        patch.phone = phone;
      }

      if (Object.keys(patch).length > 0) {
        demographicsUpdated++;
        if (!dryRun) {
          await ctx.db.patch(client._id, patch);
        }
      }
    }

    // ── 4. Return report ──────────────────────────────────────────────────────
    return {
      mode: dryRun ? "DRY-RUN" : "EXECUTED",
      totalClients: clients.length,
      enrollmentsCreated,
      demographicsUpdated,
      skipped,
      warnings,
    };
  },
});
