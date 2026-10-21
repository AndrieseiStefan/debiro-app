# E1C-008B — UI/UX Consistency Audit

## 1. Executive Summary

Audit date: **22 October 2026, Europe/Bucharest**. Application baseline: `74c47ade08daf7f872fe355ee3ebaa4e86b11bc8`; repository baseline: `686eb6ca58ee297d359552ed6b78f7fdc21ce79b` (E1C-008A report). This is a documentation-only audit, not a redesign or remediation implementation.

The implemented application has a recognizable, largely consistent design language. Authenticated page introductions, directory tables, document tables, form fields, source badges, file actions and navigation already share substantial infrastructure. The Vendor/Company/Employee differences are mostly justified by their different workflows, permissions and later approved decisions. Replacing them with one identical screen would remove useful distinctions.

Four new, evidence-backed issues were confirmed:

| Priority | Count | Findings |
| --- | ---: | --- |
| P0 | 0 | No critical UI workflow blocker confirmed in the exercised states. |
| P1 | 1 | **U001:** shared status/placeholder and related small-text contrast. |
| P2 | 3 | **U002:** Company Sharing tooltip behind Drawer; **U003:** Login placeholder/value font mismatch; **U004:** upload validation moves the focused submit action outside a short viewport. |

The existing **E1C-008A-F001** direct-entry SSR failure and **F002** test-discovery/terminology drift remain open, separately owned findings. Passing client-side UI tests does not clear either. They are cross-referenced in section 16, not counted again here.

New execution: **146/146 unit/component tests**, **326/326 targeted production E2E tests**, and **1/1 separate development-only preview test** passed. Browser evidence comprises **646 recorded screenshots**: 280 route/viewport captures, 210 interaction-state captures, 98 supplemental captures, 24 independently opened popovers and 34 edge/keyboard captures. Contact sheets are additional inspection aids, not additional scenarios. These are local review artifacts, not approved visual-regression baselines.

**Assessment:** suitable for the next audit/consolidation stage, with a P1 contrast remediation required before an accessibility-quality sign-off. This report is not full WCAG conformance, pixel-perfect design approval, production authorization validation or E1 closure approval. No application files, existing tests, configuration, dependencies or mockups were changed.

## 2. Scope and Methodology

### Execution and evidence boundaries

1. Read the repository constitution, [E1C-008A](e1c-008a-functional-audit.md), design principles/direction/foundation, feature contracts and relevant existing tests. Inventoried shared primitives before screen review.
2. Inspected the actual contents of all **41 PNG references**, using seven contact sheets and relevant source contracts. Filenames alone were not treated as evidence of a screen's identity.
3. Used the unchanged existing production build (`rMsSznpT_NrkrfsQ1Rtz6`) on isolated audit port `15079`. A's commit changes documentation only; its production build represents the application baseline above. The user's development server and browser session were not reset or stopped. Browser mutations used isolated test contexts and fictional data, not the user's tab-memory workspace.
4. Captured 20 route families in both locales at seven sizes. Inspected desktop/mobile page pairs for every family, seven-width responsive sheets for Landing, Dashboard, Vendor Details, Company Documents, Employee Details and Templates, and selected full-resolution screens. Other width coverage combines recorded screenshots, geometry measurements and existing E2E assertions; it is not a manual pixel review of every PNG.
5. Exercised actual form/menu/drawer states, keyboard activation/focus/close/return, validation, selection, empty results, unavailable records, long employee names and long filenames. Read computed styles and sampled opaque-background text contrast. Confirmed paint order with hit-testing, not just DOM presence.
6. Ran existing tests without editing them. The production runs were explicitly targeted, not advertised as the full repository suite. Typecheck/lint/build and the full functional baseline are attributed to A, not rerun or counted as new B checks.

**Viewport set V7:** `1920×1080`, `1448×900`, `1280×800`, `1024×768`, `768×900`, `375×812`, `320×720`. **State set S4:** 1448/768/375/320 widths, typically 900/812/812/720 heights. Supplementary short-height check: `375×500`. A `640×450` layout was captured as a viewport-equivalent reflow sample, not a claim of actual browser zoom or text-only zoom testing.

Methods used below: **B** = real Chromium browser interaction/capture; **G** = geometry/computed styles; **T** = existing tests newly executed; **S** = source/contract review. A PASS applies only to the named aspect/states. A page with a shared contrast failure is not an overall accessibility PASS.

### Local evidence index

All B evidence is under [`artifacts/visual/e1c-008b/`](../../artifacts/visual/e1c-008b/), ignored by Git. It is intentionally not part of this documentation-only commit. Paths below refer to this local evidence; a separate checkout will need a new capture run.

| Key | Evidence | Purpose |
| --- | --- | --- |
| R | [`render-metrics.json`](../../artifacts/visual/e1c-008b/render-metrics.json), `render-audit.log`, `render-audit.mjs`; `{ro,en}-{page-key}-{width}.png` | 280 route captures; titles, controls, table geometry, sampled contrast and page widths. |
| S | [`state-results.json`](../../artifacts/visual/e1c-008b/state-results.json), `state-audit.log`, `state-audit.mjs`; `{locale}-state-{state}-{width}.png` | 210 drawer/form/tab/menu captures. |
| X | [`extra-results.json`](../../artifacts/visual/e1c-008b/extra-results.json), `extra-audit.log`, `extra-audit.mjs`; `{locale}-extra-{state}-{width}.png` | 98 edit/filter/preview/onboarding/error/typography captures. |
| P | [`popover-results.json`](../../artifacts/visual/e1c-008b/popover-results.json), `popover-captures.mjs`; `{locale}-popover-{profile,bell,company}-{width}.png` | 24 popovers opened independently at each size; focus, bounds, Escape/return. |
| E | [`edge-results.json`](../../artifacts/visual/e1c-008b/edge-results.json), `edge-audit.mjs`; `{locale}-edge-{state}-{width}.png`; [`keyboard-upload.json`](../../artifacts/visual/e1c-008b/keyboard-upload.json) | 32 long-content/public-section captures, two keyboard-invalid-upload captures; production preview 404 checks. |
| U | `ui-unit.log` | 15 unit/component files, 146 passing tests. |
| T1 | `ui-e2e.log`, `ui-e2e.json`, `ui-e2e-results/` | 214 production E2E passes, no skipped/unexpected/flaky results. |
| T2 | `overlay-e2e.log`, `overlay-e2e.json`, `overlay-e2e-results/` | 94 production E2E passes, no skipped/unexpected/flaky results. |
| T3 | `notifications-e2e.log`, `notifications-e2e.json`, `notifications-e2e-results/` | 18 production E2E passes, no skipped/unexpected/flaky results. |
| D | `dev-preview.log`, `dev-preview.json`, `dev-preview-results/` | One development-only preview test passed separately on existing port 3001. |
| M | `reference-inventory.json`, `references-1.png`…`references-7.png`, `mockup-sha256.txt` | Reference inspection and original-file preservation inventory. |

The successful final probe records contain no probe errors. During preparation, two audit locators needed correction: Onboarding step 2 requires explicit selection before Continue; the framework route announcer is also an alert, so the unavailable Employee locator needed main-content scoping. Neither was treated as an application defect. Some popovers intentionally close on responsive remount; P reopens each at its target viewport rather than treating a stale resized capture as an open state.

### New test execution

All production commands used `PLAYWRIGHT_BASE_URL=http://localhost:15079`, JSON/list reporters and output paths in the evidence directory. No failures were hidden, tests weakened, dependencies installed or production routes exposed.

- U: `npm run test -- --maxWorkers=2`, explicitly selecting `components`, `page-header`, `sidebar-navigation`, `tooltip`, `section-action`, `plan-cards`, `company-document-ui`, `employees-page`, `employee-document-page`, `employee-reminder-drawer`, `company-share-drawer`, `global-search-domains`, `notification-bell`, `dashboard-greeting`, `template-accents` test files under `src/test/`: **146 passed**.
- T1: `npx playwright test` selecting `company-documents-ui`, `employees`, `authenticated-page-header`, `authenticated-navigation`, `login`, `landing`, `dashboard-greetings`, `employee-documents`, `global-search-domains`, `notification-bell`, `company-billing`, `billing-interactions`, `profile-dropdown`, `my-profile-invitations`, `companies`, `onboarding`, `requirements`, `supplier-portal` specs under `e2e/`, `--workers=3 --reporter=list,json`: **214 passed**.
- T2: same invocation selecting `company-document-sharing`, `add-vendor`, `add-document`, `invite-vendor`, `company-document-management`, `requirements-preview`, `requirement-scopes`, `template-colors`, `company-members`, `document-management`, `search-filters`, `vendor-details`, `company-document-preview`, `--workers=3`: **94 passed**. This includes full Chromium's real PDF preview checks separately from the default headless shell's supported fallback.
- T3: `notifications.spec.ts` and `notification-records.spec.ts`, `--workers=2`: **18 passed**.
- D: `PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/foundation.spec.ts -g 'development-only primitive preview' --workers=1 --reporter=list,json`: **1 passed**. Production `/__dev/design-system` and `/en/__dev/design-system`: **404**, independently checked in E.
- Final documentation checks: report structure/links/evidence/backlog traceability, `git diff --check`, mockup hashes, tracked-diff scope and Git status. Only this report is staged for the task commit.

