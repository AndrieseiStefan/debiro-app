# E1C-008A — Functional Audit and Remediation Backlog

## 1. Executive Summary

Audit date: **2026-10-22**, Europe/Bucharest. Application baseline: `74c47ade08daf7f872fe355ee3ebaa4e86b11bc8` (`feat: extend global search across company domains`). This is an assessment of the existing **E1 browser-local demonstration**, not certification of a production service.

The exercised Vendor, Company Document, Employee, template, Dashboard, notification, search, settings and global-user workflows are largely coherent with their current contracts. No P0 ownership, personnel-disclosure, corruption or compliance defect was confirmed in the executed checks. This does not establish server-side security: E1 has no real authentication, tenant API, database or private object-storage boundary.

Two confirmed follow-ups:

| Priority | Count | Assessment |
| --- | ---: | --- |
| P0 | 0 | None confirmed within the tested E1 boundaries. |
| P1 | 1 | F001: document drawer deep links return HTTP 500 during server rendering; client recovery hides the response failure. Existing documented defect, reconfirmed. |
| P2 | 1 | F002: four session-navigation tests use superseded sidebar terminology and fail deterministically; the default E2E script omits this suite. Test-hardening issue, not incorrect product terminology. |

Typecheck, lint, production build and **581/581 unit/component tests passed**. The complete production-compatible browser run executed **519 tests: 515 passed, 4 failed, 0 skipped, 0 flaky**. All four failures belong to F002. The existing development-only preview test passed separately (**1/1**); both production locale variants remained HTTP 404. Additional browser/HTTP probes confirmed F001 independently of the existing tests. No application, configuration, dependency, existing test or mockup was changed; findings are not fixed by this audit.

**Sign-off:** audit deliverable complete; unconditional E1 closure/hardening sign-off is withheld pending F001 and a clean discovery-complete regression run after F002. Backend-deferred capabilities are not additional E1 defects.

## 2. Audit Scope

Inventoried all **20 product route families** (RO default/as-needed prefix and EN), including dynamic entity routes:

| Area | Existing routes |
| --- | --- |
| Public/demo entry | `/`, `/login`, `/onboarding`, `/upload/[token]` |
| Workspace | `/dashboard`, `/vendors`, `/vendors/[vendorId]`, `/documents`, `/documents/[documentId]/review`, `/requirements`, `/notifications` |
| Company | `/company/documents`, `/company/employees`, `/company/employees/[employeeId]` |
| Company Settings | `/company/settings/profile`, `/company/settings/members`, `/company/settings/billing` |
| Global user | `/profile`, `/profile/companies`, `/invitations` |

Also assessed shared drawers/file actions, Company/Settings disclosures, breadcrumb roots, profile and company popovers, Reports unavailable state, all six Global Search groups, notification records versus passive attention, and operational data/session ownership. Development preview is not a product route. Detailed visual fidelity/spacing and performance/security architecture hardening belong to E1C-008B/C; responsive interaction and access to controls were checked here.

## 3. Sources and Existing Contracts

Current feature contracts, rather than old chat history or illustrative mockup counts, determine expected results:

- [Repository constitution](../../AGENTS.md), [UI foundation](../design/ui-foundation.md), [fixture clock/data](../project/fixture-data.md), [current status](../project/current-status.md), [previous interaction audit](../project/e1-interaction-audit.md).
- Public/global: [Landing](../features/landing-page.md), [Login](../features/login.md), [Onboarding](../features/onboarding.md), [Company workspaces](../features/company-workspaces.md), [My Companies](../features/my-companies.md), [Profile/Invitations](../features/my-profile-invitations.md), [Profile dropdown](../features/profile-dropdown.md).
- Vendor lifecycle: [Vendors](../features/vendors.md), [Vendor Details](../features/vendor-details.md), [Add Vendor](../features/add-vendor.md), [Vendor requirements](../features/vendor-requirements.md), [Add Document](../features/add-document.md), [Documents](../features/documents.md), [Review](../features/document-review.md), [Document management](../features/document-management.md), [Invite Vendor](../features/invite-vendor.md), [Supplier portal](../features/supplier-upload-portal.md).
- Cross-domain: [Company Documents/sharing](../features/company-documents.md), [Employees/documents/reminders](../features/employees.md), [Templates](../features/requirements.md), [Dashboard/greeting](../features/dashboard.md), [Notifications/Audit/bell](../features/notifications-audit.md), [Global Search](../features/global-search.md).
- Settings: [Company Profile](../features/company-profile.md), [Members](../features/company-members-access.md), [Billing](../features/company-plan-billing.md).
- Architecture baseline: [ADR-0002](../decisions/0002-application-architecture-and-stack.md), authentication supersession [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md), [system architecture](../architecture/system-architecture.md), [security/data direction](../architecture/security-and-data.md). Future integrations in these documents are not implemented E1 capabilities.

Inspected route inventory, existing test cases and relevant domain/application boundaries: `company-state`, `browser-session`, `created-vendors`, `vendor-requirements`, Vendor document access/management, `createOwnedDocumentEngine`, Company document projections/management, Employee validation/access/workspaces/projections, scoped template state, `workspace-overview`, `notificationWorkspace` and `search-workspace`. Negative operation tests provide evidence beyond merely hidden UI controls.

Mockup inventory: 35 tracked PNG references and six existing untracked Company/Employee references, all preserved. Directly inspected the current Dashboard redesign, Company Documents, Employee Details (`employees-list.png`, whose filename is reversed), Review, bell and Global Search references. Explicit later decisions take precedence: Dashboard-root breadcrumbs, Templates terminology, no Employee review, separate missing obligations, no fake delivery, no search View All, local-only sharing. This audit does **not** claim a fresh pixel-by-pixel review of every canonical image.

