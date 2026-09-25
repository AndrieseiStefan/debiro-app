# Roadmap

This roadmap records direction only. Detailed requirements are created by the task that defines or implements them.

## Phase 0 — Product & Repository Foundation

- Repository memory — complete
- Canonical mockup contract and ten approved images — complete
- Architecture and stack decision — complete (TASK-002)
- UI foundation and canonical design system tooling — complete (TASK-003); no product screens approved
- E1-001 canonical landing page — implemented; product-owner visual approval remains pending
- E1-002 canonical onboarding first step — implemented; product-owner visual approval remains pending
- E1-003 canonical dashboard overview — implemented with a fixture-backed authenticated shell; product-owner visual approval remains pending
- E1-004 canonical Vendors List — implemented with fixture-backed local list controls; product-owner visual approval remains pending
- E1-005 canonical Vendor Details — implemented with a typed dynamic fixture route and local document search; product-owner visual approval remains pending
- E1-006 canonical Document Requirements — implemented with typed presentation fixtures and browser-local controls; product-owner visual approval remains pending
- E1-007 canonical Invite Vendor drawer — implemented from Vendor Details with a local preview form; product-owner visual approval remains pending
- E1-008 canonical Supplier Upload Portal — implemented as a separate external-supplier layout with a deterministic token fixture and browser-local file selection; product-owner visual approval remains pending
- E1-009 canonical Document Review — implemented with a deterministic document fixture, local edits and human confirmation only; product-owner visual approval remains pending

## Agreed delivery sequence

1. E1-001 landing page — implemented under an explicit task brief. The earlier complete-MVP epic planning checkpoint remains open.
2. Implement remaining approved mockup experiences using typed fixture data; mockup 10 remains. The global `/documents` list is deferred to E1-011, sourced from `11-documents.png`.
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

Document Review (09) is implemented. The next tracked approved mockup is 10; the global Documents list is separately deferred to E1-011. The broader MVP epic sequence still requires a planning checkpoint; backend and auth are not implemented.
