import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Save or update Iceberg config
export const saveConfig = internalMutation({
  args: {
    assistantId: v.string(),
    vectorStoreId: v.string(),
    systemInstructions: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("icebergConfig").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("icebergConfig", args);
    }
  },
});
