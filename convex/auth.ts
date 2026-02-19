import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: (params.name as string) || (params.email as string).split("@")[0],
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx<DataModel>, args) {
      if (args.existingUserId) {
        // Existing user — just return
        return args.existingUserId;
      }

      // New user — check if this is the first user (auto-admin)
      const existingUsers = await ctx.db.query("users").first();
      const now = Date.now();

      const userId = await ctx.db.insert("users", {
        email: args.profile.email,
        name: args.profile.name ?? (args.profile.email?.split("@")[0] || "User"),
        role: existingUsers === null ? "admin" : "staff",
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      });

      return userId;
    },
  },
});
