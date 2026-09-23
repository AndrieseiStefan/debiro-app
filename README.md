# debiro

**Domain:** `debiro.ro`

**Current stage:** Canonical UI implementation underway (E1-001 landing page)

debiro is a B2B SaaS product initially focused on vendor and subcontractor compliance. It turns recurring supplier-document work into one clear operational flow: a company adds suppliers and requirements, invites suppliers securely, receives documents, extracts and human-confirms their information, calculates compliance status, sends reminders, receives renewals, and preserves an audit trail.

The initial market focus is Romania, with Romanian and English product support. The commercial direction is a recurring subscription.

Repository documentation is canonical project memory and must describe current truth. The ten approved mockups in `docs/design/mockups/` are canonical contracts for visual design, interaction, Romanian copy, and typography. Until a final logo is approved, visible branding is plain uppercase `DEBIRO`; temporary mockup branding such as `ComplyHub` is replaced with `DEBIRO` only. Technical identifiers and `debiro.ro` remain lowercase.

The current domain strategy is a single domain: public and future authenticated experiences use `debiro.ro`, without introducing `app.debiro.ro`. Domain-dependent URLs must later be configurable so the product is portable to another canonical domain.

TASK-002 selected the [technical architecture](docs/architecture/README.md). TASK-003 established the [UI foundation](docs/design/ui-foundation.md). E1-001 implements the first mockup-backed screen: the Romanian/English landing page. The other nine canonical screens, authentication, and backend functionality are not implemented. Product-owner visual approval and screenshot baselines remain future work.

## Local development

Use Node.js 24 (`.nvmrc`) and npm. From the repository root, run `npm ci`, then `npm run dev`. The Romanian landing page is at `/`, English at `/en`; the design-system specimen is at `/__dev/design-system` in development only. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run e2e` validate the app. Install Playwright Chromium with `npx playwright install chromium` if it is not already available. `VISUAL_ROUTE=/ npm run visual:capture` captures the landing page; use `/en` or `/__dev/design-system` for those routes. Captures are ignored under `artifacts/visual/` and are not approved baselines.

The next screen task supplied with E1-001 is E1-002 (canonical onboarding). The complete MVP epic sequence is still not recorded in repository documentation and needs a separate planning checkpoint.

## Project memory

- [Current status](docs/project/current-status.md)
- [Roadmap](docs/project/roadmap.md)
- [Architecture](docs/architecture/README.md)
- [Architecture decision records](docs/decisions/README.md)
- [Approved mockups](docs/design/mockups/README.md)
- [UI foundation](docs/design/ui-foundation.md)
- [Landing page](docs/features/landing-page.md)
