"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";

// Send message to OpenAI Assistants API and save response
export const sendMessage = action({
  args: {
    sessionId: v.string(),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    // Save user message
    await ctx.runMutation(api.aiDirector.saveMessage, {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      userId: args.userId,
    });

    // Get or create assistant config
    let config = await ctx.runQuery(api.aiDirector.getConfig);

    if (!config) {
      // Set up the assistant if not configured
      const result = await ctx.runAction(internal.aiDirectorActions.setupAssistant, {});
      config = result;
    }

    // Get chat history for context
    const messages = await ctx.runQuery(api.aiDirector.getMessages, {
      sessionId: args.sessionId,
    });

    // Check for custom system prompt in appSettings (admin-configurable)
    const customPrompt = await ctx.runQuery(api.settings.get, { key: "ai_director_system_prompt" });

    // Build messages array for chat completion
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content: customPrompt?.value || config.systemInstructions || getDefaultInstructions(),
      },
    ];

    // Add last 20 messages for context
    const recentMessages = messages.slice(-20);
    for (const msg of recentMessages) {
      chatMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    // Add current message
    chatMessages.push({ role: "user", content: args.content });

    // Call OpenAI with file search if vector store exists
    const tools = config.vectorStoreId
      ? [{ type: "file_search" as const }]
      : undefined;

    const toolResources = config.vectorStoreId
      ? { file_search: { vector_store_ids: [config.vectorStoreId] } }
      : undefined;

    // Use Assistants API for better file search
    if (config.assistantId && config.vectorStoreId) {
      // Create a thread and run
      const thread = await openai.beta.threads.create({
        messages: chatMessages.map((m) => ({
          role: m.role === "system" ? "assistant" : m.role,
          content: m.content,
        })),
      });

      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: config.assistantId,
      });

      if (run.status === "completed") {
        const threadMessages = await openai.beta.threads.messages.list(thread.id);
        const assistantMsg = threadMessages.data.find((m) => m.role === "assistant");
        const responseText =
          assistantMsg?.content[0]?.type === "text"
            ? assistantMsg.content[0].text.value
            : "I apologize, but I couldn't generate a response.";

        // Save assistant response
        await ctx.runMutation(api.aiDirector.saveMessage, {
          sessionId: args.sessionId,
          role: "assistant",
          content: responseText,
          userId: args.userId,
        });

        return responseText;
      }
    }

    // Fallback to regular chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText =
      completion.choices[0]?.message?.content ||
      "I apologize, but I couldn't generate a response.";

    // Save assistant response
    await ctx.runMutation(api.aiDirector.saveMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content: responseText,
      userId: args.userId,
    });

    return responseText;
  },
});

// Set up OpenAI Assistant + vector store
export const setupAssistant = internalAction({
  handler: async (ctx) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    // Create vector store
    const vectorStore = await openai.vectorStores.create({
      name: "DEC Knowledge Base",
    });

    // Create assistant
    const assistant = await openai.beta.assistants.create({
      name: "AI Director - DEC Assistant",
      instructions: getDefaultInstructions(),
      model: "gpt-4o",
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: { vector_store_ids: [vectorStore.id] },
      },
    });

    const config = {
      assistantId: assistant.id,
      vectorStoreId: vectorStore.id,
      systemInstructions: getDefaultInstructions(),
      updatedAt: Date.now(),
    };

    await ctx.runMutation(internal.aiDirectorInternal.saveConfig, config);

    return config;
  },
});

function getDefaultInstructions(): string {
  return `You are AI Director, the AI assistant for Dads Evoking Change (DEC), a nonprofit organization focused on fatherhood programs and family services.

You help staff with:
- Organization policies and procedures
- Program information (co-parenting, legal assistance, fatherhood programs)
- Grant management guidance
- Client service questions
- General operational questions

Always be professional, helpful, and empathetic. Reference uploaded documents when available.
If you don't know something, say so honestly rather than guessing.`;
}
