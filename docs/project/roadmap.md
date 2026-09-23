# Roadmap

This roadmap records direction only. Detailed requirements are created by the task that defines or implements them.

## Phase 0 — Product & Repository Foundation

- Repository memory — complete
- Canonical mockup contract and ten approved images — complete
- Architecture and stack decision — complete (TASK-002)
- UI foundation and canonical design system tooling — complete (TASK-003); no product screens approved

## Agreed delivery sequence

1. **Next checkpoint:** Define and finalize the complete Epic sequence through MVP before E1-001. Do not create arbitrary implementation tasks immediately after TASK-003.
2. Implement approved mockup screens using typed fixture data in the agreed sequence.
3. Visually and interactively compare them with the canonical mockups; obtain product-owner visual approval.
4. Define data model and API contracts, then build backend/persistence and replace fixtures with real data.
5. Add document processing, OCR/AI and other real integrations as their tasks define them.
6. Harden for production and commercial readiness.

This sequence makes UI delivery visual-first while preserving typed screen contracts and a separate application/domain layer. Exact epics and detailed features will be established at the next checkpoint, not here.

## Future product directions

- Identity and organizations
- Vendor management and document requirements
- Supplier invitation and upload
- Document storage, processing, extraction and human review
- Compliance status, reminders and renewals
- Audit history, MVP hardening and commercial readiness

These are roadmap directions, not detailed feature specifications or a finalized Epic sequence.

## Next task

Finalize the complete MVP epic sequence before E1-001; the UI foundation is complete, but canonical screens, backend, and auth are not.
