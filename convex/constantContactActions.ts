"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Refresh CC tokens
export const refreshTokens = internalAction({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.constantContactInternal.getFullConfig);
    if (!config) throw new Error("Constant Contact not connected");

    const response = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.CC_CLIENT_ID}:${process.env.CC_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) throw new Error("Failed to refresh CC token");
    const token = await response.json();

    await ctx.runMutation(internal.constantContactInternal.updateTokens, {
      configId: config._id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiry: Date.now() + token.expires_in * 1000,
    });

    return token.access_token;
  },
});

// Get contact lists from CC
export const getContactLists = action({
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.constantContactInternal.getFullConfig);
    if (!config) throw new Error("Constant Contact not connected");

    let accessToken = config.accessToken;
    if (config.tokenExpiry < Date.now() + 60000) {
      accessToken = await ctx.runAction(internal.constantContactActions.refreshTokens, {});
    }

    const response = await fetch("https://api.cc.email/v3/contact_lists", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error("Failed to fetch CC contact lists");
    const data = await response.json();
    return data.lists || [];
  },
});
