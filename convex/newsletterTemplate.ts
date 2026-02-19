// Branded HTML email template for DEC newsletters
// Ported from the n8n workflow — injects content into a pre-built template,
// then OpenAI polishes (removes empty sections, fixes formatting).

interface NewsletterSections {
  welcomeMessage?: string;
  recentMilestones?: string;
  personalReflections?: string;
  programUpdates?: string;
  programHighlights?: string;
  participantTestimonials?: string;
  upcomingEvents?: string;
  dadOfMonthName?: string;
  dadOfMonthStory?: string;
  photoLink?: string;
  communityEvents?: string;
  partnerships?: string;
  fatherhoodStat?: string;
  volunteerNeeds?: string;
  donationCampaigns?: string;
  readerSupport?: string;
  contactInfo?: string;
  socialMediaCTA?: string;
  additionalNotes?: string;
}

function hasContent(...fields: (string | undefined)[]): boolean {
  return fields.some((f) => f && f.trim().length > 0);
}

function nl2br(text: string): string {
  return text.replace(/\n/g, "<br>");
}

export function buildNewsletterHtml(
  title: string,
  sections: NewsletterSections
): string {
  const PRIMARY = "#345c72";
  const PRIMARY_LIGHT = "#7DACC4";
  const FOOTER_BG = "#2a4a5c";
  const TEXT_DARK = "#333333";
  const TEXT_LIGHT = "#666666";
  const BG_LIGHT = "#f4f4f4";
  const WHITE = "#ffffff";
  const LOGO_URL =
    "https://img1.wsimg.com/isteam/ip/0a4f58d6-398a-4973-a498-0771464f243a/DEC%20Logo%20Name%20Below.png/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:1280";

  let html = "";

  // --- Header ---
  html += `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_LIGHT};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_LIGHT};">
<tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:${WHITE};border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

<!-- Logo Header -->
<tr>
<td align="center" style="background-color:${PRIMARY};padding:30px 20px;">
<img src="${LOGO_URL}" alt="Dads Evoking Change" width="180" style="display:block;max-width:180px;height:auto;">
<h1 style="color:${WHITE};font-size:24px;margin:16px 0 4px;font-weight:bold;">${title}</h1>
<p style="color:${PRIMARY_LIGHT};font-size:14px;margin:0;">Empowering Fathers, Strengthening Families</p>
</td>
</tr>`;

  // --- Welcome & Leadership ---
  if (hasContent(sections.welcomeMessage, sections.recentMilestones, sections.personalReflections)) {
    html += `
<tr>
<td style="padding:30px 30px 10px;">
<h2 style="color:${PRIMARY};font-size:20px;margin:0 0 16px;border-bottom:2px solid ${PRIMARY_LIGHT};padding-bottom:8px;">Welcome from Leadership</h2>`;
    if (sections.welcomeMessage?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;">${nl2br(sections.welcomeMessage.trim())}</p>`;
    }
    if (sections.recentMilestones?.trim()) {
      html += `<p style="color:${TEXT_LIGHT};font-size:14px;line-height:1.6;margin:0 0 12px;"><strong>Recent Milestones:</strong> ${nl2br(sections.recentMilestones.trim())}</p>`;
    }
    if (sections.personalReflections?.trim()) {
      html += `<p style="color:${TEXT_LIGHT};font-size:14px;line-height:1.6;margin:0 0 12px;font-style:italic;">${nl2br(sections.personalReflections.trim())}</p>`;
    }
    html += `</td></tr>`;
  }

  // --- Program Updates ---
  if (hasContent(sections.programUpdates, sections.programHighlights, sections.participantTestimonials, sections.upcomingEvents)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<h2 style="color:${PRIMARY};font-size:20px;margin:0 0 16px;border-bottom:2px solid ${PRIMARY_LIGHT};padding-bottom:8px;">Program Updates</h2>`;
    if (sections.programUpdates?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;">${nl2br(sections.programUpdates.trim())}</p>`;
    }
    if (sections.programHighlights?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;"><strong>Highlights:</strong> ${nl2br(sections.programHighlights.trim())}</p>`;
    }
    if (sections.participantTestimonials?.trim()) {
      html += `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
<tr><td style="background-color:#f0f7fa;border-left:4px solid ${PRIMARY};padding:16px;border-radius:0 4px 4px 0;">
<p style="color:${TEXT_DARK};font-size:14px;line-height:1.6;margin:0;font-style:italic;">${nl2br(sections.participantTestimonials.trim())}</p>
</td></tr></table>`;
    }
    if (sections.upcomingEvents?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:12px 0 0;"><strong>Upcoming Events:</strong> ${nl2br(sections.upcomingEvents.trim())}</p>`;
    }
    html += `</td></tr>`;
  }

  // --- Dad of the Month ---
  if (hasContent(sections.dadOfMonthName, sections.dadOfMonthStory)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<h2 style="color:${PRIMARY};font-size:20px;margin:0 0 16px;border-bottom:2px solid ${PRIMARY_LIGHT};padding-bottom:8px;">Dad of the Month</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f7fa;border-radius:8px;overflow:hidden;">
<tr><td style="padding:20px;">`;
    if (sections.photoLink?.trim()) {
      html += `<img src="${sections.photoLink.trim()}" alt="${sections.dadOfMonthName?.trim() || "Dad of the Month"}" width="120" style="display:block;border-radius:50%;margin:0 auto 16px;max-width:120px;height:auto;">`;
    }
    if (sections.dadOfMonthName?.trim()) {
      html += `<h3 style="color:${PRIMARY};font-size:18px;margin:0 0 8px;text-align:center;">${sections.dadOfMonthName.trim()}</h3>`;
    }
    if (sections.dadOfMonthStory?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:14px;line-height:1.6;margin:0;">${nl2br(sections.dadOfMonthStory.trim())}</p>`;
    }
    html += `</td></tr></table>
</td></tr>`;
  }

  // --- Community & Partnerships ---
  if (hasContent(sections.communityEvents, sections.partnerships)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<h2 style="color:${PRIMARY};font-size:20px;margin:0 0 16px;border-bottom:2px solid ${PRIMARY_LIGHT};padding-bottom:8px;">Community &amp; Partnerships</h2>`;
    if (sections.communityEvents?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;"><strong>Community Events:</strong> ${nl2br(sections.communityEvents.trim())}</p>`;
    }
    if (sections.partnerships?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;"><strong>Partnerships:</strong> ${nl2br(sections.partnerships.trim())}</p>`;
    }
    html += `</td></tr>`;
  }

  // --- Fatherhood Stats ---
  if (hasContent(sections.fatherhoodStat)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PRIMARY};border-radius:8px;">
