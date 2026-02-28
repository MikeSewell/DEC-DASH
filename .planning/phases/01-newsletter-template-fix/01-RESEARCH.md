# Phase 1: Newsletter Template Fix - Research

**Researched:** 2026-02-28
**Domain:** HTML Email Rendering, CSS Inlining, Email Client Compatibility
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Light refresh — keep DEC brand identity (teal header, logo, Kareem's signature, section structure) but clean up layout, spacing, and typography
- Convert from div-based layout to table-based layout for email client compatibility
- Remove `box-shadow` and other unsupported CSS properties
- All CSS must be fully inlined — no external stylesheets, no `<style>` blocks that email clients strip
- Footer content (social icons, phone, email, donate link, volunteer link) stays unchanged — just fix rendering
- Preview should be as accurate and useful as possible — what Kareem sees should match what gets sent
- Keep the editable preview feature (contentEditable iframe for direct HTML editing with save/cancel)
- Keep desktop/mobile toggle
- Test email flow is working fine — no changes needed to test send workflow
- Add content size awareness to prevent hitting Constant Contact's 400KB limit
- Empty sections should be cleanly removed from the final email — no placeholder text, no orphaned headers
- Keep all 20 newsletter fields across 7 categories in the editor — auto-removal handles unused ones at generation time
- Keep GPT-4o AI polish pass (fix formatting, remove empty placeholders, generate subject line and preheader)

### Claude's Discretion
- Header structure choice (two-column vs center-stack) — whatever renders best across email clients
- Exact color palette decisions — keep DEC brand feel, professional and clean
- Loading skeleton and error state designs in preview
- Size warning UX specifics (counter placement, warning threshold, blocking vs warning behavior)
- Typography choices for email (web-safe font stacks that degrade gracefully)
- How to handle the AI polish pass interaction with the new table-based layout

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEWS-01 | Newsletter HTML uses table-based layout for cross-client compatibility (Gmail, Outlook, Apple Mail) | Table-based layout patterns documented; current template has div blocks that must be converted to tables; see Architecture Patterns section |
| NEWS-02 | All CSS is inlined — no external stylesheets, no unsupported properties (box-shadow removed) | `juice` library (v11.1.1) handles CSS inlining; specific unsupported properties catalogued; box-shadow removed and replaced with border fallback |
| NEWS-03 | Newsletter editor validates content size and warns when approaching 400KB Constant Contact limit | CC limit confirmed at 400KB via official docs; size measurement via `new TextEncoder().encode(html).length`; UX pattern for warning documented |
| NEWS-04 | Newsletter preview accurately reflects how email will render in major email clients | iframe srcDoc approach confirmed; key gap is that browsers render CSS that email clients strip — iframe will show best-case rendering, not client-specific rendering |
</phase_requirements>

---

## Summary

The current `newsletterTemplate.ts` is approximately 80% correct — it already uses `role="presentation"` tables for structural layout (outer wrapper, header two-column, donate buttons, social icons). The critical problems are: (1) `box-shadow` on the main container (not supported in Outlook Windows/Word renderer, stripped by Gmail for non-Google accounts), (2) multiple `<div>` blocks used for highlighted sections like "Recent Milestones," "Program Highlights," and testimonials — these render unreliably in Outlook, (3) `opacity` on text elements (not supported in Outlook Windows), (4) `border-radius` on elements where Outlook Windows will ignore it, and (5) `overflow:hidden` on table cells which has no email support.

The fix is surgical: replace the `<div>`-based highlight/milestone/testimonial blocks with `<table>` equivalents (using bgcolor attributes for background color, and inline padding via `<td>`), remove `box-shadow` and `opacity`, and ensure all CSS is explicitly inlined with no reliance on `<style>` blocks. The current template does not use a CSS inliner — it writes inline styles directly into the HTML string, which is the correct approach. Adding `juice` (v11.1.1) in the `generateEmailHtml` Convex action after template generation and before the AI polish pass would add a safety layer for any `<style>` blocks the AI polish pass introduces.

For the 400KB size warning, Constant Contact's official API documentation explicitly states the 400KB limit for custom code emails. The warning UX should live in `NewsletterEditor.tsx` as a computed byte count from the `generatedEmailHtml` field with a yellow warning banner at 350KB (87.5% of limit) and a red warning at 390KB.

**Primary recommendation:** Fix the 5 specific HTML problems in `newsletterTemplate.ts`, add a `juice` inlining pass in `newsletterActions.ts` as a safety net, and add a byte-count size indicator to `NewsletterEditor.tsx`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `juice` | 11.1.1 | CSS inliner — converts `<style>` blocks to inline styles | Industry standard for email CSS inlining; maintained by Automattic; 2M+ weekly downloads |
| Built-in `TextEncoder` | Node.js built-in | Measure HTML byte size accurately | No install needed; UTF-8 byte count matches what CC measures |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | — | Template is already inline-style-first | Juice is a safety net, not the primary approach |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `juice` | `inline-css` | inline-css is lighter but less maintained; juice is the clear standard |
| `juice` | Hand-writing all inline styles (current approach) | Current approach is fine for the template itself; juice is only needed if AI polish introduces `<style>` blocks |

**Installation:**
```bash
npm install juice
```

Note: `juice` must be used inside a Convex `"use node"` action (already the case for `newsletterActions.ts`). It cannot run in the default Convex runtime (which uses a custom V8 environment without Node.js APIs).

---

## Architecture Patterns

### Current Template Structure Assessment

The existing `newsletterTemplate.ts` produces HTML that is already partially email-compatible. Here is what is correct and what must be fixed:

**Already correct:**
- Outer wrapper table with `role="presentation"` — correct
- Header two-column table (logo left, title right) — correct table structure
- `font-family: Arial, Helvetica, sans-serif` on most elements — correct web-safe stack
- Donate/Volunteer button table structure — correct
- Social icon table structure — correct
- Footer table structure — correct

**Must be fixed in `newsletterTemplate.ts`:**

| Location (approx. line) | Problem | Fix |
|------------------------|---------|-----|
| Line 65: Main container `<table>` | `box-shadow:0 2px 10px rgba(0,0,0,0.1)` | Remove entirely — no email-safe replacement |
| Line 65: Main container `<table>` | `border-radius:8px` | Remove or keep only for Apple Mail (Outlook Windows ignores it) |
| Line 65: Main container `<table>` | `max-width:600px` on table element | Keep as inline style but also add `width="600"` HTML attribute |
| Lines 79, 80: `<h2>` and `<p>` in header | `opacity:0.95` and `opacity:0.9` | Replace with hard-coded hex color at equivalent opacity instead |
| Line 106: Recent Milestones | `<div style="background-color:#f8f9fa;...border-radius:6px">` | Replace with `<table>` + `<td bgcolor="#f8f9fa">` |
| Lines 129, 137, 139: Program sections | `<div>` blocks with `border-radius`, `overflow:hidden` | Replace all with table equivalents |
| Line 161: Dad of Month | `<table style="...overflow:hidden">` | Remove `overflow:hidden` — not supported in email |
| Line 164: Photo img | `border-radius:50%` on img | Keep — supported in Apple Mail/Gmail; Outlook shows square |
| Footer line 69: Header `<td>` | `border-radius:8px 8px 0 0` | Keep — Apple Mail and Gmail support it; Outlook ignores safely |

### Pattern 1: Email-Safe Highlighted Box (replaces `<div>` blocks)

**What:** Table-based background-color box with left border accent
**When to use:** Every section that currently uses a `<div>` with `background-color` and `border-left`

```html
<!-- Source: email best practices - table-based colored box -->
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="background-color:#f8f9fa;padding:0;border-left:4px solid #7DACC4;">
  <table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
  <tr>
  <td style="padding:20px;font-family:Arial,sans-serif;">
    <!-- content here -->
  </td>
  </tr>
  </table>
</td>
</tr>
</table>
```

Note: `bgcolor` attribute on `<td>` provides Outlook Windows fallback. `border-left` IS supported in Outlook (it uses Word renderer which handles borders). The nested table structure is needed because Outlook does not support `padding` + `border` on the same `<td>`.

### Pattern 2: Table-Based Testimonial Block (replaces `<div>` with nested `<div>`)

**What:** Outer bordered table, inner shaded table for quote
**When to use:** `participantTestimonials` section

```html
<!-- Replaces: div with border:2px solid + inner div with border-left:3px solid -->
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border:2px solid #7DACC4;">
<tr>
<td style="padding:20px;background-color:#ffffff;font-family:Arial,sans-serif;">
  <h3 style="color:#2a4a5c;font-size:18px;margin:0 0 15px 0;font-family:Arial,sans-serif;">Participant Testimonials</h3>
  <table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
  <tr>
  <td style="background-color:#f8f9fa;padding:15px;border-left:3px solid #345c72;font-family:Arial,sans-serif;">
    <p style="color:#333333;font-style:italic;font-size:16px;margin:0;font-family:Arial,sans-serif;">"TESTIMONIAL"</p>
  </td>
  </tr>
  </table>
</td>
</tr>
</table>
```

### Pattern 3: Opacity Replacement

**What:** Replace `opacity:0.95` with equivalent hex color
**When to use:** Any text using `opacity` shorthand for tinting

```
opacity: 0.95 on #ffffff → use #f2f2f2 (or keep #ffffff with slight color shift)
opacity: 0.9 on #ffffff  → use #e6e6e6
```

For the header white text with opacity, simply remove opacity and use `color:#ffffff` directly — the slight tint is decorative, not required.

### Pattern 4: juice CSS Inlining in generateEmailHtml

**What:** Safety pass to inline any `<style>` blocks the AI polish introduces
**When to use:** After template generation (`buildNewsletterHtml`), before AI polish

```typescript
// Source: https://github.com/Automattic/juice
"use node";
import juice from "juice";

// After buildNewsletterHtml():
const rawHtml = buildNewsletterHtml(newsletter.title, sections);
// Inline any style blocks (safety net for AI-introduced styles)
const inlinedHtml = juice(rawHtml, {
  removeStyleTags: true,       // strip <style> blocks after inlining
  preserveMediaQueries: false, // email clients mostly don't support media queries
  applyStyleTags: true,        // inline rules from <style> tags
});
// Then send inlinedHtml to AI polish...
```

### Pattern 5: Size Measurement in NewsletterEditor

**What:** Live byte-size indicator computed from `generatedEmailHtml`
**When to use:** Whenever the editor has a generated HTML value

```typescript
// Source: MDN TextEncoder API (built-in)
const htmlBytes = generatedEmailHtml
  ? new TextEncoder().encode(generatedEmailHtml).length
  : 0;
const htmlKB = Math.round(htmlBytes / 1024);
const WARN_THRESHOLD_KB = 350;  // ~87.5% of 400KB limit
const ERROR_THRESHOLD_KB = 390; // ~97.5% of 400KB limit

// UX: Show size pill in editor header
// - Green: < 350KB — "Email size: {N} KB"
// - Yellow warning: 350-390KB — "Approaching 400 KB limit ({N} KB)"
// - Red error: 390KB+ — "WARNING: Near 400 KB limit ({N} KB) — reduce content"
```

The size should be displayed in the `NewsletterEditor.tsx` header row (next to "Last saved at" text). It only shows when `generatedEmailHtml` exists. It does NOT block sending — it is informational only.

### Anti-Patterns to Avoid
- **Using `<div>` for layout or colored boxes:** Outlook Windows (Word renderer) applies inconsistent padding/margins to divs; use tables
- **Using `box-shadow`:** Stripped by Gmail (for non-Google accounts), ignored by Outlook Windows — remove entirely, no fallback needed
- **Using `overflow:hidden` on tables/cells:** Has no effect in email clients; remove it
- **Using `opacity` on text:** Not supported in Outlook Windows (Word renderer) — replace with explicit color values
- **Using `max-width` without `width` attribute:** Outlook Windows ignores CSS `max-width` on tables; always set `width` HTML attribute to 600
- **Putting padding and background-color on the same `<td>` with a border:** In Outlook, the border and padding interact differently — use nested tables
- **Relying on `border-radius` for visual structure:** In Outlook Windows it is ignored — borders and backgrounds must read correctly without it

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS style inlining | Custom regex to extract `<style>` and inject inline | `juice` npm package | Handles specificity ordering, cascading, shorthand expansion, and selector edge cases correctly |
| HTML byte measurement | `html.length` (character count) | `new TextEncoder().encode(html).length` | Character count != byte count for multi-byte Unicode; CC measures bytes |

**Key insight:** The template's inline-style-first approach is actually correct. Do not add a full CSS inliner pipeline as the primary mechanism — the template already writes styles directly. `juice` is only a defensive safety net for the AI polish pass which may introduce `<style>` blocks.

---

## Common Pitfalls

### Pitfall 1: Outlook Windows (Word Renderer) is the Hardest Target
**What goes wrong:** Styling looks perfect in Gmail and Apple Mail but breaks in Outlook 2016/2019/2021 on Windows
**Why it happens:** Outlook for Windows uses Microsoft Word's HTML rendering engine, not a browser engine
**How to avoid:** Test every structural element against the Word renderer rules: no `box-shadow`, no `opacity`, no `overflow`, `width` as HTML attribute not just CSS, avoid nested `<div>` for layout
**Warning signs:** If you can't test in actual Outlook, treat any `<div>` used for visual structure as a risk

### Pitfall 2: Gmail Strips `<style>` Blocks (Partially)
**What goes wrong:** `<style>` rules work in the preview iframe but disappear in Gmail
**Why it happens:** Gmail strips embedded CSS for non-Google accounts (e.g., Yahoo via Gmail, corporate mail)
**How to avoid:** All CSS must be fully inlined. The `juice` pass in `generateEmailHtml` ensures this even if AI polish introduces `<style>` blocks
**Warning signs:** Any CSS selector surviving in the `generatedEmailHtml` `<head>` is a liability

### Pitfall 3: iframe Preview ≠ Actual Email Client Rendering
**What goes wrong:** Kareem approves the preview, but the email looks different in Outlook
**Why it happens:** The browser rendering the iframe supports CSS that email clients strip. The iframe is rendered by Chrome/Safari, not by Outlook's Word engine
**How to avoid:** Set accurate expectations in the UI: label the preview "Preview (Gmail/Apple Mail rendering)" rather than implying it matches all clients. The real guarantee comes from the test email send via Constant Contact
**Warning signs:** If the preview looks perfect but the test email looks broken, the iframe is showing browser-quality rendering not email-client rendering

### Pitfall 4: Constant Contact's `[[trackingImage]]` Requirement
**What goes wrong:** Open rate tracking is broken for emails sent via the API
**Why it happens:** The CC API documentation states custom code emails must include `[[trackingImage]]` in the `<body>` for open rate reporting
**How to avoid:** Add `[[trackingImage]]` to the footer or body of the template. Currently missing from `newsletterTemplate.ts`
**Warning signs:** Zero open rate on sent emails is the sign something is wrong

### Pitfall 5: juice Cannot Run in Default Convex Runtime
**What goes wrong:** `import juice from "juice"` fails in a Convex query/mutation/action without `"use node"`
**Why it happens:** Convex's default runtime is a custom V8 environment; juice requires Node.js APIs
**How to avoid:** juice must only be called from a `"use node"` action. `newsletterActions.ts` already has `"use node"` at line 1 — this is the correct place
**Warning signs:** `Cannot find module 'juice'` or similar runtime errors in Convex logs

### Pitfall 6: `width` on Table vs CSS `width`
**What goes wrong:** Email renders at wrong width in Outlook Windows
**Why it happens:** Outlook ignores `style="width:600px"` on `<table>` and uses the HTML `width="600"` attribute
**How to avoid:** Always set both `width="600"` (HTML attribute) AND `style="max-width:600px"` (CSS) on the outer container table. Inner content tables use `width="100%"` attribute
**Warning signs:** Email content spans full screen or collapses in Outlook

---

## Code Examples

### Fixing the Main Container Table (line 65 of newsletterTemplate.ts)

```html
<!-- BEFORE (broken in Outlook): -->
<table role="presentation" border="0" width="600" cellspacing="0" cellpadding="0"
  style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:600px;">

<!-- AFTER (email-safe): -->
<table role="presentation" border="0" width="600" cellspacing="0" cellpadding="0"
  style="background-color:#ffffff;max-width:600px;">
```

Note: `border-radius` on the outer container can be kept or removed. If kept, Apple Mail and Gmail render it; Outlook Windows renders square corners. The design still works either way. Remove `box-shadow` completely — there is no email-safe replacement.

### Fixing Header Opacity (lines 79-80 of newsletterTemplate.ts)

```html
<!-- BEFORE: opacity not supported in Outlook Windows -->
<h2 style="...opacity:0.95;">Dads Evoking Change</h2>
<p style="...opacity:0.9;">Empowering Fathers...</p>

<!-- AFTER: explicit color instead of opacity -->
<h2 style="color:#ffffff;font-size:18px;margin:0 0 8px 0;font-weight:normal;font-family:Arial,sans-serif;">Dads Evoking Change</h2>
<p style="color:#f2f2f2;font-size:15px;margin:0;font-family:Arial,sans-serif;line-height:1.3;">Empowering Fathers, Strengthening Families</p>
```

### Adding juice Inlining to generateEmailHtml (newsletterActions.ts)

```typescript
// Source: https://github.com/Automattic/juice
"use node";
import juice from "juice";
// ... existing imports ...

// Inside the action handler, after buildNewsletterHtml():
const rawHtml = buildNewsletterHtml(newsletter.title, sections);

// Safety: inline any <style> blocks (defensive against AI polish introducing style tags)
const inlinedHtml = juice(rawHtml, {
  removeStyleTags: true,
  preserveMediaQueries: false,
  applyStyleTags: true,
});

// Then pass inlinedHtml (not rawHtml) to the OpenAI completion
```

### Adding the [[trackingImage]] Requirement

```typescript
// In newsletterTemplate.ts footer section, inside <body> before closing </table>:
// CC API requirement: tracking pixel for open rate measurement
html += `<!-- Constant Contact tracking -->
<tr>
<td>[[trackingImage]]</td>
</tr>`;
```

### Size Warning in NewsletterEditor.tsx

```tsx
// Compute in component body:
const sizeBytes = generatedEmailHtml
  ? new TextEncoder().encode(generatedEmailHtml).length
  : 0;
const sizeKB = Math.round(sizeBytes / 1024);
const WARN_KB = 350;
const ERROR_KB = 390;

// Render in editor header row:
{generatedEmailHtml && (
  <span className={cn(
    "text-xs px-2 py-0.5 rounded-full font-medium",
    sizeKB >= ERROR_KB
      ? "bg-red-100 text-red-700"
      : sizeKB >= WARN_KB
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700"
  )}>
    {sizeKB >= ERROR_KB && "Near limit — "}
    {sizeKB >= WARN_KB && sizeKB < ERROR_KB && "Approaching limit — "}
    {sizeKB} KB / 400 KB
  </span>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<div>`-based email layout | Table-based layout | Email clients froze at ~2010 CSS support | Div layouts still break in Outlook Windows today |
| External CSS stylesheets | Inline styles (all) | Gmail began stripping `<style>` ~2013 | Must inline everything |
| Media queries for responsive | Fluid/adaptive tables | Outlook never supported media queries | Use percentage widths and max-width instead |

**Deprecated/outdated in email:**
- `box-shadow`: 63% support across clients — missing Outlook Windows (Word renderer) and Gmail for non-Google accounts. Do not use.
- `opacity` shorthand: Not supported in Outlook Windows (Word renderer). Use explicit color values.
- `overflow:hidden`: No email client support. Remove.
- `<div>` for layout blocks: Unreliable in Outlook Windows. Use tables.
- `border-radius` on tables: Not supported in Outlook Windows. Tolerable for progressive enhancement only.

---

## Open Questions

1. **Does Kareem need the `[[trackingImage]]` tracking pixel?**
   - What we know: CC API documentation states it is required for open rate reporting; it is currently absent from the template
   - What's unclear: Whether the current campaigns are reporting zero opens or if CC inserts the pixel automatically for API-created campaigns
   - Recommendation: Add `[[trackingImage]]` to the template footer as a `<tr><td>` row — it is invisible and costs nothing

2. **Should `border-radius` be removed or kept for progressive enhancement?**
   - What we know: Outlook Windows ignores it (renders square corners); Gmail and Apple Mail render it correctly; the design functions without it
   - What's unclear: Kareem's preference for square vs rounded corners in clients that don't support it
   - Recommendation: Keep `border-radius` only on elements where square corners are acceptable (the main container, section headers); remove from elements where sharp corners would look broken

3. **Is the Constant Contact API's auto-inlining sufficient to skip the juice pass?**
   - What we know: CC documentation states "The system automatically converts style tags to inline CSS when sending"; the AI polish pass may also produce fully inlined output
   - What's unclear: Whether CC's auto-inlining is applied before or after the 400KB size check, and whether it handles all edge cases
   - Recommendation: Keep the juice pass in `generateEmailHtml` as a defensive layer — the inlined HTML stored in Convex is what we measure for the 400KB warning, so it must be in its final form

---

## Sources

### Primary (HIGH confidence)
- [Constant Contact Developer Portal - Design Custom Code Emails](https://developer.constantcontact.com/api_guide/design_code_emails.html) — 400KB size limit, `[[trackingImage]]` requirement, CSS inlining behavior confirmed
- [CanIEmail.com - box-shadow](https://www.caniemail.com/features/css-box-shadow/) — box-shadow support status per client: ~63% overall, not supported in Gmail non-Google accounts
- [juice npm package - GitHub](https://github.com/Automattic/juice) — v11.1.1, API options (`removeStyleTags`, `preserveMediaQueries`, `applyStyleTags`), usage patterns
- `npm info juice` — confirmed latest version 11.1.1

### Secondary (MEDIUM confidence)
- [CanIEmail.com - border-radius](https://www.caniemail.com/features/css-border-radius/) — Outlook Windows (Word renderer) does not support border-radius
- [Kontent.ai - Rounded corners in Outlook 2025](https://kontent.ai/blog/emails-outlook-containers-rounded-courners/) — VML workaround exists but unnecessary for this phase
- [Tables vs Divs in HTML Emails](https://thehtmlemailtoolkit.com/tables-vs-divs-the-ultimate-showdown-in-email-layouts/) — Confirms table-based layout requirement for Outlook

### Tertiary (LOW confidence — for validation)
- [Medium - Designing High-Performance Email Layouts in 2026](https://medium.com/@romualdo.bugai/designing-high-performance-email-layouts-in-2026-a-practical-guide-from-the-trenches-a3e7e4535692) — General best practices, current as of Jan 2026; not an authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — juice is the established standard; `TextEncoder` is a Node.js built-in; both verified
- Architecture: HIGH — specific line-by-line problems identified in the existing `newsletterTemplate.ts` source code; fixes are well-established email patterns
- Pitfalls: HIGH — box-shadow, opacity, and div-layout issues are verified via CanIEmail.com (an authoritative reference database); 400KB limit confirmed via official CC API docs

**Research date:** 2026-02-28
**Valid until:** 2026-08-28 (email client support changes slowly; CanIEmail.com is the authoritative source to re-check)