## 4. Execution Environment

- Local macOS workspace; Node `v24.21.0`, npm `11.19.0`; repository-pinned Next `16.3.6`, React `19.3.0`, Playwright `1.63.0`, Vitest `5.0.1`.
- Fresh production build served at `http://localhost:15079`; isolated Chromium contexts, RO/EN, reduced motion and Europe/Bucharest timezone. Existing file-viewer tests separately use full Chromium for native PDF capability.
- Unit run limited to two workers; production browser run used three workers and no retries. Unit run completed before the broad browser run. No test was altered, weakened or silently skipped.
- The existing user development server on port 3001 was left running. A separate development start on port 15080 was rejected by Next's existing-server lock; the read-only preview test was then run in a fresh browser against port 3001. No user tab was reloaded or reset.
- Expiry uses the existing **2026-10-02 12:00 UTC fixture clock**. Recorded real-time Employee events retain original timestamps; only the authorized activity date-range reference advances. No production clock or event timestamp was changed.
- Temporary records/files were created through actual UI in isolated contexts; existing test-only session identities/response interception supplied role and notification edge scenarios. No persistent seed, production hook, database or external service was added.
- Initial tracked tree clean. Six unrelated untracked mockups preserved. Audit output is local evidence under `artifacts/visual/e1c-008a/`, not an approved baseline or part of the commit.

### Commands and execution evidence

| Evidence | Executed check | Result |
| --- | --- | --- |
| U | `npm run test -- --maxWorkers=2` | 72 files / 581 tests passed; 0 failed. `unit.log`. |
| T | `npm run typecheck` | Passed; `typecheck.log`. |
| L | `npm run lint` | Passed; `lint.log`. |
| B | `npm run build` | Passed; `build.log`. |
| P | `PLAYWRIGHT_BASE_URL=http://localhost:15079 PLAYWRIGHT_JSON_OUTPUT_NAME=artifacts/audits/e1c-008a/production-results.json npx playwright test e2e --grep-invert 'shows the development-only primitive preview\|capture an unapproved route screenshot' --workers=3 --reporter=list,json --output=artifacts/audits/e1c-008a/production-results` | 59 spec files; 515 passed / 4 failed / 0 skipped / 0 flaky; 488.0 seconds. `production-e2e.log`, `production-results.json`, `suite-counts.json`, failure traces/screenshots. |
| D | `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/foundation.spec.ts --grep 'shows the development-only primitive preview' --workers=1` | 1 passed; `development-preview.log`, `development-results.json`. |
| H | Production HTTP probes, without browser recovery | 2 normal Documents requests 200; 6 drawer-entry requests 500; 2 dev-preview requests 404. `http-probes.json`, server error log. |
| M | Temporary isolated browser probes | RO/EN Employee journeys passed; 20 fresh workspace screenshots at 1448/375px; `journey-audit.log`, `browser-audit.json`, `combined-journeys.json`. See §6. |

The production command deliberately discovers **all** spec files, including Login, manual-expiry and session-navigation files absent from the default `npm run e2e` list. Only the one development-only assertion and the parameterized screenshot utility were excluded from the production run. The assertion ran separately as D; the screenshot utility is not a conformance test. Original command paths above precede relocation of the evidence folder into ignored `artifacts/visual/e1c-008a/`.

Temporary audit probes were corrected for an unread-count-bearing accessible name, a route-commit wait and the actual Dashboard region translation key. These were probe errors, not application defects; they do not replace, change or reclassify the four failing repository tests. HTTP 500 observations remained reproducible after probe corrections. Vitest emitted environment-reuse advice and Playwright emitted `NO_COLOR`/`FORCE_COLOR` warnings; neither is a failed application assertion.

## 5. Test Coverage Matrix

Legend: **PASS** means the named executed assertion/workflow supports the stated scope, not every possible permutation. **FAIL** is reproducible contrary behavior. **NOT VERIFIED** means no supported end-to-end execution/evidence. **NOT APPLICABLE** is outside current E1 operation semantics. **DEFERRED** is explicitly E2/out-of-MVP, not an E1 defect. Test references below are under `e2e/` unless prefixed `src/test/`; all were included in U/P/D as appropriate.