## 3. Design Sources and Approved Overrides

Primary authority: [AGENTS.md](../../AGENTS.md), [design principles](../design/design-principles.md), [visual direction](../design/visual-direction.md), [UI foundation](../design/ui-foundation.md), current feature contracts and A. Existing feature documentation takes precedence over superseded foundation descriptions, such as the early visual-only global search.

| Screen family | Actual reference inspected | Current approved interpretation |
| --- | --- | --- |
| Landing | `01-landing-page.png` | Later full-viewport presentation, three groups/two flexible gaps, Trust bottom padding, dark viewport-aware Pricing, shared PlanCards and compact Resources override old single-screen composition; [Landing contract](../features/landing-page.md). |
| Onboarding/Login | `02-onboarding.png`, `12-onboarding-step2.png`, `13-onboarding-step3.png`, `14-login.png` | Shared centered 1350px border-box pre-auth container; 32/24/16px gutters; 40px fields/46px CTA; explicit optional-step semantics. Login's original full-bleed scale is superseded; [Login](../features/login.md), [Onboarding](../features/onboarding.md). |
| Dashboard | `03-dashboard-overview.png`, `dashboard-redesign.png` | Latest three-domain overview, Employee tracking statuses, no Add Vendor CTA, personalized greeting reservation; [Dashboard](../features/dashboard.md). Old four-vendor-card illustration is not the current contract. |
| Vendor directory/details | `04-vendors-list.png`, `05-vendor-details.png`, `25-vendor-details-contacts-activity-notes.png` | Actionable rows, lifecycle/edit, shared page header, current contacts/activity/notes and source display; [Vendors](../features/vendors.md), [Details](../features/vendor-details.md). |
| Templates | `06-document-requirements.png`, `23A-Add-suggested-document-to-template.png`, `23B-Add-personalized-document-to-template.png`, `previzualizare-cerinte.png` | Current `Șabloane / Templates`; vendor category only, two editor tabs, scoped Company/Employee extensions, atomic edits, appearance/source identity; no removed applicability tab or source-section eyebrow; [Templates](../features/requirements.md). |
| Vendor assignment/invite | `24-vendor-requirement-template-assignment.png`, `07-invite-vendor.png` | Vendor multi-template union/confirmation and contact-backed invitation preview retained; no real delivery; [Vendor requirements](../features/vendor-requirements.md), [Invite](../features/invite-vendor.md). |
| Upload/review/documents | `08-supplier-upload-portal.png`, `supplier-upload-portal-new.png`, `09-document-review.png`, `11-documents.png`, `16-add-document.png` | Updated centered portal, responsive viewer/back row, metadata grid, preserved fixture extraction/no real OCR; [Portal](../features/supplier-upload-portal.md), [Review](../features/document-review.md), [Documents](../features/documents.md), [Upload](../features/add-document.md). |
| Details/history/file actions | `29-document-actions-and-details-entrypoints.png`, `document-details.png` | Current/historical versions, no document delete, exact-byte real-file viewer/download, grouped actions and 8px file-card spacing supersede older action placement; [Management](../features/document-management.md). |
| Company Documents/Share | `company-documents.png`, `company-documents-share-drawer.png` | Dashboard breadcrumb root, current Source column, one bulk toolbar, standalone upload simplification, selected unattached warnings and local-only share preview; [Company Documents](../features/company-documents.md). |
| Employees | `employee-create-drawer.png`, `employee-details.png`, `employees-list.png` | **Contents are reversed relative to the last two names:** `employee-details.png` shows the directory; `employees-list.png` shows Details. Current Vendor-like directory, free job title/optional department, Details-only bulk actions, no-review document policy and email composer override earlier details; [Employees](../features/employees.md). |
| Notifications/bell | `10-audit-activity.png`, `17-bell-notification-center.png` | No redundant eyebrow; actual multi-domain activity vs separate notification records, explicit demo notice, existing reload/read boundary; [Notifications](../features/notifications-audit.md). |
| Company settings | `18-company-settings-access-members.png`, `19-company-settings-plans-pay.png`, `30-company-settings-profile.png`, `e1-032bd-plan-upgrade.png` | Local member/billing interactions, sample invoice download, reusable plan modal/cards, stable standard Settings trigger; [Members](../features/company-members-access.md), [Billing](../features/company-plan-billing.md), [Profile](../features/company-profile.md). |
| Global user/company controls | `20-profile-dropdown-menu.png`, `21-Profile-my-companies.png`, `22-change-company-popup.png`, `32a-my-profile.png`, `32a-my-invitations.png` | Circular profile trigger/attached chevron, anchored clamped switcher, explicit global Profile breadcrumb root, active company identity under Company; [Profile menu](../features/profile-dropdown.md), [My Companies](../features/my-companies.md), [User pages](../features/my-profile-invitations.md). |
| Global Search | `e1-032bf-global-search.png` | Current six groups and authorized current-only results, no fabricated View All page, explicit domain/owner context; [Search](../features/global-search.md). |

Mockup sample names/dates/counts are not locked data. The plain uppercase DEBIRO text is preserved. Inter is the documented provisional font, not proof of a font-family defect. Reflow, semantic accessibility and approved later workflows justify bounded deviations; none of the findings recommends redesigning a canonical experience.

## 4. UI Component Inventory

Inventory completed before reviewing the routes. Paths are existing implementations, not proposed new components. **Reuse** means preserve/extend these implementations, not replace them with a new design system.

