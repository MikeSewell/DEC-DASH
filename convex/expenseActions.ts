"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getOpenAIApiKey } from "./openaiHelpers";

export const getRecommendations = action({
  args: {
    expenseSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    const prompt = `You are a financial advisor specializing in nonprofit organizations. Analyze the following expense summary for "Dads Evoking Change" (DEC), a nonprofit focused on fatherhood programs and family services.

Expense Summary:
${args.expenseSummary}

Provide cost-saving recommendations in the following JSON format (no markdown, just valid JSON):
{
  "overallAssessment": "A 2-3 sentence summary of spending patterns and overall financial health.",
  "recommendations": [
    {
      "title": "Short recommendation title",
      "description": "Detailed explanation of the recommendation and how to implement it.",
      "priority": "high" | "medium" | "low",
      "potentialSavings": "Estimated savings range or percentage, e.g. '$500-$1,000/month' or '10-15%'"
    }
  ],
  "vendorInsights": "A paragraph analyzing vendor spending patterns and consolidation opportunities.",
  "accountNotes": "A paragraph about account category distribution and any imbalances."
}

Focus on practical, nonprofit-specific advice. Consider grant compliance, program efficiency, and sustainable cost management. Provide 3-5 recommendations sorted by priority.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    try {
      return JSON.parse(cleaned);
    } catch {
      return {
        overallAssessment: raw,
        recommendations: [],
        vendorInsights: "",
        accountNotes: "",
      };
    }
  },
});
