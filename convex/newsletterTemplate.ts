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
    "https://img1.wsimg.com/isteam/ip/79d3269a-c5cf-4ad8-8b38-1cad9786def8/DEC%20logo%20small.jpg/:/rs=w:500,cg:true,m";

  let html = "";

  // --- Outer wrapper + Main container ---
  html += `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_LIGHT};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG_LIGHT};margin:0;padding:0;font-family:Arial,sans-serif;">
<tr>
<td align="center" style="padding:20px 0;">

<!-- Main Container -->
<table role="presentation" border="0" width="600" cellspacing="0" cellpadding="0" style="background-color:${WHITE};border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:600px;">

<!-- Header Section -->
<tr>
<td style="background-color:${PRIMARY};border-radius:8px 8px 0 0;padding:0;">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<!-- Logo Column -->
<td width="200" align="center" valign="middle" style="padding:30px 0 30px 30px;">
<img src="${LOGO_URL}" alt="Dads Evoking Change Logo" style="width:120px;height:auto;display:block;">
</td>
<!-- Title Column -->
<td align="left" valign="middle" style="padding:30px 30px 30px 20px;">
<h1 style="color:${WHITE};font-size:24px;margin:0 0 5px 0;font-weight:bold;font-family:Arial,sans-serif;line-height:1.2;">${title}</h1>
<h2 style="color:${WHITE};font-size:18px;margin:0 0 8px 0;font-weight:normal;font-family:Arial,sans-serif;opacity:0.95;">Dads Evoking Change</h2>
<p style="color:${WHITE};font-size:15px;margin:0;opacity:0.9;font-family:Arial,sans-serif;line-height:1.3;">Empowering Fathers, Strengthening Families</p>
</td>
</tr>
</table>
</td>
</tr>`;

  // --- Welcome Message Section ---
  if (hasContent(sections.welcomeMessage, sections.recentMilestones, sections.personalReflections)) {
    html += `
<!-- Welcome Message Focus Section -->
<tr>
<td style="padding:40px 30px 30px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Welcome Message from Executive Director Kareem Chadly</h2>
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0 0 15px 0;font-family:Arial,sans-serif;">Dear DEC Community,<br></p>`;
    if (sections.welcomeMessage?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.welcomeMessage.trim())}</p>`;
    }
    if (sections.personalReflections?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:15px 0 0 0;font-style:italic;font-family:Arial,sans-serif;">${nl2br(sections.personalReflections.trim())}</p>`;
    }
    html += `
<p style="color:${PRIMARY};font-size:16px;line-height:1.6;margin:15px 0 0 0;font-style:italic;font-family:Arial,sans-serif;">With gratitude and determination,<br><strong>Kareem Chadly</strong><br>Executive Director<br><br></p>`;
    // Recent Milestones
    if (sections.recentMilestones?.trim()) {
      html += `
<div style="background-color:#f8f9fa;padding:20px;border-radius:6px;margin-bottom:20px;border-left:4px solid ${PRIMARY_LIGHT};">
<h3 style="color:${FOOTER_BG};font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Recent Milestones</h3>
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.recentMilestones.trim())}</p>
</div>`;
    }
    html += `</td>
</tr>`;
  }

  // --- Program Updates Section ---
  if (hasContent(sections.programUpdates, sections.programHighlights, sections.participantTestimonials, sections.upcomingEvents)) {
    html += `
<!-- Program Updates Section -->
<tr>
<td style="padding:0 30px 30px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Program Updates</h2>`;
    if (sections.programUpdates?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.programUpdates.trim())}</p>
<p><br></p>`;
    }
    // Program Highlights & Outcomes
    if (sections.programHighlights?.trim()) {
      html += `
<div style="background-color:#f8f9fa;padding:20px;border-radius:6px;margin-bottom:20px;border-left:4px solid ${PRIMARY_LIGHT};">
<h3 style="color:${FOOTER_BG};font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Program Highlights &amp; Outcomes</h3>
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.programHighlights.trim())}</p>
</div>`;
    }
    // Participant Testimonials
    if (sections.participantTestimonials?.trim()) {
      html += `
<div style="background-color:${WHITE};padding:20px;border-radius:6px;margin-bottom:20px;border:2px solid ${PRIMARY_LIGHT};">
<h3 style="color:${FOOTER_BG};font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Participant Testimonials</h3>
<div style="background-color:#f8f9fa;padding:15px;border-radius:4px;margin-bottom:15px;border-left:3px solid ${PRIMARY};">
<p style="color:${TEXT_DARK};font-style:italic;font-size:16px;margin:0 0 10px 0;font-family:Arial,sans-serif;">"${nl2br(sections.participantTestimonials.trim())}"</p>
</div>
</div>`;
    }
    // Upcoming Events Next Month
    if (sections.upcomingEvents?.trim()) {
      html += `