| Feature | Scenario | Expected contract | Execution method | Result | Evidence reference | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| Landing | Product/Solutions/Pricing/Resources anchors; account entry; Back; RO/EN | Real section anchors and locale-preserving Login/Onboarding, no fake resources | Browser | PASS | P `landing.spec.ts`, `foundation.spec.ts`; U `landing.test.tsx` | — |
| Login | Validation, password visibility, valid demo entry | Navigate without credentials/identity/session provisioning | Browser + component | PASS | P `login.spec.ts`, `dashboard-greetings.spec.ts` | — |
| Onboarding | Mandatory Step 1; explicit optional setup; general draft; supplier draft | No invented category, vendor, invitation or account | Browser + units | PASS | P `onboarding.spec.ts`, `company-workspace.spec.ts`; U `onboarding.test.tsx` | — |
| Supplier portal | Supported demo token, unknown token, upload validation and outcomes | Fixture lookup only; same Vendor requirement state | Browser | PASS | P `supplier-portal.spec.ts`, `document-review-lifecycle.spec.ts`, `requirements-preview.spec.ts` | — |
| Vendor directory | Search/filter/reset, five sorts, pagination, inactive records | Owned current projection; deterministic sorting | Browser + domain | PASS | P `vendors.spec.ts`, `vendor-sorting.spec.ts`, `vendor-lifecycle.spec.ts`, `search-filters.spec.ts` | — |
| Vendor form | Create/edit, duplicate CUI, category vs descriptive industry | Atomic owned metadata; stable identity/configuration | Browser + units | PASS | P `add-vendor.spec.ts`, `vendor-edit.spec.ts`; M Journey A | — |
| Vendor Details | Contacts, primary contact, invitation recipient, notes/dirty guards | Scoped identities; no fake delivery; cancellation preserves data | Browser | PASS | P `vendor-workspace.spec.ts`, `invite-vendor.spec.ts`, `vendor-details.spec.ts` | — |
| Vendor templates | Compatible scope/category, apply/reapply, removal provenance | Snapshots/idempotence; no file deletion or live synchronization | Browser + domain | PASS | P `vendor-template-assignment.spec.ts`; U `vendor-requirements.test.ts` | — |
| Vendor upload | Manual/simulated extraction, invalid type/size/dates, bound requirement | Pending initial upload; no arbitrary OCR/AI | Browser + units | PASS | P `add-document.spec.ts`; U `supplier-portal.test.tsx`, `document-review-lifecycle.test.ts` | — |
| Vendor review | Approve/reject, repeat/stale/foreign actions, superseded pending | Human decision; retained history/current-only compliance | Browser + domain | PASS | P `document-review*.spec.ts`; U `vendor-compliance.test.ts`; M A/F | — |
| Vendor renewal | New current file, exact old bytes, expiry/manual invalidation | Internal renewal needs no review; history retained | Browser + domain | PASS | P `document-management.spec.ts`, `manual-document-expiry.spec.ts`; U `document-version-files.test.ts` | — |
| Vendor Documents | Ownership, counts/statuses, filters, sorting, pages, deep-link attention | Same current source as Details; no missing pseudo-files | Browser + units | PASS | P `documents.spec.ts`, `fixture-consistency.spec.ts`, `dashboard-secondary-navigation.spec.ts` | — |
| Document URLs | Direct Details/History in RO/EN and Vendor context | Healthy HTTP response and valid drawer entry | Independent HTTP + source + browser | FAIL | H; §8 F001 | F001 |
| Company Documents | Identity, KPIs, current/missing/optional rows, search/filter/sort/pages | Separate owned source; no Vendor fallback | Browser + projection tests | PASS | P `company-documents.spec.ts`, `company-documents-ui.spec.ts`; U `company-documents.test.ts` | — |
| Company templates | Scope restriction, application/reapplication, snapshots | Existing single-source `(templateId, ruleId)` snapshot semantics | Browser + domain | PASS | P `company-document-management.spec.ts`, `requirement-scopes.spec.ts`; U `company-document-management.test.ts` | — |
| Company files | Standalone/bound upload, review/rejection, metadata, replacement, history, manual expiry | Review required; no old-version promotion; exact bytes | Browser + domain | PASS | P `company-document-management.spec.ts`; M B/F | — |
| Company selection/share | Missing attachment, mixed/stale selection, local package validation/preview | Selectable without bytes; no partial eligibility or external-success claim | Browser + component + domain | PASS | P `company-document-sharing.spec.ts`; U `company-share-drawer.test.tsx`, `company-document-sharing.test.ts` | — |
| Company/Employee viewer | Native PDF, plugin-less fallback, raster preview, missing bytes | Authorized real bytes only; no substitute file | Browser + domain | PASS | P `company-document-preview.spec.ts`, `employee-documents.spec.ts`; U file tests | — |
| Employees directory | CRUD, duplicate email, free job title, department creation/reuse, inactive status | Atomic company-owned Employee/Department, not membership | Browser + domain | PASS | P `employees.spec.ts`; U `employees.test.ts` | — |
| Employees list | Filters, tracking privacy, sort/pages, row/link/menu separation | No directory selection; inactive records retained | Browser + component | PASS | P `employees.spec.ts`; U `employees-page.test.tsx` | — |
| Employee Details | Profile, Documents/Activity, missing/stale owner | Basic membership profile; Administrator-only personnel | Browser + negative operations | PASS | P `employee-documents.spec.ts`; U `employee-documents.test.ts`, `employee-document-page.test.tsx` | — |
| Employee templates | Scope/ownership, overlap/reapply, retained rules/files/source | Employee-scoped identity deduplication; no category/automatic assignment | Browser + domain | PASS | P `employee-documents.spec.ts`; U `employee-documents.test.ts`; M C | — |
| Employee files | Initial/replacement upload, metadata, expiry, tracking/KPIs | Immediate current; no review/approval event | Browser + domain | PASS | P `employee-documents.spec.ts`; U `employee-documents.test.ts`; M C | — |
| Employee legacy | Pending/approved/rejected historical compatibility | Pending projects expiry without rewrite; rejected never resurfaces | Browser + domain | PASS | P `employee-documents.spec.ts`; U `employee-documents.test.ts` | — |
| Employee bulk download | Selection across pages, missing file blocks batch, two exact downloads | Actual owned current files; no silently skipped missing item | Browser + domain | PASS | P `employee-documents.spec.ts:211`; U `employee-documents.test.ts` | — |
| Large download batches | Delivery of every file above browser automatic-download limits | Documented individual-download/browser-policy limitation | Documentation/source review only in this audit | NOT VERIFIED | [Employee limitation](../features/employees.md); §13 | — |
| Employee reminder | Always visible, recipient, subject/message validation, close/discard, keyboard tooltip | Compose only; no HTTP, reminder record or successful-send claim | Browser + component | PASS | P `employee-documents.spec.ts`; U `employee-reminder-*.test.*`; M C screenshots | — |
| Invalid recipient | Open Details for a stored invalid/missing employee email | Strict existing read contract rejects malformed employees | Supported path assessment + defensive component test | NOT VERIFIED | Such records cannot be created/read through current Employee UI; U `employee-reminder-drawer.test.tsx` is defensive only | — |
| Templates | Vendor/Company/Employee creation/edit/view/duplicate/delete; immutable scope | Atomic owned Save/Cancel; category required for Vendor only | Browser + domain | PASS | P `requirements.spec.ts`, `requirement-scopes.spec.ts`; U scope/edit/creation tests | — |
| Starter templates | Browse/clone/duplicate source/delete/reuse, new company | Immutable platform source; explicit owned clone, no auto-assignment | Browser + domain | PASS | P `starter-templates.spec.ts`; U `starter-templates.test.ts` | — |
| Appearance/source | Stable accents, explicit owned provenance, snapshots after edit/delete | No name inference or status-color conflation | Browser + domain/component | PASS | P `template-colors.spec.ts`, `company-documents-ui.spec.ts`; U `template-accents.test.tsx` | — |
| Dashboard | Three-domain counts, active/inactive sums, five-item previews/order/navigation | Reuse dedicated projections; current versions only | Browser + domain/component | PASS | P `dashboard.spec.ts`, `dashboard-employee-overview.spec.ts`, `dashboard-secondary-navigation.spec.ts`; U `dashboard-workspace.test.ts` | — |
| Greeting | 24 variants/dayparts, Login rotation, no repeat/flash, refresh, blocked storage | Presentation session only; no new authentication | Browser + unit/hydration | PASS | P `dashboard-greetings.spec.ts`; U `dashboard-greeting.test.tsx` | — |
| Notifications | Categories/date ranges, attention, required-only missing, activity/audit/export | Owned projections; original IDs/timestamps; seeded sends not actual audit | Browser + domain/component | PASS | P `notifications.spec.ts`, `secondary-management.spec.ts`; U `notifications-workspace.test.ts`, `notifications-domains.test.tsx` | — |
| Notification bell | Six-row preview, full unread total, mark all read, locale/company lifetime | Actual authorized records only; passive attention excluded | Browser + component/domain | PASS | P `notification-bell.spec.ts`, `notification-records.spec.ts`; U `notification-bell.test.tsx` | — |
| Bell domain targets | Vendor, Company current/history/missing, Employee, stale/deleted references | Resolve owned IDs, never arbitrary hrefs | Isolated intercepted records + browser + units | PASS | P `notification-records.spec.ts`; U `notifications-domains.test.tsx` | — |
| Notification generation | Real Company/Employee delivered notices after mutation | No notification/delivery engine exists in E1 | Contract/source review | DEFERRED | Actual activity is not automatically unread notification; §11 | — |
| Global Search | Six groups, normalization/rank/IDs, all current/missing rows, live changes | Scoped authorized sources; history excluded; no new index | Browser + pure/component tests | PASS | P `global-search.spec.ts`, `global-search-domains.spec.ts`; U `global-search*.test.*` | — |
| Search interactions | Keys, focus/close, stale activation, dirty Template navigation | Existing destinations/managers, no access bypass | Browser + component | PASS | P `global-search*.spec.ts`; M A/B/C | — |
| Company Profile | Save/Cancel, validation, dirty guards, Onboarding/Billing identity | One canonical company source, Administrator edits | Browser + domain/component | PASS | P `company-profile.spec.ts`, `billing-interactions.spec.ts`; U company-profile/billing tests | — |
| Members & Access | Invite/role/remove/cancel; last-admin/self/foreign guards | Membership/invitation separate, no delivery claim | Browser + negative operations | PASS | P `company-members.spec.ts`, `secondary-management.spec.ts`; U `company-members.test.ts`, `member-management.test.tsx` | — |
| Plan & Billing | Demo payment metadata, confirmed upgrades, trial/seats, sample CSV | Company-owned safe demo, not real payment/invoice processing | Browser + negative operations | PASS | P `billing-interactions.spec.ts`, `company-billing.spec.ts`; U billing tests | — |
| Global profile | Save/Cancel/dirty state, locale, identity propagation, preferences | User-global; historical actor snapshots unchanged | Browser + units | PASS | P `my-profile-invitations.spec.ts`, `company-switch-navigation.spec.ts`; U `user-profile.test.tsx` | — |
| My Companies/Invitations | Create/switch, accept/reject/expire/cancel, global route retention | No automatic activation on invitation acceptance; no Demo copying | Browser + units | PASS | P `companies.spec.ts`, `my-profile-invitations.spec.ts`, `company-workspace.spec.ts`; U received-invitation/company tests | — |
| Workspace navigation | Root breadcrumbs, active sidebar, disclosures, company redirects | Dashboard-root workspace; global Profile root preserved | Browser + component | PASS | P `authenticated-navigation.spec.ts`, `company-switch-navigation.spec.ts`; U sidebar/breadcrumb/navigation tests | — |
| Empty/recovery states | Blank company, domain-only populations, no matches/notices/activity, stale files/targets | Truthful empty/error/unavailable state, no fabricated data | Browser + domain | PASS | P `company-workspace.spec.ts`, Dashboard/search/file suites; U malformed/ownership tests | — |
| Loading/retry | Remote retries or worker recovery | No remote operations in current synchronous E1 stores | Contract/source assessment | NOT APPLICABLE | Real API/worker recovery deferred to E2 | — |
| Session persistence | SPA/module/locale/A→B→A; full reload reset | Browser-local domain state; greeting is a separate exception | Browser + units | PASS | P `company-workspace.spec.ts`, `company-switch-navigation.spec.ts`, `document-management.spec.ts`; U session tests | — |
| Legacy session E2E | Four ISU navigation scenarios through Templates | Current `Șabloane / Templates` label | Existing production tests | FAIL | P `document-session-navigation.spec.ts:23`; §8 F002 | F002 |
| Development preview | Dev-only route vs production restriction | Dev renders, production RO/EN 404 | Existing dev test + production HTTP | PASS | D, H; `src/lib/development.ts` | — |
| Real service security | Auth, server tenancy, storage, external recipient access | Future server-enforced boundaries | No such service provisioned | DEFERRED | ADR/security contracts; §10–11 | — |

