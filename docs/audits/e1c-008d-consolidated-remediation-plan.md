# E1C-008D — Consolidated Audit & Remediation Plan

## 1. Executive Summary

Consolidated on **22 October 2026, Europe/Bucharest**. This is the canonical **E1 remediation tracker**, derived from the completed [functional audit A](e1c-008a-functional-audit.md), [UI/UX audit B](e1c-008b-ui-ux-audit.md) and [technical audit C](e1c-008c-technical-hardening-audit.md). Original reports retain their historical evidence and finding identities; this plan does not replace them.

The reconciled baseline is **six unique confirmed findings: P0 0 / P1 2 / P2 4**. C confirmed no additional distinct technical finding. All six remain **Confirmed / Open**; no remediation was implemented or independently validated by this consolidation. None requires a new data model, API, dependency, provider or product redesign.

All six are **required for the proposed E1 closure baseline**, including the four P2 corrections. Priority describes impact, not execution order: repair test discovery/labels/environment selection first, then shared Drawer SSR, shared contrast, Login typography, Company Share tooltip and upload validation focus. Each is a separate future implementation task with one local commit. Sections 7–12 contain standalone execution prompts; they are artifacts for later work, **not instructions executed in E1C-008D**.

**Current assessment: consolidation deliverable complete; E1 closure withheld.** Supported document entries still return HTTP 500; readable small-text contrast is not yet corrected; the discovery-complete production baseline has four failed cases whose tails did not execute. Green targeted tests do not remove these facts. E1 closure is a browser-demo quality milestone requiring Product Owner acceptance, not production readiness or server-security certification.

## 2. Inputs and Audit Baselines

### Authority and repository recovery

- [AGENTS.md](../../AGENTS.md) governs scope, current-truth documentation, approved mockups/copy, minimal reuse and local-only commits.
- Latest recovered commit: `ec68cb4ead4808d99314cccf9ad0b28d2ec85e63` (`docs: add E1C technical hardening audit`). Preceding audit commits: B `a7381aff6da02e247cb213907366af0af62a6ed2`, A `686eb6ca58ee297d359552ed6b78f7fdc21ce79b`.
- All three audits assess unchanged application baseline `74c47ade08daf7f872fe355ee3ebaa4e86b11bc8`. The tracked working tree was clean at D recovery; six pre-existing untracked PNG mockups remain unrelated and preserved.
- Read A/B/C in full. Cross-checked [current status](../project/current-status.md), [UI foundation](../design/ui-foundation.md), [Login](../features/login.md), [document management](../features/document-management.md), relevant Company/Employee contracts and identified source/test/configuration boundaries. No comprehensive browser investigation or application test rerun was needed for this documentation-only task.
- Current feature decisions supersede illustrative old mockups. No new mockup interpretation, glossary approval, provider-term verification or product requirement is inferred here.

### Evidence reconciliation

