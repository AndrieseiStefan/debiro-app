# Roadmap

This roadmap records direction only. Detailed requirements are created by the task that defines or implements them.

## Phase 0 — Product & Repository Foundation

- Repository memory — complete
- Canonical mockup contract and twenty-eight approved images — complete
- Architecture and stack decision — complete (TASK-002)
- UI foundation and canonical design system tooling — complete (TASK-003); no product screens approved
- E1-001 canonical landing page — implemented; product-owner visual approval remains pending
- E1-002/E1-012 canonical three-step onboarding — implemented with optional fixture-backed Steps 2 and 3 (E1-013 absorbed); product-owner visual approval remains pending
- E1-003 canonical dashboard overview — implemented with a fixture-backed authenticated shell; product-owner visual approval remains pending
- E1-004/E1-026A/A1 Vendors List — implemented with fixture/local name navigation, Open/Active/Inactive menus, separate lifecycle/compliance summaries, semantic column sorting and existing local filters/pagination; unsupported bulk selection is removed; product-owner visual approval remains pending
- E1-005/E1-026A/B/E1-027 Vendor Details — implemented with identity-driven coverage for all listed vendors, safe absent-data states, inactive indicators, shared-form atomic metadata editing, local document search and snapshot-based template application/upload/removal; product-owner visual approval remains pending
- E1-006/E1-023/E1-025A/B/C/D Document Requirements — implemented with company-scoped browser-memory template creation/editing, Add Document drawer, appearance controls, local duplicate/delete, and read-only supplier Preview; product-owner visual approval remains pending
- E1-027A shared authenticated search/filter UX — implemented with global-reference search styling, counted filter triggers, desktop popover/mobile Drawer, view-owned filters and independent sort/pagination
- E1-027 vendor requirement template application — multi-select/confirmation, identity-based deduplication, independent snapshots/provenance, company custom document types, missing-row upload, explicit requirement/document removal and category-change relevance warning; browser-memory only; see [vendor requirements](../features/vendor-requirements.md)
- E1-027B Vendor Contacts, complete vendor-scoped Activity and threaded Notes — implemented with primary-contact/Invite integration, shared company-owned local audit events, standard filters/pagination, protected Save/delete lifecycle and informational-only Documents banner; product-owner visual approval remains pending
- E1-007 canonical Invite Vendor drawer — implemented from Vendor Details with a local preview form; product-owner visual approval remains pending
- E1-008 canonical Supplier Upload Portal — implemented as a separate external-supplier layout with a deterministic token fixture, shared Preview/Portal requirement presentation, and browser-local file selection; product-owner visual approval remains pending
- E1-009 canonical Document Review — implemented with a deterministic document fixture, local edits and human confirmation only; product-owner visual approval remains pending
- E1-010 canonical Notifications and Audit Activity — implemented with separate operational/audit fixtures, local filters, timeline and CSV export; product-owner visual approval remains pending
- E1-011 canonical Documents page — implemented with typed document-to-vendor fixtures and local tabs, filters, sort, and pagination; product-owner visual approval remains pending
- E1-014 canonical Login screen — implemented with local validation and fixture-backed Dashboard navigation, without real auth or social sign-in; product-owner visual approval remains pending
- E1-015 Add Vendor drawer — implemented with shared drawer mechanics and browser-memory list/details mapping, without persistence or invitations; product-owner visual approval remains pending
- E1-016 Add Document drawer — implemented with shared drawer mechanics, browser-memory document metadata, and conditional demo review; product-owner visual approval remains pending
- E1-017 bell notification preview, E1-018 Members & Access, E1-019 Plan & Billing, and E1-020 global-user profile dropdown — implemented with fixture/browser-local data; product-owner visual approval remains pending
- E1-021/022 My Companies and active-company switcher — implemented with shared browser-memory company state and local creation; product-owner visual approval remains pending

## Agreed delivery sequence

1. E1-001 landing page — implemented under an explicit task brief. The earlier complete-MVP epic planning checkpoint remains open.
2. Implement approved mockup experiences using typed fixture/browser-local data — complete for all twenty-eight tracked canonical mockup states.
3. Visually and interactively compare them with the canonical mockups; obtain product-owner visual approval.
4. Before expanding beyond the supplied E1 tasks, finalize the complete Epic sequence through MVP.
5. Define data model and API contracts, then build backend/persistence and replace fixtures with real data.
6. Add document processing, OCR/AI and other real integrations as their tasks define them.
7. Harden for production and commercial readiness.

This sequence makes UI delivery visual-first while preserving typed screen contracts and a separate application/domain layer. The complete MVP epic plan is not yet established here.

## Future product directions

- Identity and organizations
- Vendor management and document requirements
- Supplier invitation and upload
- Document storage, processing, extraction and human review
- Compliance status, reminders and renewals
- Audit history, MVP hardening and commercial readiness

These are roadmap directions, not detailed feature specifications or a finalized Epic sequence.

## Next task

All twenty-eight tracked mockups have fixture/browser-local implementations. Product-owner visual approval and the broader MVP epic planning checkpoint remain open; backend and auth are not implemented.
