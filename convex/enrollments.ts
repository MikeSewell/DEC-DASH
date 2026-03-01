import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

/**
 * Shared status validator for enrollment status field.
 */
const statusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("on_hold"),
  v.literal("completed"),
  v.literal("withdrawn")
);

/**
 * List all enrollments for a specific client.
 */
export const listByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrollments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

/**
 * List all enrollments for a specific program.
 */
export const listByProgram = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("enrollments")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();
  },
});

/**
 * Get a single enrollment by ID.
 */
export const getById = query({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.enrollmentId);
  },
});

/**
 * Create a new enrollment.
 * Admin, manager, and staff only — lawyers/psychologists do NOT create enrollments.
 */
export const create = mutation({
  args: {
    clientId: v.id("clients"),
    programId: v.id("programs"),
    status: statusValidator,
    enrollmentDate: v.number(),
    exitDate: v.optional(v.number()),
    exitReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const enrollmentId = await ctx.db.insert("enrollments", {
      clientId: args.clientId,
      programId: args.programId,
      status: args.status,
      enrollmentDate: args.enrollmentDate,
      exitDate: args.exitDate,
      exitReason: args.exitReason,
      notes: args.notes,
      createdBy: currentUser._id,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_enrollment",
      entityType: "enrollments",
      entityId: enrollmentId,
      details: `Created enrollment for client ${args.clientId} in program ${args.programId}`,
    });

    return enrollmentId;
  },
});

/**
 * Update an existing enrollment's status, exit info, or notes.
 * Admin, manager, and staff only.
 */
export const update = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    status: v.optional(statusValidator),
    exitDate: v.optional(v.number()),
    exitReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) throw new Error("Enrollment not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status !== undefined) updates.status = args.status;
    if (args.exitDate !== undefined) updates.exitDate = args.exitDate;
    if (args.exitReason !== undefined) updates.exitReason = args.exitReason;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.enrollmentId, updates);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "update_enrollment",
      entityType: "enrollments",
      entityId: args.enrollmentId,
      details: `Updated enrollment ${args.enrollmentId} for client ${existing.clientId}`,
    });
  },
});

/**
 * Delete an enrollment. Admin only.
 * Throws if the enrollment has linked sessions — those must be deleted first.
 */
export const remove = mutation({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin");

    const existing = await ctx.db.get(args.enrollmentId);
    if (!existing) throw new Error("Enrollment not found");

    // Block deletion if linked sessions exist
    const linkedSessions = await ctx.db
      .query("sessions")
      .withIndex("by_enrollmentId", (q) => q.eq("enrollmentId", args.enrollmentId))
      .collect();
    if (linkedSessions.length > 0) {
      throw new Error(
        "Cannot delete enrollment with linked sessions. Delete sessions first."
      );
    }

    await ctx.db.delete(args.enrollmentId);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "delete_enrollment",
      entityType: "enrollments",
      entityId: args.enrollmentId,
      details: `Deleted enrollment ${args.enrollmentId} for client ${existing.clientId}`,
    });
  },
});

/**
 * Internal batch import for enrollment records.
 * No auth (internalMutation — not callable from frontend).
 * Deduplicates by clientId + programId: skips if an enrollment already exists for that pair.
 * Returns { created, skipped }.
 */
export const importBatch = internalMutation({
  args: {
    enrollments: v.array(
      v.object({
        clientId: v.id("clients"),
        programId: v.id("programs"),
        status: statusValidator,
        enrollmentDate: v.number(),
        exitDate: v.optional(v.number()),
        exitReason: v.optional(v.string()),
        notes: v.optional(v.string()),
        createdBy: v.id("users"),
      })
    ),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;

    for (const enrollment of args.enrollments) {
      // Deduplicate by clientId + programId
      const existing = await ctx.db
        .query("enrollments")
        .withIndex("by_clientId", (q) => q.eq("clientId", enrollment.clientId))
        .collect();
      const duplicate = existing.find((e) => e.programId === enrollment.programId);

      if (duplicate) {
        skipped++;
        continue;
      }

      await ctx.db.insert("enrollments", {
        ...enrollment,
        updatedAt: Date.now(),
      });
      created++;
    }

    return { created, skipped };
  },
});