| Family | Existing implementation | Use/variant assessment |
| --- | --- | --- |
| Page headers/primary action | `components/layout/AuthenticatedPageHeader.tsx` | Context/title/subtitle/description/support/actions; 42/34px title, page-primary Button wrapper. Greeting `reserveCopy` is intentional. |
| Breadcrumbs | `AuthenticatedBreadcrumbs.tsx` and CSS | Default Dashboard root, valid locale-aware links, non-link group/current items; explicit Profile root for global routes. |
| Shell/sidebar/groups | `AuthenticatedAppShell`, `AppShell`, `AppSidebar`, `SidebarNavigationItem` | Route-derived active state and independent disclosures; compact horizontal navigation is an approved pattern, not an absent hamburger. |
| Header/utilities | `AppTopBar`, `AppUtilities`, `PublicHeader` | Shared shell placement, locale/bell/avatar; public header has different configured marketing/help actions. |
| Containers | `PageContainer`, `PublicContainer`, `PortalContainer`, `Containers.module.css` | Shared public/portal max-width; authenticated workspace intentionally fluid. No second Login geometry needed. |
| KPI cards/charts | `features/dashboard/SummaryMetricCard.tsx`, `DashboardStatusChart.tsx`, `ui/DocumentSummary.module.css` | Dashboard composition, count-only directory variant and document-summary variant serve different information density. |
| Buttons | `ui/Button.tsx`, CSS; PagePrimaryAction wrapper | Primary/secondary/ghost/destructive, compact/table/icon/loading/disabled; reuse existing sizes, not one global forced height. |
| Text input/field | `ui/Field.tsx`, `Field.module.css`, global placeholder tokens | Label/helper/error/required/read-only and compact 42px/14px treatment; U001/U003 affect presentation, not validation. |
| Select | `ui/SelectField.tsx`, same Field CSS | Same border/radius/padding/size and muted empty state; selected value restores normal ink. Native options preserved. |
| Textarea | `ui/TextareaField.tsx`, Field textarea variant; Invite textarea/counter pattern | Company Sharing and Reminder reuse existing field geometry; multiline height is intentionally not a one-line input height. |
| Search input | `ui/SearchInput.tsx`, CSS | Shared search identity; Global Search adds specialized combobox/panel semantics. U001 applies to placeholder ink. |
| Autocomplete/combobox | Employee job-title/department controls in `features/employees/EmployeeDrawer.tsx`; Global Search | Domain-specific free text + suggestions/create-department vs navigable results. Do not replace with a restrictive Select. |
| Dates | Existing `DD.MM.YYYY` Field/parser and native select pairs in payment editor | No separate date-picker component found. Different semantic date policies are not a visual defect. |
| Checkbox/switch | Native checkbox; `ui/Switch.tsx` | Switch has invisible native input, visible track and focus ring; row checkbox allows native keyboard behavior. Not every control must be 44px to meet WCAG AA. |
| Tables | `ui/DataTable.module.css`; Vendor directory CSS reused by Employees | Shared presentation, not a universal table React abstraction. Document/selection/identity columns stay domain-specific. |
| Filters | `ui/FilterPanel.tsx`, `FilterTrigger.tsx`, shared SearchInput | Reset/close, current control styling; Company/Employee inline controls plus panel are a PO simplification opportunity, not a confirmed bug. |
| Pagination | `ui/Pagination.tsx`, CSS | Directory/document opt-in presentations, locale counts/page size; no Dashboard preview pagination. |
| Status badges | `ui/StatusBadge.tsx`, CSS | Pure visual tone + document/compact/source/template sizes; domain status mapping remains outside primitive. U001 is foreground contrast, not a new status model. |
| Source identity/tints | `features/requirements/TemplateSources.tsx`, `template-accents.ts`, CSS | Source labels/applied chips and stable template accent palette; provenance must not become compliance color. |
| Role badges | `features/company-settings/RoleVisual.tsx` | Existing role icon/tone treatment reused in member, profile and company contexts. Job titles remain separate. |
| Avatar | `ui/Avatar.tsx`, profile trigger CSS | Identity initials reused; compact circular header trigger is not a Company switch control. |
| Drawer/header | `ui/Drawer.tsx`, `DrawerHeader`, CSS | Standard 502px, wide 804px Details, mobile fill, focus/inert/scroll/close lifecycle. Employee form's established wider presentation is intentional. A-F001 is a separate SSR issue. |
| Modal/confirmation | `ui/Modal.tsx`, `ConfirmationDialog.tsx` | Existing centered overlay and nested alertdialog; plan confirmation/dirty cancellation must not be removed as redundant steps. |
| Tooltip/unavailable | `ui/Tooltip.tsx`, CSS | Focusable trigger, pointer/focus explanation, right/fallback placement, existing `layer="drawer"`; Company Share omits this opt-in (U002). |
| Row actions | `ui/RowActionMenu.tsx`, CSS | Portaled contextual menus, keyboard/close behavior; native name links remain the main navigation target. |
| Profile/company/bell popovers | Feature-specific ProfileDropdown/NotificationBell and layout CompanySwitcher | Reuse existing anchored implementations. Their content and dismissal differ legitimately; no evidence justifies a generic replacement. |
| Tabs/segmented choices | Vendor/Employee Details, Requirements and shared supplier requirements presentation; AddRequirementDocument source choices | Existing localized tabs use keyboard navigation; source/delivery buttons use pressed-state semantics. Avoid conflating a selection group with navigation tabs. |
| File card/actions/history | `features/documents/DocumentManagementViews.tsx` | Shared DocumentFileCard and DocumentVersionHistory, View File before Download, `--space-2` gap; owner-specific handlers retained. |
| Dropzone/file viewer | `DocumentFileDropzone.tsx`, `DocumentFilePreview.tsx` | Native file picker + localized type/size errors, real PDF/raster bytes or truthful unavailable fallback. No screenshot/mockup as UI. |
| Inline notices/errors | Field helpers/errors, `ui/ErrorState.tsx`, `StateContainers.module.css`, existing feature notice styles | Local notices reuse existing patterns; field errors are associated and announced. U004 concerns focus recovery, not missing error copy. |
| Empty/loading | `ui/EmptyState.tsx`, `LoadingBlock.tsx`, shared StateContainers | Existing empty/no-results and retry/back patterns; local stores do not justify artificial async spinners or fake retries. LoadingBlock has a status label. |
| Disclosure actions | `ui/SectionAction.tsx` | Shared View all/Show less text, chevrons and `aria-expanded`; Dashboard navigation remains a link instead of pretending to expand. |
| Plans/appearance/icons | `features/company-settings/PlanCards.tsx`; Requirements AppearancePicker; `layout/AppIcon.tsx` | Shared pricing/upgrade cards and meaningful appearance controls. Existing icon system/brand must be preserved. |

All paths above are relative to `src/`. Root-cause classification used below: **A** shared component used incorrectly; **B** page CSS override; **C** duplicated local implementation; **D** outdated token; **E** legitimate domain difference; **F** missing interaction pattern. A repeated structure alone is not automatically C or a reason for a new abstraction.

## 5. Page Coverage Matrix

Every row below includes RO and EN. **V7 captures/G** means every required width was rendered, recorded and measured; manual visual inspection covered desktop/mobile pairs for every family and the representative seven-width sets named in section 2. This is not a blanket claim of testing every possible state at every size. Evidence keys refer to section 2; state names map exactly to artifact names.

| Page/route family | Reference | Viewports and states checked | Method | Result and evidence |
| --- | --- | --- | --- | --- |
| Landing `/`, `/en` | 01 + current Landing contract | V7; hero/benefits/trust, pricing/resources S4, native anchors, account links, reduced motion, short/reflow | B/G/T1/S | Layout/navigation PASS; small placeholder/status text elsewhere is not a Landing redesign request. R `landing`; E `pricing/resources`; T1. Marketing illustration contrast not counted as functional text in U001. |
| Login `/login` | 14 + scale overrides | V7; empty/typed/focus, disabled/valid CTA, password toggle, validation/demo entry | B/G/T1/S | Behavior/containment PASS; **U001/U003 FAIL** for text presentation. R `login`; X `login-empty/login-value`. |
| Onboarding steps 1–3 `/onboarding` | 02/12/13 | Step 1 V7; steps 2/3 S4, explicit template selection, optional empty vendors, Back/validation/final action | B/G/T1/S | Exercised semantics/containment PASS. R `onboarding`; X `onboarding-step-2/3`; T1. Small-text color sampling is not exhaustive on decorative gradients. |
| Dashboard `/dashboard` | Current dashboard-redesign | V7; three domains, resolved greeting/refresh, links, actual activity, empty Employee tracking | B/G/T1/S | Layout/semantics PASS; **U001 FAIL** on operational small-text tones. R `dashboard`, responsive-2; T1. |
| Vendors `/vendors` | 04/15 | V7; Add/invalid/focus, Edit S4, counts, filters, sorting/rows/navigation | B/G/T1/T2/S | Directory reuse PASS; **U001 FAIL**. R `vendors`; S `vendor-add/validation/input-focus`; X `vendor-edit`; T1/T2. |
| Vendor Details `/vendors/construct-pro` | 05/25/24 | V7; Documents, Contacts/Activity/Notes at desktop, responsive header, invite/upload/template picker S4 | B/G/T2/S | Layout and existing domain differences PASS; **U001 FAIL**. R `vendor`, S `vendor-tab-1/2/3`, `vendor-invite/upload/template-picker`. Direct drawer entry: existing A-F001. |
| Vendor Documents `/documents` | 11 | V7; filtered result/no-results, sorting/pagination, Details/History/menu lifecycle | B/G/T2/S | Dense table variant intentional; **U001 FAIL**. R `documents`; T2 `document-management/search-filters`. Existing A-F001 not cleared by recovered browser UI. |
| Document Review `/documents/construct-pro-tax-2024/review` | 09 | V7 default, viewer/review controls; existing management/upload regressions | B/G/T2/S | Rendered layout PASS; no new Review-specific defect. R `review`. Full lifecycle/security assertions are A baseline, not newly complete B coverage. |
| Templates `/requirements` | 06/23A/23B/preview | V7; Vendor/Company/Employee scope, new/edit/preview, appearance, suggested/custom document drawer S4 | B/G/T1/T2/S | Existing two-tab/applicability/atomic-edit behavior PASS; **U001 FAIL** for shared placeholder/small text. R `templates`; S `template-document-*`, `template-new-employee`; X `template-preview/appearance`; T2. |
| Notifications `/notifications` | 10 | V7; date/category, independent disclosures, attention/current state, actual activity/audit, unread/company/personnel cases | B/G/T3/S | Domain separation/navigation PASS; **U001 FAIL** on small tones/metadata. R `notifications`; T3; no passive attention row becomes an alert record. |
| Company Documents `/company/documents` | Company Documents | V7; selection/toolbar/filter/no-results S4, template-empty, upload, share modes/preview, actual PDF/raster | B/G/T1/T2/S | Toolbar/reuse/ownership PASS; **U001/U002/U004 FAIL** in described states. R `company-documents`; S `company-*`; X `company-filter/selection/no-results`; T2. |
| Employees `/company/employees` | Actual contents of employee-details | V7; Add/Edit S4, free job title/departments, sorting/filters, active/inactive and permissions | B/G/T1/S | Directory geometry matches Vendors; **U001 FAIL** for neutral status/placeholder. R `employees`; S `employee-add`; X `employee-edit`; T1. |
| Employee Details `/company/employees/employee%3Aandrei-popescu` | Actual contents of employees-list | V7; zero/configured documents, upload/details/history/reminder S4, unavailable owner, long name/file | B/G/T1/S | No-review lifecycle/shared actions PASS; **U001/U004 FAIL**. R `employee`; S `employee-*`; X `employee-unavailable`; E `long-employee/long-file-card`. |
| Company Profile `/company/settings/profile` | 30 | V7; read-only initial/current data, shared fields, disabled clean Save; keyboard/responsive shell | B/G/T1/S | Geometry PASS; **U001 FAIL** for shared shell/secondary text. R `company-profile`; behavior depth beyond selected tests attributed to A. |
| Members `/company/settings/members` | 18 | V7; invite S4, duplicate/invalid, role/state actions and confirmation, Settings disclosure navigation | B/G/T2/S | Hierarchy/trigger geometry PASS; **U001 FAIL** for small tones/metadata. R `members`; X `member-invite`; T2. |
| Billing `/company/settings/billing` | 19/upgrade | V7; billing/payment editors and plan modal S4, local sample invoice, role restrictions, expand/collapse | B/G/T1/S | Shared PlanCards and truthful demo flow PASS; **U001 FAIL** on sampled small status/metadata. R `billing`; S `billing-editor/payment-editor/upgrade-plans`; T1. |
| My Profile `/profile` | 32a profile | V7; read-only email, preferences, clean Save, locale/user route preservation | B/G/T1/S | Global Profile root/containment PASS; **U001 FAIL** on shared shell text. R `profile`; T1. |
| My Companies `/profile/companies` | 21 | V7; create form, active state, company switch and role ownership, global route preservation | B/G/T1/S | Geometry/behavior PASS; **U001 FAIL** on active/secondary small text. R `companies`, P `company`; T1. |
| My Invitations `/invitations` | 32a invitations | V7; active/expired/accepted, filters, Accept/Reject interactions and company isolation | B/G/T1/S | Local semantics PASS; **U001 FAIL** on small status/helper text. R `invitations`; T1. |
| Supplier upload portal `/upload/demo-construct-pro` | Updated portal + 08 | V7; current requested rows/progress, file selection/type-size errors, responsive center | B/G/T1/S | Shared portal geometry PASS; **U001 FAIL** on sampled status/metadata ink. R `portal`; T1. Not a real emailed/secure portal delivery test. |

