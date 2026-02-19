import { query, mutation } from "./_generated/server";

// Debug: list all auth accounts
export const listAuthAccounts = query({
  handler: async (ctx) => {
    return await ctx.db.query("authAccounts").collect();
  },
});

// Debug: list all users
export const listAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Debug: clear all auth data to allow re-registration
export const clearAuthData = mutation({
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    for (const a of accounts) await ctx.db.delete(a._id);

    const sessions = await ctx.db.query("authSessions").collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    const tokens = await ctx.db.query("authRefreshTokens").collect();
    for (const t of tokens) await ctx.db.delete(t._id);

    const codes = await ctx.db.query("authVerificationCodes").collect();
    for (const c of codes) await ctx.db.delete(c._id);

    const verifiers = await ctx.db.query("authVerifiers").collect();
    for (const v of verifiers) await ctx.db.delete(v._id);

    const rateLimits = await ctx.db.query("authRateLimits").collect();
    for (const r of rateLimits) await ctx.db.delete(r._id);

    const users = await ctx.db.query("users").collect();
    for (const u of users) await ctx.db.delete(u._id);

    return { cleared: true };
  },
});
