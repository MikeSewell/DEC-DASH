import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireRole } from "./users";

const intakeFields = {
  intakeDate: v.optional(v.number()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
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
  ethnicity: v.optional(v.string()),
  zipCode: v.optional(v.string()),
  age: v.optional(v.string()),
};

/**
 * List all legal intake forms with optional search.
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "manager", "staff", "lawyer");

    const forms = await ctx.db
      .query("legalIntakeForms")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    if (args.search) {
      const term = args.search.toLowerCase();
      return forms.filter(
        (f) =>
          (f.firstName?.toLowerCase().includes(term)) ||
          (f.lastName?.toLowerCase().includes(term)) ||
          (f.coParentName?.toLowerCase().includes(term))
      );
    }

    return forms;
  },
});

/**
 * Get a single intake form by ID.
 */
export const getById = query({
  args: { id: v.id("legalIntakeForms") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", "manager", "staff", "lawyer");
    return await ctx.db.get(args.id);
  },
});

/**
 * Get stats: total count, new this month, top county.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin", "manager", "staff", "lawyer");

    const forms = await ctx.db.query("legalIntakeForms").collect();
    const total = forms.length;

    // New this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const newThisMonth = forms.filter((f) => f.createdAt >= startOfMonth).length;

    // Top county
    const countyCounts: Record<string, number> = {};
    for (const f of forms) {
      const county = f.countyFiledIn || "Unknown";
      countyCounts[county] = (countyCounts[county] || 0) + 1;
    }
    let topCounty = "N/A";
    let topCount = 0;
    for (const [county, count] of Object.entries(countyCounts)) {
      if (count > topCount) {
        topCounty = county;
        topCount = count;
      }
    }

    return { total, newThisMonth, topCounty, topCount };
  },
});

/**
 * Create a new intake form.
 */
export const create = mutation({
  args: intakeFields,
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin", "manager", "lawyer");
    const now = Date.now();

    const id = await ctx.db.insert("legalIntakeForms", {
      ...args,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "create_legal_intake",
      entityType: "legalIntakeForms",
      entityId: id,
      details: `Created intake form for ${args.firstName || ""} ${args.lastName || ""}`.trim(),
    });

    return id;
  },
});

/**
 * Update an existing intake form.
 */
export const update = mutation({
  args: {
    id: v.id("legalIntakeForms"),
    ...intakeFields,
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin", "manager", "lawyer");
    const { id, ...updates } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Intake form not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "update_legal_intake",
      entityType: "legalIntakeForms",
      entityId: id,
      details: `Updated intake form for ${existing.firstName || ""} ${existing.lastName || ""}`.trim(),
    });
  },
});

/**
 * Delete an intake form. Admin only.
 */
export const remove = mutation({
  args: { id: v.id("legalIntakeForms") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Intake form not found");

    await ctx.db.delete(args.id);

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "delete_legal_intake",
      entityType: "legalIntakeForms",
      entityId: args.id,
      details: `Deleted intake form for ${existing.firstName || ""} ${existing.lastName || ""}`.trim(),
    });
  },
});

/**
 * Bulk import intake records. Admin only.
 */
export const importFromData = mutation({
  args: {
    rows: v.array(
      v.object({
        intakeDate: v.optional(v.number()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
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
        ethnicity: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        age: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "admin");
    const now = Date.now();
    let count = 0;

    for (const row of args.rows) {
      await ctx.db.insert("legalIntakeForms", {
        ...row,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    }

    await ctx.runMutation(internal.auditLog.log, {
      userId: user._id,
      action: "import_legal_intake",
      entityType: "legalIntakeForms",
      details: `Bulk imported ${count} intake forms`,
    });

    return { imported: count };
  },
});