### Cross-cutting states and overlays

| Component/flow | Reference / viewport scope | Actual checked states | Result / evidence |
| --- | --- | --- | --- |
| Profile, bell, Company switcher | 20/17/22; S4 independently opened | Pointer and Enter opening, panel bounds, first focus, Escape/return, client navigation/company and locale behavior in tests | PASS for tested geometry/keyboard; P and T1/T3. Shell/badge contrast U001 remains. |
| Reports Tooltip | Existing right-placement contract; desktop/compact tests | Focus/hover, unavailable semantics, right/fallback viewport handling | PASS; S `reports-focus`, T1 authenticated navigation. No fake destination. |
| Company Share unavailable Tooltip | Existing Tooltip contract; 1448 and 320, RO/EN | Focus/hover with local preview/email mode; actual foreground paint | **FAIL U002**; S `company-share-tooltip-*`, source comparison with Reminder. |
| Drawer focus and cancellation | Shared Drawer/Modal; S4 and existing regression widths | Trap/return, Escape/X/Cancel, scroll, dirty Billing/Template confirmations, nested overlay actions | PASS for exercised lifecycle except **U004** invalid upload recovery; S/X/P, T1/T2. A-F001 remains separate. |
| File cards/history/viewer | document-details + current grouped-action contract; S4/seven-width tests | Grouped View/Download, wrapped long filename, real PDF/raster, unavailable bytes, historical downloads | PASS for exercised UI; S `employee-details-file/history`, E `long-file-card`, T1/T2. Exact-byte/security baseline remains limited to E1 client contracts. |
| Error/empty/loading | Existing state primitives; S4 | Filtered no-results, no template, no employee docs, unavailable owner, validation alerts; component LoadingBlock | PASS for named empty/error presentation, **U004** focus exception; X/S/U. Async network loading/retry is NOT APPLICABLE to synchronous E1 stores; future network states DEFERRED. |
| Appearance/preview/confirmation | Existing appearance/preview and shared alertdialog patterns | Desktop appearance opening/choice/Escape; read-only preview S4; discard/change/role/remove confirmations in T1/T2 | PASS for exercised behavior; X, T1/T2. Resized captures where a popover dismisses are not proof it stayed open. |

## 6. Cross-Page Consistency Findings

### Domain comparison

| Comparison | Observed common pattern | Difference / classification | Assessment |
| --- | --- | --- | --- |
| Vendors vs Employees directory | Same table CSS: 13px body, 11px headers, measured 42.5px header/57px first row at 1448; shared directory KPI/pagination pattern | Vendor document ratio/category vs employee department/job/tracking; no employee directory bulk selection (**E**) | Consistent; no reason to duplicate/refactor the directory. |
| Vendor Details vs Company/Employee Documents | Shared DataTable styling, source badges, Button/Field, management file card/history | Domain columns, review policy and selection differ (**E**); Company rows wrap actors/dates more, so row height need not equal Vendor rows | Expected. Keep privacy/status logic and source ownership outside presentation primitives. |
| Global Vendor Documents vs owner detail tables | Same application typography/color language | Global table deliberately dense 12/10px body/header vs 13/11px owner table (**E**) | Approved variant, not a new inconsistency ticket. |
| Company vs Employee upload | Same CompanyUploadDrawer, dropzone, compact Field/Select | Company review notice vs Employee no-review notice (**E**); same missing invalid-focus recovery (**F/A**, U004) | Reuse works; correct recovery once in the shared consumer without changing review policy. |
| Vendor vs Company/Employee template application | Shared Drawer/buttons, explicit preview of requirements | Vendor supports multi-template union/conflict/confirmation; others single scoped choice (**E**) | Extra Vendor confirmation is meaningful and must remain. No category control for Company/Employee. |
| Administrative fields vs pre-auth controls | Shared Field/Select/Button primitives | Authenticated compact 42px/14px vs pre-auth 40px/13px/46px CTA (**E**); Login placeholder remains 14px (**B**, U003) | Preserve scale variants; fix typography inheritance, not Onboarding size. |
| Employee Reminder vs Company Sharing | Same focusable unavailable Button + Tooltip | Reminder opts into drawer layer; Share does not (**A**, U002) | Confirmed integration inconsistency, not missing backend implementation. |
| Status vs provenance/roles | StatusBadge sizes/meaningful icons, source accent labels, shared RoleVisual | Not Configured, review-required and vendor compliance differ (**E**) | Business meanings must remain distinct. Foreground contrast still needs common correction (**D/C**, U001). |

### Other consistency conclusions

- Main page CTA, callout, search, filter and pagination placements broadly follow current contracts. Company bulk actions occupy one content-driven toolbar; Employee reminder is beside Download/template actions even when empty. No extra toolbar row or sticky Add Vendor footer was introduced.
- Button variants communicate primary/secondary/destructive roles. Unavailable delivery controls are focusable with explanations, not claimed successes. Some are intentionally blue; changing that hierarchy is a product decision, not a verified functional defect.
- Semantic native links remain inside enhanced directory rows. Context menus are separate controls; no duplicate Eye/View action is required to make a row navigable.
- Template color identity is stable provenance, not compliance. Selected rows/focus states remain distinguishable; shared neutral source labels have a darker override. U001 excludes those readable source overrides from its failing status-tone examples.
- No confirmed new spacing/radius/icon-system divergence justifies broad CSS cleanup. Repeated older feature notices and tab wrappers are consolidation candidates only when a real change requires it, not a mandate to rewrite working screens.

## 7. User Journey Friction Analysis

Counts below are **meaningful action stages**, not individual keystrokes, native file-picker clicks, elapsed-time measurements or task-success benchmarks. Starting point is the named page; existing suitable templates/data are assumed unless stated. B exercised presentation states; T1/T2/T3 and A supply the separately identified lifecycle depth. Required validation, permissions and secure-operation confirmations are not counted as removable friction.

| Journey | Current stages / meaningful count | Friction and minimal opportunity |
| --- | --- | --- |
| A — Create Vendor | Vendors → open Add → enter required details/category → submit/open Details (**3** after starting page) | Clear single entry/inline end actions; errors focus first invalid. Retain category/tax/email validation. No confirmed unnecessary step. |
| B — Apply Vendor template | Details → open template drawer → choose compatible template(s) → inspect application/union confirmation → confirm (**4**) | Category exclusion, existing/new documents and union confirmation prevent silent requirement changes. Do not remove confirmation to match Company. |
| C — Upload/review Vendor document | Requirement Upload → select file/check metadata → upload → open Review → inspect/correct → confirm (**6**); standalone adds type choice within metadata stage | Review serves actual approval semantics. Extraction is off by default; fixtures do not parse arbitrary bytes. Keep review and provenance; U001 affects readability, not number of steps. |
| D — Add Company document | Company Documents → Add → choose file/name/type/optional metadata → submit (**3**) → Details/review/confirm if approval needed (**2** more) | Name/type vs requirement-bound read-only fields are intentional. U004 adds recovery cost on short invalid submissions; focus correction removes no validation. |
| E — Apply Company template | Company Documents → Set Documents → choose owned company template → Apply (**3**) | No vendor category/configuration; no templates gives a direct Templates link instead of a dead picker. Template creation is a separate prerequisite, not hidden assignment. |
| F — Share Company documents | Header/row/selection → Share → choose documents/mode and package details → Preview (**3** after selection entry); external creation unavailable | Preview and attachment warnings are necessary. U002 hides only the hover/focus explanation, not persistent notice. No simplification may turn local preview into a success/delivery claim. |
| G — Add Employee | Employees → Add → personal/professional fields → Save (**3**) | Free job title and inline optional department avoid forcing new categories/routes. Email uniqueness and personnel permission remain required. |
| H — Apply Employee template | Details Documents → Set Documents → choose owned employee template → Apply (**3**) | Consistent with Company, with personnel permission checks. Empty-state duplicate entry is optional O002, not a broken workflow. |
| I — Upload/replace Employee document | Add/requirement Upload or Details → Upload New Version → file/metadata → submit (**3**, replacement adds opening Details when not already open) | Immediate current version, date-derived status; **no approval step** is correct. Shared file actions/history preserve the actual previous files. U004 applies to invalid standalone uploads. |
| J — Employee reminder | Documents toolbar → Reminder → compose subject/message → inspect Send explanation (**3**); delivery unavailable | Recipient read-only and no fake sends. Backend absence is deferred, not a UI bug. Do not add a fake successful fourth step. |
| K — Dashboard/Notifications/Search | Dashboard KPI/domain link → scoped page (**1**); bell → notice → owned destination (**2**); Search → query → result (**3**) | Search owner/domain labels reduce wrong-record selection. Notifications disclosures expand in-place; Dashboard View All navigates. Repeated navigation/locale/company state exercised. A-F001 affects direct document entry, not a new B ticket. |

