# debiro

**Domain:** `debiro.ro`

**Current stage:** UI foundation implemented; MVP epic planning checkpoint next

debiro is a B2B SaaS product initially focused on vendor and subcontractor compliance. It turns recurring supplier-document work into one clear operational flow: a company adds suppliers and requirements, invites suppliers securely, receives documents, extracts and human-confirms their information, calculates compliance status, sends reminders, receives renewals, and preserves an audit trail.

The initial market focus is Romania, with Romanian and English product support. The commercial direction is a recurring subscription.

Repository documentation is canonical project memory and must describe current truth. The ten approved mockups in `docs/design/mockups/` are canonical contracts for visual design, interaction, Romanian copy, and typography. Until a final logo is approved, visible branding is plain lowercase `debiro`; temporary mockup branding such as `ComplyHub` is replaced with `debiro` only.

The current domain strategy is a single domain: public and future authenticated experiences use `debiro.ro`, without introducing `app.debiro.ro`. Domain-dependent URLs must later be configurable so the product is portable to another canonical domain.

TASK-002 selected the [technical architecture](docs/architecture/README.md). TASK-003 established the [UI foundation](docs/design/ui-foundation.md): a working Next.js scaffold, reusable primitives, localization, and test/visual-capture tooling. None of the ten canonical product screens, authentication, or backend functionality is implemented or visually approved.

## Local development

Use Node.js 24 (`.nvmrc`) and npm. From the repository root, run `npm ci`, then `npm run dev`. Romanian is at `/`, English at `/en`; the temporary design-system specimen is at `/__dev/design-system` in development only. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run e2e` validate the foundation. Install Playwright Chromium with `npx playwright install chromium` if it is not already available. `npm run visual:capture` captures the specimen; `VISUAL_ROUTE=/en` selects another local route. Captures are ignored under `artifacts/visual/` and are not approved baselines.

The next project action is to finalize the complete MVP epic sequence before starting E1-001.

## Project memory

- [Current status](docs/project/current-status.md)
- [Roadmap](docs/project/roadmap.md)
- [Architecture](docs/architecture/README.md)
- [Architecture decision records](docs/decisions/README.md)
- [Approved mockups](docs/design/mockups/README.md)
- [UI foundation](docs/design/ui-foundation.md)
