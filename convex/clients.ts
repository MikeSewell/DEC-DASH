import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";
import { getAuthUserId } from "@convex-dev/auth/server";

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
 * List clients joined with program info, role-filtered.
 */
export const listWithPrograms = query({
  args: {
    programType: v.optional(v.string()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map((p) => [p._id, p]));

    let clients = await ctx.db.query("clients").collect();

    // Role-based filtering
    if (user.role === "lawyer") {
      const legalProgramIds = new Set(
        programs.filter((p) => p.type === "legal").map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && legalProgramIds.has(c.programId));
    } else if (user.role === "psychologist") {
      const coparentProgramIds = new Set(
        programs.filter((p) => p.type === "coparent").map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && coparentProgramIds.has(c.programId));
    }

    // Program type filter
    if (args.programType && args.programType !== "all") {
      const typeIds = new Set(
        programs.filter((p) => p.type === args.programType).map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && typeIds.has(c.programId));
    }

    // Status filter
    if (args.status) {
      clients = clients.filter((c) => c.status === args.status);
    }

    // Search filter
    if (args.search) {
      const term = args.search.toLowerCase();
      clients = clients.filter(
        (c) =>
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term)
      );
    }

    return clients.map((c) => {
      const program = c.programId ? programMap.get(c.programId) : undefined;
      return {
        ...c,
        programName: program?.name ?? "\u2014",
        programType: program?.type ?? "other",
      };
    });
  },
});

/**
 * Get client stats (role-filtered).
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const programs = await ctx.db.query("programs").collect();
    let clients = await ctx.db.query("clients").collect();

    // Role-based filtering
    if (user.role === "lawyer") {
      const legalIds = new Set(
        programs.filter((p) => p.type === "legal").map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && legalIds.has(c.programId));
    } else if (user.role === "psychologist") {
      const coparentIds = new Set(
        programs.filter((p) => p.type === "coparent").map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && coparentIds.has(c.programId));
    }

    const total = clients.length;
    const active = clients.filter((c) => c.status === "active").length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const newThisMonth = clients.filter((c) => c.createdAt >= startOfMonth).length;

    return { total, active, newThisMonth };
  },
});

/**
 * Get active client counts grouped by program type (legal, coparent, other).
 * Role-filtered: lawyers see legal only, psychologists see coparent only.
 */
export const getStatsByProgram = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map((p) => [p._id, p.type]));

    let clients = await ctx.db.query("clients").collect();

    // Role-based filtering (mirrors getStats)
    if (user.role === "lawyer") {
      const legalIds = new Set(
        programs.filter((p) => p.type === "legal").map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && legalIds.has(c.programId));
    } else if (user.role === "psychologist") {
      const coparentIds = new Set(
        programs.filter((p) => p.type === "coparent").map((p) => p._id)
      );
      clients = clients.filter((c) => c.programId && coparentIds.has(c.programId));
    }

    const activeClients = clients.filter((c) => c.status === "active");
    const byType: Record<string, number> = {};
    for (const client of activeClients) {
      const type = client.programId ? (programMap.get(client.programId) ?? "other") : "other";
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return {
      legal: byType["legal"] ?? 0,
      coparent: byType["coparent"] ?? 0,
      other: byType["other"] ?? 0,
    };
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
 * Get client by ID with joined program and linked intake forms.
 */
export const getByIdWithIntake = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;

    const program = client.programId ? await ctx.db.get(client.programId) : null;

    const legalIntake = await ctx.db
      .query("legalIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    const coparentIntake = await ctx.db
      .query("coparentIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    return {
      ...client,
      program,
      legalIntake,
      coparentIntake,
    };
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
    const currentUser = await requireRole(ctx, "admin", "manager", "staff", "lawyer", "psychologist");

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
    const currentUser = await requireRole(ctx, "admin", "manager", "staff", "lawyer", "psychologist");

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
 * Delete a client. Admin only.
 */
export const remove = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin");

    const existing = await ctx.db.get(args.clientId);
    if (!existing) throw new Error("Client not found");

    await ctx.db.delete(args.clientId);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "delete_client",
      entityType: "clients",
      entityId: args.clientId,
      details: `Deleted client ${existing.firstName} ${existing.lastName}`,
    });
  },
});

