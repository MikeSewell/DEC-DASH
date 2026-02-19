import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

/**
 * List clients with optional filters by programId and/or status.
 */
export const list = query({
  args: {
    programId: v.optional(v.id("programs")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("withdrawn")
      )
    ),
  },
  handler: async (ctx, args) => {
    let clients;

    if (args.programId) {
      clients = await ctx.db
        .query("clients")
        .withIndex("by_programId", (q) => q.eq("programId", args.programId))
        .collect();
    } else {
      clients = await ctx.db.query("clients").collect();
    }

    if (args.status) {
      clients = clients.filter((c) => c.status === args.status);
    }

    return clients;
  },
});

/**
 * Get a single client by ID.
 */
export const getById = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clientId);
  },
});

/**
 * Create a new client.
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    programId: v.optional(v.id("programs")),
    enrollmentDate: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("withdrawn")
    ),
    zipCode: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const clientId = await ctx.db.insert("clients", {
      firstName: args.firstName,
      lastName: args.lastName,
      programId: args.programId,
      enrollmentDate: args.enrollmentDate,
      status: args.status,
      zipCode: args.zipCode,
      ageGroup: args.ageGroup,
      ethnicity: args.ethnicity,
      notes: args.notes,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "create_client",
      entityType: "clients",
      entityId: clientId,
      details: `Created client ${args.firstName} ${args.lastName}`,
    });

    return clientId;
  },
});

/**
 * Update an existing client.
 */
export const update = mutation({
  args: {
    clientId: v.id("clients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    programId: v.optional(v.id("programs")),
    enrollmentDate: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("withdrawn")
      )
    ),
    zipCode: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin", "manager", "staff");

    const existing = await ctx.db.get(args.clientId);
    if (!existing) throw new Error("Client not found");

    const updates: Record<string, unknown> = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.programId !== undefined) updates.programId = args.programId;
    if (args.enrollmentDate !== undefined) updates.enrollmentDate = args.enrollmentDate;
    if (args.status !== undefined) updates.status = args.status;
    if (args.zipCode !== undefined) updates.zipCode = args.zipCode;
    if (args.ageGroup !== undefined) updates.ageGroup = args.ageGroup;
    if (args.ethnicity !== undefined) updates.ethnicity = args.ethnicity;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.clientId, updates);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "update_client",
      entityType: "clients",
      entityId: args.clientId,
      details: `Updated client ${existing.firstName} ${existing.lastName}`,
    });
  },
});

/**
 * Get clients by program.
 */
export const getByProgram = query({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();
  },
});

/**
 * Get age distribution: count of clients grouped by ageGroup.
 */
export const getAgeDistribution = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();

    const distribution: Record<string, number> = {};
    for (const client of clients) {
      const group = client.ageGroup ?? "Unknown";
      distribution[group] = (distribution[group] ?? 0) + 1;
    }

    return Object.entries(distribution).map(([ageGroup, count]) => ({
      ageGroup,
      count,
    }));
  },
});

/**
 * Get ethnicity breakdown: count of clients grouped by ethnicity.
 */
export const getEthnicityBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();

    const breakdown: Record<string, number> = {};
    for (const client of clients) {
      const eth = client.ethnicity ?? "Unknown";
      breakdown[eth] = (breakdown[eth] ?? 0) + 1;
    }

    return Object.entries(breakdown).map(([ethnicity, count]) => ({
      ethnicity,
      count,
    }));
  },
});

/**
 * Get zip code stats: count of clients grouped by zipCode.
 */
export const getZipCodeStats = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();

    const stats: Record<string, number> = {};
    for (const client of clients) {
      const zip = client.zipCode ?? "Unknown";
      stats[zip] = (stats[zip] ?? 0) + 1;
    }

    return Object.entries(stats).map(([zipCode, count]) => ({
      zipCode,
      count,
    }));
  },
});
