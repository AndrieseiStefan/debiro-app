# Agent Workflow

1. Read `AGENTS.md`.
2. Read `docs/project/current-status.md`.
3. Read only documentation relevant to the task.
4. For UI work, inspect each relevant approved mockup.
5. Inspect the existing implementation before introducing abstractions.
6. Identify affected contracts and boundaries.
7. Implement the smallest complete change.
8. Preserve mockup visual fidelity.
9. Preserve approved interactions.
10. Preserve approved Romanian copy exactly.
11. Replace placeholder branding with uppercase visible `DEBIRO`; preserve lowercase technical identifiers and `debiro.ro`.
12. Add focused tests.
13. Run relevant validation.
14. Visually compare UI with its canonical mockup where applicable.
15. Create or update only documentation made current by the task.
16. Update current status and roadmap where required.
17. Inspect the final diff.
18. If all required validation passes, create the local task commit. If validation fails, do not create the final task commit or push; report the blocker.
19. Do not push by default. Push only when the user explicitly authorized it; a generic request to implement, complete, validate, or commit is not authorization.
20. If push is authorized, push only the intended current branch through its already configured remote. Do not create or change remotes, intentionally push unrelated commits or branches, force push, or rewrite history unless separately and explicitly requested.
21. Report the outcome, validation, commit SHA and message, push status, and any material deviation. For a push, identify the explicit authorization used.

## Context principle

Repository context is authoritative over repeated prompt context. Future prompts should provide task-specific deltas rather than repeat the entire project history.
