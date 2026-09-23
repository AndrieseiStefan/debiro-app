# ADR-0001 — Repository as Project Memory

## Status

Accepted.

## Context

Future contributors and coding agents need to understand the product, accepted decisions, implemented state, unresolved questions, canonical design, and next work without relying on chat history. Documentation also must not prematurely turn roadmap ideas into detailed requirements.

## Options considered

1. Treat chat and task prompts as the primary project memory.
2. Create comprehensive specifications for all anticipated features up front.
3. Treat repository documentation as canonical current truth and grow it incrementally.

## Decision

Repository documentation is canonical project memory. It grows incrementally with current requirements, accepted decisions, and implementation. Detailed feature documentation must not be created before the task that defines or implements the feature.

Approved mockups become canonical contracts for visual design, interaction, Romanian product copy, and typography. Relevant UI must target 1:1 fidelity as closely as technically practical. Temporary placeholder branding is replaced with plain text; sample data remains replaceable, and the final logo is not yet defined. The initially lowercase visible-brand convention was superseded by the later `DEBIRO` casing decision; see [visual direction](../design/visual-direction.md).

Git history preserves historical project evolution.

## Trade-offs

This approach keeps context close to the code and limits speculative drift, but each task must spend time synchronizing documentation and checking for stale statements.

## Consequences

- Fresh sessions start with `AGENTS.md`, current status, and task-relevant documentation.
- Tasks update affected documentation in the same change.
- Future ideas remain concise roadmap entries until their defining task.
- UI tasks inspect and compare against exact approved mockups.
- Durable decisions are recorded through ADRs where appropriate.

## Risks

- Documentation can become misleading if changes are merged without synchronization.
- Excessive documentation can recreate speculative requirements unless the incremental policy is enforced.

## Follow-up

- TASK-002 records the architecture and stack decision.
- Future tasks update current status, roadmap, feature documentation, and ADRs only where their scope makes new information current.