**Optional simplifications, not required bug fixes:** O001 evaluates duplicated filter entry points; O002 evaluates repeated empty-state actions. Section 17 records effort/benefit, minimum surface, safety constraints and approval needs. No evidence supports removing mandatory confirmation, selection warnings, permission checks, audit provenance or review to shorten these flows.

## 8. Typography and Spacing Review

### Measured/approved scales

| Pattern | Browser/source observation | Result |
| --- | --- | --- |
| Authenticated heading | Representative main pages: 42px / 45.36px line height at 1448; shared mobile 34px; descriptions follow shared PageHeader | Consistent; long Employee breadcrumb/name wraps naturally, not ellipsis-only navigation. |
| Login/Onboarding fields | Both 40px outer height and 13px value font; Onboarding Continue 46px; Login empty placeholder 14px | Geometry PASS; typography **U003**. Do not change Onboarding to 42px. |
| Compact admin forms | Add Vendor, Templates, Company/Employee upload, Billing/Employee/Share fields use compact Field/Select 42px/14px | Consistent control family; icons can change inner padding, not a reason to force a different outer height. |
| Directory tables | Vendors and Employees measured 13px body / 11px header, same first-row and header heights | Consistent reuse, not merely similar screenshots. |
| Owner document tables | 13px body / 11px header, 8px/14px core cell padding; selection-cell insets differ by role | Consistent core. Wrapped source/actor/date content changes actual row height legitimately. |
| Global Documents table | 12px body / 10px header, compact padding | Explicit approved dense variant. A larger owner table is not a regression. |
| Drawers | Standard 502px, wide Details 804px; full-width mobile; 22px shared header with older feature-specific approved header treatments | Preserve established variants; do not redesign Invite/Add Vendor to identical content height. |
| File actions | View File then Download in shared file card; 8px gap, natural wrapping | PASS, including long filename at 320px and real existing viewer tests. |
| Borders/radius/surfaces | Existing shared field/Surface/Button/badge tokens; light-blue table/readonly backgrounds | Cohesive. No new local visual system recommended. |

Small text was assessed at its actual size; increasing every caption is not the proposed contrast fix. Normal text contrast must not be excused because a status uses color or bold 550 weight. U001 is a shared ink/token issue; U003 is a size-inheritance issue and needs a separate small correction.

Spacing conclusions: shared field label/control/error grouping is coherent; Vendor upload metadata uses a strict equal-column grid then collapses in source order. Company and Employee upload use the existing simpler grid. Informational blocks and inline actions do not overlay input fields. Company bulk-toolbar adjacency/wrapping is covered by actual browser assertions. Dashboard's reserved greeting height can leave visible room below a short greeting at 320px; this is an explicit anti-flash/anti-shift decision in UI foundation, not an invented fixed-spacing defect. The Landing presentation's extra height belongs between groups, not after Trust; existing Landing tests passed that current contract.

## 9. Responsive Review

- **All 280 base route captures:** page `scrollWidth <= viewport width`; no browser page errors recorded by that probe. This does not mean tables never scroll: wide tables and compact navigation intentionally have their own accessible scrolling regions.
- **Desktop 1920/1448/1280:** authenticated sidebar/header remain stable; public max-width is centered. Vendor header actions reflow without squeezing the title. Company template CTA shares the selection toolbar when space permits; no fixed-width workaround was observed.
- **1024/768:** page introductions/cards/forms reflow; the authenticated 800px shell transition is deliberate. Template list/editor stack; Contact grid and actions adapt. Do not introduce a new global breakpoint or hamburger based on this audit.
- **375/320:** locale/bell/avatar remain accessible; primary actions and owner file actions wrap. Independently reopened profile/bell/company popovers fit the viewport and return focus on Escape. Example 320px profile bounds: x=12, right=308, bottom≈549 within 812px in both locales (P). Bell has internal content scrolling with a reachable footer.
- **Long content:** E creates a long hyphenated Employee name/job title and an original filename over 100 characters using real UI. Details/breadcrumb/file-card text wraps; actions remain grouped; no page-width overflow at 1448/768/375/320. This is representative stress coverage, not every Unicode/unbroken-string combination.
- **Short height:** 375×500 upload form scrolls without clipping its data, but added validation errors move the still-focused submit action below the viewport (**U004**). This is distinct from horizontal containment.
- **Landing:** Pricing remains below the initial presentation and expands naturally on small screens; Resources is a minimal real anchor/coming-soon message, not duplicate auth links. E includes actual scrolled pricing/resources captures in both locales. Some scroll-into-view captures start midway through a tall section; full-page R captures and T1 establish its complete composition.
- **Zoom:** 640×450 viewport-equivalent reflow sample inspected. Native 200%/400% browser zoom, text-only zoom, mobile software-keyboard resizing, browser toolbar/safe-area changes and real touch hardware are **NOT VERIFIED**.

## 10. Accessibility Review

### Exercised checks

| Aspect | Evidence / outcome |
| --- | --- |
| Native semantics and names | Labeled Field/Select, required/error descriptions, current breadcrumbs, native table/link/checkbox controls and aria-expanded disclosures inspected in S and tests. No blanket automated accessibility-tool pass claimed. |
| Keyboard actions | Enter/Space activation, tab movement in existing tests, Arrow/Home/End template/detail tab handling, Escape/return for popovers/drawers and modal cancellation exercised. P independently checks first focus and return at S4. |
| Visible focus | Existing global 3px focus outline and Switch track outline; actual focused field, profile item, bell header action and Reports screenshots inspected. **U004** is a confirmed short-viewport recovery exception; this is not a claim that all possible focus order permutations pass. |
| Unavailable controls | Reports/help/logout/reminder/share retain safe unavailable semantics and explanations. Reminder Tooltip actually paints above Drawer. Company Sharing Tooltip **fails U002**, despite DOM/aria description and persistent note existing. |
| Contrast | Opaque foreground/background samples expose **U001**. Disabled controls, decorative marketing preview, SVG icons, gradients, opacity layers and status color semantics are not automatically judged by this text probe. |
| Tables and navigation reflow | Scroll regions remain inside the page; keyboard-reachable controls and responsive table assertions passed. No WCAG failure inferred merely from an internal horizontal table. |
| Dialogs/alerts | Existing trap/return/inert/close behavior is covered by U/T; field errors have alert/description associations. No real screen reader was used. |
| Motion | Reduced-motion capture mode and current Landing tests/source retain the preference-aware path. Not an exhaustive vestibular/motion review. |

Reference thresholds are from the primary [W3C contrast-minimum guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum): normal text needs 4.5:1, large text 3:1; placeholder text is not exempt simply because it is muted. Actual inactive controls have an exception. This audit's failing samples are active fields, status labels, metadata and unread numbers, not disabled-button opacity.

The [W3C target-size-minimum guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) permits 24px targets or its specified alternatives/exceptions. A 16–18px native checkbox or small inline action is not classified as a confirmed failure solely because it is below 44px. Exhaustive target-spacing/overlap measurements, screen-reader announcements, forced colors, alternative input, contrast on every tinted/gradient background and OS scaling are **NOT VERIFIED**. This is a focused accessibility audit, not certification.

## 11. RO/EN Terminology Review