## 6. Functional Journey Results

### A — Vendor (PASS for client workflow; direct-entry exception F001)

An uninterrupted additional RO browser probe created `Audit Vendor` with a construction category, created/applied one owned Vendor template, uploaded an actual synthetic PNG and confirmed it in the existing Review. Observed transitions: zero requirements **Compliant** → required Missing **Noncompliant** → approved distant-expiry file **Compliant**. Internal replacement with expiry `01.10.2026` immediately became current/Expired without another review and produced **Noncompliant**. Dashboard showed the vendor, Notifications Audit showed actual actions, and Global Search opened the current replacement. Existing RO/EN browser suites additionally cover rejection/re-upload, idempotence, contacts/notes and exact history downloads.

Evidence: `combined-journeys.log/json`; P `company-workspace.spec.ts:48`, `vendor-template-assignment.spec.ts`, `document-review-lifecycle.spec.ts`, `document-management.spec.ts`, `global-search.spec.ts`.

### B — Company Document (PASS for local lifecycle/preparation; activity generation deferred)

The additional combined probe created/applied a Company template, uploaded a bound file, confirmed it, replaced it with a new file/near expiry and confirmed the replacement. Its row projected Expiring Soon; selection opened the existing Share drawer and prepared a real attached-file **local preview**, not an external share. Dashboard current Company Document total became 6 (from 5), and Global Search opened the replacement. Existing RO/EN tests assert snapshots, all review outcomes, KPIs, stale selections, no-file warnings, exact history bytes, and Notifications attention contexts. Company lifecycle has no recorder; no new actual audit event or unread notice is inferred from these operations.

