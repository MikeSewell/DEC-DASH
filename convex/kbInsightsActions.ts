"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";

// ─── System prompt ──────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction assistant for the Dads' Education Center (DEC), a nonprofit organization.

Your task is to extract organizational metrics from the provided documents. These documents may include impact reports, grant reports, meeting notes, program descriptions, and operational summaries.

CRITICAL RULES:
1. Return null for any metric not explicitly mentioned in the documents — NEVER invent, estimate, or infer values.
2. For each metric found, record the exact document name it was extracted from in the sourceDocument field.
3. When multiple documents report different values for the same metric, use the value from the most recently dated document. Record the alternate value in conflictValue and its source document in conflictDocument.
4. If a metric is not found in any document, set value to null, unit to null, and sourceDocument to null.
5. The conflictValue and conflictDocument fields should be null if there is no conflict.

Extract the following specific metrics:
- total_clients_served: Total number of clients served (label: "Total Clients Served", unit: "clients")
- active_clients: Current number of active clients (label: "Active Clients", unit: "clients")
- legal_clients_served: Clients served through the legal program (label: "Legal Clients Served", unit: "clients")
- coparent_clients_served: Clients served through the co-parenting program (label: "Co-Parent Clients Served", unit: "clients")
- program_completion_rate: Percentage of clients who completed the program (label: "Program Completion Rate", unit: "%")
- volunteers_engaged: Number of volunteers engaged (label: "Volunteers Engaged", unit: "volunteers")
- grants_managed: Number of grants managed or active (label: "Grants Managed", unit: "grants")
- community_events: Number of community events held (label: "Community Events Held", unit: "events")

Return all 8 metrics in the response, using null for metrics not found in the documents.`;

// ─── JSON schema for structured output ──────────────────────────────────────

const KPI_SCHEMA = {
  type: "object" as const,
  properties: {
    metrics: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          key: { type: "string" as const },
          label: { type: "string" as const },
          value: { type: ["string", "null"] as const },
          unit: { type: ["string", "null"] as const },
          sourceDocument: { type: ["string", "null"] as const },
          conflictValue: { type: ["string", "null"] as const },
          conflictDocument: { type: ["string", "null"] as const },
        },
        required: ["key", "label", "value", "unit", "sourceDocument", "conflictValue", "conflictDocument"] as const,
        additionalProperties: false as const,
      },
    },
  },
  required: ["metrics"] as const,
  additionalProperties: false as const,
};

// ─── Metric definitions ──────────────────────────────────────────────────────

export const METRIC_DEFINITIONS = [
  { key: "total_clients_served", label: "Total Clients Served", unit: "clients" },
  { key: "active_clients", label: "Active Clients", unit: "clients" },
  { key: "legal_clients_served", label: "Legal Clients Served", unit: "clients" },
  { key: "coparent_clients_served", label: "Co-Parent Clients Served", unit: "clients" },
  { key: "program_completion_rate", label: "Program Completion Rate", unit: "%" },
  { key: "volunteers_engaged", label: "Volunteers Engaged", unit: "volunteers" },
  { key: "grants_managed", label: "Grants Managed", unit: "grants" },
  { key: "community_events", label: "Community Events Held", unit: "events" },
];

// ─── Helper: detect binary/non-text content ──────────────────────────────────

function isBinaryContent(text: string): boolean {
  // Check first 500 chars for high ratio of non-printable characters
  const sample = text.slice(0, 500);
  const nonPrintable = sample.replace(/[\x20-\x7E\n\r\t]/g, "").length;
  return nonPrintable / sample.length > 0.3;
}

// ─── Main action ─────────────────────────────────────────────────────────────

export const extractMetrics = action({
  args: {},
  handler: async (ctx) => {
    // 1. Set extracting flag so frontend can show loading state
    await ctx.runMutation(internal.kbInsights.setExtracting, { extracting: true });

    try {
      // 2. Initialize OpenAI
      const OpenAI = (await import("openai")).default;
      const apiKey = await getOpenAIApiKey(ctx);
      const openai = new OpenAI({ apiKey });

      // 3. Load all KB files
      const files = await ctx.runQuery(api.knowledgeBase.listFiles);
      if (files.length === 0) {
        await ctx.runMutation(internal.kbInsights.setExtracting, { extracting: false });
        throw new Error(
          "No KB documents uploaded. Upload documents in the Knowledge Base tab before extracting metrics."
        );
      }

      // 4. Download and extract text content per file
      // Use response.text() for all file types. Works for TXT, MD, JSON, HTML, CSV.
      // For PDFs, text() returns garbled binary — isBinaryContent check skips those gracefully.
      const documentBlocks: string[] = [];
      for (const file of files) {
        const url = await ctx.storage.getUrl(file.storageId);
        if (!url) continue;
        const response = await fetch(url);
        const text = await response.text();
        // Skip files that appear to be binary (garbled text indicator)
        if (text.length > 0 && !isBinaryContent(text)) {
          documentBlocks.push(
            `=== Document: ${file.fileName} (uploaded ${new Date(file.uploadedAt).toISOString().split("T")[0]}) ===\n${text}`
          );
        }
      }

      if (documentBlocks.length === 0) {
        await ctx.runMutation(internal.kbInsights.setExtracting, { extracting: false });
        throw new Error(
          "No readable text documents found in KB. Upload TXT, MD, or other text-format files."
        );
      }

      // 5. Call Chat Completions with json_schema structured output
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "kpi_extraction",
            strict: true,
            schema: KPI_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract organizational metrics from these ${documentBlocks.length} documents:\n\n${documentBlocks.join("\n\n")}`,
          },
        ],
      });

      const result = JSON.parse(
        completion.choices[0].message.content ?? '{"metrics":[]}'
      ) as { metrics: Array<{
        key: string;
        label: string;
        value: string | null;
        unit: string | null;
        sourceDocument: string | null;
        conflictValue: string | null;
        conflictDocument: string | null;
      }> };

      // 6. Persist to kbSummaryCache (replaces singleton row)
      await ctx.runMutation(internal.kbInsights.saveCache, {
        metrics: result.metrics,
        extractedAt: Date.now(),
        documentCount: files.length,
      });

      const extractedCount = result.metrics.filter((m) => m.value !== null).length;
      return { success: true, metricsExtracted: extractedCount };
    } catch (error) {
      // Always reset extracting flag on error so the frontend doesn't get stuck
      await ctx.runMutation(internal.kbInsights.setExtracting, { extracting: false });
      throw error;
    }
  },
});
