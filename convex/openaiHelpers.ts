import { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Get the OpenAI API key from appSettings (DB) first, falling back to env var.
 * Throws if neither is configured.
 */
export async function getOpenAIApiKey(ctx: ActionCtx): Promise<string> {
  // Check DB setting first
  const setting = await ctx.runQuery(api.settings.get, { key: "openai_api_key" });
  if (setting?.value) {
    return setting.value;
  }

  // Fall back to environment variable
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  throw new Error(
    "OpenAI API key not configured. An admin can set it in Admin > Settings."
  );
}
