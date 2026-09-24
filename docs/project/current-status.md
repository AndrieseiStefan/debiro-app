# Current Status

**Project stage:** Canonical UI implementation underway; full MVP epic sequence pending

**Visible brand:** DEBIRO (text-only; technical identifiers remain `debiro`)

**Primary domain:** `debiro.ro`

**Market focus:** Romania first

**Domain strategy:** Single domain

**Technical stack:** Accepted in [ADR-0002](../decisions/0002-application-architecture-and-stack.md), with authentication revised by [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md). The frontend foundation, landing page, onboarding first step, and fixture-backed dashboard overview are implemented; backend/auth integrations are not.

## Design state

Ten approved product mockups are present in `docs/design/mockups/`. They are canonical contracts requiring:

- UI fidelity as close to 1:1 as technically practical
- Interaction fidelity as close to 1:1 as technically practical
- Exact approved Romanian product copy
- Close reproduction of typography and visual treatment
- Replacement of placeholder branding with uppercase `DEBIRO`

The final logo is not yet designed and must not be invented.

## Implemented

- Canonical repository documentation and project-memory rules
- High-level product, roadmap, design, decision, and development guidance
- An accepted, documented architecture/stack and cost model; no external providers provisioned
- Next.js/React/strict TypeScript application scaffold with CSS Modules and semantic mockup-derived tokens
- Romanian-default and English `next-intl` routing, foundation and implemented-screen catalogs, typed view-data convention
- Reusable low-level UI/layout primitives, accessibility baseline, Vitest/RTL and Playwright test tooling, deterministic visual capture, development-only design-system preview
- E1-001 canonical landing page at `/` (Romanian) and `/en` (English), using a typed static dashboard preview and no provider data; see [landing page](../features/landing-page.md)
- E1-002 canonical onboarding first step at `/onboarding` (Romanian) and `/en/onboarding` (English), using a typed form fixture and browser-local interactions only; see [onboarding](../features/onboarding.md)
- E1-003 canonical dashboard overview at `/dashboard` (Romanian) and `/en/dashboard` (English), using an independent authenticated app shell and deterministic view fixture; see [dashboard](../features/dashboard.md)
- Landing-page CTA alignment and visible brand casing standardized to `DEBIRO`; the three-mode responsive contract, shared centered 1350px page shell, shared 66px public header, stacked hero reflow, and boundary/safety viewport regression matrix are implemented in [UI foundation](../design/ui-foundation.md#page-shell-contract)

## Architecture decision

TypeScript/Node.js 24 LTS, Next.js App Router modular monolith, typed fixture-to-real view boundary, same-origin JSON/API service boundary, Neon managed PostgreSQL with Drizzle, Clerk identity/sessions only, debiro-owned organization tenancy and PostgreSQL RLS, private R2 EU documents, pg-boss jobs drained by Railway cron, Poppler/Tesseract text processing, gated OpenAI structured extraction, Resend email, `next-intl`, Railway EU West hosting, Vitest and Playwright. The revised Initial MVP model is ~$18.7/month gross at 60% Neon activity (~$26.5 always-active ceiling); US identity/email transfer review remains a production gate. See [architecture](../architecture/README.md), [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md), and the [dated cost model](../architecture/cost-model.md).

## Not implemented

- The seven remaining canonical screens (04–10), later onboarding steps, and functional backend workflows
- Product-owner visual approval and approved regression baselines
- Backend or API
- Database, schemas, or migrations
- Authentication or authorization
- Document storage or upload system
- Document processing, OCR, or AI extraction
- Notifications, email, or reminders
- Billing

## Next

E1-004 — Implement Canonical Vendors List. The complete epic sequence through MVP remains undocumented and should be finalized as a separate planning checkpoint before broader backlog execution. The UI foundation is documented in [UI foundation](../design/ui-foundation.md).
