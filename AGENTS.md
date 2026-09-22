# Repository Constitution

This file governs all work in this repository.

## Canonical project memory

- Repository documentation is the canonical project memory. Chat history is not a specification; Git history preserves historical evolution.
- Documentation describes current truth only. Do not create detailed speculative feature or architecture documentation.
- Synchronize relevant documentation in the same task that changes behavior, requirements, or durable decisions. A task with relevant stale documentation is incomplete.
- Keep implementations minimal, follow established patterns, and avoid unnecessary abstractions.
- The technical repository language is English. Customer-facing product languages are Romanian (`ro`) and English (`en`).

## Product and design contracts

- The visible product brand is the plain lowercase text `debiro` until a dedicated branding task approves a final logo. Do not invent a logo, icon, wordmark treatment, or visual identity.
- Approved mockups in `docs/design/mockups/` are canonical product contracts, not inspiration. For represented screens, target 1:1 fidelity as closely as technically practical.
- The contract covers layout, hierarchy, spacing, sizing, visual treatment, interactions, typography, and visible Romanian product copy.
- Approved Romanian mockup copy is locked. Do not silently paraphrase, shorten, expand, or replace it.
- Approved typographic hierarchy and styling are part of the visual contract and must be reproduced closely.
- Replace temporary mockup branding such as `ComplyHub` with lowercase `debiro`. This is the only currently approved intentional content change.
- Mockup sample data (for example names, companies, dates, counts, emails, and document values) is not locked and must become runtime data.
- Inspect every relevant approved mockup before implementing UI. Do not redesign an approved experience because another implementation is easier.
- Material deviations are allowed only when required by accessibility, responsive adaptation, security, browser/platform constraints, technical impossibility, or explicit product-owner approval. Minimize, justify, document, and report them.
- Mockup screenshots are references only; never use them as implemented screens or hotspot overlays. Build functional UI in code.
- English localization must preserve the business meaning, hierarchy, tone, and interaction intent of canonical Romanian copy. It becomes canonical only after explicit review or approval.

## Implementation order and decisions

Where applicable, prefer this order:

1. Domain/data contract
2. Application contract
3. Persistence/integration
4. API/server boundary
5. UI integration
6. Hardening

Do not silently make major unresolved architecture decisions. If blocked by one:

1. Identify the missing decision.
2. Present no more than two or three options.
3. Explain the trade-offs and recommend one.
4. Record the accepted decision, normally with an ADR.

## Completeness and safety

Every task must consider, where applicable: happy path, edge cases, validation, permissions, loading, empty states, error states, retry/recovery, responsive behavior, accessibility, localization, security, tests, observability, and data ownership.

Security-sensitive files and data must default to private, authorized access once document functionality is implemented. Never commit credentials or real secret-bearing environment files.

Never rewrite Git history or force push unless explicitly authorized.