<h3 style="color:${FOOTER_BG};font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Upcoming Events Next Month</h3>
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.8;margin:0 0 10px 0;font-family:Arial,sans-serif;">${nl2br(sections.upcomingEvents.trim())}</p>`;
    }
    html += `</td>
</tr>`;
  }

  // --- Dad of the Month (not in n8n HTML but fields exist and user wanted it) ---
  if (hasContent(sections.dadOfMonthName, sections.dadOfMonthStory)) {
    html += `
<!-- Dad of the Month Section -->
<tr>
<td style="padding:0 30px 30px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Dad of the Month</h2>
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8f9fa;border-radius:8px;overflow:hidden;">
<tr><td style="padding:20px;">`;
    if (sections.photoLink?.trim()) {
      html += `<img src="${sections.photoLink.trim()}" alt="${sections.dadOfMonthName?.trim() || "Dad of the Month"}" width="120" style="display:block;border-radius:50%;margin:0 auto 16px;max-width:120px;height:auto;">`;
    }
    if (sections.dadOfMonthName?.trim()) {
      html += `<h3 style="color:${PRIMARY};font-size:18px;margin:0 0 8px;text-align:center;font-family:Arial,sans-serif;">${sections.dadOfMonthName.trim()}</h3>`;
    }
    if (sections.dadOfMonthStory?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.dadOfMonthStory.trim())}</p>`;
    }
    html += `</td></tr></table>
</td>
</tr>`;
  }

  // --- Community Events & Partnerships Section ---
  if (hasContent(sections.communityEvents, sections.partnerships)) {
    html += `