Evidence: `combined-journeys.json`, `company-journey-share.png`; P `company-document-management.spec.ts:53`, `company-document-sharing.spec.ts`, `notifications.spec.ts`, `global-search-domains.spec.ts`.

### C — Employee (PASS, additional uninterrupted RO and EN probes)

Created an Employee with a valid email, free-text job title and hire date; created/applied an Employee tax-document template. Upload with `15.10.2026` expiry immediately projected Expiring Soon without Confirm/Reject. Download returned the exact 68 uploaded bytes. Replacement through `31.12.2027` immediately projected Valid and retained two versions. Employee event sequence was exactly `employee_created`, `template_applied`, `document_upload`, `document_replaced`; Dashboard/Notifications/Search were visited in the same session. Searching the replacement filename returned one owned result. Reminder resolved the correct recipient; unavailable Send Email exposed the localized keyboard tooltip, and close created no additional event. Existing browser tests separately cover atomic department creation/reuse, inactive status, reminder validation/draft cleanup, and legacy review history.

Evidence: `journey-audit.log`, `browser-audit.json`, `ro/en-employee-journey.png`, `ro/en-employee-reminder.png`; P `employees.spec.ts`, `employee-documents.spec.ts`.

### D — Multi-company (PASS)

Existing RO/EN tests create a new empty company, create Vendor/template/document data, switch away, reject foreign operations and switch back without losing owned records/files. Additional combined probe switched Demo → Global Clean → Demo, confirmed no Company-file search result in the other workspace, then downloaded the same exact replacement bytes after return. Global Profile routes retain page drafts instead of forcing Dashboard. Company-scoped switches clear transient overlays and enter the target Dashboard.

Evidence: P `company-workspace.spec.ts`, `company-switch-navigation.spec.ts`, `company-document-management.spec.ts`, `employee-documents.spec.ts`; M `combined-journeys.json`.

### E — Language (PASS for tested retention contracts)

Existing tests exercise RO/EN labels, statuses, dates and locale-aware destinations, shared record identities, dirty-profile/template protection and greeting persistence. Additional combined probe used RO → EN → RO after company return and recovered the exact Company replacement file. Search's temporary query intentionally clears on locale change; domain records do not reset. This does not assert that every disposable form draft persists across every locale switch.

### F — Expiration (PASS)

Additional Vendor and Employee probes exercised dates around the fixed E1 clock; Company replacement exercised near expiry. Existing tests cover exact day/warning boundaries, missing optional requirements, manual-expiry overrides, retained history, Company reconfirmation, Employee immediate no-review updates, and current-only counts/attention/search. No clock manipulation or real expiration worker was introduced. Evidence: M A/B/C; U `vendor-compliance.test.ts`, `employee-documents.test.ts`, `manual-document-expiry.test.ts`; P `fixture-consistency.spec.ts`, `manual-document-expiry.spec.ts`, `employee-documents.spec.ts`.

## 7. Cross-Feature Consistency Results

