# Frontend Redesign Instructions (Symplr Benchmark)

## Purpose
Create a frontend experience benchmarked against Symplr's public web presence. The outcome must feel enterprise-grade, trustworthy, and operationally focused, with clear pathways to solutions, roles, and resources. Prioritize clarity, speed, and professional polish at every level.

## Benchmark Signals to Match
- Clear, benefit-led headlines that state outcomes and value early.
- Structured information architecture with primary categories like Platform, Solutions, Roles, Resources, About, and Contact.
- Dense but scannable content with explicit calls to action and supporting proof points.
- Consistent, authoritative tone suitable for healthcare operations leadership.
- Navigation built for complex catalogs and multiple personas.

## Information Architecture
- Global navigation must support:
- `Platform`
- `Solutions`
- `Your Role`
- `Resources`
- `About`
- `Contact`
- Each category must have a landing page plus deep links for key subpages.
- Provide a direct route to primary conversion actions in the top bar and in-page CTAs.
- Search should be visible and accessible from all pages.

## Page Structure Standards
Each major page should follow a predictable, high-signal structure:
- Hero: strong headline, concise subhead, primary CTA, secondary CTA, and a supporting image or illustration.
- Value section: 3-6 outcome-driven blocks tied to operational benefits.
- Solutions or capabilities grid: uniform cards with short titles and one-sentence summaries.
- Proof points: awards, stats, or customer outcomes.
- Testimonial or customer story callout.
- Resource or research CTA.
- Final conversion CTA with contact or demo request.

## Layout and Grid
- Use a 12-column grid on desktop with consistent gutters.
- Ensure strong rhythm with consistent vertical spacing between sections.
- Maintain visual hierarchy through spacing, typography scale, and card elevation, not heavy ornament.
- Cards should align to a baseline grid; no uneven heights in a row.

## Typography and Copy
- Use a professional, highly legible type system with a clear hierarchy: H1, H2, H3, body, caption.
- Headlines should be sentence case and benefit-driven.
- Body copy should be concise and operational, avoiding marketing fluff.
- Use short paragraphs and bullet lists for scannability.

## Color and Visual Design
- Use a neutral, trustworthy base palette with a single primary accent for CTAs and links.
- Keep background colors subtle; use light tints to separate sections.
- Ensure text contrast meets WCAG AA at minimum.
- Imagery should feel clinical, professional, and operationally focused, not lifestyle.

## Components and Behavior
- Buttons:
- Primary button for main CTA, secondary outline for supporting actions.
- Consistent sizing and padding; no mismatched CTA treatments.
- Cards:
- Standardized card layouts with title, summary, and link.
- Support hover states with subtle elevation and underline on links.
- Navigation:
- Mega menus for Solutions and Roles.
- Sticky top bar with persistent primary CTA.
- Forms:
- Labels always visible; no placeholder-only forms.
- Inline validation, clear error states, and success confirmation.
- FAQ:
- Use accordion with clear expand/collapse indicators and keyboard accessibility.

## Accessibility
- WCAG 2.1 AA minimum.
- Focus states must be visible and consistent.
- All interactive controls must be keyboard accessible.
- All images require descriptive alt text unless purely decorative.

## Performance Targets
- LCP under 2.5s on median mobile.
- CLS under 0.1, INP under 200ms.
- Image delivery must use modern formats and responsive sizing.
- Avoid heavy third-party scripts; defer non-critical assets.

## Content Governance
- All pages must have an owner and last-reviewed date in CMS metadata.
- Consistent terminology across Platform, Solutions, and Role-based pages.
- Avoid redundant product naming or inconsistent acronyms.

## Quality Bar and Review Checklist
- Navigation accuracy: all top-level and deep links work.
- Layout consistency: spacing and card alignment are uniform.
- CTA consistency: primary CTA is present on every page.
- Responsiveness: layout maintains hierarchy at tablet and mobile.
- Accessibility: all form fields and navigation are keyboard tested.
- Performance: page meets LCP, CLS, and INP targets.

## Deliverables
- Page templates for Home, Platform Overview, Solutions Detail, Role Detail, Resources, About, Contact.
- Component library matching the standards above.
- A documented design system with tokens for color, spacing, typography, and elevation.