/**
 * Public batch import for legal clients (no auth, for CLI import scripts).
 * Creates a client + legalIntakeForm for each row. Dedupes by firstName+lastName.
 */
export const importLegalBatch = mutation({
  args: {
    programId: v.id("programs"),
    rows: v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      zipCode: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      age: v.optional(v.string()),
      coParentName: v.optional(v.string()),
      reasonForVisit: v.optional(v.string()),
      attorneyNotes: v.optional(v.string()),
      hasAttorney: v.optional(v.string()),
      email: v.optional(v.string()),
      numberOfVisits: v.optional(v.string()),
      upcomingCourtDate: v.optional(v.string()),
      hasRestrainingOrder: v.optional(v.string()),
      countyFiledIn: v.optional(v.string()),
      existingCourtOrders: v.optional(v.string()),
      custodyOrderFollowed: v.optional(v.string()),
      notFollowedReason: v.optional(v.string()),
      minorChildrenInvolved: v.optional(v.string()),
      childrenResidence: v.optional(v.string()),
      marriedToMother: v.optional(v.string()),
      childSupportOrders: v.optional(v.string()),
      paymentStatus: v.optional(v.string()),
      seekingTo: v.optional(v.string()),
      safetyFears: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      countyOfOrders: v.optional(v.string()),
      referralSource: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;

    for (const row of args.rows) {
      const { firstName, lastName, zipCode, ethnicity, age, ...intakeFields } = row;

      // Check for existing client with same name in same program
      const existing = await ctx.db.query("clients")
        .withIndex("by_programId", (q) => q.eq("programId", args.programId))
        .collect();
      const dupe = existing.find(
        (c) => c.firstName.toLowerCase() === firstName.toLowerCase()
          && c.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (dupe) { skipped++; continue; }

      const clientId = await ctx.db.insert("clients", {
        firstName, lastName,
        programId: args.programId,
        status: "active",
        zipCode, ethnicity,
        ageGroup: age,
        createdAt: Date.now(),
      });

      await ctx.db.insert("legalIntakeForms", {
        clientId,
        firstName, lastName,
        ...intakeFields,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      created++;
    }

    return { created, skipped };
  },
});

/**
 * Public batch import for co-parent clients (no auth, for CLI import scripts).
 * Creates a client + coparentIntakeForm for each row. Dedupes by fullName.
 */
export const importCoparentBatch = mutation({
  args: {
    programId: v.id("programs"),
    rows: v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      fullName: v.optional(v.string()),
      zipCode: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      age: v.optional(v.string()),
      timestamp: v.optional(v.string()),
      role: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
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
    })),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;

    for (const row of args.rows) {
      const { firstName, lastName, fullName, zipCode, ethnicity, age, ...intakeFields } = row;

      // Check for existing client with same name in same program
      const existing = await ctx.db.query("clients")
        .withIndex("by_programId", (q) => q.eq("programId", args.programId))
        .collect();
      const dupe = existing.find(
        (c) => c.firstName.toLowerCase() === firstName.toLowerCase()
          && c.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (dupe) { skipped++; continue; }

      const clientId = await ctx.db.insert("clients", {
        firstName, lastName,
        programId: args.programId,
        status: "active",
        zipCode, ethnicity,
        ageGroup: age,
        createdAt: Date.now(),
      });

      await ctx.db.insert("coparentIntakeForms", {
        clientId,
        fullName: fullName || `${firstName} ${lastName}`,
        ...intakeFields,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      created++;
    }

    return { created, skipped };
  },
});

/**
 * Internal create (no auth, for CLI import scripts).
 */
export const internalCreate = internalMutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    programId: v.optional(v.id("programs")),
    enrollmentDate: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("withdrawn")),
    zipCode: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clients", { ...args, createdAt: Date.now() });
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