| Shared fact / distinction | Result and evidence |
| --- | --- |
| Initial Vendor population | 24 total; 23 Compliant / 1 Attention / 0 Noncompliant. Current Vendor files: 25 = 4 Needs Review + 15 Valid + 4 Expiring Soon + 2 Expired. P fixture consistency + U vendor projection. Unconfigured vendors being Compliant despite unrelated expired files is **intentional**, not a discrepancy. |
| Initial Company Documents | Five current files, six logical rows including required Missing; Attention 4 = required Missing + Expired + Needs Review + Expiring Soon. Active Shares 0. Dashboard and listing agree; fresh screenshots plus U/P projections. |
| Initial Employees | 8 total = 7 active + 1 inactive; active tracking = 0 Complete + 0 Attention + 7 Not Configured. Inactive documents remain retained, not rolled into active tracking. U/P Dashboard/Employee tests and inspected screenshots. |
| Vendor compliance vs file ratio | Severity Noncompliant → Attention → Compliant comes only from configured requirements/current references. Optional Missing does not make Noncompliant; zero configuration is Compliant. U `vendor-compliance.test.ts`, M A/F. |
| Employee tracking vs document status | Zero configuration is Not Configured, not Vendor Compliant. Required Missing/Expired/Expiring produces Attention. Employee files have no effective Needs Review status. U/P Employee lifecycle and legacy tests; M C. |
| Current vs historical versions | Old/rejected/superseded files retain exact history bytes but do not duplicate current lists, requirement completion, KPIs, expiry previews or search. U version/projection tests; P management/review/search suites. |
| Template edits vs assigned snapshots | Editing/deleting a source never silently updates assigned rules or erases uploaded evidence. Vendor/Employee identity merging and Company's source-rule pair behavior remain distinct approved contracts. U/P template/assignment tests. |
| Activity identity and time | Dashboard first-five and Notifications Activity/Audit reuse namespaced actual event identities/order. Latest authorized recorded timestamp advances activity filters only; fixed-clock expiry unchanged. U `notifications-workspace.test.ts`, `dashboard-workspace.test.ts`; P Notifications/Employee suites. |
| Bell vs attention vs activity | Full authorized actual-record unread count, not preview length or passive attention. Seeded reminder delivery examples remain demo notices only, excluded from actual audit/export/timelines. U/P bell/notification-record tests. |
| Personnel authorization | Reviewer/Viewer retain basic Employee directory profiles but not private document rows, inferred counts, search groups, events, files or audit export metadata. Negative operation + projection/component/browser tests, not just visibility inspection. |
| Source accent vs status | Owned explicit template provenance determines grouping accent; current lifecycle determines status. Missing/unresolved source is not fabricated Manual. U/P accent/source tests. |
| Cross-domain notification coverage | Actual Company/Employee records navigate correctly when supplied through the existing isolated test mechanism. Their automatic production generation/delivery is not implemented and is not claimed as PASS. |

## 8. Confirmed Findings

### E1C-008A-F001 — Make document drawer deep links server-render safely

- **Area:** Vendor Documents and Vendor Details document Details/History entry.
- **Category:** Navigation; technical root cause routed to **E1C-008C**.
- **Priority / severity / status:** **P1 / Medium / Confirmed**. Existing documented defect, not newly introduced by E1C-007C.
- **Preconditions:** Existing production build; a seeded accessible current document such as `construct-pro-fire-2024`. No temporary data or unavailable backend needed.
- **Reproduction:**
  1. Start the existing production build.
  2. Request `/documents` directly: HTTP 200.
  3. Request `/documents?document=construct-pro-fire-2024` directly.
  4. Repeat with `&documentAction=history`, with `/vendors/construct-pro?document=construct-pro-fire-2024`, and with each `/en/...` equivalent.
  5. Inspect the response status and production server output independently of client recovery.
