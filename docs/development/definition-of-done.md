# Definition of Done

A task is complete only when all applicable conditions are true:

- Requested scope is implemented and non-goals are respected.
- Business rules are deterministic.
- Data ownership is clear and permissions are enforced.
- Validation is implemented.
- Happy path works and relevant edge cases are handled.
- Loading, empty, error, and retry/recovery states are handled.
- Focused tests are added and required validation passes.
- Security, localization, accessibility, observability, and responsive behavior are considered.
- Relevant approved mockups were inspected before UI implementation.
- UI is functional code, not a screenshot-based substitute.
- UI visually matches approved mockups as closely to 1:1 as technically practical.
- Interaction matches approved mockups.
- Romanian product copy matches approved mockups exactly.
- Typography closely matches approved mockups.
- Placeholder branding is replaced with uppercase visible `DEBIRO`; technical identifiers and `debiro.ro` remain lowercase.
- Sample data is replaced with correct runtime data.
- Every material deviation is minimized, justified, documented, and reported.
- Documentation, current status, and roadmap are synchronized where relevant.
- No unrelated changes are included.
- The final diff is clean and inspected.
- All required validation passes before the final task commit is created.
- Exactly one local task commit is created after successful validation.
- The commit SHA and message are reported.
- The task is not pushed unless the user explicitly authorized push; generic implementation, completion, validation, or commit instructions are not push authorization.
- If push is authorized, only the intended current branch is pushed through its already configured remote, without intentionally pushing unrelated commits or branches.
- Force push and history rewriting do not occur unless separately and explicitly authorized.
- Final output states whether the commit was pushed and, if so, identifies the explicit authorization used.
