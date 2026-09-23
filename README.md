# debiro

**Domain:** `debiro.ro`

**Current stage:** Architecture selected; UI foundation next

debiro is a B2B SaaS product initially focused on vendor and subcontractor compliance. It turns recurring supplier-document work into one clear operational flow: a company adds suppliers and requirements, invites suppliers securely, receives documents, extracts and human-confirms their information, calculates compliance status, sends reminders, receives renewals, and preserves an audit trail.

The initial market focus is Romania, with Romanian and English product support. The commercial direction is a recurring subscription.

Repository documentation is canonical project memory and must describe current truth. The ten approved mockups in `docs/design/mockups/` are canonical contracts for visual design, interaction, Romanian copy, and typography. Until a final logo is approved, visible branding is plain lowercase `debiro`; temporary mockup branding such as `ComplyHub` is replaced with `debiro` only.

The current domain strategy is a single domain: public and future authenticated experiences use `debiro.ro`, without introducing `app.debiro.ro`. Domain-dependent URLs must later be configurable so the product is portable to another canonical domain.

TASK-002 selected the [technical architecture](docs/architecture/README.md). No application runtime or functionality has been implemented. TASK-003 — UI Foundation & Canonical Design System is next.

## Project memory

- [Current status](docs/project/current-status.md)
- [Roadmap](docs/project/roadmap.md)
- [Architecture](docs/architecture/README.md)
- [Architecture decision records](docs/decisions/README.md)
- [Approved mockups](docs/design/mockups/README.md)