- **Actual:** All six drawer-entry requests returned **500**. Log: `ReferenceError: document is not defined`. Existing browser tests can still reach/render the client drawer, so their passing DOM assertions do not establish healthy direct HTTP entry.
- **Expected:** Supported owned Details/History URLs should return a healthy page response and resolve the drawer client-side without referencing the browser DOM during SSR. Plain `/documents` returns 200 in both locales; the query must not turn valid navigation into a server failure.
- **Evidence:** H `http-probes.json`; `ro/en-direct-details-response.txt`; production server log. Additional `direct-browser-entry.json` and `ro/en-direct-drawer-500.png` confirm HTTP 500 **and** a visible recovered Details drawer in each locale, with no browser `pageerror`. Source [Drawer.tsx](../../src/components/ui/Drawer.tsx):74–81 calls `createPortal(..., document.body)` during render. [DocumentManagementDrawer.tsx](../../src/features/documents/DocumentManagementDrawer.tsx):26–40 renders from initial query selection; existing [document-management contract](../features/document-management.md#access-and-file-limits) already records this limitation. Both locale-specific direct-entry probe assertions failed independently.
- **Root cause (confirmed):** Portal target evaluated while server-rendering an initially selected drawer. `use client` does not prevent initial server rendering; effects' DOM guards do not protect this render expression.
- **Affected modules:** Shared `src/components/ui/Drawer.tsx`; direct initial-selection consumers in `src/features/documents/DocumentManagementDrawer.tsx` and their existing route composition.
- **Dependencies:** E1C-008C SSR hardening; shared Drawer accessibility/lifecycle regression.
- **Recommended fix:** Minimal hydration-consistent portal readiness/target handling in the shared implementation, preserving the existing open/close contract. Do not redesign drawers, remove query destinations, expose dev routes or duplicate drawer mechanics.
- **Regression risk:** All upload/details/history/reminder/share/template drawers; focus trap/return, inert background, scroll lock, keyboard close, nested menus, Back, query preservation and responsive sizing.
- **Acceptance:** Given a valid owned seeded document URL, when directly loading or refreshing RO/EN Details/History from Documents or Vendor Details, then HTTP is 200, there is no server/hydration error, and the existing drawer/actions render. Given a lost/foreign identity, then the existing safe recovery remains, with no disclosure. Given ordinary client navigation, then current/history bytes and Drawer focus behavior remain unchanged.

### E1C-008A-F002 — Restore current-label session E2E coverage and discovery

- **Area:** Regression test discovery/session-navigation suite, not product sidebar behavior.
- **Category:** Integration (test infrastructure); route to **E1C-008C**.
- **Priority / severity / status:** **P2 / Low / Confirmed**.
- **Preconditions:** Current correct `Șabloane / Templates` terminology; production server.
- **Reproduction:**
  1. Run `PLAYWRIGHT_BASE_URL=http://localhost:15079 npx playwright test e2e/document-session-navigation.spec.ts` (or the all-spec production audit command).
  2. Let the RO/EN, 1448/375px scenarios reach the Templates navigation step.
  3. Inspect the failed locator and actual sidebar snapshot.
  4. Compare the package `e2e` script's explicit list with the spec-file inventory.
- **Actual:** All four scenarios time out at the superseded `^Cerințe(?: \\d+)?$` / `^Requirements(?: \\d+)?$` link lookup. Snapshots contain working `Șabloane / Templates` links to `/requirements`. `package.json` omits `document-session-navigation.spec.ts`, `login.spec.ts` and `manual-document-expiry.spec.ts` from the normal E2E command; the audit's wider discovery exposed the drift. Login and manual-expiry passed when discovered here.
- **Expected:** Regression tests must follow approved current template terminology while retaining their lifecycle assertions. The intended normal validation entry point must account for all functional suites, separating development-only checks explicitly.
- **Evidence:** P `production-results.json` four unexpected results; all four `document-session-navigatio-*/error-context.md` and traces. [Test source](../../e2e/document-session-navigation.spec.ts):29–31 and 87–88 retains old labels. [package.json](../../package.json) explicit `e2e` list excludes the three files. [Templates terminology contract](../features/requirements.md) and passing `requirements.spec.ts:6` establish that the application label is correct.
- **Root cause (confirmed):** Stale hardcoded test labels after terminology normalization, compounded by a manually enumerated default test list that excludes the stale suite. This is deterministic, not a timing flake or failed application data persistence.
- **Affected modules:** `e2e/document-session-navigation.spec.ts`, `package.json` E2E entry point; existing Playwright development/production separation.
- **Dependencies:** None for correcting test expectations; coordinate any discovery change with the dev-only preview boundary and F001's direct-response assertions.
- **Recommended fix:** Reuse approved catalog/current labels for this suite without weakening persistence/history/download assertions. Make intended full functional discovery explicit and retain a separate dev-preview invocation. Do not rename the app back to Requirements or suppress this suite.
- **Regression risk:** Omitting critical cases, accidentally running dev-only preview against production, or reporting a filtered green run as full coverage.
- **Acceptance:** Given the current sidebar, when all four original session scenarios run, then each completes all existing assertions with current labels. Given the normal documented E2E entry point, when invoked, then Login/manual-expiry/session suites are included or explicitly and durably accounted for; production still returns 404 for the preview.

## 9. Suspected / Not Verified Findings

No additional defect is promoted to Confirmed from source suspicion alone. No unresolved product decision is required to reproduce F001/F002.

- **NOT VERIFIED:** Unsupported invalid-email Employee Details. The existing strict directory validator prevents that record from being reached through supported UI; the defensive reminder warning has component coverage only. Expanding legacy reads would change a contract and is not an audit fix.
- **NOT VERIFIED:** Every-file delivery for large automatic multi-download batches under every browser policy. Existing documentation records Chromium's eleven-file/ten-download limitation; this run verifies two exact bulk downloads and all-selection eligibility, not a newly approved archive/delivery mechanism. Carry this boundary to E1C-008C/browser hardening, not a speculative new E1 feature ticket.
- **NOT VERIFIED:** Unreached tail assertions in the four failed session-navigation cases. Other passing management/session/isolation tests cover overlapping behaviors, but do not retroactively make these four cases PASS.
- **NOT VERIFIED:** Browser-engine/device combinations beyond executed Chromium and viewport emulation. No claim of Safari/Firefox, assistive-technology certification or real-device coverage.

## 10. Security & Permission Findings

No confirmed E1 P0 security/ownership finding. Positive and negative operation coverage executed:

| Boundary | Executed evidence and result |
| --- | --- |
| Active membership/company context | `company-workspace.test.ts`, `company-switch-navigation.spec.ts`, `company-workspace.spec.ts`: inaccessible targets/foreign IDs denied; no Demo fallback or cross-company mutation. PASS within E1. |
| Vendor files/review/mutations | `document-management.test.ts`, `document-version-files.test.ts`, `document-review-lifecycle.test.ts`: Administrator management; Reviewer review; Viewer read; stale/current/foreign/inactive denial. PASS. |
| Company files | `company-document-management.test.ts` negative operation tests at line 142 and browser role test at line 184: writes/review/read separated, exact historical access scoped. PASS. |
| Personnel files/metadata/events | `employee-documents.test.ts`, `employee-document-page.test.tsx`, `global-search-domains.test.tsx`, `notifications-domains.test.tsx` and browser role cases: Administrator checks before private reads/counts/export/destinations, cross-employee/company access denied. PASS. |
| Search/bell stale destinations | `global-search-domains.spec.ts`, `notification-records.spec.ts`: live ID revalidation and owned-domain resolution; forged/stale targets cannot navigate into another owner. PASS. |
| Members/billing mutation safety | Existing domain/browser tests recheck active company/role, last Administrator, self-management, invitation lifecycle, safe payment whitelist and upgrade intent. PASS. |

These are meaningful client-domain regression checks, **not** hostile-client/server authorization tests. E1 session registries and test identities are mutable in the browser by design. Real authentication, endpoint authorization, row-level security, storage isolation, malicious-file scanning, sharing tokens, audit durability, retention, deployment security and independent penetration testing are **DEFERRED**, not successfully verified here. No real credentials or customer documents were used.

## 11. Deferred E2 Capabilities

Not counted as E1 defects:

- Database-backed operational/file persistence and recovery; E1 full-reload/new-tab reset remains accepted.
- Real Clerk authentication, verification/recovery, logout and account-switch lifecycle. Demo Login only rotates a presentation greeting; Logout stays unavailable.
- User-and-company-scoped durable notification read state across refresh, logout/login and devices. E1 read IDs remain tab-memory and reset on full reload.
- Automatic/real Company or Employee notification issuance, real invitation/reminder delivery and background scheduling. Actual Employee/Vendor operations remain activity, not fabricated unread notices.
- Company Document lifecycle audit recording and durable immutable audit/event storage. Existing documented absence is not backfilled from document metadata. Explicitly supplied authorized Company notification/event records remain supported by the read side.
- External Company sharing links/email, secure tokens/passwords, server expiry/revocation and recipient download authorization. Local preview is not a live share; Active Shares remains zero.
- AI/OCR, arbitrary file parsing, authoritative verification, malware scanning, durable private object storage and production file validation.
- Real payments, official invoice processing, subscription/seat entitlement enforcement and commercial pricing approval; current downloads are marked sample CSVs.
- Reports is explicitly post-MVP/Coming Soon, with no working destination promised. Public Help/legal/resource content and forgot-password destinations remain existing documented product/service decisions, not invented pages.

Existing Landing/portal marketing/security/service claims are documented demo/unverified copy and need product/service-readiness review before public launch. This audit did not add claims or observe reminder/share/payment controls falsely reporting actual delivery/processing.

## 12. Prioritized Remediation Backlog

### P0 — Must Fix Before E1 Closure

None confirmed. Do not infer production readiness from that count.

### P1 — Should Fix Before E1 Closure

| Finding | Implementation-ready story | Severity / size | Dependencies / sequence | Files / acceptance / required regression |
| --- | --- | --- | --- | --- |
| F001 | Make shared document drawer entry SSR-safe | Medium / S | First application correction; E1C-008C owns shared SSR hardening | `Drawer.tsx`, existing initial-selection consumers if necessary. Given RO/EN valid Details/History URLs, direct load/refresh returns 200 without DOM/hydration error. Retain safe foreign/lost recovery. Add response-status coverage; rerun all Drawer focus/scroll/Back/file/current-history and desktop/mobile suites. |

### P2 — Optional / Scheduled Improvement

| Finding | Implementation-ready story | Severity / size | Dependencies / sequence | Files / acceptance / required regression |
| --- | --- | --- | --- | --- |
| F002 | Repair session-navigation expectations and full-suite discovery | Low / S | E1C-008C test hardening; can precede F001, required before final clean regression sign-off | `document-session-navigation.spec.ts`, package E2E entry point/documented invocation. Four original cases complete with current catalog labels, no weakened assertions; all functional suites accounted for. Rerun 519 production-compatible tests and dev preview separately; retain production 404 restriction. |

No implementation ticket is created for unsupported setup, known E2 delivery gaps or cosmetic spacing. This is a compact confirmed backlog for E1C-008D to consolidate, not authorization to implement it.

## 13. Coverage Gaps

- Four existing session-navigation cases fail before their full tails; failures preserved, not skipped or counted green. Deterministic stale labels, not observed flaky tests.
- Unsupported malformed Employee-email records cannot enter Details via current contracts; defensive warning is unit/component tested only.
- Cross-browser/device/assistive-technology validation, full input/state Cartesian coverage, large-download browser-policy recovery and real external service failures were not executed.
- Real user/company auth/storage/export/sharing authorization cannot be validated without E2 infrastructure. Client-domain permission coverage is not a replacement.
- Company lifecycle mutation recording and automatic Company/Employee notifications do not exist; only explicitly supplied actual-record read/navigation behavior is tested. No history or passive-attention notification was fabricated.
- Responsive interaction was exercised by existing suites at 1920/1448/1280/1024/768/375/320 and additional intermediate/short viewports. Additional fresh audit captures cover 1448/375, plus combined-journey drawers. Not every screen/state/width combination was manually inspected.
- Existing technical/feature documents include older historical implementation wording; current specific feature decisions were used rather than treating superseded mockup/example counts as requirements. Detailed documentation/performance/architecture drift belongs to E1C-008C.

## 14. Recommendations

1. Preserve domain/ownership contracts; no compliance, review, notification or template rewrite is indicated by this audit.
2. Correct F002's validation drift without altering product terminology, then reproduce/resolve F001 in the shared portal boundary. Run response-status checks independently of browser client recovery.
3. Build order remains contract/data correctness → security/ownership → domain logic → integration → navigation/UI → regression. No confirmed contract/data/security/domain fix was found, so the actionable work starts at the shared navigation/SSR boundary and regression discovery.
4. E1C-008B: use preserved mockups and approved overrides for the dedicated UI/UX audit; inspect compact actions, keyboard states and grouping without conflating domain statuses or demo metrics. No cosmetic defect is escalated here.
5. E1C-008C: own F001/F002; separately examine large-browser-download policy, portal SSR/hydration, test entry-point completeness and the documented production security boundaries. Keep the design preview unavailable in production.
6. E1C-008D: consolidate these two traceable findings with B/C results, preserve the deferred-E2 list and require new evidence before promoting suspected issues. Avoid speculative tickets for intentionally absent services.

## 15. E1C-008A Sign-Off Assessment

**Audit report complete; application closure conditional.** Major domains, accepted status/current-version rules, role/company isolation and cross-feature journeys were assessed using source/contracts, executed tests and actual browsers. The report preserves contrary evidence: 515/519 production tests passed, four stale-label cases failed, and six direct drawer requests returned 500. These are not an all-green application sign-off.

Documentation-only delivery validation passed: all 15 report sections and the traceable backlog exist; every confirmed finding has reproduction/source/runtime evidence; local Markdown links resolve; E2 limitations and unsupported checks are separate; no application or existing test file changed; the six unrelated canonical mockup hashes are unchanged. New-file whitespace checking and `git diff --check` pass, and final scope/status inspection permits only this report in the documentation commit. The task-owned production server was stopped; the existing development server/user workspace was retained. Committing this audit records failed checks as findings, not successful application validation. No fixes, amend or push are part of this task.