| Concept | Observed terminology/behavior | Assessment |
| --- | --- | --- |
| Reusable templates | `Șabloane`, `Șabloane de cerințe`; `Templates`, `Requirement Templates`; route remains `/requirements` | Correct current terminology. Old `Cerințe / Requirements` sidebar test labels belong to A-F002, not a request to rename the app back. |
| Vendor requirements | Document obligations/`Cerințe documente` remain context-specific | Correct; do not blanket-replace every requirement with template. |
| Scope/category/industry | `Destinație șabloane`, Vendor/Company/Employee; `Categorie furnizor` only Vendor; optional descriptive industry distinct | Correct business distinction; no obsolete applicability tab/control observed. |
| Employee lifecycle | Employment Active/Inactive separate from Not Configured/Complete/Needs Attention; no approval task for Employee docs | Correct; do not unify the labels with Vendor compliance or Company review. |
| Review/delivery | Company pending review vs Employee date state; local share preview, demo notice and unavailable send explanations | Correct meaning retained. `În review` follows current source/approved copy, not an audit-author retranslation. |
| Navigation | Dashboard-root workspace chains; Company/Settings groups non-interactive; Profile-root global pages | RO/EN destinations and current-state semantics retained. |
| Vendor/Supplier English | Directory/sidebar use Suppliers; Search uses Vendors/Vendor Documents and some operational descriptions use vendors | Understandable synonyms but not one approved English glossary. **D001 product review**, not a mandatory copy rewrite or confirmed broken localization. |
| Dates/counts/plurals | Locale formatting and existing count strings in lists, previews, disclosures and popovers exercised | No new missing-key/raw-key/overflow defect observed in sampled states; full linguistic/legal review not performed. |

Long Romanian labels fit by wrapping rather than removing diacritics or reducing essential controls. EN layout was tested independently; no silent RO copy changes are proposed. English remains subject to product-owner approval, as documented by the repository.

## 12. Confirmed Findings

### E1C-008B-U001 — Restore readable contrast for shared small-text roles

- **Pages/components:** Authenticated shell, Vendor/Company/Employee lists/details, Dashboard, Notifications, user/settings pages; Login input placeholders and Supplier Portal status/metadata. Shared StatusBadge/placeholder ink, DataTable metadata, bell/sidebar counters and related feature-specific small text.
- **Category:** Accessibility; Visual Consistency. **Priority / severity / status:** **P1 / Medium / Confirmed**. One consolidated cross-cutting issue, not a separate ticket for every occurrence.
- **Current:** Functional status labels, active input placeholders, readable metadata and unread counts use foreground/background pairs below 4.5:1 at normal text sizes. Labels/icons still convey meaning; this is readability loss, not a failure of compliance derivation.
- **Expected:** Preserve status hues, soft surfaces, provenance identity and existing sizes, but use readable ink for normal text. Keep placeholders muted relative to values without making them low-contrast.
- **Reproduce:** (1) Open `/company/documents` at 1448×900 with fixture data. (2) Inspect actual Expired/Expiring Soon/Valid badges and secondary document metadata. (3) Open `/company/employees` and inspect Not Configured. (4) Inspect global Search placeholder and unread counter; open `/login` empty. (5) Repeat `/en/...` and mobile; compute rendered text contrast against its opaque surface, not a screenshot's scaled contact-sheet pixels.
- **Measured evidence:** R contains actual computed foreground/background/font values; examples below. [Company Documents](../../artifacts/visual/e1c-008b/ro-company-documents-1448.png), [Employees](../../artifacts/visual/e1c-008b/en-employees-1448.png), [Login](../../artifacts/visual/e1c-008b/en-extra-login-empty-1448.png), [mobile bell](../../artifacts/visual/e1c-008b/ro-popover-bell-375.png) show the relevant text roles.

| Actual role | Foreground / background | Size | Ratio |
| --- | --- | --- | ---: |
| StatusBadge Valid | `#07976a` / `#e2f8ef` | 12px | 3.35:1 |
| StatusBadge Expiring Soon / In Review | `#a66a00` / `#fff2cf` | 12px | 4.03:1 |
| StatusBadge Expired | `#dc2b43` / `#ffe5e9` | 12px | 3.95:1 |
| StatusBadge Not Configured | `#617393` / `#eaf0f8` | 12px | 4.18:1 |
| Active Field placeholder | `#8198bb` / `#ffffff` | 14px | 2.94:1 |
| Global Search placeholder | `#8198bb` / `#f2f6fb` | 14px | 2.71:1 |
| Document metadata | `#647fa4` / `#ffffff` | 12px | 4.11:1 |
| Bell/sidebar unread number | `#ffffff` / `#f44e69` | 10/12px | 3.42:1 |

- **Reference:** Current shared design language plus W3C normal-text criterion in section 10. Accessibility is an allowed bounded deviation from raw mockup colors. No typography enlargement/redesign is required.
- **Sources/root cause:** [`tokens.css`](../../src/styles/tokens.css), [`globals.css`](../../src/styles/globals.css), [`StatusBadge.module.css`](../../src/components/ui/StatusBadge.module.css), [`DataTable.module.css`](../../src/components/ui/DataTable.module.css), [`NotificationBell.module.css`](../../src/features/notifications/NotificationBell.module.css), [`AppSidebar.module.css`](../../src/components/layout/AppSidebar.module.css). **D**: color roles used as small-text ink without sufficient contrast; **C**: equivalent local metadata/counter colors also need review. R lists additional feature-local samples, e.g. Portal and My Companies; the issue is not exhausted by changing one Badge declaration.
- **Reuse/minimal remediation:** Correct existing semantic foreground roles/StatusBadge variants and shared placeholder/metadata rules first, then mapped local counterparts. Existing text-secondary ink demonstrates a readable role already exists. Preserve green/amber/red meanings and badge backgrounds where possible; do not blindly darken all global status tokens used for icons/decorations or replace template provenance colors with status colors.
- **Dependencies/risk:** No backend. Coordinate the small foreground changes with visual approval and U003's inheritance fix. Broad consumer exposure requires RO/EN normal/selected/hover/tinted/readonly checks, plus disabled/decorative exceptions. Do not alter mappings, counts, forms or Company/Employee/Vendor policy.
- **Acceptance:** **Given** each active sampled text role and its supported soft/tinted surface, **when** rendered in RO/EN desktop/mobile, **then** normal text reaches at least 4.5:1 while status/source meanings, typography, geometry and disabled semantics remain unchanged. **Given** an empty field, **when** a real option/value is selected, **then** placeholder vs value hierarchy remains distinct and both remain readable.

### E1C-008B-U002 — Use the existing drawer Tooltip layer in Company Sharing

- **Pages/components:** Company Documents → Share Documents, Link/Email final unavailable action; CompanyShareDrawer, Tooltip, Button, Drawer.
- **Category:** Interaction State; Component Reuse; Accessibility. **Priority / severity / status:** **P2 / Low / Confirmed**.
- **Current:** Focusing/hovering Generate Link or Send Email creates the tooltip/aria description, but it paints under the sharing panel. The persistent backend-unavailable note remains visible, so users are not entirely without an explanation and no delivery occurs.
- **Expected:** The same existing tooltip should be visibly attached above the drawer for pointer and keyboard interaction, using its established layer opt-in, with current copy and safe unavailable behavior unchanged.
- **Reproduce:** (1) Open `/company/documents`. (2) Share Documents; choose Email (Link also uses the same final-action Tooltip). (3) Scroll to the final action and focus or hover it. (4) Inspect actual pixels and hit-test the tooltip's center, not only `getByRole('tooltip').isVisible()`. (5) Repeat EN/320px. Compare Employee Details → Send Reminder → valid message → Send Email focus.
- **Evidence:** S `company-share-tooltip-focus/hover/mobile` in RO/EN. [RO focus capture](../../artifacts/visual/e1c-008b/ro-state-company-share-tooltip-focus-1448.png), [EN capture](../../artifacts/visual/e1c-008b/en-state-company-share-tooltip-focus-1448.png), [working Reminder counterpart](../../artifacts/visual/e1c-008b/en-state-employee-reminder-tooltip-focus-1448.png). S's paint probe: Company tooltip z=240, center x≈1296/y≈792 hits the drawer's `demoNote`, `topPainted=false`; Reminder z=1050, `data-layer=drawer`, `topPainted=true`.
- **Reference/source/root cause:** Existing Tooltip's documented drawer layer, not a new overlay design. [`CompanyShareDrawer.tsx`](../../src/features/company-documents/CompanyShareDrawer.tsx) omits `layer="drawer"`; [`Tooltip.module.css`](../../src/components/ui/Tooltip.module.css) defaults to 240, Drawer uses 1000. [`EmployeeReminderDrawer.tsx`](../../src/features/employees/EmployeeReminderDrawer.tsx) demonstrates the existing correct opt-in. Classification **A**.
- **Reuse/minimal remediation:** Supply the existing drawer layer at the Company Share consumer. Do not globally raise all Tooltip z-indexes, duplicate a tooltip implementation, move the persistent explanation or change Drawer mechanics.
- **Dependencies/risk:** Small local consumer correction; recheck focus/pointer, viewport fallback, nested modal order, RO/EN, desktop/mobile, aria description and no-op Enter/Space/click behavior. No backend or auth work.
- **Acceptance:** **Given** either final unavailable share action, **when** hovered/focused in an open drawer, **then** the localized tooltip is visibly foregrounded and inside the viewport. **Given** activation, **then** no share/link/email/event is created and the persistent explanation remains.