<tr><td style="padding:24px;text-align:center;">
<p style="color:${PRIMARY_LIGHT};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Fatherhood Stat</p>
<p style="color:${WHITE};font-size:16px;line-height:1.5;margin:0;">${nl2br(sections.fatherhoodStat!.trim())}</p>
</td></tr></table>
</td></tr>`;
  }

  // --- Support & Get Involved ---
  if (hasContent(sections.donationCampaigns, sections.volunteerNeeds, sections.readerSupport)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<h2 style="color:${PRIMARY};font-size:20px;margin:0 0 16px;border-bottom:2px solid ${PRIMARY_LIGHT};padding-bottom:8px;">Support &amp; Get Involved</h2>`;
    if (sections.donationCampaigns?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;">${nl2br(sections.donationCampaigns.trim())}</p>`;
    }
    if (sections.volunteerNeeds?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;"><strong>Volunteer Opportunities:</strong> ${nl2br(sections.volunteerNeeds.trim())}</p>`;
    }
    if (sections.readerSupport?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;">${nl2br(sections.readerSupport.trim())}</p>`;
    }
    // CTA buttons
    html += `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr>
<td style="padding-right:12px;">
<a href="https://www.gofundme.com/f/dads-evoking-change" target="_blank" style="display:inline-block;background-color:${PRIMARY};color:${WHITE};text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;">Donate Now</a>
</td>
<td>
<a href="https://www.dadsevokingchange.org/volunteer" target="_blank" style="display:inline-block;background-color:${PRIMARY_LIGHT};color:${WHITE};text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;">Volunteer</a>
</td>
</tr></table>`;
    html += `</td></tr>`;
  }

  // --- Stay Connected ---
  if (hasContent(sections.socialMediaCTA, sections.contactInfo)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<h2 style="color:${PRIMARY};font-size:20px;margin:0 0 16px;border-bottom:2px solid ${PRIMARY_LIGHT};padding-bottom:8px;">Stay Connected</h2>`;
    if (sections.socialMediaCTA?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0 0 12px;">${nl2br(sections.socialMediaCTA.trim())}</p>`;
    }
    if (sections.contactInfo?.trim()) {
      html += `<p style="color:${TEXT_LIGHT};font-size:14px;line-height:1.6;margin:0 0 12px;">${nl2br(sections.contactInfo.trim())}</p>`;
    }
    // Social icons
    html += `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0;">
<tr>
<td style="padding-right:16px;">
<a href="https://www.facebook.com/DadsEvokingChange" target="_blank" style="color:${PRIMARY};font-size:14px;text-decoration:none;font-weight:bold;">Facebook</a>
</td>
<td style="padding-right:16px;">
<a href="https://www.instagram.com/dadsevokingchange/" target="_blank" style="color:${PRIMARY};font-size:14px;text-decoration:none;font-weight:bold;">Instagram</a>
</td>
<td>
<a href="https://www.dadsevokingchange.org" target="_blank" style="color:${PRIMARY};font-size:14px;text-decoration:none;font-weight:bold;">Website</a>
</td>
</tr></table>`;
    html += `</td></tr>`;
  }

  // --- Additional Notes ---
  if (hasContent(sections.additionalNotes)) {
    html += `
<tr>
<td style="padding:20px 30px 10px;">
<p style="color:${TEXT_DARK};font-size:15px;line-height:1.6;margin:0;">${nl2br(sections.additionalNotes!.trim())}</p>
</td></tr>`;
  }

  // --- Footer ---
  html += `
<tr>
<td style="background-color:${FOOTER_BG};padding:30px;text-align:center;">
<p style="color:${PRIMARY_LIGHT};font-size:13px;margin:0 0 8px;">Dads Evoking Change</p>
<p style="color:#a0b8c8;font-size:12px;margin:0 0 16px;">Empowering Fathers, Strengthening Families</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
<tr>
<td style="padding-right:12px;">
<a href="https://www.gofundme.com/f/dads-evoking-change" target="_blank" style="display:inline-block;background-color:${PRIMARY_LIGHT};color:${WHITE};text-decoration:none;padding:10px 20px;border-radius:4px;font-size:13px;font-weight:bold;">Donate</a>
</td>
<td>
<a href="https://www.dadsevokingchange.org/volunteer" target="_blank" style="display:inline-block;border:1px solid ${PRIMARY_LIGHT};color:${PRIMARY_LIGHT};text-decoration:none;padding:10px 20px;border-radius:4px;font-size:13px;font-weight:bold;">Volunteer</a>
</td>
</tr></table>
<p style="color:#a0b8c8;font-size:11px;margin:0;">info@dadsevokingchange.org | www.dadsevokingchange.org</p>
<p style="color:#7a9ab0;font-size:10px;margin:8px 0 0;">&copy; ${new Date().getFullYear()} Dads Evoking Change. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr></table>
</body>
</html>`;

  return html;
}