| Source | Confirmed unique contribution | Executed evidence in that audit | Boundaries retained here |
| --- | --- | --- | --- |
| A, §§4–8, 12–15 | F001 P1; F002 P2 | Typecheck/lint/build; 72 files / **581 unit/component passes**. Complete production-compatible run: **519 cases, 515 passed, 4 failed, 0 skipped, 0 flaky**. Separate development preview: 1 pass. Six drawer-entry HTTP 500 probes. | Failed cases stop at obsolete labels; unreached tails are not passes. Recovered client drawer does not prove healthy HTTP. |
| B, §§2, 10–12, 14–18 | U001 P1; U002/U003/U004 P2 | **146 unit/component passes**, **326 targeted production E2E passes**, separate dev preview 1 pass; **646 recorded screenshots** and computed/paint/focus measurements. | Targeted, not another complete suite; no full WCAG/pixel/real-device certification. A's build reused. |
| C, §§4, 6, 12–14, 19–24 | No new T finding; A/B retained | Typecheck/lint/**581 unit/component passes**. **211 passing production attempts including repetitions**, plus four deliberately reproduced F002 failures; separate dev preview 1 pass. 66 locale-specific HTTP requests: 48×200, 8×404, 10×500; 132 browser load/refresh samples. | 211 is not 211 new unique cases and not a full suite. Timing symptoms were **NOT REPRODUCED**, not permanently resolved. A's build reused. |

Do not sum A/B/C passes into a unique coverage total. The A production build reused in B/C is `rMsSznpT_NrkrfsQ1Rtz6`; D does not present it as a fresh build. Detailed commands, traces, screenshots and limitations remain in the source reports. Their ignored local evidence lives under `artifacts/visual/e1c-008a/`, `e1c-008b/` and `e1c-008c/`; it is not committed or guaranteed to exist in another checkout.

### Test-discovery baseline

Source: C §13, cross-checked against [package.json](../../package.json), [Playwright configuration](../../playwright.config.ts) and the [session suite](../../e2e/document-session-navigation.spec.ts).

| Inventory | Baseline | Interpretation |
| --- | ---: | --- |
| Unit/component files / cases | 72 / 581 | All files match the existing Vitest entry. |
| All Playwright spec files / cases | 59 / 521 | Includes one dev-only assertion and one screenshot utility. |
| Normal `npm run e2e` enumeration | 55 / 505 | Includes the dev-only assertion; not a complete production conformance command. |
| Functional cases omitted by normal enumeration | 15 in 3 files | Session navigation 4, Login 5, manual expiry 6. |
| Production-compatible conformance | **519** | 521 minus exactly one dev assertion and one screenshot utility. |
| Development-only assertion | 1 | Run separately in development; production RO/EN preview routes remain 404. |
| Screenshot utility | 1 | Intentional `visual:capture` utility, outside conformance totals. |

Current configuration starts a development server and disables reuse in CI. A local prestarted-production invocation worked during the audits, but is not an explicit production CI contract. This belongs to **A-F002**, not a seventh finding. Final totals may grow with added regressions; discover and report actual unique cases, attempts, retries, failures and exclusions separately.

## 3. Consolidated Findings Register

All statuses below mean **Confirmed / Open / remediation not executed**. Severity is preserved from the source, independently of priority and delivery order.

| Original finding ID | Title / source | Priority / severity | Future task / size | Closure requirement / regression risk |
| --- | --- | --- | --- | --- |
| **E1C-008A-F001** | Document Details/History direct-entry SSR 500. A §8; C §§6, 19, 21. | P1 / Medium | **E1C-008-FIX-002**, S | Required; blocks healthy HTTP entry. Broad shared-overlay lifecycle risk despite small fix. |
| **E1C-008B-U001** | Insufficient contrast for shared operational small-text roles. B §§10, 12, 14. | P1 / Medium | **E1C-008-FIX-003**, M | Required; blocks contrast sign-off. Broad visual consumer exposure, no business-logic change. |
| **E1C-008A-F002** | Stale session-navigation E2E labels and incomplete test discovery/environment selection. A §8; C §§13, 19, 21. | P2 / Low | **E1C-008-FIX-001**, S | Required; blocks trustworthy discovery-complete closure validation. Test omission/wrong-server/retry-masking risk. |
| **E1C-008B-U002** | Company Share tooltip paints behind Drawer. B §12. | P2 / Low | **E1C-008-FIX-005**, S | Required local interaction correction; layer/viewport/unavailable-action regression risk. |
| **E1C-008B-U003** | Login placeholder/value typography mismatch. B §12. | P2 / Low | **E1C-008-FIX-004**, S | Required consistency correction; shared CSS size-variant regression risk. |
| **E1C-008B-U004** | Invalid upload focus recovery on short viewports. B §12. | P2 / Low | **E1C-008-FIX-006**, S | Required recovery correction; chooser/field/error focus and upload-success regression risk. |

Totals reconcile to A (1 P1 + 1 P2) + B (1 P1 + 3 P2) + C (0 new) = **0 P0 / 2 P1 / 4 P2 / 6 unique**. There is no count conflict. A's older P2 “Optional / Scheduled” heading and C's “Should Fix” grouping do not waive the current consolidation requirement: all six agreed corrections are closure prerequisites. Historical reports are not rewritten to conceal this disposition.

### Root cause, module and minimal-scope map

| ID | Confirmed root cause | Affected existing modules / reuse boundary | Required minimal remediation |
| --- | --- | --- | --- |
| A-F001 | Initially open shared Drawer evaluates `document.body` during SSR; client-component designation/effect guards do not protect render. | [Drawer](../../src/components/ui/Drawer.tsx), [DocumentManagementDrawer](../../src/features/documents/DocumentManagementDrawer.tsx), existing Documents/Vendor initial query composition. | Hydration-consistent portal readiness/target handling in shared mechanics. Keep query selection, unavailable recovery and lifecycle. |
| B-U001 | Existing foreground roles used as normal-size text lack contrast; some equivalents duplicate local ink/counter styles. | [tokens](../../src/styles/tokens.css), [globals](../../src/styles/globals.css), [StatusBadge CSS](../../src/components/ui/StatusBadge.module.css), [DataTable CSS](../../src/components/ui/DataTable.module.css), [bell CSS](../../src/features/notifications/NotificationBell.module.css), [sidebar CSS](../../src/components/layout/AppSidebar.module.css), B-mapped feature-local equivalents. | Reuse suitable readable semantic ink first, then correct mapped local equivalents; retain semantic hues, soft surfaces, provenance, sizes and geometry. |
| A-F002 | Stale hardcoded expectations plus manually enumerated script omit suites; server configuration lacks explicit production/dev selection. | Session spec, package scripts, existing Playwright configuration/foundation preview and visual utility separation. | Current labels, complete functional discovery, explicit local/CI readiness/mode; retain every functional assertion and production preview restriction. |
| B-U002 | Share consumer omits existing drawer-layer opt-in: Tooltip z240 under Drawer z1000. | [CompanyShareDrawer](../../src/features/company-documents/CompanyShareDrawer.tsx), existing [Tooltip](../../src/components/ui/Tooltip.tsx) / [layer CSS](../../src/components/ui/Tooltip.module.css); [EmployeeReminderDrawer](../../src/features/employees/EmployeeReminderDrawer.tsx) already demonstrates z1050 opt-in. | Apply `layer="drawer"` at the consumer, not a global z-index rewrite. |
| B-U003 | Login sets 13px values while shared absolute placeholder size resolves to 14px. | [Login CSS](../../src/features/login/LoginPage.module.css), globals/tokens and existing Field/Select/Onboarding size treatments. | Size-aware/inherited placeholder typography; preserve pre-auth 40px fields/46px CTA and compact admin variants. |
| B-U004 | CompanyUploadDrawer publishes validation errors and returns without visible invalid-target focus recovery. | [CompanyUploadDrawer](../../src/features/company-documents/CompanyUploadDrawer.tsx), [dropzone](../../src/features/documents/DocumentFileDropzone.tsx); reuse AddVendor/Employee/Share form-focus patterns. | Focus appropriate visible invalid control/error after errors render; never focus hidden file input. Keep shared Drawer and owner-specific mutation policies. |

Original reports contain reproduction and runtime evidence; this map is not new runtime verification. C's expanded Vendor History/unavailable contexts remain **A-F001**. CI mode detail remains **A-F002**. No duplicate C IDs are assigned.

## 4. Required vs Optional vs Deferred

| Disposition | Items | Current action |
| --- | --- | --- |
| Required E1 remediation | All six register entries | Implement separately, validate independently, then run final combined regression. No item is closed here. |
| Optional, approval-dependent UI simplification | B-O001 duplicate filter entry points; B-O002 repeated Employee empty-state actions | Retain existing approved UI until Product Owner approval; not part of six defects. |
| Product decision | B-D001 English Suppliers/Vendors glossary; stronger bulk-download guarantee | Retain copy/current documented browser boundary; no archive or silent delivery guarantee. |
| Separate documentation observation | C §16 architecture current-state wording drift | Optional scoped synchronization later, not an application defect or seventh mandatory fix. |
| Deferred E2 | Identity/server tenancy/durability/private files/delivery/processing/audit/billing/operations/privacy | Separate gated implementation; nothing provisioned or authorized by D. |
| Not verified / not reproduced | Section 18 coverage boundaries | Preserve uncertainty; require new evidence before defect promotion or readiness claims. |

## 5. Prioritized Remediation Backlog

| Task | Exact task title | Original ID | Priority / size | Dependencies / unblocks |
| --- | --- | --- | --- | --- |
| **E1C-008-FIX-001** | Restore complete E2E discovery and current labels | E1C-008A-F002 | P2 / S | Existing infrastructure; establishes validation contract for every later task. |
| **E1C-008-FIX-002** | Make existing Document Details/History direct entry SSR-safe | E1C-008A-F001 | P1 / S | FIX-001 preferred before full regression; healthy direct HTTP/hydration gate. |
| **E1C-008-FIX-003** | Improve contrast of existing small-text roles | E1C-008B-U001 | P1 / M | Coordinate CSS boundary with FIX-004; readable operational text gate. |
| **E1C-008-FIX-004** | Align Login placeholder and value typography | E1C-008B-U003 | P2 / S | Rebase on FIX-003 styling; size-aware placeholder consistency. |
| **E1C-008-FIX-005** | Correct Company Share tooltip layering | E1C-008B-U002 | P2 / S | Existing Tooltip layer; independent consumer fix, regression after FIX-002. |
| **E1C-008-FIX-006** | Restore visible invalid-upload focus | E1C-008B-U004 | P2 / S | Existing invalid-focus patterns; shared Company/Employee upload correction. |

Effort estimates are bounded planning estimates, not authorization to broaden scope. Every future task must preserve unrelated changes/mockups, synchronize directly relevant current-truth documentation, add focused tests, record remaining blockers honestly and create **one** local commit only after its required validation passes. No amend or push. Unrelated known open findings are reported, never suppressed to manufacture a clean result.

## 6. Dependencies and Implementation Sequence

1. **Phase 1 — Test foundation / FIX-001.** P2 executes first because a partial discovery script cannot provide reliable shared-component regression evidence. Preserve all 519 baseline production-compatible cases and separate dev/utility accounting. Do not add F001's success assertions here only to skip them while it is open; those arrive with FIX-002. If restored original assertions expose another genuine failure, report/investigate it rather than weaken them.
2. **Phase 2 — SSR correctness / FIX-002.** Correct the actual server exception, then assert raw response status separately from client-rendered content. Keep all shared Drawer consumer behavior, including nested overlays and file identity.
3. **Phase 3 — Shared UI / FIX-003 then FIX-004.** Contrast owns foreground roles; Login typography owns size inheritance. They can affect the same globals/tokens: review the combined diff and remeasure both color and typography after each. Preserve approved geometry and deliberate size variants. Do not concurrently overwrite the same CSS or bundle both into one commit.
4. **Phase 4 — Local interactions / FIX-005 then FIX-006.** Independent consumer-level fixes: existing Tooltip layer and existing form-focus approach. No shared overlay rewrite, new form framework or delivery backend.
5. **Phase 5 — Final validation.** Fresh production build, complete discovered conformance run, separate development preview, HTTP/SSR/contrast/paint/focus evidence and all domain regressions. Only then assess closure with the Product Owner.

FIX-001 is an evidence dependency, not higher product impact than P1. FIX-005/FIX-006 do not require domain/schema work and can be independently shipped after their focused checks; final combined validation still follows all six. E2 security/integration work and optional product decisions are not hidden dependencies for these E1 corrections.

## 7. FIX-001 Detailed Story and Codex Prompt

**Story:** Restore reliable validation entry points without changing product navigation. Original finding **E1C-008A-F002**, P2 / Low / Confirmed Open, size S. Four RO/EN × 1448/375 session cases stop at old `Cerințe / Requirements` sidebar locators; the correct UI is `Șabloane / Templates`. Existing package enumeration omits those four plus five Login and six manual-expiry cases. Current Playwright server configuration always selects development, with local reuse and different CI behavior.

**Required scope:** tests/scripts/configuration and directly relevant validation documentation only. All downstream version/session/history/exact-download/company-switch assertions must execute unchanged in meaning. No application terminology rollback, assertion removal, timeout/retry inflation or silent functional exclusion. Establish explicit production/dev readiness locally and in CI; do not create a deployment platform. Regression risk is false completeness, not an established application persistence failure. Evidence: A §8 F002; C §§13–14, 19–21.

**Proposed commit:** `test: restore complete E1 regression discovery`.

### Standalone Codex Execution Prompt — FIX-001

```text
Task:
E1C-008-FIX-001 — Restore complete E2E discovery and current labels.

Context:
Read AGENTS.md and docs/audits/e1c-008d-consolidated-remediation-plan.md.
Source finding: E1C-008A-F002, P2/Low, size S; see A §8 and C §13/19/21.
Audit baseline: 59 Playwright specs / 521 discovered cases = 519 production
conformance + 1 dev-only preview + 1 screenshot utility. Current normal list
is 55 files / 505 cases, includes the dev assertion and omits 15 functional
cases: session navigation 4, Login 5, manual expiry 6. Do not call it complete.

Scope:
Repair old session sidebar expectations using approved Șabloane / Templates
labels and existing catalog/test patterns. Define complete functional E2E
discovery, explicit production/dev server selection and readiness for local
and CI runs, a separate dev preview check and separate visual utility.

Requirements:
- Preserve all original lifecycle, repeated-navigation, sizing, history,
  exact-byte download, locale and company-isolation assertions.
- Do not rename application labels, routes or vendor-specific requirements.
- Keep production /__dev/design-system and /en/__dev/design-system HTTP 404.
- No hidden failed suites, weakened assertions, test.skip/only, new arbitrary
  waits, timeout inflation or retry increases to rescue failures.
- Preserve CI forbidOnly and honest per-attempt/retry reporting. Current
  config starts dev and cannot be assumed to select production in CI.
- Use isolated contexts and an explicit task-owned server; do not reset the
  user's tab-memory workspace or stop/reuse it accidentally as production.
- Account for discovery counts including added tests, not just the old 519.
  Do not run native-PDF groups in a browser that lacks their existing support.
- No schema, dependency, fixture, business behavior or auth changes. Preserve
  unrelated/untracked mockups. Sync directly relevant validation docs only.

Data Model:
Existing synthetic test inputs, version IDs and company-owned state remain
unchanged. No entity/schema/persistence migration or application data change.

API Contract:
No API or application route changes. Only test execution/server-mode contract.

Implementation Notes:
Inspect e2e/document-session-navigation.spec.ts, package.json,
playwright.config.ts, e2e/foundation.spec.ts, e2e/visual-capture.spec.ts and
existing support helpers/catalogs. Reuse current tooling. A-F001 is a separate
known supported-document SSR 500: report it while open; do not conceal it or
implement its shared Drawer fix in this task. HTTP success regressions belong
to FIX-002. Do not expose the preview to make a production run green.

Definition of Done:
All intended functional suites are discoverable and execute in the explicit
production mode; all four repaired session cases finish their full original
assertions. Development preview passes separately; production preview stays
404 in RO/EN. Commands, discovered counts, failures/retries and exclusions are
documented. Typecheck, lint, units and production build pass; all required
task regression checks pass. No app/data behavior changes. One local commit,
no amend, no push; do not commit if required validation fails.

Acceptance Criteria:
1. Given current RO/EN navigation at 1448/375, when the four session cases run,
   then each reaches and passes every original tail assertion with new labels.
2. Given normal production validation, when listing/running tests, then all
   519 baseline applicable cases plus new regressions are accounted for,
   including Login/manual expiry/session; utility/dev checks are separate.
3. Given local or CI execution, when readiness completes, then the intended
   server mode is explicit and no wrong-mode server silently substitutes.
4. Given production preview URLs, when requested in either locale, then 404;
   given development, then its existing preview assertion passes separately.
5. Given a genuine remaining failure, when reporting results, then it stays
   visible with its actual assertion, not hidden by exclusions or retries.

Implementation Plan:
1. Inspect git state, source reports, existing scripts/config and all specs.
2. Reproduce the four stale locators and compare normal/all discovery lists.
3. Reuse current-label/catalog and server/test configuration patterns.
4. Implement the minimal label/discovery/environment correction only.
5. Add focused configuration/discovery coverage where appropriate; preserve
   all existing functional assertions and explicit dev/utility accounting.
6. Run npm run typecheck, npm run lint, npm run test, npm run build, complete
   production-compatible E2E, separate dev check and production RO/EN 404s.
7. Verify counts, unchanged app scope, git diff --check and git status; record
   genuine blockers rather than weaken coverage or claim known F001 fixed.
8. After required validation passes, stage task files only and create exactly
   one local commit: test: restore complete E1 regression discovery.

Output:
Summary; files changed; exact commands/server modes; unique discovered cases
vs attempts/retries/results; separate dev/utility evidence; known limitations;
commit SHA/message and working-tree status. Confirm no amend and no push.
```

## 8. FIX-002 Detailed Story and Codex Prompt

**Story:** Make supported initially selected document drawers SSR-safe. Original **E1C-008A-F001**, P1 / Medium / Confirmed Open, size S. `Drawer` renders a portal target using the browser DOM before effects. A measured six failing locale contexts; C expanded this to eight owned Details/History contexts plus two unavailable-document contexts, all ten returning HTTP 500 on both browser load and refresh. Client recovery and absence of browser `pageerror` do not resolve the exception.

**Required scope:** minimal shared portal readiness/target correction with hydration-consistent initial rendering. Keep existing `DocumentSelection`, query/context and navigation. FIX-001 preferred before complete regression. Assess equivalent Modal risk within the regression surface without inventing new supported initial-open routes or broad overlay refactoring. Existing Company/Employee managers are initially closed and have no serialized query-overlay contract. Evidence: A §8 F001; C §§6–8, 19, 21.

**Direct-response matrix:** RO/EN × Documents/Vendor Details × Details/History = eight owned entries using `construct-pro-fire-2024`; also `/documents?document=not-owned-audit` in both locales. Owned entries must return 200 on raw request and refresh; unavailable query entries must keep the safe unavailable presentation without a portal exception. Preserve existing 404 vs safe-200 behavior for unrelated unsupported targets; do not normalize every invalid URL to a new policy.

**Proposed commit:** `fix: make document drawers SSR-safe`.

### Standalone Codex Execution Prompt — FIX-002

```text
Task:
E1C-008-FIX-002 — Make existing Document Details/History direct entry SSR-safe.

Context:
Read AGENTS.md, docs/audits/e1c-008d-consolidated-remediation-plan.md,
E1C-008A-F001 (A §8) and C §6/19/21. P1/Medium, size S, still Open.
An initially open shared Drawer reads document.body during server rendering,
returns HTTP 500, then recovers in the browser. A client DOM pass is not a fix.
Prefer the completed FIX-001 discovery/environment contract for regression.

Scope:
Minimal hydration-consistent portal readiness/target handling in the existing
shared Drawer. Preserve initially selected Details/History, query routing,
unavailable states and every existing owner workflow. No new drawer/route.

Requirements:
- Keep server and first client render consistent; browser DOM access must be
  safe before effects run. No hydration suppression, artificial delay or fake
  content. Ensure focus/lifecycle effects run when their panel actually exists.
- Preserve 804px/502px variants, mobile containment, open/closing lifecycle,
  Escape/backdrop/Tab, initial focus/return, inert/aria-hidden and body scroll
  restoration. Nested Modal, menu and Tooltip behavior must remain correct.
- Preserve Details/History internal Back, browser Back, existing URL/context,
  current/historical version identity and exact bytes. No store reset.
- Retain lost/stale/foreign safe recovery, current role/company checks and
  locale routing. No employee-private data leak or new auth semantics.
- Assess existing Modal's equivalent portal shape for this regression surface,
  but do not invent deep links or refactor unrelated working overlay mechanics.
- Preserve all unrelated/untracked canonical mockups, source behavior and user
  workspace. Sync directly relevant known-limitation docs after validation.

Data Model:
Existing DocumentSelection, owned document/version/history references and
contextPath only. No entity, schema, ID, persistence or migration changes.

API Contract:
No new API/routes. Existing supported query URLs must produce healthy HTTP
responses, not a 500 masked by client recovery. No backend authorization claim.

Implementation Notes:
Inspect src/components/ui/Drawer.tsx,
src/features/documents/DocumentManagementDrawer.tsx and Documents/Vendor route
initial-selection composition. Reuse Drawer/DrawerHeader; preserve shared
consumers in Vendor, Company, Employee, requirements, filters and reminders.
Existing src/test/document-management-drawer.test.tsx and relevant overlay,
document-management, company/employee/viewer tests are starting points.
Do not fix Tooltip U002 or upload-focus U004 in this commit.

Definition of Done:
Independent production HTTP and browser refresh tests are green for supported
entries, with no SSR/hydration exceptions. All shared Drawer lifecycle and
current/history byte/permission regressions pass in RO/EN desktop/mobile.
Typecheck/lint/units/build and relevant production E2E pass; final scope and
git diff --check pass. Exactly one local commit, no amend or push; do not
commit on failed required validation. Known unrelated findings remain visible.

Acceptance Criteria:
1. Given construct-pro-fire-2024, when directly requesting and refreshing
   /documents?document=construct-pro-fire-2024 or
   /vendors/construct-pro?document=construct-pro-fire-2024, each with/without
   &documentAction=history and each /en equivalent, then HTTP 200 and the
   correct Details/History resolve without SSR/hydration error (eight entries).
2. Given /documents?document=not-owned-audit and its EN equivalent, when loaded
   and refreshed, then safe unavailable recovery has no portal/server crash
   or disclosure. Actual foreign/stale/role guards remain unchanged.
3. Given SPA open/close/internal Back/browser Back/company or locale changes,
   when used repeatedly, then existing selection, focus, inert and scroll
   cleanup remain correct without resetting owned state.
4. Given current/historical file operations and denied/missing-byte cases,
   when accessed, then exact file identity and safe failure remain intact.
5. Given nested overlays or compact screens, when keyboard/pointer is used,
   then no trapped focus, blocked control, clipping or background lock remains.

Implementation Plan:
1. Inspect current git state, contracts, portal render and initial-open callers.
2. Reproduce raw production 500 independently of client UI and record the matrix.
3. Reuse a minimal readiness/portal pattern compatible with existing lifecycle.
4. Implement only the shared SSR correction; preserve first-render consistency.
5. Add targeted SSR/hydration and direct HTTP load/refresh regressions, plus
   focused tests of readiness-sensitive focus/cleanup and unavailable states.
6. Run typecheck/lint/units/build, production direct-response tests and shared
   Drawer, nested overlay, Vendor/Company/Employee/history/viewer regressions;
   repeat representative close/return cases, with no retry/sleep inflation.
7. Inspect desktop/mobile RO/EN captures and server/browser errors; verify
   exact bytes, Back, isolation, docs, git diff --check and git status.
8. After required validation passes, create exactly one local commit:
   fix: make document drawers SSR-safe. Do not amend or push.

Output:
Root cause/fix; files changed; raw HTTP matrix separate from DOM results;
SSR/hydration/lifecycle/file/permission/visual checks; remaining limitations;
commit SHA/message and working-tree status. Confirm no push.
```

## 9. FIX-003 Detailed Story and Codex Prompt

**Story:** Improve existing functional text ink, not the palette or business mappings. Original **E1C-008B-U001**, P1 / Medium / Confirmed Open, size M. B's computed normal-text samples are below 4.5:1; disabled/decorative text is not the failing category. Shared semantic foreground corrections should precede B-mapped local equivalents. Coordinate globals/tokens with FIX-004 and verify the combined result; changing only one Badge declaration is incomplete.

| B measured role | Actual foreground / background | Baseline ratio |
| --- | --- | ---: |
| Valid StatusBadge, 12px | `#07976a` / `#e2f8ef` | 3.35:1 |
| Warning / In Review, 12px | `#a66a00` / `#fff2cf` | 4.03:1 |
| Expired, 12px | `#dc2b43` / `#ffe5e9` | 3.95:1 |
| Not Configured, 12px | `#617393` / `#eaf0f8` | 4.18:1 |
| Active field placeholder, 14px | `#8198bb` / white | 2.94:1 |
| Global Search placeholder, 14px | `#8198bb` / `#f2f6fb` | 2.71:1 |
| Document metadata, 12px | `#647fa4` / white | 4.11:1 |
| Bell/sidebar unread ink, 10/12px | White / `#f44e69` | 3.42:1 |

These are prior B measurements, not new D measurements. Evidence: B §§10, 12, R computed samples and linked captures. Preserve status hue meanings, source accent identity and readable neutral source overrides; do not blanket recolor icons/gradients/inactive controls or enlarge fonts to evade the normal-text threshold. Existing `--color-text-secondary` illustrates reusable readable ink, not a preapproved replacement for every role.

**Proposed commit:** `fix: improve operational text contrast`.

### Standalone Codex Execution Prompt — FIX-003

```text
Task:
E1C-008-FIX-003 — Improve contrast of existing small-text roles.

Context:
Read AGENTS.md, docs/audits/e1c-008d-consolidated-remediation-plan.md and
E1C-008B-U001 in B §10/12/14. P1/Medium, size M, Confirmed/Open. B measured
active small-text status, placeholder, metadata and unread-counter roles
below 4.5:1, e.g. Valid 3.35, warning 4.03, danger 3.95, neutral 4.18,
field placeholder 2.94, Search placeholder 2.71, metadata 4.11, counter 3.42.
These are text readability failures, not incorrect compliance derivation.

Scope:
Correct existing shared foreground roles/StatusBadge, placeholder, DataTable
metadata and bell/sidebar unread counts, then the feature-local equivalents
mapped in B (including Portal/My Companies). No palette or page redesign.

Requirements:
- Measure actual rendered foreground/background at normal text sizes; use
  >=4.5:1 for active operational text on supported opaque/soft/selected/tinted
  surfaces. Keep the evidence scope explicit for gradients/opacity/icons.
- Reuse existing readable semantic text roles where suitable before extending
  minimal text-specific roles. Do not blindly darken global icon/status tokens.
- Preserve status meanings, green/amber/red distinctions, source/template
  accent identity, role meaning, badge surfaces where possible, all font sizes,
  geometry, borders, layout, validation and data. Source is not compliance.
- Preserve disabled/decorative exceptions and selected vs placeholder value
  hierarchy; do not treat real All/Any filter values as empty placeholders.
- Coordinate globals/tokens with FIX-004. This task owns color; do not silently
  bundle Login size-inheritance remediation or force every input to one size.
- Verify RO/EN, all three document owners, shell, public fields, Dashboard,
  Notifications and Search. Use existing components, no dependency/design-system
  rewrite. Inspect relevant approved mockups/current contracts before UI edits.
- Preserve permissions, company isolation, ordinary E1 lifetimes and all
  unrelated/untracked mockups; synchronize relevant token/UI documentation.

Data Model:
Existing visual tones/size variants and domain mappings remain unchanged.
No entity/schema/category/status/provenance/persistence changes.

API Contract:
No API, route, authorization or provider changes.

Implementation Notes:
Inspect src/styles/tokens.css, src/styles/globals.css,
src/components/ui/StatusBadge.module.css, DataTable.module.css and Field/Select/
Search styling; src/features/notifications/NotificationBell.module.css and
src/components/layout/AppSidebar.module.css; follow B's mapped local samples.
Retain readable neutral source overrides. Use existing StatusBadge, Field,
SelectField, SearchInput, table and counter implementations, not replacements.

Definition of Done:
Each confirmed role and mapped equivalent has recorded before/after computed
contrast on supported states; active normal text is >=4.5:1 without semantic,
font-size or geometry regression. Placeholder/value distinction remains clear.
Typecheck/lint/unit/component and targeted production E2E pass; RO/EN visual
captures reviewed. Diff/scope checks pass. One local commit after required
validation, no amend or push; do not commit if required checks fail.

Acceptance Criteria:
1. Given active status/metadata/counter/placeholder text, when rendered on its
   supported opaque/soft/selected/tinted background, then measured contrast
   is >=4.5:1, including every B-confirmed role and mapped local equivalent.
2. Given Vendor/Company/Employee statuses or source/role badges, when rendered,
   then existing meaning, distinction, size and provenance remain unchanged.
3. Given empty Input/Select/Search, when a value is entered or selected, then
   muted placeholder vs normal value hierarchy stays readable and correct.
4. Given RO/EN desktop/mobile and hover/selected/readonly states, when compared,
   then no new overflow, layout, counter/count or behavioral change occurs.
5. Given inactive/decorative content, when reviewing changes, then exceptions
   are explicit rather than indiscriminate recoloring or false pass claims.

Implementation Plan:
1. Inspect git state, source audit evidence, shared consumers and current mocks.
2. Reproduce computed failing text pairs, distinguishing active/inactive roles.
3. Reuse existing semantic ink/variants and map affected local equivalents.
4. Implement minimal foreground corrections without business/geometry changes.
5. Add focused contrast/style regression coverage with meaningful background
   pairs and placeholder/value states; retain existing semantic assertions.
6. Run npm run typecheck, npm run lint, relevant unit/component tests and
   targeted production E2E; build the artifact used for browser verification.
   Cover status tones, forms/Select, Search, tables, shell counters, Dashboard,
   Notifications, all owner contexts and Login/Onboarding geometry regressions.
7. Review actual RO/EN desktop/mobile captures and computed ratios, coordinate
   FIX-004's CSS boundary, sync docs, run git diff --check and inspect status.
8. After required validation passes, create exactly one local commit:
   fix: improve operational text contrast. Do not amend or push.

Output:
Summary; files/roles changed; measured pairs/ratios and visual evidence;
tests/checks performed and scope; known limitations; commit SHA/message,
working-tree status and confirmation nothing was pushed.
```

## 10. FIX-004 Detailed Story and Codex Prompt

**Story:** Make Login placeholder typography follow its field size. Original **E1C-008B-U003**, P2 / Low / Confirmed Open, size S. B measured Login 13px entered text / 14px placeholder, both weight 400 and 40px outer height; Onboarding compared at 13px/13px. This is not an outer-height or authentication defect.

**Required scope:** existing size-aware/inherited typography, minimal shared reuse; no new pre-auth control family. Coordinate with FIX-003's color changes, preserve 40px/13px pre-auth fields, 46px CTA, compact 42px/14px admin controls and Vendor upload's established smaller treatment. Empty Select vs selected value must retain correct hierarchy. Evidence: B §12 U003 and X computed/empty/typed captures; [Login contract](../features/login.md).

**Proposed commit:** `fix: align login placeholder typography`.

### Standalone Codex Execution Prompt — FIX-004

```text
Task:
E1C-008-FIX-004 — Align Login placeholder and value typography.

Context:
Read AGENTS.md, docs/audits/e1c-008d-consolidated-remediation-plan.md,
E1C-008B-U003 in B §12 and docs/features/login.md. P2/Low, size S, Open.
Login values are 13px but placeholders 14px due to a shared absolute-size
rule; both weight 400, outer field 40px. Onboarding compares 13px/13px.
Coordinate with FIX-003's foreground changes; do not overwrite its contrast fix.

Scope:
Make email/password placeholder typography follow the actual field variant,
prefer existing shared size-aware/inherited styling. Preserve every outer
dimension and interaction. No Login redesign or general design-system cleanup.

Requirements:
- Placeholder font size/weight/line treatment follows its field; muted ink
  remains distinct from normal value ink and retains FIX-003 readability.
- Preserve pre-auth 40px fields/13px values, 46px primary CTA, Onboarding's
  existing treatment, compact admin 42px/14px and existing Vendor small controls.
- Do not globally force inputs to 13px or add screen-specific geometry hacks.
- Preserve Field/Select empty-state vs real-option styling, padding, radius,
  icons, labels, errors, focus outline, Login card/header, responsive logic,
  copy, routes, validation, password toggle and demo greeting/Login semantics.
- Inspect relevant approved mockups/current overrides; reuse Field/Select and
  existing typography patterns without new dependencies/components/auth.
- Preserve company/personnel permissions, ordinary session data and unrelated
  untracked mockups. Sync directly relevant control documentation if changed.

Data Model:
Existing Field/Select values and presentation sizes only; no entity, schema,
credentials, persistence or session data changes.

API Contract:
No API/auth/route changes. Demo Login remains demo navigation, not a session.

Implementation Notes:
Inspect src/features/login/LoginPage.module.css, src/styles/globals.css,
src/styles/tokens.css and current Field/Select/Onboarding overrides. Reuse the
field's computed size rather than inventing another pre-auth variant family.
Start regression from e2e/login.spec.ts, e2e/onboarding.spec.ts and existing
component/Onboarding tests. Check all consumers if the global rule changes.

Definition of Done:
Both Login fields resolve matching placeholder/value size and weight; muted
vs normal ink and all outer geometry remain correct. Onboarding/admin/Select
and relevant small controls are unchanged. Typecheck/lint, focused unit and
production E2E pass; actual computed styles and RO/EN captures reviewed.
Diff/scope checks pass. One local commit only after required checks pass;
no amend/push and no final task commit on failed validation.

Acceptance Criteria:
1. Given Login email/password in RO/EN, when empty then typed/cleared, then
   placeholder and value follow the same 13px field scale/weight without
   layout shift, while placeholder/value color hierarchy remains correct.
2. Given Login icons/toggle/errors/CTA, when focused or activated, then existing
   alignment, validation and demo navigation remain unchanged.
3. Given Onboarding controls and authenticated compact Input/Select, when
   empty then entered/selected, then their existing sizes and treatment remain
   unchanged (pre-auth 40px/13px, admin compact 42px/14px).
4. Given desktop/tablet/375/320 widths in both locales, when rendered, then no
   new overflow, card/header layout or focus regression appears.

Implementation Plan:
1. Inspect git state, U003, FIX-003 changes and existing size treatments/mocks.
2. Reproduce Login placeholder/value and Onboarding computed-style comparison.
3. Reuse the minimal size-aware/inheritance pattern without new control family.
4. Implement typography-only correction; preserve color work and geometry.
5. Add focused computed-style regression for both fields and representative
   Onboarding/admin/Select variants; retain behavior assertions.
6. Run typecheck/lint, targeted unit/component tests, build and relevant
   production Login/Onboarding/forms E2E. Broaden consumer checks if global CSS
   changes; do not claim a targeted run is the complete E1 suite.
7. Review RO/EN desktop/mobile captures and computed typography/geometry,
   inspect shared contrast, update relevant docs, git diff --check/status.
8. After required validation passes, create exactly one local commit:
   fix: align login placeholder typography. Do not amend or push.

Output:
Summary/files; before/after placeholder/value font and outer-size measurements;
RO/EN visual and behavior regressions; checks performed; limitations;
commit SHA/message and working-tree status. Confirm no push.
```

## 11. FIX-005 Detailed Story and Codex Prompt

**Story:** Use Tooltip's existing drawer-layer opt-in at Company Share's unavailable final action. Original **E1C-008B-U002**, P2 / Low / Confirmed Open, size S. B measured tooltip DOM/aria presence but z240 beneath Drawer z1000; its center hit the drawer's note, not the tooltip. Employee Reminder's existing z1050 `layer="drawer"` correctly paints on top. Persistent Share explanation remains visible and no delivery currently occurs.

**Required scope:** one existing consumer's layer choice; preserve no-op Generate Link/Send Email, localized copy, selection/preview/warnings and existing Tooltip collision behavior. No global layer increase or Drawer mechanics change. No backend dependency. Validate actual painting, not only DOM visibility. Evidence: B §12 U002, S focus/hover/mobile probes and Reminder comparison.

**Proposed commit:** `fix: foreground company share tooltips`.

### Standalone Codex Execution Prompt — FIX-005

```text
Task:
E1C-008-FIX-005 — Correct Company Share tooltip layering.

Context:
Read AGENTS.md, docs/audits/e1c-008d-consolidated-remediation-plan.md and
E1C-008B-U002 (B §12). P2/Low, size S, Confirmed/Open. Company Share's final
Generate Link/Send Email tooltip exists in DOM but paints below Drawer:
default z240 vs Drawer z1000. Existing Employee Reminder uses the correct
layer="drawer" opt-in (z1050 below nested Modal z1100).

Scope:
Reuse existing Tooltip drawer-layer support at CompanyShareDrawer's final
unavailable Link/Email action. Keep all existing content/behavior/geometry.

Requirements:
- Focus/hover explanation must be actually painted above Drawer and remain
  viewport-contained, with existing collision/fallback/scroll behavior.
- Preserve localized explanation, aria-describedby, keyboard focus and the
  persistent backend-unavailable note. Check both Link and Email modes.
- Keep actions unavailable. Click/Enter/Space must not create shares, links,
  emails, notification/activity records, active-share counts or fake success.
- Preserve preview, attachment/stale-selection validation, permissions and
  company-switch cleanup; no real sharing/security integration.
- No global z-index change, Tooltip replacement, Drawer refactor, extra
  wrapper/toolbar, new dependency or unrelated UI edit. Inspect current
  contract/mockup; reuse Button/Tooltip exactly as existing consumers do.
- Preserve unrelated/untracked mockups, user tab-memory data and RO/EN copy.

Data Model:
Existing ShareDocumentSelection, ShareForm and SharePreview unchanged.
No schema/entity/ID/storage/event/persistence changes.

API Contract:
No API or delivery service. Existing local preview only; final actions remain
unavailable and must never be presented as actual secure sharing.

Implementation Notes:
Inspect src/features/company-documents/CompanyShareDrawer.tsx,
src/components/ui/Tooltip.tsx and Tooltip.module.css; use
src/features/employees/EmployeeReminderDrawer.tsx as the working layer example.
Existing src/test/company-share-drawer.test.tsx, src/test/tooltip.test.tsx and
e2e/company-document-sharing.spec.ts provide regression starting points.
FIX-002 shared SSR work is separate; do not bundle it into this local change.

Definition of Done:
Both mode explanations are visibly foregrounded for pointer/keyboard in RO/EN
desktop/mobile, verified by actual screenshots and paint order/hit-testing,
not just tooltip DOM visibility. Unavailable actions remain safe no-ops;
Reminder and nested overlays unchanged. Typecheck/lint, focused component and
production E2E/build evidence pass; diff/scope checks pass. Exactly one local
commit after required validation, no amend/push, no commit on failed checks.

Acceptance Criteria:
1. Given Link or Email unavailable action in Company Share, when hovered or
   keyboard-focused, then localized Tooltip visibly paints above Drawer and
   inside viewport, with a correct accessible description.
2. Given an unavailable action, when clicked/Enter/Space activated, then no
   delivery/link/event is created and persistent explanation remains.
3. Given narrow/short viewport, scroll or collision, when Tooltip is open, then
   it stays attached/reachable with existing fallback and no page overflow.
4. Given Reminder, nested Modal or normal Tooltip consumers, when exercised,
   then their layering, focus/Escape/return and existing behavior remain intact.

Implementation Plan:
1. Inspect git state, source finding, consumer and current Tooltip API/contract.
2. Reproduce the underpainted tooltip in both modes; compare Reminder.
3. Reuse existing layer="drawer", not new overlay behavior.
4. Apply the minimal consumer correction only.
5. Add focused consumer coverage for the opt-in and actual browser paint order,
   accessible description and unavailable activation; retain existing tests.
6. Run typecheck/lint, Company Share/Tooltip component tests, production build
   and targeted Share/Reminder/overlay E2E, including safe selection/permissions.
7. Inspect RO/EN 1448/768/375/320 and short-height focus/hover captures; verify
   hit-testing, viewport bounds, no events, docs, git diff --check/status.
8. After required validation passes, create exactly one local commit:
   fix: foreground company share tooltips. Do not amend or push.

Output:
Root cause/fix/files; mode/locale/viewport and paint-order evidence; pointer,
keyboard/no-op/regression checks; limitations; commit SHA/message and status.
Confirm nothing was pushed.
```

## 12. FIX-006 Detailed Story and Codex Prompt

**Story:** Restore visible correction focus after invalid Company/Employee upload submission. Original **E1C-008B-U004**, P2 / Low / Confirmed Open, size S. At 375×500, B's keyboard/pointer invalid submissions added accurate errors but left Submit focused at y≈510.05–555.05, entirely below the viewport. Scroll/Tab/Escape remain possible: this is recoverable focus friction, not lost data or a new validation rule.

**Required scope:** shared owner-neutral CompanyUploadDrawer form recovery, reusing AddVendor/Employee/Share patterns. A missing file's hidden input is not a visible correction target: use the existing chooser or an accessible error target, with minimal existing dropzone affordance only if needed. Include domain-returned date/form errors as well as initial file/name/type errors. Keep stale/unavailable bound uploads fail-closed; no fallback standalone creation. No global Drawer or sticky-footer change. Evidence: B §12 U004, S/X validation and keyboard-upload JSON/captures.

**Proposed commit:** `fix: restore visible upload validation focus`.

### Standalone Codex Execution Prompt — FIX-006

```text
Task:
E1C-008-FIX-006 — Restore visible invalid-upload focus.

Context:
Read AGENTS.md, docs/audits/e1c-008d-consolidated-remediation-plan.md and
E1C-008B-U004 (B §12). P2/Low, size S, Confirmed/Open. Shared CompanyUploadDrawer
adds inline errors but returns without focus recovery. At 375x500, invalid
Company/Employee standalone submission leaves Submit focused wholly below
viewport (B y510.05–555.05). Errors are accurate; preserve their rules/copy.

Scope:
Minimal visible-invalid-target focus recovery in the existing shared
Company/Employee upload form; reuse established local form/ref patterns.

Requirements:
- After invalid errors render, identify the first appropriate correction
  control or accessible error target, focus it and keep it visibly reachable
  in the scrollable drawer. Preserve error associations/announcements.
- Missing file must focus a visible chooser/error target, never the hidden
  native file input. Use a minimal existing dropzone affordance only if needed;
  no new form framework, global Drawer focus rewrite or arbitrary offsets.
- Cover client file/name/type errors and returned invalid date/form errors;
  preserve retry/correction and successful submission behavior.
- Preserve standalone, requirement-bound readonly and replacement contexts,
  stale/foreign/permission denial, submitting guard and unavailable handling.
- Keep validation, exact original bytes, ownership, current/history/version
  identity, Company review and Employee immediate no-review rules unchanged.
- Cancel/Escape/X/focus-return, responsive inline actions and Vendor upload
  must not regress. No sticky footer, fake async state, timer/delay or delivery.
- Inspect relevant current mocks/contracts. Preserve RO/EN copy, company
  isolation, user workspace and unrelated/untracked canonical mockups.

Data Model:
Existing CompanyUploadContext, File, validation errors and
DocumentManagementAdapter; no entity/schema/ID/persistence/policy changes.

API Contract:
No API/new route. Existing adapter operations and typed failure reasons stay
unchanged; no real remote upload, retry service, OCR/AI or review integration.

Implementation Notes:
Inspect src/features/company-documents/CompanyUploadDrawer.tsx and
src/features/documents/DocumentFileDropzone.tsx; reuse existing Field,
SelectField, Button, DocumentUploadDrawer and visible chooser. Existing
AddVendorDrawer, EmployeeDrawer and CompanyShareDrawer illustrate focus
recovery. A hidden aria-invalid file input must not win a naive selector.
Start with Company/Employee management/component suites and existing
e2e/company-document-management.spec.ts and e2e/employee-documents.spec.ts.

Definition of Done:
Keyboard and pointer invalid submit visibly focus a relevant correction
target with accurate associated error in RO/EN at short and normal heights.
Valid uploads/replacements, correction/retry, permissions and close/return
remain unchanged for both owners; Vendor remains unchanged. Typecheck/lint,
focused units/components, production build and targeted E2E pass. Actual
captures/focus geometry reviewed; diff/scope checks pass. One local commit
after required checks, no amend/push; no commit if required validation fails.

Acceptance Criteria:
1. Given empty Company or Employee standalone upload at 375x500, when Submit
   is used by Enter or pointer, then an appropriate visible correction target
   receives focus with its associated message inside the drawer viewport.
2. Given missing file only, blank name/type or invalid date, when submitted,
   then the correct visible target/error is focused, not a hidden file input,
   and correction followed by retry uses unchanged validation.
3. Given bound readonly/replacement or stale/unavailable context, when errors
   occur, then focus goes to a usable correction/error target without changing
   readonly identity or falling back to standalone creation.
4. Given valid authorized upload/replacement, when submitted, then exact bytes,
   versions/history, Company review and Employee no-review policy are intact.
5. Given Cancel/Escape/X, denied permissions, company/locale switch or mobile
   reflow, when used, then close/focus-return/isolation remain unchanged and
   Vendor upload is unaffected.

Implementation Plan:
1. Inspect git state, source finding, shared form/dropzone and focus patterns.
2. Reproduce invalid keyboard/pointer submit at 375x500 for Company/Employee.
3. Reuse existing form/ref/error-focus patterns and a visible file target.
4. Implement minimal post-error focus recovery, including returned date/form
   failure paths, without changing validation or global drawer mechanics.
5. Add focused first-invalid/chooser/error and successful retry/close tests;
   preserve adapter, permission, current/history and exact-file assertions.
6. Run typecheck/lint, relevant unit/component suites, production build and
   targeted Company/Employee/Vendor upload/management/history/viewer E2E.
7. Inspect actual RO/EN 1448/768/375/320 and 375x500 captures/focus bounds,
   standalone/bound/replacement states, docs, git diff --check and git status.
8. After required validation passes, create exactly one local commit:
   fix: restore visible upload validation focus. Do not amend or push.

Output:
Root cause/fix/files; focused target and error association/geometry evidence;
viewport/locale/owner and retry/success/permission regressions; checks run;
limitations; commit SHA/message and working-tree status. Confirm no push.
```

## 13. Shared Component and Regression Risks

| Surface / tasks | Must preserve / test | Explicit non-goal |
| --- | --- | --- |
| Test entry / FIX-001 | Full functional discovery, explicit mode/readiness, per-case identity/results, dev assertion separately, production 404, native-PDF groups | No retry masking, deleted assertions, renamed app navigation or new CI platform. |
| Drawer / FIX-002 | Initial SSR/client consistency; focus/Tab/Escape/backdrop/return; close timer cleanup; inert/aria-hidden/body scroll; nested Modal/menu/Tooltip; browser/internal Back; shared consumer widths | No new drawer implementation, query removal, unsupported deep links, store reset or broad overlay rewrite. |
| Shared CSS / FIX-003 + FIX-004 | Color and typography ownership coordinated; Input/Select empty vs real values; readonly/selected/hover/tinted states; icon alignment; public/admin size variants; source/role/status distinctions | No palette, density, font-size, global breakpoint or provenance/business mapping redesign. |
| Share / FIX-005 | Actual foreground paint and viewport fallback, focus/hover description, no-op activation, persistent notice, local preview/attachment warnings, switch cleanup | No generated token/link/email/success, event, active-share count or global layer change. |
| Upload / FIX-006 | Visible first-invalid recovery, hidden-file exception, associated errors, returned failures, valid retry/Cancel/Escape; actual bytes and immutable history | No validation expansion, sticky actions, global Drawer focus change or policy unification. |

Cross-domain contracts are mandatory regression invariants, not simplification opportunities:

- **Vendor:** zero configured requirements is Compliant; configured requirements/current references determine Noncompliant → Attention → Compliant, not file ratios. Existing optionality, supplier review, internal renewal, snapshots/starter cloning and category semantics remain.
- **Company:** Company-owned standalone/bound/replacement operations, review-required current versions, local-only Share preparation and current/history access remain. No invented Company lifecycle audit events or automatic notices.
- **Employee:** membership-visible basic profiles do not grant personnel access; Administrator-only document metadata/files/events remain private. Immediate upload/replacement activation and legacy pending/history rules remain. Zero configuration is Not Configured, not Vendor Compliant.
- **Shared projections:** current versions only; no passive attention row becomes a notification or actual activity. Preserve namespaced event identity/original timestamps, fixture-clock expiry and authorized activity-range reference.
- **Lifetime/navigation:** company-keyed tab-memory state, active workspace A→B→A, full-reload reset, separate saved greeting exception, notification read reset on full reload, locale-aware routes and global Profile route retention remain. No persistence or auth expansion.
- **Files:** current/history version identity, exact bytes, no substitute files, missing-byte failure and authorized viewer/fallback/object-URL cleanup remain. Native download initiation is not guaranteed receipt.

Relevant existing regression families include `authenticated-navigation`, `company-switch-navigation`, `company-workspace`, `document-management`, `document-session-navigation`, `document-review-lifecycle`, `manual-document-expiry`, `company-document-management`, `company-document-sharing`, `company-document-preview`, `employee-documents`, `requirement-scopes`, `starter-templates`, `template-colors`, `global-search-domains`, `notification-records`, Dashboard, Login and Onboarding. These are starting points, not permission to omit the rest of final conformance.

## 14. Optional Product Decisions

These records are **not** the six confirmed defects. They have no mandatory FIX assignment and no inferred P0/P1 priority.

| Record / evidence | Current disposition | Approval needed before expansion |
| --- | --- | --- |
| **E1C-008B-O001**, B §17: inline document filters duplicate FilterPanel dimensions | Retain existing filters; optional simplification deferred. | PO-approved entry pattern by width, preserving query composition, active counts/reset/sort/pages/keyboard. Removing quick controls can add work; no demonstrated timing benefit. |
| **E1C-008B-O002**, B §17: repeated Employee empty-state template/upload actions | Retain current actionable empty state; optional simplification deferred. | Approve hierarchy/discoverability change using existing action slots only; retain toolbar/header capabilities and denied/zero-config distinctions. |
| **E1C-008B-D001**, B §§11, 17: English Suppliers/Vendors glossary | Retain current copy pending explicit English glossary approval. | Review EN meaning/widths; preserve locked RO copy, technical routes and vendor-specific requirements. No mechanical global replacement. |
| Large automatic downloads, C §12 | Document current browser limitation; no stronger delivery guarantee. Eleven-file attempt yielded **ten observed byte-exact downloads** in the sampling window; eleventh stored file remained. | Explicit supported-delivery/permission guidance/recovery decision before implementation expansion. Not a universal ten-file limit, missing-data bug, archive authorization or promise that every initiated download arrives. |

Existing Reports/Help/legal/forgot-password/resource/service decisions and marketing-claim launch review remain as documented in A/B; do not invent destinations or service capabilities. Any change to approved E1 state lifetime or invalid Employee read contracts also requires a separate explicit decision. Optional current-state architecture wording synchronization may follow C §16, without rewriting historical ADR decisions or changing application behavior.

## 15. E2 Security and Integration Gates

These are **deferred requirements**, not additional confirmed E1 defects and not verified production capabilities. No integration is authorized by this plan. See A §11, B §17 and C §18, together with [security/data direction](../architecture/security-and-data.md), [ADR-0002](../decisions/0002-application-architecture-and-stack.md) and its authentication revision [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md). Provider choices are documented directions; current terms/prices/regions are not reverified here.

| Gate | Required before real service/customer data | Preserve from E1 |
| --- | --- | --- |
| Real authentication/logout/account switching | Verified identity/session lifecycle, local user mapping, recovery/revocation/outages and accepted privacy/transfer review; auth-provider identity is not tenancy. | Demo Login/greeting is presentation only; unavailable Logout is not fake auth. |
| Server tenancy/personnel authorization | Membership/role on every read/mutation/file/export/job, runtime validation, same-origin/CSRF/rate limits, non-bypass DB/RLS scope and cross-tenant negative tests. | Separate company identity, basic employee profile vs private documents, stable ownership. |
| Persistent database/state | Reviewed mappings/migrations, current/version/snapshot invariants, atomicity/concurrency/idempotency and rollback compatibility. | No browser registry treated as server authority; no copying/resetting customer companies. |
| Private document storage/upload/download | Authorized staging/finalization, validated actual type/size/quotas/scanning, private objects/least privilege, short-lived version-scoped capabilities, revocation and byte integrity. | Current/history identity and no substitute files; define rather than assume batch delivery. |
| Invitation security | Random scoped tokens stored hashed, expiration/revocation/reissue/rate limits, minimal URLs/logs, actual recipient flow. | Local fixtures/previews are not live invitations or authorization. |
| External Company sharing | Server-owned selected version checks, reject stale/unattached sets, scoped access/expiry/revocation/password policy, privacy and download authorization. | Preparation/preview only; never report an active share before actual creation. |
| Email reminders and scheduling | Approved bilingual delivery, authenticated callbacks, transactional enqueue, bounded retry/dead-letter/idempotency, execution-time authorization and monitoring. | No fabricated sends, success notifications or passive-row events. |
| OCR/AI and human confirmation | Bounded native/OCR/provider processing, legal/residency/privacy gates, schemas/provenance/evaluation and human confirmation. | Deterministic fixture extraction is not real parsing; Extracted is not Verified. |
| Durable audit/events | Transactional immutable actor/owner/event identity and original timestamps, integrity/retention/redaction; implement Company Document lifecycle recording explicitly. | Do not backfill claimed activity from document rows or seeded reminder delivery examples. |
| Automatic notifications/read state | Authorized actual event-to-recipient generation; idempotent notices; durable user+company read state across refresh/logout/login/devices. | Separate attention/activity/notices; never infer unread from passive status. |
| Billing/subscriptions | Explicit provider decision, approved checkout/webhook/entitlements/seat/tax/invoice contracts and actual processing/security tests. | Safe demo metadata/sample invoice is not real charge or subscription enforcement. |
| Monitoring/error handling | Redacted request/job correlation, actionable alerts/metrics/health, provider failure/retry evidence and incident ownership. | Product audit history is not operational telemetry; no secrets/file content in logs. |
| Retention/GDPR/privacy/recovery | Reviewed lawful purpose/minimization/access/deletion/legal hold/regional processors; server secrets validation; backup/PITR/object reconciliation, RPO/RTO and demonstrated restore/runbooks. | Client tests and a recovery plan are not security/GDPR/restore certification. |

Order remains domain/authority decisions → application/runtime contracts → persistence → private files/capabilities → transactional events/jobs/delivery → gated processing → operational/recovery hardening. Preserve approved Vendor/Company/Employee business differences during integration. No new global clock, artificial events, real document processing or infrastructure is introduced in D.

## 16. Final E1 Regression Strategy

This is the **future combined validation contract after all six fixes**, not a claim of checks run during D. Preserve A's known failing full-suite baseline; do not substitute B/C's targeted/repeated passes.

### Execution and evidence

1. Record exact application commit, Node/tool versions, intended server mode, unique discovery list and test/environment exclusions. Isolate task contexts and ports; preserve the user's server/tab data.
2. Pass `npm run typecheck`, `npm run lint`, **all unit/component tests** and `npm run build` on the final combined source. Baseline is 581 tests / 72 files; report actual totals after additions.
3. Use FIX-001's explicit **production** entry/readiness contract to run every production-compatible conformance case. Baseline is **519**, not normal-script 505 or C's 211 attempts. New regressions may increase it. No silently omitted functional cases, unchanged failure hiding or retry inflation. Record unique cases separately from repeated/retried attempts, skipped/flaky/unexpected results and justified utility separation.
4. Run the development-only primitive preview assertion separately against **development**. It must pass there. Independently assert production `/__dev/design-system` and `/en/__dev/design-system` remain **404**. Keep screenshot utility outside conformance; approved visual baselines must not be invented.
5. Run independent raw HTTP/status and browser load/refresh checks for FIX-002's eight owned query contexts and unavailable RO/EN context; assert supported owned entries **200** before considering DOM recovery. Collect server logs and browser pageerror/rejection/hydration messages. Require no unexpected SSR/hydration errors, not merely no visible crash. Preserve existing not-found/safe-unavailable policies elsewhere.
6. Measure FIX-003 active text pairs at actual computed sizes on white/soft/selected/tinted surfaces; require normal text **≥4.5:1**. Verify FIX-004's same-variant placeholder/value size/weight and unchanged geometry. Review actual RO/EN desktop/mobile captures. Disabled/decorative/ambiguous-gradient exceptions and full-accessibility limitations remain explicit.
7. Validate FIX-005 foreground paint/hit-testing plus pointer/keyboard/viewport bounds in both Share modes. Verify no share/email/event/success. Validate FIX-006 actual focused target/error association and viewport bounds at **375×500**, normal heights and both owners; missing-file target must be visible.
8. Exercise all shared Drawer consumers: initial/query vs event opening, closing/remount, Tab/Escape/backdrop/return, nested Modal/menu/Tooltip, scroll/inert/aria-hidden cleanup, internal/browser Back and route/company/locale changes. Repeat representative historical timing cases in bounded serial/parallel runs with traces; report repeats as attempts and do not infer permanent absence of flakes.
9. Pass Company/Employee/Vendor lifecycle, templates/starter/category/snapshot/provenance, Company Share, no-review Employee/legacy decisions, Vendor/Company review, manual expiry and current-only KPI/tracking projections. Preserve required vs optional and zero-configuration domain differences.
10. Pass Dashboard/greeting, Search, Notifications/bell/activity/audit, locale-aware destinations, unread/read lifetime and actual-record vs attention semantics. Ensure no fake notification or historical delivery claim enters actual activity.
11. Pass company switching A→B→A, global Profile route retention and positive/negative role/owner/personnel boundaries before counts/search/export/files. Preserve ordinary reload resets and presentation greeting exception; do not expand malformed Employee reads.
12. Verify current/historical real-file preview/fallback, permission denial, missing bytes, exact filenames/bytes and URL cleanup. Run full Chromium's existing native-PDF groups. Do not promise complete large-batch receipt from anchor initiation; retain documented limitation.
13. Check supported responsive interactions across **1920×1080, 1448×900, 1280×800, 1024×768, 768×900, 375×812, 320×720**, plus short-height invalid upload. Desktop/mobile RO/EN screenshots must be inspected for changed shared consumers; not every possible state/viewport or real device is thereby certified.
14. Finish `git diff --check`, changed/staged-file review, mockup preservation and `git status`. No unrelated source/data/dependencies, weakenings or untracked mockup additions. Record actual results, failures, warnings and evidence paths.

### Findings verification record required at closure

| Finding / task | Required independent proof | Current disposition |
| --- | --- | --- |
| A-F002 / FIX-001 | Four full original cases pass; complete actual discovery and explicit modes; separate dev pass, production 404 | Open, not implemented |
| A-F001 / FIX-002 | Raw owned entries/load/refresh healthy, no SSR/hydration exception; safe unavailable + overlay/file regression | Open, not implemented |
| B-U001 / FIX-003 | Computed role/surface matrix meets text threshold with semantic/geometry regression clear | Open, not implemented |
| B-U003 / FIX-004 | Both Login fields empty/typed match variant; Onboarding/admin/Select geometry unchanged | Open, not implemented |
| B-U002 / FIX-005 | Actual foreground tooltip in both modes and no-op delivery behavior; bounds/keyboard pass | Open, not implemented |
| B-U004 / FIX-006 | Visible correction focus/error in short/normal Company/Employee uploads; successful/denied operations intact | Open, not implemented |

Update each entry with implementation commit, exact verification evidence/date/result and remaining limitations during its future task. A commit alone does not close a finding. If a genuine failure or new defect is discovered, preserve its evidence and assess it explicitly; do not retroactively reclassify contrary evidence as a pass.

## 17. E1 Closure Checklist

**Current gate: NOT MET.** E1C-008D is planning, not final regression or Product Owner approval. All future boxes remain unchecked until evidence exists.

- [ ] All six required fixes implemented separately, with traceable original finding IDs, local commit and independently verified disposition for each.
- [ ] No confirmed P0/P1 remains open; no unresolved critical E1 defect or unassessed genuine new regression remains.
- [ ] Complete intended discovery verified; four stale-suite cases execute their full tails; final production conformance is green at actual discovered totals.
- [ ] Typecheck, lint, all unit/component tests and final production build pass.
- [ ] Development-only preview passes separately; both production locale routes remain 404.
- [ ] Supported document Details/History direct HTTP/load/refresh is healthy without client-recovery masking; safe unavailable targets preserved; no unexpected SSR/hydration errors.
- [ ] Normal operational small-text contrast is independently measured and readable; placeholder typography/geometry and bounded accessibility checks pass.
- [ ] Company Share explanation actually foregrounds; invalid upload recovery focuses a visible correction target; pointer/keyboard/short-height evidence passes.
- [ ] All shared Drawer/nested overlay/navigation/focus/scroll/inert regressions pass.
- [ ] Vendor, Company, Employee, template/starter, review/no-review/history/exact-file workflows and permissions/company isolation pass.
- [ ] Dashboard/greeting/Search/Notifications/bell/activity and RO/EN/responsive behavior remain correct; no fabricated activity/notice/delivery.
- [ ] No approved UI/copy/route/business/lifetime regression, mockup/data loss, unrelated refactor or hidden test weakening.
- [ ] Optional product decisions are explicitly retained/deferred or separately approved; no unsupported batch-delivery promise.
- [ ] E2 limitations, residual coverage risks and non-production-security boundary remain documented; no production-readiness claim.
- [ ] `git diff --check`, changed/staged scope, mockup preservation and final status checks pass.
- [ ] Product Owner reviews the evidence/residual risks and explicitly accepts the final E1 browser-demo baseline.

If a required gate fails, **do not recommend E1 closure**. A priority label, previous targeted pass or documented E2 deferral cannot waive a confirmed E1 fix. Scope-changing decisions require explicit approval and a visible disposition, not silent checklist edits.

## 18. Residual Risks / Not Verified

Retained from A §§9, 13; B §13; C §20. These are neither new confirmed findings nor proof of readiness:

- The four F002 case tails remain unverified in their failing runs; overlaps from other suites do not execute them retroactively.
- Cross-engine Safari/Firefox, real devices/touch/software keyboards/safe areas, real 200%/400% or text-only zoom, forced colors and assistive-technology/full WCAG conformance are not established by Chromium viewport captures.
- No product-approved visual CI baselines or exhaustive pixel equality exist. Every gradient/tint/icon/target-spacing exception and extreme Unicode/malformed-file combination was not measured.
- Eleven-file automatic downloads produced ten observed exact files in one browser/configuration/window; complete receipt across browser policies remains unverified. Do not infer a universal cap, lost stored files or approval to build an archive.
- Historical timing failures were not reproduced in C's controlled serial/parallel samples. Long-duration heap/retainer analysis and E2-scale workloads/budgets were not verified; no measured E1 performance/leak remediation is justified by speculation.
- Future initially open Modal/popover entries are not supported routes today. Preserve equivalent portal safety in regression thinking without inventing a failing product URL.
- Unsupported invalid-email legacy Employee Details remains outside the strict existing read contract; defensive reminder component coverage does not authorize expanding it.
- Real API/network failure/retry, authentication/DB/RLS/private storage/tokens/providers/jobs, deployed monitoring, penetration/CVE/deep secret-history scans and backup restore were not verified. Client-domain denial tests are not hostile-client/server security evidence.
- Current architecture wording drift, final English glossary/font/visual approval and marketing/service claims need their documented scoped review; they do not add confirmed C defects or authorize redesign.
- Ignored local audit captures/logs are evidence for this checkout, not committed reproducible CI fixtures. Future task owners must reproduce the relevant defect and retain new evidence.

## 19. Next Implementation Steps

1. Review/accept this scope and execute **FIX-001 only** using its standalone prompt; preserve visibility of all other Open findings.
2. Execute FIX-002 with independent raw HTTP assertions and broad shared-overlay regression.
3. Execute FIX-003 then FIX-004, coordinating semantic ink and typography inheritance without merging commits or expanding design scope.
4. Execute the two bounded consumer corrections FIX-005 and FIX-006, each with actual paint/focus evidence and its own commit.
5. Run section 16 on the combined result, record each finding's verified disposition and review section 17 with the Product Owner. E2 work remains separately gated.

Do not execute all six as one large task. Proposed future commits in sections 7–12 are independent delivery units, not commits created by this document. No push is authorized by this plan or by an instruction merely to implement/validate/commit.

## 20. Consolidation Sign-Off Assessment

**E1C-008D documentation deliverable: complete. E1 remediation: not started by D. E1 closure: withheld. Production readiness: not assessed/approved.**

The full A/B/C reports reconcile without count or identity drift: six unique confirmed findings, 0 P0 / 2 P1 / 4 P2; no duplicate C identifier. Each maps to exactly one proposed task, minimal scope, data/API no-change boundary, dependencies, size/risk, Given/When/Then acceptance, reusable source boundary, regression requirements, standalone prompt and one proposed local commit. Optional preferences/product decisions, deferred E2 capabilities and unverified evidence remain separate.

Documentation validation for D covers the 20 required sections, six original IDs and six prompt/story mappings, source/evidence traceability, local Markdown file/anchor links, balanced code fences, whitespace and changed-file/staged scope. No new application test/build/browser pass is claimed. Application source, existing tests/scripts/configuration, prior reports and all 41 PNG references (including the six pre-existing untracked mockups) are preserved. No user session or server was reset by D.

This report is the sole staged artifact for exactly one local documentation-only commit: **`docs: consolidate E1 audit remediation plan`**. No amend or push is part of E1C-008D. Open findings and coverage limitations are intentional contents of the completed audit-consolidation deliverable, not application validation failures concealed by the documentation commit.
