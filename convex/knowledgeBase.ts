import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all knowledge base files
export const listFiles = query({
  handler: async (ctx) => {
    return await ctx.db.query("knowledgeBase").collect();
  },
});

// Generate upload URL for Convex file storage
export const getUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save file record after upload
export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    sizeBytes: v.number(),
    openaiFileId: v.string(),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("knowledgeBase", {
      ...args,
      uploadedAt: Date.now(),
    });
  },
});

// Delete file from knowledge base
export const deleteFile = mutation({
  args: { id: v.id("knowledgeBase") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id);
    if (file) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(args.id);
    }
  },
});
