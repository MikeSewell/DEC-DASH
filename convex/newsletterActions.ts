"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";
import { buildNewsletterHtml } from "./newsletterTemplate";

// Generate email HTML from newsletter sections using branded template + OpenAI polish
export const generateEmailHtml = action({
  args: { id: v.id("newsletters") },
  handler: async (ctx, args) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    const newsletter = await ctx.runQuery(api.newsletters.getById, { id: args.id });
    if (!newsletter) throw new Error("Newsletter not found");

    const sections = JSON.parse(newsletter.sections);

    // Step 1: Inject content into branded template
    const rawHtml = buildNewsletterHtml(newsletter.title, sections);

    // Step 2: Polish with OpenAI (ported from n8n workflow)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert HTML email designer. Your job is to polish and finalize a branded HTML email newsletter.

Rules:
1. REMOVE any sections that contain only placeholder text, empty content, or "N/A" — delete the entire section block including its heading.
2. Fix any HTML syntax issues and ensure all tags are properly closed.
3. Ensure all CSS is inline (no <style> blocks) for maximum email client compatibility.
4. Improve visual consistency — ensure spacing, font sizes, and colors are uniform.
5. Add a preheader text meta tag after <title> with a compelling 1-line summary of the newsletter content.
6. Do NOT change the brand colors, logo URL, or overall layout structure.
7. Do NOT add new sections or content that wasn't in the original.
8. Return ONLY the final HTML — no markdown fences, no explanation.

On the FIRST line of your response, output a compelling email subject line for this newsletter.
Then output "---" on a line by itself.
Then output the polished HTML.`,
        },
        {
          role: "user",
          content: rawHtml,
        },
      ],
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || "";
    const separatorIndex = response.indexOf("---");

    let subject = newsletter.title;
    let html = response;

    if (separatorIndex > 0) {
      subject = response.substring(0, separatorIndex).trim();
      html = response.substring(separatorIndex + 3).trim();
    }

    // Strip markdown code fences if present
    if (html.startsWith("```")) {
      html = html.replace(/^```html?\n?/, "").replace(/\n?```$/, "");
    }

    // Save generated HTML back to newsletter
    await ctx.runMutation(api.newsletters.update, {
      id: args.id,
      generatedEmailHtml: html,
      generatedEmailSubject: subject,
    });

    return { subject, html };
  },
});

// Send a test/review email via Constant Contact before the real send
export const sendTestEmail = action({
  args: {
    id: v.id("newsletters"),
    testEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const newsletter = await ctx.runQuery(api.newsletters.getById, { id: args.id });
    if (!newsletter) throw new Error("Newsletter not found");
    if (!newsletter.generatedEmailHtml) throw new Error("Email HTML not generated yet. Generate it first.");

    const ccConfig = await ctx.runQuery(internal.constantContactInternal.getFullConfig);
    if (!ccConfig) throw new Error("Constant Contact not connected");

    // Refresh token if needed
    let accessToken = ccConfig.accessToken;
    if (ccConfig.tokenExpiry < Date.now() + 60000) {
      accessToken = await ctx.runAction(internal.constantContactActions.refreshTokens, {});
    }

    // Reuse existing campaign or create a new one
    let activityId = newsletter.campaignActivityId;

    if (!activityId) {
      // Create email campaign in Constant Contact
      const campaignResponse = await fetch("https://api.cc.email/v3/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${newsletter.title} - ${Date.now()}`,
          email_campaign_activities: [
            {
              format_type: 5,
              from_email: "info@dadsevokingchange.org",
              from_name: "Dads Evoking Change",
              reply_to_email: "info@dadsevokingchange.org",
              subject: newsletter.generatedEmailSubject || newsletter.title,
              html_content: newsletter.generatedEmailHtml,
            },
          ],
        }),
      });

      if (!campaignResponse.ok) {
        const error = await campaignResponse.text();
        throw new Error(`Failed to create CC campaign: ${error}`);
      }

      const campaign = await campaignResponse.json();
      activityId = campaign.campaign_activities?.[0]?.campaign_activity_id;

      if (!activityId) throw new Error("Failed to get campaign activity ID from Constant Contact");

      // Store the campaign activity ID for reuse
      await ctx.runMutation(api.newsletters.update, {
        id: args.id,
        campaignActivityId: activityId,
      });
    }

    // Send test email via CC test endpoint
    const testResponse = await fetch(
      `https://api.cc.email/v3/emails/activities/${activityId}/tests`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_addresses: [args.testEmail],
          personal_message: "Test preview of DEC newsletter",
        }),
      }
    );

    if (!testResponse.ok) {
      const error = await testResponse.text();
      throw new Error(`Failed to send test email: ${error}`);
    }

    return { success: true, testEmail: args.testEmail };
  },
});

// Send newsletter via Constant Contact to a contact list
export const sendNewsletter = action({
  args: { id: v.id("newsletters"), contactListId: v.string() },
  handler: async (ctx, args) => {
    const newsletter = await ctx.runQuery(api.newsletters.getById, { id: args.id });
    if (!newsletter) throw new Error("Newsletter not found");
    if (!newsletter.generatedEmailHtml) throw new Error("Email HTML not generated yet");

    const ccConfig = await ctx.runQuery(internal.constantContactInternal.getFullConfig);
    if (!ccConfig) throw new Error("Constant Contact not connected");

    // Refresh token if needed
    let accessToken = ccConfig.accessToken;
    if (ccConfig.tokenExpiry < Date.now() + 60000) {
      accessToken = await ctx.runAction(internal.constantContactActions.refreshTokens, {});
    }

    let activityId = newsletter.campaignActivityId;

    if (!activityId) {
      // Create email campaign in Constant Contact
      const campaignResponse = await fetch("https://api.cc.email/v3/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newsletter.title,
          email_campaign_activities: [
            {
              format_type: 5,
              from_email: "info@dadsevokingchange.org",
              from_name: "Dads Evoking Change",
              reply_to_email: "info@dadsevokingchange.org",
              subject: newsletter.generatedEmailSubject || newsletter.title,
              html_content: newsletter.generatedEmailHtml,
              contact_list_ids: [args.contactListId],
            },
          ],
        }),
      });

      if (!campaignResponse.ok) {
        const error = await campaignResponse.text();
        throw new Error(`Failed to create CC campaign: ${error}`);
      }

      const campaign = await campaignResponse.json();
      activityId = campaign.campaign_activities?.[0]?.campaign_activity_id;

      if (!activityId) throw new Error("Failed to get campaign activity ID");

      await ctx.runMutation(api.newsletters.update, {
        id: args.id,
        campaignActivityId: activityId,
      });
    } else {
      // Campaign already exists (from test send) — update it with the contact list
      const updateResponse = await fetch(
        `https://api.cc.email/v3/emails/activities/${activityId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            format_type: 5,
            from_email: "info@dadsevokingchange.org",
            from_name: "Dads Evoking Change",
            reply_to_email: "info@dadsevokingchange.org",
            subject: newsletter.generatedEmailSubject || newsletter.title,
            html_content: newsletter.generatedEmailHtml,
            contact_list_ids: [args.contactListId],
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        throw new Error(`Failed to update CC campaign activity: ${error}`);
      }
    }

    // Schedule to send immediately
    await fetch(
      `https://api.cc.email/v3/emails/activities/${activityId}/schedules`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduled_date: "0" }),
      }
    );

    // Mark as published
    await ctx.runMutation(api.newsletters.publish, { id: args.id });

    return { success: true };
  },
});
