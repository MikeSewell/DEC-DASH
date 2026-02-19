"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";

// Upload file to OpenAI vector store
export const uploadToOpenAI = action({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    sizeBytes: v.number(),
    uploadedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    // Get the file from Convex storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found in storage");

    // Download the file
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const file = new File([blob], args.fileName, { type: args.fileType });

    // Upload to OpenAI
    const openaiFile = await openai.files.create({
      file,
      purpose: "assistants",
    });

    // Get config for vector store ID
    const config = await ctx.runQuery(api.aiDirector.getConfig);
    if (config?.vectorStoreId) {
      // Add file to vector store
      await openai.vectorStores.files.create(config.vectorStoreId, {
        file_id: openaiFile.id,
      });
    }

    // Save file record in Convex
    await ctx.runMutation(api.knowledgeBase.saveFile, {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      sizeBytes: args.sizeBytes,
      openaiFileId: openaiFile.id,
      uploadedBy: args.uploadedBy,
    });

    return { openaiFileId: openaiFile.id };
  },
});

// Remove file from OpenAI
export const removeFromOpenAI = action({
  args: { id: v.id("knowledgeBase") },
  handler: async (ctx, args) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    // Get file record
    const files = await ctx.runQuery(api.knowledgeBase.listFiles);
    const file = files.find((f: any) => f._id === args.id);
    if (!file) throw new Error("File not found");

    // Remove from OpenAI vector store
    const config = await ctx.runQuery(api.aiDirector.getConfig);
    if (config?.vectorStoreId) {
      try {
        await openai.vectorStores.files.delete(
          config.vectorStoreId,
          file.openaiFileId
        );
      } catch {
        // File may already be removed
      }
    }

    // Delete the OpenAI file
    try {
      await openai.files.delete(file.openaiFileId);
    } catch {
      // File may already be removed
    }

    // Delete from Convex
    await ctx.runMutation(api.knowledgeBase.deleteFile, { id: args.id });
  },
});
