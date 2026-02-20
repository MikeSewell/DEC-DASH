import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

const intakeFields = {
  clientId: v.optional(v.id("clients")),
  timestamp: v.optional(v.string()),
  role: v.optional(v.string()),
  fullName: v.optional(v.string()),
  ethnicity: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  zipCode: v.optional(v.string()),
  age: v.optional(v.string()),
  coParentName: v.optional(v.string()),
  coParentEthnicity: v.optional(v.string()),
  coParentDob: v.optional(v.string()),
  coParentPhone: v.optional(v.string()),
  coParentEmail: v.optional(v.string()),
  coParentZip: v.optional(v.string()),
  coParentAge: v.optional(v.string()),
  referralSource: v.optional(v.string()),
  coParentInformed: v.optional(v.string()),
  sessionDate: v.optional(v.string()),
  sessionTime: v.optional(v.string()),
  sessionsCompleted: v.optional(v.string()),
};

export const getByClientId = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coparentIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();
  },
});

export const create = mutation({
  args: intakeFields,
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin", "manager", "psychologist");
    const now = Date.now();

    const id = await ctx.db.insert("coparentIntakeForms", {
      ...args,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "create_coparent_intake",
      entityType: "coparentIntakeForms",
      entityId: id,
      details: `Created co-parent intake for ${args.fullName || ""}`.trim(),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("coparentIntakeForms"),
    ...intakeFields,
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin", "manager", "psychologist");
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Co-parent intake form not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "update_coparent_intake",
      entityType: "coparentIntakeForms",
      entityId: id,
      details: `Updated co-parent intake for ${existing.fullName || ""}`.trim(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("coparentIntakeForms") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Co-parent intake form not found");

    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "delete_coparent_intake",
      entityType: "coparentIntakeForms",
      entityId: args.id,
      details: `Deleted co-parent intake for ${existing.fullName || ""}`.trim(),
    });
  },
});

/**
 * Internal create (no auth, for CLI import scripts).
 */
export const internalCreate = internalMutation({
  args: intakeFields,
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("coparentIntakeForms", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const importFromData = mutation({
  args: {
    rows: v.array(
      v.object({
        clientId: v.optional(v.id("clients")),
        timestamp: v.optional(v.string()),
        role: v.optional(v.string()),
        fullName: v.optional(v.string()),
        ethnicity: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        age: v.optional(v.string()),
        coParentName: v.optional(v.string()),
        coParentEthnicity: v.optional(v.string()),
        coParentDob: v.optional(v.string()),
        coParentPhone: v.optional(v.string()),
        coParentEmail: v.optional(v.string()),
        coParentZip: v.optional(v.string()),
        coParentAge: v.optional(v.string()),
        referralSource: v.optional(v.string()),
        coParentInformed: v.optional(v.string()),
        sessionDate: v.optional(v.string()),
        sessionTime: v.optional(v.string()),
        sessionsCompleted: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin");
    const now = Date.now();
    let count = 0;

    for (const row of args.rows) {
      await ctx.db.insert("coparentIntakeForms", {
        ...row,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "import_coparent_intake",
      entityType: "coparentIntakeForms",
      details: `Bulk imported ${count} co-parent intake forms`,
    });

    return { imported: count };
  },
});

/**
 * Internal bulk import: creates clients + co-parent intake forms (no auth, for CLI scripts).
 */
export const internalImportWithClients = internalMutation({
  args: {
    programId: v.id("programs"),
    rows: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        timestamp: v.optional(v.string()),
        role: v.optional(v.string()),
        fullName: v.optional(v.string()),
        ethnicity: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        age: v.optional(v.string()),
        coParentName: v.optional(v.string()),
        coParentEthnicity: v.optional(v.string()),
        coParentDob: v.optional(v.string()),
        coParentPhone: v.optional(v.string()),
        coParentEmail: v.optional(v.string()),
        coParentZip: v.optional(v.string()),
        coParentAge: v.optional(v.string()),
        referralSource: v.optional(v.string()),
        coParentInformed: v.optional(v.string()),
        sessionDate: v.optional(v.string()),
        sessionTime: v.optional(v.string()),
        sessionsCompleted: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let count = 0;

    for (const { firstName, lastName, ...intakeData } of args.rows) {
      const clientId = await ctx.db.insert("clients", {
        firstName,
        lastName,
        programId: args.programId,
        status: "active",
        enrollmentDate: now,
        zipCode: intakeData.zipCode,
        ethnicity: intakeData.ethnicity,
        createdAt: now,
      });

      await ctx.db.insert("coparentIntakeForms", {
        ...intakeData,
        clientId,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    return { imported: count };
  },
});
