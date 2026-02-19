import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

/**
 * Helper: get the current user and verify they have one of the allowed roles.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  ...roles: Array<"admin" | "manager" | "staff" | "readonly">
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");

  if (!roles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  return user;
}

/**
 * Get the currently logged-in user.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user ?? null;
  },
});

/**
 * Get all users. Admin only.
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.db.query("users").collect();
  },
});

/**
 * Create a new user. The first user ever created automatically gets the "admin" role.
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("readonly")
    ),
    mustChangePassword: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if this is the very first user
    const existingUsers = await ctx.db.query("users").first();
    const role = existingUsers === null ? "admin" : args.role;

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role,
      mustChangePassword: args.mustChangePassword,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId,
      action: "create_user",
      entityType: "users",
      entityId: userId,
      details: `Created user ${args.name} (${args.email}) with role ${role}`,
    });

    return userId;
  },
});

/**
 * Update a user's role. Admin only.
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("readonly")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin");

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("Target user not found");

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "update_user_role",
      entityType: "users",
      entityId: args.userId,
      details: `Changed role from ${targetUser.role} to ${args.role} for ${targetUser.name}`,
    });
  },
});

/**
 * Delete a user. Admin only.
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireRole(ctx, "admin");

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("Target user not found");

    await ctx.db.delete(args.userId);

    await ctx.runMutation(internal.auditLog.log, {
      userId: currentUser._id,
      action: "delete_user",
      entityType: "users",
      entityId: args.userId,
      details: `Deleted user ${targetUser.name} (${targetUser.email})`,
    });
  },
});