<!-- Community Events & Partnerships Section -->
<tr>
<td style="padding:0 30px 30px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Community &amp; Partnerships</h2>`;
    // Community Events to Feature — table rows
    if (sections.communityEvents?.trim()) {
      html += `
<div style="background-color:#f8f9fa;padding:20px;border-radius:6px;margin-bottom:20px;">
<h3 style="color:${FOOTER_BG};font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Community Events to Feature</h3>
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="color:${TEXT_DARK};font-size:16px;padding:12px 0;border-bottom:1px solid #e9ecef;font-family:Arial,sans-serif;">
<strong style="color:${PRIMARY};">${nl2br(sections.communityEvents.trim())}</strong>
</td>
</tr>
</table>
</div>`;
    }
    // New & Active Partnerships
    if (sections.partnerships?.trim()) {
      html += `
<div style="background-color:#e8f4f8;padding:20px;border-radius:6px;border-left:4px solid ${PRIMARY_LIGHT};">
<h3 style="color:${FOOTER_BG};font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">New &amp; Active Partnerships</h3>
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0 0 15px 0;font-family:Arial,sans-serif;">${nl2br(sections.partnerships.trim())}</p>
</div>`;
    }
    html += `</td>
</tr>`;
  }

  // --- Fatherhood by the Numbers Section ---
  if (hasContent(sections.fatherhoodStat)) {
    html += `
<!-- Fatherhood by the Numbers Section -->
<tr>
<td style="padding:0 30px 30px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Fatherhood by the Numbers</h2>
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="background-color:${PRIMARY};padding:30px;border-radius:6px;text-align:center;">
<p style="color:${WHITE};font-size:20px;margin:0 0 15px 0;font-weight:bold;font-family:Arial,sans-serif;">Did You Know?</p>
<p style="color:${WHITE};font-size:16px;margin:0 0 20px 0;opacity:0.95;font-family:Arial,sans-serif;line-height:1.5;">${nl2br(sections.fatherhoodStat!.trim())}</p>
</td>
</tr>
</table>
</td>
</tr>`;
  }

  // --- Support DEC & Get Involved Section ---
  if (hasContent(sections.donationCampaigns, sections.volunteerNeeds, sections.readerSupport)) {
    html += `
<!-- Support & Get Involved Section -->
<tr>
<td style="padding:0 30px 30px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Support DEC &amp; Get Involved</h2>
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0 0 20px 0;font-family:Arial,sans-serif;">Your support helps us continue our vital work in strengthening families and empowering fathers. Every contribution makes a direct impact on the lives of fathers and children in our community.</p>`;
    if (sections.donationCampaigns?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0 0 15px 0;font-family:Arial,sans-serif;">${nl2br(sections.donationCampaigns.trim())}</p>`;
    }
    if (sections.readerSupport?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0 0 15px 0;font-family:Arial,sans-serif;">${nl2br(sections.readerSupport.trim())}</p>`;
    }
    // Donate Button
    html += `
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:20px 0;">
<a href="https://gofund.me/97bebc4e" style="background-color:${PRIMARY};color:${WHITE};padding:15px 30px;text-decoration:none;border-radius:5px;font-size:18px;font-weight:bold;display:inline-block;font-family:Arial,sans-serif;">Donate Now</a>
</td>
</tr>
</table>`;
    // Special Volunteer Request (yellow box)
    html += `
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="background-color:#fff3cd;padding:20px;border-radius:6px;border-left:4px solid #ffc107;">
<h3 style="color:#856404;font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Special Volunteer Request</h3>
<p style="color:#856404;font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">We are seeking pro bono attorneys, mediators, and family therapists to support our fathers. If you're a professional in these fields and want to make a difference, please click the volunteer button below.</p>
</td>
</tr>
</table>`;
    if (sections.volunteerNeeds?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:15px 0 0 0;font-family:Arial,sans-serif;">${nl2br(sections.volunteerNeeds.trim())}</p>`;
    }
    html += `</td>
</tr>`;
  }

  // --- Stay Connected / Social Media Section ---
  if (hasContent(sections.socialMediaCTA, sections.contactInfo)) {
    html += `
<!-- Social Media & Contact Section -->
<tr>
<td style="padding:0 30px 40px 30px;">
<h2 style="color:${PRIMARY};font-size:24px;margin:0 0 20px 0;border-bottom:3px solid ${PRIMARY_LIGHT};padding-bottom:10px;font-family:Arial,sans-serif;">Stay Connected</h2>
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:20px 0;">
<p style="color:${TEXT_DARK};font-size:16px;margin:0 0 20px 0;font-family:Arial,sans-serif;">Follow our journey on social media:</p>
<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">
<tr>
<td style="padding:0 10px;">
<a href="https://www.facebook.com/Decfordads/" style="text-decoration:none;">
<img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" alt="Facebook" style="width:40px;height:40px;border-radius:50%;display:block;">
</a>
</td>
<td style="padding:0 10px;">
<a href="https://www.instagram.com/dadsevokingchange" style="text-decoration:none;">
<img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" style="width:40px;height:40px;border-radius:50%;display:block;">
</a>
</td>
</tr>
</table>
</td>
</tr>
</table>`;
    if (sections.socialMediaCTA?.trim()) {
      html += `<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.socialMediaCTA.trim())}</p>`;
    }
    html += `</td>
</tr>`;
  }

  // --- Additional Notes ---
  if (hasContent(sections.additionalNotes)) {
    html += `
<tr>
<td style="padding:0 30px 30px 30px;">
<p style="color:${TEXT_DARK};font-size:16px;line-height:1.6;margin:0;font-family:Arial,sans-serif;">${nl2br(sections.additionalNotes!.trim())}</p>
</td>
</tr>`;
  }

  // --- Footer Section ---
  html += `
<!-- Footer Section -->
<tr>
<td style="background-color:${FOOTER_BG};padding:30px;border-radius:0 0 8px 8px;">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center">
<p style="color:${WHITE};font-size:16px;margin:0 0 15px 0;font-weight:bold;font-family:Arial,sans-serif;">Dads Evoking Change</p>
<p style="color:${WHITE};font-size:14px;margin:0 0 10px 0;font-family:Arial,sans-serif;">Phone: (833) 873-7329 | Email: admin@dadsevokingchange.org</p>
<p style="color:${WHITE};font-size:14px;margin:0 0 20px 0;font-family:Arial,sans-serif;">Visit us: <a href="https://dadsevokingchange.org" style="color:${PRIMARY_LIGHT};text-decoration:none;">www.dadsevokingchange.org</a></p>

<!-- Action Buttons -->
<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;">
<tr>
<td style="padding:0 10px;">
<a href="https://gofund.me/97bebc4e" style="background-color:${PRIMARY};color:${WHITE};padding:10px 20px;text-decoration:none;border-radius:5px;font-size:14px;display:inline-block;font-family:Arial,sans-serif;">Donate</a>
</td>
<td style="padding:0 10px;">
<a href="https://forms.gle/qKBeqPhZQVhV6h2X7" style="background-color:transparent;color:${WHITE};padding:10px 20px;text-decoration:none;border:2px solid ${WHITE};border-radius:5px;font-size:14px;display:inline-block;font-family:Arial,sans-serif;">Volunteer</a>
</td>
</tr>
</table>

<p style="color:#cccccc;font-size:12px;margin:20px 0 0 0;font-family:Arial,sans-serif;">&copy; ${new Date().getFullYear()} Dads Evoking Change. All rights reserved.<br><a href="#" style="color:${PRIMARY_LIGHT};text-decoration:none;">Privacy Policy</a></p>
</td>
</tr>
</table>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;

  return html;
}
