"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { getOpenAIApiKey } from "./openaiHelpers";

// Generate email HTML from newsletter sections using OpenAI
export const generateEmailHtml = action({
  args: { id: v.id("newsletters") },
  handler: async (ctx, args) => {
    const OpenAI = (await import("openai")).default;
    const apiKey = await getOpenAIApiKey(ctx);
    const openai = new OpenAI({ apiKey });

    const newsletter = await ctx.runQuery(api.newsletters.getById, { id: args.id });
    if (!newsletter) throw new Error("Newsletter not found");

    const sections = JSON.parse(newsletter.sections);

    const prompt = `Generate a professional, mobile-friendly HTML email newsletter for "Dads Evoking Change" nonprofit organization.

Use this content:
- Title: ${newsletter.title}
- Dad of the Month: ${sections.dadOfMonthName || "N/A"} — ${sections.dadOfMonthStory || "N/A"}
- Participant Testimonials: ${sections.participantTestimonials || "N/A"}
- Program Highlights: ${sections.programHighlights || "N/A"}
- Program Updates: ${sections.programUpdates || "N/A"}
- Fatherhood Stat: ${sections.fatherhoodStat || "N/A"}
- Additional Notes: ${sections.additionalNotes || "N/A"}

Brand colors: Primary green #1B4D3E, Gold accent #D4A843.
Include a header with the organization name, sections with clear headings, and a footer.
Return ONLY the HTML code, no markdown or explanation.
Also suggest a compelling email subject line on the first line, then "---" separator, then the HTML.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "";
    const separatorIndex = response.indexOf("---");

    let subject = newsletter.title;
    let html = response;

    if (separatorIndex > 0) {
      subject = response.substring(0, separatorIndex).trim();
      html = response.substring(separatorIndex + 3).trim();
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

// Send newsletter via Constant Contact
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

    // Create email campaign in Constant Contact
    const campaignResponse = await fetch(
      "https://api.cc.email/v3/emails",
      {
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
      }
    );

    if (!campaignResponse.ok) {
      const error = await campaignResponse.text();
      throw new Error(`Failed to create CC campaign: ${error}`);
    }

    const campaign = await campaignResponse.json();

    // Schedule to send immediately
    const activityId = campaign.campaign_activities?.[0]?.campaign_activity_id;
    if (activityId) {
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
    }

    // Mark as published
    await ctx.runMutation(api.newsletters.publish, { id: args.id });

    return { success: true, campaignId: campaign.campaign_id };
  },
});
