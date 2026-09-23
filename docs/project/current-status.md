# Current Status

**Project stage:** Architecture selected; UI foundation next

**Brand:** debiro

**Primary domain:** `debiro.ro`

**Market focus:** Romania first

**Domain strategy:** Single domain

**Technical stack:** Accepted in [ADR-0002](../decisions/0002-application-architecture-and-stack.md); not yet implemented

## Design state

Ten approved product mockups are present in `docs/design/mockups/`. They are canonical contracts requiring:

- UI fidelity as close to 1:1 as technically practical
- Interaction fidelity as close to 1:1 as technically practical
- Exact approved Romanian product copy
- Close reproduction of typography and visual treatment
- Replacement of placeholder branding with lowercase `debiro`

The final logo is not yet designed and must not be invented.

## Implemented

- Canonical repository documentation and project-memory rules
- High-level product, roadmap, design, decision, and development guidance
- An accepted, documented architecture/stack and cost model; no runtime or providers provisioned

## Architecture decision

TypeScript/Node.js 24 LTS, Next.js App Router modular monolith, typed fixture-to-real view boundary, same-origin JSON/API service boundary, Neon managed PostgreSQL with Drizzle, Better Auth, debiro-owned organization tenancy and PostgreSQL RLS, private R2 EU documents, pg-boss jobs drained by Railway cron, Poppler/Tesseract text processing, gated OpenAI structured extraction, Resend email, `next-intl`, Railway EU West hosting, Vitest and Playwright. See [architecture](../architecture/README.md), [ADR-0002](../decisions/0002-application-architecture-and-stack.md), and the [dated cost model](../architecture/cost-model.md).

## Not implemented

- Application runtime
- Frontend or functional UI
- Backend or API
- Database, schemas, or migrations
- Authentication or authorization
- Document storage or upload system
- Document processing, OCR, or AI extraction
- Notifications, email, or reminders
- Billing

## Next

TASK-003 — UI Foundation & Canonical Design System. After TASK-003, define the complete Epic sequence through MVP before E1-001.