### E1C-008B-U003 — Preserve Login field-size typography in placeholders

- **Pages/components:** `/login`, `/en/login`, email/password Fields; comparison with existing Onboarding fields.
- **Category:** Typography; Visual Consistency. **Priority / severity / status:** **P2 / Low / Confirmed**.
- **Current:** Login fields have 13px entered text but 14px placeholders. Empty-to-typed text changes scale despite the normalized pre-auth controls. Weight remains 400 and outer height stays 40px; no outer layout shift was observed. Onboarding's compared company input resolves both to 13px.
- **Expected:** A field's placeholder uses that control size's font size/weight/line treatment, retaining muted color and normal value ink. Do not enlarge Onboarding or change Login card/header geometry.
- **Reproduce:** Open Login at 1448×900; inspect `#login-email` and its `::placeholder`; type `person@example.test`, clear it, repeat EN. Compare cleared `#company-name` on Onboarding. Password shares the same Login field class.
- **Evidence:** X `small`: value 13px, placeholder 14px, both weight 400, height 40; X `onboarding`: 13px/13px. [Empty Login](../../artifacts/visual/e1c-008b/en-extra-login-empty-1448.png), [typed Login](../../artifacts/visual/e1c-008b/en-extra-login-value-1448.png), [`extra-results.json`](../../artifacts/visual/e1c-008b/extra-results.json).
- **Reference/source/root cause:** [Login contract](../features/login.md) and canonical Onboarding size treatment. [`LoginPage.module.css`](../../src/features/login/LoginPage.module.css) sets input font-size=13px but inherits the absolute 14px placeholder rule in [`globals.css`](../../src/styles/globals.css)/[`tokens.css`](../../src/styles/tokens.css). Onboarding has its existing size-consistent placeholder treatment. Classification **B**, with shared absolute-size interaction; not a reason to create a new Login-specific design system.
- **Reuse/minimal remediation:** Prefer existing shared size-aware/inherited placeholder typography so 14px compact fields remain 14px and 13px pre-auth fields remain 13px. Assess all consumers before changing the global rule; keep Select empty-state hierarchy and current variants. A new control family/global cleanup is out of scope.
- **Dependencies/risk:** Coordinate U001's color changes; preserve control height/padding/radius/icons, validation, password toggle, CTA and routes. Regression Login/Onboarding, compact Field/Select and Vendor upload's existing small controls.
- **Acceptance:** **Given** Login email/password at supported sizes, **when** empty then typed, **then** placeholder/value font size and weight follow the same field variant, muted vs value colors remain appropriate, and outer geometry/behavior do not change. **Given** Onboarding and admin forms, **then** their existing sizes remain unchanged.

### E1C-008B-U004 — Keep upload error-recovery focus visible on short screens

- **Pages/components:** Company Documents standalone Add Document; Employee Details standalone Add Document; shared CompanyUploadDrawer/Field/dropzone and inline submit row.
- **Category:** Interaction State; Responsive; Accessibility. **Priority / severity / status:** **P2 / Low / Confirmed**. This is not a claim of a separately certified WCAG failure or missing validation.
- **Current:** With a short mobile viewport, submitting empty fields adds associated visible inline errors but leaves focus on the submit button. Error insertion pushes that focused button below the visible drawer area. Users can still scroll/Tab/Escape, and several errors are visible; this is recoverable focus friction, not data loss.
- **Expected:** Invalid submission follows the established Add Vendor/Employee/Sharing focus-recovery pattern: a visible first invalid field or accessible error target is focused/scrolled into view. No validation rules, review policy or Drawer mechanics should change.
- **Reproduce:** (1) Set 375×500. (2) Open Company Documents → Add Documents, leave file/name/type empty. (3) Scroll/focus Upload and Continue and press Enter. (4) Observe inline errors and current focus. (5) Repeat on Employee Details → Add Document and EN. Pointer submission reproduces the same state.
- **Evidence:** [`keyboard-upload.json`](../../artifacts/visual/e1c-008b/keyboard-upload.json), [RO keyboard capture](../../artifacts/visual/e1c-008b/ro-keyboard-invalid-upload.png), [EN Employee keyboard capture](../../artifacts/visual/e1c-008b/en-keyboard-invalid-upload.png), S/X validation captures. Both keyboard probes: submit remains active, y=510.05/bottom=555.05 while viewport height=500. Visible name/type errors exist; focus is wholly below the viewport.
- **Reference/source/root cause:** Existing local form recovery pattern, rather than a new form library. [`CompanyUploadDrawer.tsx`](../../src/features/company-documents/CompanyUploadDrawer.tsx) sets errors and returns without focus recovery; [`AddVendorDrawer.tsx`](../../src/features/vendors/AddVendorDrawer.tsx), [`EmployeeDrawer.tsx`](../../src/features/employees/EmployeeDrawer.tsx) and CompanyShareDrawer already direct invalid focus. Classification **F** in a shared owner-neutral upload consumer, not a reason to change global Drawer behavior.
- **Reuse/minimal remediation:** Reuse the existing form/ref + invalid-control recovery approach once in CompanyUploadDrawer for both owners. For a missing file, focus a visible chooser/error target, not the visually hidden file input. Avoid adding arbitrary scroll offsets, sticky actions, timers or a new shared abstraction.
- **Dependencies/risk:** No backend. Preserve all validation, original bytes, local creation, permissions, current/history semantics and successful focus/close return. Test short/normal heights, missing file only, missing name/type, invalid date, RO/EN and requirement-bound read-only uploads. Vendor upload remains unchanged.
- **Acceptance:** **Given** invalid Company/Employee upload at 375×500, **when** submitted with keyboard or pointer, **then** an appropriate visible invalid/error target receives focus with its message associated and the correction path is clear. **Given** a valid submission or Cancel/Escape, **then** the existing upload/close/focus-return and owner-specific review behavior remain unchanged.

## 13. Suspected / Not Verified

No additional suspected issue is promoted to a confirmed ticket without rendered evidence. Boundaries below are coverage limitations or investigation notes, not invented defects:

| Area | Status | Reason / required follow-up |
| --- | --- | --- |
| Full WCAG conformance, screen-reader announcements and real assistive technology | NOT VERIFIED | DOM/keyboard checks do not replace NVDA/VoiceOver/TalkBack or a full criterion review. U001/U002/U004 remain actionable independently. |
| Native 200%/400% zoom, text-only scaling, forced colors | NOT VERIFIED | Viewport-equivalent reflow and source inspection only; do not label that an actual browser-zoom pass. |
| Firefox/Safari, real mobile keyboard/touch/safe area, native multi-file download policies | NOT VERIFIED | Chromium/headless + explicit full-Chromium PDF tests; no physical-device or cross-engine claim. |
| Every gradient/tint/icon/border contrast and every small target's spacing exception | NOT VERIFIED | Contrast sampler deliberately excludes ambiguous gradients/opacity/decorative/disabled roles; U001 lists confirmed opaque text examples only. |
| Arbitrary extreme text/RTL/other languages, every malformed file/decoder | NOT VERIFIED / NOT APPLICABLE for unsupported locales | Representative long RO/EN name/file checks and existing file tests do not exhaust all inputs. No additional supported locale is assumed. |
| Pixel-diff equality against each mockup at every width | NOT VERIFIED | No product-approved CI baselines exist; manual comparison respected later overrides. Contact sheets support layout comparison, not subpixel certification. |
| Error/loading/retry under a real server/network | DEFERRED | E1 synchronous stores lack that integration. Existing missing/stale/permission/no-file states were exercised; do not fabricate latency or failures. |
| Additional duplicate local tabs/notices | Source observation, not confirmed defect | Differences can preserve domain semantics. Consolidate only with a demonstrated inconsistency/feature need, not a speculative new component. |
| Direct-entry document HTTP response | Existing A-F001 | Browser recovery is not a fix. Technical verification/remediation belongs to C; no duplicate B issue. |

## 14. Prioritized Remediation Backlog

Only confirmed findings are in this required-correction backlog. Optional/product/deferred records are in section 17. Story sizes are estimates, not implementation authorization.

### P0 — Must Fix

None newly confirmed by B. This does not remove existing functional/technical blockers or certify areas marked NOT VERIFIED.

### P1 — Important Consistency/Usability

| Order / finding | Story / size | Dependencies, root and exact scope | Acceptance / regression |
| --- | --- | --- | --- |
| 1 — **E1C-008B-U001** | Make operational small text readable; **M** | Existing foreground roles, StatusBadge/Field/Search/DataTable plus mapped feature-local counterparts. No backend; bounded visual approval. Coordinate U003. Exclude business mappings, status/source model, geometry, disabled/decorative blanket recoloring and a palette redesign. | U001 Given/When/Then; sample every tone/placeholder/metadata/counter, white/soft/selected/tinted backgrounds, RO/EN, all three document domains, shell/public fields, no count/logic changes. One shared-root story, not duplicate page tickets. |

