import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

/**
 * List all programs.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

/**
 * Get a single program by ID.
 */
export const getById = query({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.programId);
  },
});

/**
 * Create a new program.
 */
export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("coparent"),
      v.literal("legal"),
      v.literal("fatherhood"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager");

    const programId = await ctx.db.insert("programs", {
      name: args.name,
      type: args.type,
      description: args.description,
      isActive: args.isActive,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_program",
      entityType: "programs",
      entityId: programId,
      details: `Created program "${args.name}" (${args.type})`,
    });

    return programId;
  },
});

/**
 * Update an existing program.
 */
export const update = mutation({
  args: {
    programId: v.id("programs"),
    name: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("coparent"),
        v.literal("legal"),
        v.literal("fatherhood"),
        v.literal("other")
      )
    ),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager");

    const existing = await ctx.db.get(args.programId);
    if (!existing) throw new Error("Program not found");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.programId, updates);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "update_program",
      entityType: "programs",
      entityId: args.programId,
      details: `Updated program "${existing.name}"`,
    });
  },
});

/**
 * Delete a program. Admin/manager only. Fails if clients are linked.
 */
export const remove = mutation({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager");

    const existing = await ctx.db.get(args.programId);
    if (!existing) throw new Error("Program not found");

    const linkedClients = await ctx.db
      .query("clients")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .first();

    if (linkedClients) {
      throw new Error("Cannot delete program with linked clients. Reassign clients first.");
    }

    await ctx.db.delete(args.programId);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "delete_program",
      entityType: "programs",
      entityId: args.programId,
      details: `Deleted program "${existing.name}"`,
    });
  },
});

/**
 * Get stats for each program: count of active clients and total sessions.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const programs = await ctx.db.query("programs").collect();

    const stats = await Promise.all(
      programs.map(async (program) => {
        const clients = await ctx.db
          .query("clients")
          .withIndex("by_programId", (q) => q.eq("programId", program._id))
          .collect();

        const activeClients = clients.filter((c) => c.status === "active").length;

        const sessions = await ctx.db
          .query("sessions")
          .collect();
        const programSessions = sessions.filter(
          (s) => s.programId === program._id
        );

        return {
          _id: program._id,
          name: program.name,
          type: program.type,
          isActive: program.isActive,
          activeClients,
          totalSessions: programSessions.length,
        };
      })
    );

    return stats;
  },
});

/**
 * Public seed: ensure programs exist (for CLI import scripts).
 * Returns map of type → programId.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("programs").collect();
    const result: Record<string, string> = {};

    const defaults = [
      { name: "Legal Aid Program", type: "legal" as const, description: "Free legal consultation for fathers" },
      { name: "Co-Parent Counseling", type: "coparent" as const, description: "Co-parenting skills and communication" },
    ];

    for (const def of defaults) {
      const match = existing.find((p) => p.type === def.type);
      if (match) {
        result[def.type] = match._id;
      } else {
        const id = await ctx.db.insert("programs", {
          name: def.name,
          type: def.type,
          description: def.description,
          isActive: true,
          createdAt: Date.now(),
        });
        result[def.type] = id;
      }
    }

    return result;
  },
});

/**
 * Internal seed: create a program without auth (for CLI seeding).
 */
export const seed = internalMutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("coparent"),
      v.literal("legal"),
      v.literal("fatherhood"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Skip if a program with this type already exists
    const existing = await ctx.db.query("programs").collect();
    if (existing.some((p) => p.type === args.type && p.name === args.name)) {
      const match = existing.find((p) => p.type === args.type && p.name === args.name)!;
      return match._id;
    }

    return await ctx.db.insert("programs", {
      name: args.name,
      type: args.type,
      description: args.description,
      isActive: args.isActive,
      createdAt: Date.now(),
    });
  },
});
