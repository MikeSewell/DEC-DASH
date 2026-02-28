# Phase 1: Newsletter Template Fix - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Repair the newsletter HTML email template so it renders correctly across major email clients (Gmail, Outlook, Apple Mail). Add content size guardrails. Fix the template builder in `newsletterTemplate.ts`, the AI polish pipeline in `newsletterActions.ts`, and the preview/editing experience in `NewsletterPreview.tsx`. No new newsletter features — this is a rendering and reliability fix.

</domain>

<decisions>
## Implementation Decisions

### Email Styling
- Light refresh — keep DEC brand identity (teal header, logo, Kareem's signature, section structure) but clean up layout, spacing, and typography
- Convert from div-based layout to table-based layout for email client compatibility
- Remove `box-shadow` and other unsupported CSS properties
- All CSS must be fully inlined — no external stylesheets, no `<style>` blocks that email clients strip
- Footer content (social icons, phone, email, donate link, volunteer link) stays unchanged — just fix rendering

### Preview Experience
- Preview should be as accurate and useful as possible — what Kareem sees should match what gets sent
- Keep the editable preview feature (contentEditable iframe for direct HTML editing with save/cancel)
- Keep desktop/mobile toggle
- Test email flow is working fine — no changes needed to test send workflow

### Size Warning
- Add content size awareness to prevent hitting Constant Contact's 400KB limit
- Exact UX approach (live counter vs warning-only, block vs warn) at Claude's discretion — optimize for least intrusive but protective

### Empty Sections
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

</decisions>

<specifics>
## Specific Ideas

- Current template matches the n8n "New test" node HTML structure — the rebuild should preserve the same sections and content flow
- Executive Director Kareem Chadly's greeting/signature is a key brand element — must remain prominent
- Highlight milestone boxes, testimonial blocks, community event tables, partnerships section, "Fatherhood by the Numbers" stat block, and volunteer request box are all distinct visual elements that need table-based equivalents
- The flaticon social icons (40x40) in the footer should be preserved

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-newsletter-template-fix*
*Context gathered: 2026-02-28*