### P2 — Minor / Scheduled Improvements

| Order / finding | Story / size | Dependencies, root and exact scope | Acceptance / regression |
| --- | --- | --- | --- |
| 2 — **E1C-008B-U002** | Foreground Company Share unavailable tooltip; **S** | CompanyShareDrawer uses existing Tooltip layer. No global z-index/Drawer refactor, new overlay or delivery behavior. | U002 criteria; inspect pixels/hit test for focus/hover, Link/Email, desktop/320, RO/EN; Reminder/modal layering and unavailable activation unchanged. |
| 3 — **E1C-008B-U003** | Make placeholder typography size-aware; **S** | Existing global placeholder and Login field-size interaction; coordinate U001 review to avoid conflicting color edits. Do not change public/admin outer sizes or card layout. | U003 criteria; empty/typed input and empty/selected Select, pre-auth 40/13 and admin 42/14 variants, icons/validation/password behavior. |
| 4 — **E1C-008B-U004** | Recover visible invalid-upload focus; **S** | CompanyUploadDrawer consumer; existing form focus pattern. No validation, review, storage, global Drawer or sticky-footer changes. | U004 criteria; short/normal viewport, chooser/name/type/date errors, keyboard/pointer, standalone/requirement, Company/Employee and unchanged Vendor regression. |

E1C-008C should retain A-F001's independent SSR/direct-response work and A-F002's real test-discovery correction. E1C-008D should merge this backlog by root cause, retaining IDs and separate optional/product/E2 classifications. Green DOM assertions must not substitute for HTTP health, contrast calculation or painted-tooltip checks.

## 15. Shared Component Reuse Opportunities

| Opportunity | Existing reusable implementation | Safe boundary |
| --- | --- | --- |
| U001 readable status/metadata/placeholder roles | StatusBadge, Field/Select, global semantic ink and DataTable CSS | Correct foreground roles centrally, then audited local equivalents; preserve every domain mapping and meaningful template hue. |
| U002 unavailable drawer explanation | Tooltip's existing `layer="drawer"`, demonstrated by Employee Reminder | Consumer prop reuse; no new tooltip or global overlay-layer rewrite. |
| U003 small-control placeholder font | Existing field variants and Onboarding's size-consistent behavior | Inherit/resolve the control's own typography; do not force all public/admin fields to one geometry. |
| U004 invalid focus | Existing AddVendor/Employee/Share form ref/invalid-target pattern | Reuse locally inside the shared Company/Employee upload form; no generic form framework required. |
| Future table changes | Shared DataTable CSS and Vendor directory presentation | Preserve domain columns/ownership and existing intentional dense/global variant. No need to introduce a universal DataTable React component now. |
| Future option/filter changes | Field/Select/SearchInput/FilterPanel/FilterTrigger | Reuse existing controls; O001 needs product approval before removing a visible entry point. |
| Future empty states | EmptyState/ErrorState/StateContainers and current action props | O002 only after approval; retain distinguishable no-data, filtered-empty, denied/unavailable and missing-bytes explanations. |
| Future pricing/disclosures | Existing PlanCards and SectionAction | Keep shared plans/labels and intentional navigation-vs-expansion distinction; no duplicate Landing plan configuration. |

Do not treat these opportunities as permission to rewrite existing working components, change architecture, add dependencies or perform an E2 design-system cleanup in E1.

## 16. Existing E1C-008A Cross-References

| Existing ID | B relevance | Ownership / no-duplication rule |
| --- | --- | --- |
| [E1C-008A-F001](e1c-008a-functional-audit.md#e1c-008a-f001--make-document-drawer-deep-links-server-render-safely) — P1 SSR document drawer entry | Direct Details/History links can HTTP 500 then recover in client UI. That affects entry quality, but does not mean the visible file card needs redesign. | Keep original exact reproduction/evidence and technical root cause in C. Do not create B navigation ticket or claim passing recovered-drawer E2E resolves it. |
| [E1C-008A-F002](e1c-008a-functional-audit.md#e1c-008a-f002--restore-current-label-session-e2e-coverage-and-discovery) — P2 stale session test/discovery | Four stale `Cerințe / Requirements` selectors fail despite correct `Șabloane / Templates`; default enumeration omits suites. | Keep in C/test infrastructure. B ran explicit selected specs including Login and current terminology tests; it did not amend or silently skip/change the stale suite, and does not call its 326 passes a full-suite pass. |

A's **581 unit/component passes, typecheck/lint/build, 515/519 production E2E results and separate preview result** are prior baseline evidence, not B reruns. Its four E2E failures and SSR finding remain reported. No source changes occurred after that application validation, so repeating a production build/typecheck/lint was unnecessary for this Markdown-only audit.

## 17. Deferred Product Design Decisions

### Optional simplifications and glossary decisions — not confirmed bugs

| ID / class | Current effort and evidence | Proposed benefit / retained behavior | Minimum surface / trade-off / approval |
| --- | --- | --- | --- |
| **E1C-008B-O001 — C: Recommended simplification** | Company/Employee document views expose inline type/status controls and a Filter panel with the same filter dimensions. Opening the panel adds a meaningful stage when an inline change would suffice. X `company-filter`, R/S owner views and T2 synced-filter tests show current controls. | Evaluate one clear filter entry pattern at each size to reduce duplicate choices/mobile height. Retain query composition, active filter indication, reset, sorting, pagination and keyboard access. | Existing toolbar + FilterPanel consumers only; no projection/model changes/new filter component. Removing quick controls may increase work for frequent users. **PO approval required; optional P2 discussion, not a required U finding.** |
| **E1C-008B-O002 — C: Recommended simplification** | Empty Employee Documents offers Set Documents from Template/Add Document in the empty state while toolbar/header also expose them. Current behavior is approved and makes a blank page actionable; S `employee`/R proves repetition. | Evaluate reducing repeated actions while keeping a clear contextual way to start. No measurable time saving is claimed: current user still needs one entry click. Benefit is less competing visual emphasis on a long mobile page. | Existing EmptyState action slot/Employee consumer only. Do not remove toolbar/header capabilities or conflate zero requirements with denied access. Discoverability may worsen. **PO approval required; preserve current UI until decided.** |
| **E1C-008B-D001 — D: Product decision** | English Suppliers/Vendors are mixed across directory/navigation and Search/domain descriptions (R/S, message catalogs). Same business entities, no broken route or misleading requirement type established. | Approve an English glossary before any broad translation edit; preserve Romanian locked copy, technical route identifiers and vendor-specific requirement semantics. | Existing EN catalog after explicit approval, plus targeted copy/width tests. No mechanical replacement of every requirement/vendor. **English linguistic approval remains outstanding; no E1 code change authorized here.** |

### E2-deferred requirements — not E1 defects

- Real authentication/logout/account switching, password reset/help/marketing resources, legal copy approval and durable onboarding/session state remain outside this audit. Demo Login/greeting lifecycle and unavailable Logout are intentional current contracts.
- Reminder/invitation email delivery and secure external Company sharing remain unavailable. No fake email, link/token, notification, success or active-share count is recommended. Current local preparation/attachment warnings must survive future integration.
- Durable notification read state across reload/login/devices, durable audit storage and Company lifecycle event recording require E2 integration. The established E1 reload boundary is not a new B usability bug; passive attention rows must never be promoted to fabricated notification/activity records.
- Real asynchronous loading/error/retry/recovery, API authorization/private storage and personnel protection require server-backed contracts and follow-up UI validation. E1 tests only establish existing client ownership/privacy behavior.
- Full cross-browser/device/assistive-technology/zoom evaluation and approved screenshot baselines remain separate validation work. Inter/English final approval and any broad density/palette redesign need a dedicated design task, not incidental audit cleanup.

## 18. E1C-008B Sign-Off Assessment

**Audit deliverable complete; UI remediation not implemented.** All major page families and reusable component families are inventoried, compared with actual references/current overrides and backed by browser/test/source evidence with explicit limits. Confirmed defects, intentional differences, optional simplifications, product decisions, prior A findings and E2 boundaries are separated.

No P0 was newly confirmed. **One P1 and three P2** findings feed E1C-008D. U001 prevents an unqualified accessibility-quality approval; A-F001/F002 continue into E1C-008C independently. A complete E1 closure decision must consider those existing issues and the NOT VERIFIED coverage, not only B's green targeted tests.

Validation for this audit: **146 unit/component tests; 326 targeted production E2E; one separate development-only test passed**. Production preview remains 404 in RO/EN. No source, CSS, existing test, dependency, data model, business rule, route, canonical mockup or user/session record was modified by the task. Local isolated audit data/captures are not application fixtures. Original mockup hashes and the six unrelated untracked PNGs are preserved.

This report is the sole intended committed file. Exactly one local documentation commit is required: `docs: add E1C UI UX consistency audit`. No amend, push or application remediation is part of this task.
