import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./users";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all clients (no args — legacy programId/status filters removed in Phase 21).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clients").collect();
  },
});

/**
 * List clients joined with program info, role-filtered.
 */
export const listWithPrograms = query({
  args: {
    programType: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const programs = await ctx.db.query("programs").collect();
    const programMap = new Map(programs.map((p) => [p._id, p]));

    let clients = await ctx.db.query("clients").collect();

    // Fetch all active enrollments once — used for RBAC and programType filtering
    const allActiveEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Role-based filtering — enrollment-based (replaces legacy clients.programId check)
    if (user.role === "lawyer") {
      const legalProgramIds = new Set(
        programs.filter((p) => p.type === "legal").map((p) => p._id)
      );
      const eligibleClientIds = new Set(
        allActiveEnrollments
          .filter((e) => legalProgramIds.has(e.programId))
          .map((e) => e.clientId)
      );
      clients = clients.filter((c) => eligibleClientIds.has(c._id));
    } else if (user.role === "psychologist") {
      const coparentProgramIds = new Set(
        programs.filter((p) => p.type === "coparent").map((p) => p._id)
      );
      const eligibleClientIds = new Set(
        allActiveEnrollments
          .filter((e) => coparentProgramIds.has(e.programId))
          .map((e) => e.clientId)
      );
      clients = clients.filter((c) => eligibleClientIds.has(c._id));
    }

    // Program type filter — enrollment-based for all roles
    if (args.programType && args.programType !== "all") {
      const typeIds = new Set(
        programs.filter((p) => p.type === args.programType).map((p) => p._id)
      );
      const clientIdsWithType = new Set(
        allActiveEnrollments
          .filter((e) => typeIds.has(e.programId))
          .map((e) => e.clientId)
      );
      clients = clients.filter((c) => clientIdsWithType.has(c._id));
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

    // Derive program info from enrollments (first active enrollment per client)
    const clientProgramInfo = new Map<string, { programName: string; programType: string }>();
    for (const e of allActiveEnrollments) {
      const cKey = e.clientId as string;
      if (!clientProgramInfo.has(cKey)) {
        const prog = programMap.get(e.programId);
        clientProgramInfo.set(cKey, {
          programName: prog?.name ?? "Unknown",
          programType: prog?.type ?? "other",
        });
      }
    }

    return clients.map((c) => {
      const info = clientProgramInfo.get(c._id as string);
      return {
        ...c,
        programName: info?.programName ?? "\u2014",
        programType: info?.programType ?? "other",
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

    // Fetch all active enrollments — used for both RBAC and active count
    const allActiveEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Role-based filtering — enrollment-based (replaces legacy clients.programId check)
    if (user.role === "lawyer" || user.role === "psychologist") {
      const requiredType = user.role === "lawyer" ? "legal" : "coparent";
      const qualifyingProgramIds = new Set(
        programs.filter((p) => p.type === requiredType).map((p) => p._id)
      );
      const eligibleClientIds = new Set(
        allActiveEnrollments
          .filter((e) => qualifyingProgramIds.has(e.programId))
          .map((e) => e.clientId)
      );
      clients = clients.filter((c) => eligibleClientIds.has(c._id));
    }

    const total = clients.length;
    // Active count from enrollments (not legacy clients.status)
    const activeClientIds = new Set(allActiveEnrollments.map((e) => e.clientId));
    const active = clients.filter((c) => activeClientIds.has(c._id)).length;
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
    const programTypeMap = new Map(programs.map((p) => [p._id, p.type]));

    let clients = await ctx.db.query("clients").collect();

    // Fetch all active enrollments — used for both RBAC and program type assignment
    const allActiveEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Role-based filtering — enrollment-based (replaces legacy clients.programId check)
    if (user.role === "lawyer" || user.role === "psychologist") {
      const requiredType = user.role === "lawyer" ? "legal" : "coparent";
      const qualifyingProgramIds = new Set(
        programs.filter((p) => p.type === requiredType).map((p) => p._id)
      );
      const eligibleClientIds = new Set(
        allActiveEnrollments
          .filter((e) => qualifyingProgramIds.has(e.programId))
          .map((e) => e.clientId)
      );
      clients = clients.filter((c) => eligibleClientIds.has(c._id));
    }

    // Build a map of clientId -> Set of program types from active enrollments
    const clientEnrollmentTypes = new Map<string, Set<string>>();
    for (const enrollment of allActiveEnrollments) {
      const pType = programTypeMap.get(enrollment.programId) ?? "other";
      const clientKey = enrollment.clientId as string;
      if (!clientEnrollmentTypes.has(clientKey)) {
        clientEnrollmentTypes.set(clientKey, new Set());
      }
      clientEnrollmentTypes.get(clientKey)!.add(pType);
    }

    // Active client IDs from enrollments (not legacy clients.status)
    const activeClientIds = new Set(allActiveEnrollments.map((e) => e.clientId));
    const activeClients = clients.filter((c) => activeClientIds.has(c._id));
    const byType: Record<string, number> = {};
    for (const client of activeClients) {
      const types = clientEnrollmentTypes.get(client._id as string);
      if (types && types.size > 0) {
        // Count client in each program type they're enrolled in
        for (const type of types) {
          byType[type] = (byType[type] ?? 0) + 1;
        }
      } else {
        // Client has no active enrollments — count as "other"
        byType["other"] = (byType["other"] ?? 0) + 1;
      }
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

    const legalIntake = await ctx.db
      .query("legalIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    const coparentIntake = await ctx.db
      .query("coparentIntakeForms")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first();

    // Fetch enrollments and enrich with program info
    const rawEnrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .collect();

    const allPrograms = await ctx.db.query("programs").collect();
    const programMap = new Map(allPrograms.map((p) => [p._id, p]));

    const enrollmentsWithProgram = rawEnrollments.map((e) => {
      const prog = programMap.get(e.programId);
      return {
        ...e,
        programName: prog?.name ?? "Unknown Program",
        programType: prog?.type ?? "other",
      };
    });

    return {
      ...client,
      enrollments: enrollmentsWithProgram, // enrollment-based source of truth
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
 * Creates a client + legalIntakeForm for each row. Dedupes by firstName+lastName across all clients.
 */
export const importLegalBatch = mutation({
  args: {
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

    // Fetch all clients once outside the loop for deduplication
    const allClients = await ctx.db.query("clients").collect();

    for (const row of args.rows) {
      const { firstName, lastName, zipCode, ethnicity, age, ...intakeFields } = row;

      // Dedup across all clients by name
      const dupe = allClients.find(
        (c) => c.firstName.toLowerCase() === firstName.toLowerCase()
          && c.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (dupe) { skipped++; continue; }

      const clientId = await ctx.db.insert("clients", {
        firstName, lastName,
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
 * Creates a client + coparentIntakeForm for each row. Dedupes by fullName across all clients.
 */
export const importCoparentBatch = mutation({
  args: {
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

    // Fetch all clients once outside the loop for deduplication
    const allClients = await ctx.db.query("clients").collect();

    for (const row of args.rows) {
      const { firstName, lastName, fullName, zipCode, ethnicity, age, ...intakeFields } = row;

      // Dedup across all clients by name
      const dupe = allClients.find(
        (c) => c.firstName.toLowerCase() === firstName.toLowerCase()
          && c.lastName.toLowerCase() === lastName.toLowerCase()
      );
      if (dupe) { skipped++; continue; }

      const clientId = await ctx.db.insert("clients", {
        firstName, lastName,
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
    zipCode: v.optional(v.string()),
    ethnicity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clients", { ...args, createdAt: Date.now() });
  },
});

/**
 * Get clients enrolled in a program (via enrollments table).
 */
export const getByProgram = query({
  args: {
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_programId", (q) => q.eq("programId", args.programId))
      .collect();
    const clientIds = [...new Set(enrollments.map((e) => e.clientId))];
    const clients = await Promise.all(clientIds.map((id) => ctx.db.get(id)));
    return clients.filter((c): c is NonNullable<typeof c> => c !== null);
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
