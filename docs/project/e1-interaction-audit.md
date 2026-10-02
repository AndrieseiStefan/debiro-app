# E1 Interaction & Missing Flow Audit

Audit date: 2026-09-29. Initial baseline: `main` at `4c898fa8d76e431466fa24e4499230ec096c1d25`; updated through E1-028 for resolved account-entry links, template lifecycle, actionable vendor identities/lifecycle, sorting, metadata editing, snapshot requirements, shared search/filters, vendor Contacts/Activity/Notes with contact-based invitation simulation and shared document-review outcomes. This is a discovery record, not approval to implement the backlog. The current product is a fixture/browser-memory demonstration without authentication, persistence, file storage, or external services. The original 24 approved images were inspected during the audit; later Preview/Portal, template-assignment and vendor-workspace references bring the canonical catalog to 28. Later documented product decisions take precedence over older images (notably the reduced profile menu, two requirement tabs, single vendor category, immutable catalog names and removal of unsupported vendor bulk selection).

Method: inspected all product route files, screen components, state stores, feature contracts, and targeted E2E coverage; opened every current RO and EN route in Chromium; exercised representative forms, drawers, popovers, navigation, local mutations, and 320px overlays. Direct route checks returned HTTP 200 for all 14 implemented product route families in both languages. Unknown fixture vendor/document IDs returned 404; lost `local-*` IDs have recovery UI. The missing routes listed below returned 404 in both languages. The development-only design-system preview is not a product route and is excluded from the counts. No production code was changed during the initial audit.

Status and priority are different axes. `IMPLEMENTED` means the current **E1 local/fixture contract** works, not that a server exists. A repeated control family (for example, every row ellipsis in a table) counts once in the inventory; the row names identify its entire scope. Each non-implemented inventory row has exactly one disposition: `P0 — REQUIRED BEFORE E2`, `P1 — COMPLETE BEFORE BACKEND IF PRACTICAL`, `DESIGN_REQUIRED`, `BACKEND_DEFERRED`, or `V2 / NON-GOAL`. `DESIGN_REQUIRED` means the product/UX decision must precede coding; it is not permission to improvise a screen.

## 1. Executive Summary

The current E1 UI includes coherent local upload/review/requirement outcomes through E1-028. Local create flows, RO/EN navigation, company switching, list filters, drawer mechanics, Landing account-entry links, existing-template Save/Cancel editing and vendor Open/Active/Inactive actions work. The largest remaining gaps are non-review document management/renewal and a usable newly created company's operational workspace. Billing/auth/upload delivery are deliberately service-dependent and should not be faked to close E1.

Inventory counts (unique control/interaction families in §3, not individual rendered buttons):

| IMPLEMENTED | PARTIAL | MISSING | DESIGN_REQUIRED | INTENTIONALLY_DEFERRED | BUG / INCONSISTENT |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 38 | 13 | 3 | 10 | 8 | 1 |

The six status counts total 73 inventory families. Separately, 15 non-implemented families carry the `BACKEND_DEFERRED` **priority/disposition** (including seven `PARTIAL` families); this is not a seventh mutually exclusive status.

Route coverage: 14 implemented product route families × 2 locales; four named product destinations are absent, including Reports. The development-only `/%5F%5Fdev/design-system` preview is separately gated by development configuration and has no product-flow obligations.

## 2. Route Coverage

`{ro,en}` below means the Romanian default path and the equivalent `/en` path. Every listed vendor ID now resolves to Details; document Review remains limited to supported fixture/local IDs.

| Route | Screen / purpose / main entry | Status | Main gaps |
| --- | --- | --- | --- |
| `{ro,en}/` | Landing; public brand/marketing entry | PARTIAL | Login and free-trial links work; other marketing destinations remain undefined. |
| `{ro,en}/login` | Existing-user sign-in UI; direct URL or Login's own sign-up link | PARTIAL | Local validation navigates to Dashboard without identity; forgot password/help unavailable. |
| `{ro,en}/onboarding` | Three-step account setup UI; Login sign-up link/direct URL | PARTIAL | Local selections are discarded on Dashboard entry; only one fixture option per Step-1 select; help/legal URLs absent. |
| `{ro,en}/upload/demo-construct-pro` | Supplier-facing invitation preview; Invite Vendor preview link | PARTIAL | Local metadata upload changes Missing to In Review, shared review changes progress, rejection enables a new upload identity. File bytes/storage/delivery and uploaded-file management remain unavailable. Unknown tokens 404. |
| `{ro,en}/dashboard` | Authenticated-looking overview; Login/Onboarding/sidebar | PARTIAL | Panel CTAs and document actions unavailable; snapshot KPIs do not derive from local mutations. |
| `{ro,en}/vendors` | Supplier list; sidebar/breadcrumb | IMPLEMENTED | All names open Details; Open/Active/Inactive menus, shared local search/category/compliance filters and five-column sorting work. Unsupported bulk selection and unavailable extra-filter control are removed. |
| `{ro,en}/vendors/[vendorId]` | Vendor Details; vendor-name/context-menu navigation | PARTIAL | All listed fixture/local identities, metadata editing, Contacts/Activity/threaded Notes, snapshot templates, shared filters, upload/removal and contact-based Invite simulation work. Documents notice is informational only. Real invitations remain deferred; only Construct Pro has a supplier-portal preview fixture. Unknown fixture IDs 404; lost local IDs show recovery. |
| `{ro,en}/documents` | Global document list; sidebar/review return | PARTIAL | Every pending fixture/local document has a Review route; current counts/tab/rows derive from shared records. Non-review management remains unavailable. |
| `{ro,en}/documents/[documentId]/review` | Human review UI; supported document row/bell link | IMPLEMENTED | Approve/reject persist across client navigation and propagate to current document/requirement/compliance projections and Activity/Audit. Draft remains form-local. Unknown fixture IDs 404; missing/local or foreign-company records have safe recovery. |
| `{ro,en}/requirements` | Company-scoped template list/editor; sidebar | PARTIAL | New and existing-template drafts use atomic Save/Cancel; appearance and duplicate/delete work locally. Read-only supplier Preview reflects staged rules; company-scoped multi-template snapshot assignment is implemented in E1-027. |
| `{ro,en}/notifications` | Notification/activity and audit snapshot; sidebar/bell footer | PARTIAL | Filters, section expansion and CSV work; audit merges company-owned local vendor actions with fixtures. Rows lack contextual actions; delivery/durability remain deferred. |
| `{ro,en}/company/settings/members` | Active-company members/invite; expanded sidebar | PARTIAL | Local pending invitation works; member edit/role/revoke actions unavailable. |
| `{ro,en}/company/settings/billing` | Active-company subscription/billing readout; expanded sidebar | PARTIAL | Read-only fixture; all upgrade, payment, invoice, and billing-edit actions unavailable pending providers. |
| `{ro,en}/profile/companies` | Global-user accessible companies/create/switch; profile menu/switcher footer | PARTIAL | Local create/switch works; company-card ellipses have no management action. |
| `{ro,en}/reports` | Reports destination from visible sidebar item | MISSING | Sidebar control is semantically unavailable; no route or approved report interaction contract. |
| `{ro,en}/company/settings/profile` | Company Profile destination from settings submenu | MISSING | Submenu control is unavailable; no route/edit flow. |
| `{ro,en}/profile` and `/profile/invitations` | My Profile and My Invitations destinations from profile dropdown | MISSING | Both menu rows are unavailable; no screens or invitation source. |

There is no generic `/company/settings` page. `/` is Landing, not Dashboard. The authenticated Dashboard is `/dashboard`; all authenticated breadcrumbs inspected begin with a working Dashboard link, while Dashboard itself has no redundant breadcrumb. Supported sidebar and breadcrumb links preserve locale under both direct load and client navigation. Missing destinations are currently unavailable controls, not links that silently navigate to 404.

## 3. Interaction Inventory

The table accounts for all visible control **families**, including repeated rows and the two responsive instances of shell utilities. “Local” means state survives client navigation/locale switching where noted but not a reload. `—` in Priority means no E1 interaction gap for that family.

| # | Screen | Control / action | Current behavior | Expected behavior / destination or mutation | Status | Priority |
| ---: | --- | --- | --- | --- | --- | --- |
| 01 | Public shell | `DEBIRO` brand; RO/EN | Brand returns to Landing; locale changes corresponding route. | Same. | IMPLEMENTED | — |
| 02 | Landing | `Prețuri` | Scrolls to the teaser anchor. | Same for current teaser. | IMPLEMENTED | — |
| 03 | Landing | Header `Autentificare`; header/hero `Încearcă gratuit` | Locale-aware links navigate to existing Login/Onboarding and support keyboard activation and Back. | Same. | IMPLEMENTED | — |
| 04 | Landing | Product/Solutions/Resources dropdown-looking header controls | Unavailable; no menus. | Decide menu content/destinations, or remove interaction affordance until ready. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 05 | Landing | Hero video; three `Află mai multe`; `Vezi toate planurile` | Unavailable; no video, feature detail, or public pricing route. | Approve media/content/plan destinations or defer visibly. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 06 | Public/pre-auth | Help on Login/Onboarding; Terms/Privacy on Onboarding | Focusable unavailable buttons; no destinations. | Approve help and legal destinations; Terms acceptance should reference accessible terms. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 07 | Login | Email/password, validation, submit | Valid local input navigates to `/dashboard` without session. | Retain validation; authenticate/create a session only at auth integration. | PARTIAL | BACKEND_DEFERRED |
| 08 | Login | Password visibility; `Începe gratuit` | Toggle works; sign-up links to locale-matched `/onboarding`. | Same. | IMPLEMENTED | — |
| 09 | Login | `Ai uitat parola?` | Unavailable; no reset route. | Provider-backed reset/recovery contract. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 10 | Onboarding Step 1 | Company/user fields, password rules, terms checkbox, Continue | Required validation works; Continue enters Step 2. | Same locally; persist only after account implementation. | IMPLEMENTED | — |
| 11 | Onboarding Step 1 | Industry/size/country selects | Each has only one fixture option although visually a dropdown. | Product-approved option lists and saved values. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 12 | Onboarding Step 2 | Template radio choices; document checkboxes; Continue; Configure later | Choices are explicit/optional; skip clears draft; Continue requires ≥1 document. | Same E1 behavior. | IMPLEMENTED | — |
| 13 | Onboarding Step 3 | Add/remove supplier; Back; Dashboard exit | Validates incomplete rows; Back retains state; exit navigates Dashboard. | Same local flow; real account/vendor creation is not present. | PARTIAL | BACKEND_DEFERRED |
| 14 | Supplier portal | RO/EN; help anchor; mail/tel links | Route locale, in-page help, and OS links work. | Same. | IMPLEMENTED | — |
| 15 | Supplier portal | Missing-document file pickers | Validate type/size and create pending local metadata/active requirement reference. Approved/current files have no picker; rejection restores it. Shared uploaded-only progress updates after review; no transfer. | Actual scoped private upload after storage/token integration. | PARTIAL | BACKEND_DEFERRED |
| 16 | Supplier portal | Uploaded-row `...`; footer Privacy/Terms | All unavailable; no download/replace/remove policy or legal URL. | Decide document actions and legal destinations before enabling. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 17 | Authenticated shell | Sidebar Dashboard/Vendors/Documents/Requirements/Notifications links | Navigate and derive exactly one active section from pathname; RO/EN agree. | Same. | IMPLEMENTED | — |
| 18 | Authenticated shell | Company Settings expand/collapse and two built child links | Expansion persists across client navigation; direct child load reveals submenu; Members/Billing link. | Same. | IMPLEMENTED | — |
| 19 | Authenticated shell | Reports; Company Profile submenu | Visible but unavailable; corresponding routes 404. | Decide Reports MVP scope; design Company Profile. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 20 | Authenticated shell | Global search input and `⌘ K` hint | Accepts text only; no search results, command palette, or shortcut. | Decide global-search result/action UX; do not imply functioning search before then. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 21 | Authenticated shell | RO/EN, bell trigger, profile trigger, company-switch trigger | Locale navigation and popover/dialog toggles work on desktop/reduced shell. | Same. | IMPLEMENTED | — |
| 22 | Dashboard | Four KPI cards with chevrons | Static surfaces, not links/buttons; values remain fixture snapshots after Add Vendor/Document. | Decide drill-down destinations; make displayed totals coherent with local changes where represented. | PARTIAL | P0 — REQUIRED BEFORE E2 |
| 23 | Dashboard | `Vezi toate`, `Vezi detalii`, `Verifică și actualizează` | All panel/notice buttons unavailable. | Use existing Vendors/Documents/Notifications destinations where semantically correct; decide status drill-down. | MISSING | P0 — REQUIRED BEFORE E2 |
| 24 | Dashboard | Five attention-document `...` buttons | All unavailable. | Open an applicable document/review context or explicitly remove unsupported row action. | MISSING | P1 — COMPLETE BEFORE BACKEND IF PRACTICAL |
| 25 | Vendors | `Adaugă furnizor`, drawer Cancel/X/Escape, valid submit | Shared accessible drawer, validation, local record, Details navigation work. | Same E1 local path. | IMPLEMENTED | — |
| 26 | Vendors | Search, category/status filters, pagination/page size | Mutate current list locally; filtered empty text is shown. | Same. | IMPLEMENTED | — |
| 27 | Vendors | Unsupported bulk-selection affordance | Header/row checkboxes and selection state removed in E1-026A. | Keep removed until a bulk action is approved. | IMPLEMENTED | — |
| 28 | Vendors | Sortable table headers; shared search/filter controls | E1-026A1 semantic sorting composes with E1-027A shared immediate Category/Compliance filters, counted trigger and query-preserving Reset; unavailable extra-filter button removed. | Same E1 local contract; no advanced/lifecycle filters. | IMPLEMENTED | — |
| 29 | Vendors | Names and row `...` for Construct Pro and locally created rows | Names open Details; menus offer Open and Mark Inactive/Active. Lifecycle persists across client navigation/locales without changing compliance/data. | Same E1 local contract. | IMPLEMENTED | — |
| 30 | Vendors | Names and row `...` for other 23 fixture suppliers | All resolve identity-driven Details with safe absent data and the same Open/Active/Inactive menu. | Same E1 local contract. | IMPLEMENTED | — |
| 31 | Vendor Details | Breadcrumb; contact mail/tel/site; document search | Routes and OS/external links work; search filters rows. | Same. | IMPLEMENTED | — |
| 32 | Vendor Details | `Invită furnizor` on Construct Pro; invitation fields/toggles/copy/preview/Cancel | Form validates; copy and preview work; Send only says nothing was sent. | Keep demo honesty; real invitation/token/email later. | PARTIAL | BACKEND_DEFERRED |
| 33 | Vendor Details | `Invită furnizor` on a newly created vendor | E1-027B uses owned contacts, defaults to primary, supports local invitation simulation and safe Add Contact recovery; no arbitrary email or fabricated portal token. | Keep local simulation honest; real invitation/token/portal delivery later. | PARTIAL | BACKEND_DEFERRED |
| 34 | Vendor Details | `Adaugă document`; file/dropzone, metadata, extraction toggle, Cancel/submit | Validates and creates browser-memory metadata; exact fixture match may open local Review; bytes not stored. | Same E1 simulation; real private upload/extraction later. | PARTIAL | BACKEND_DEFERRED |
| 35 | Vendor Details | Documents/Contacts/Activity/Notes tabs | All tabs work: primary/contact CRUD, complete scoped audit projection with shared filters/pagination, and Notes Save/dirty-navigation/delete lifecycle. | Same company/vendor-owned E1 local contract. | IMPLEMENTED | — |
| 36 | Vendor Details | `Filtrează`, missing-row `Încarcă`, document-row `...`, Documents notice | E1-027 upload/removal/Review and E1-027A shared status filters work; E1-027B1 restores the current missing-requirement count, updated by upload/removal and hidden at zero, without the redundant notice action. | Same E1 local lifecycle and shared filters; no replacement notice CTA. | IMPLEMENTED | — |
| 37 | Vendor Details | Edit/archive vendor; change category/contact data | E1-026B reuses Add Vendor form for atomic metadata Save/Cancel, including category, seeded/local and inactive vendors. | Keep stable identity/history; E1-027 category edits warn but preserve configuration; archive remains unapproved. | PARTIAL | DESIGN_REQUIRED (archive only) |
| 38 | Documents | All/Needs Review tabs; review KPI; search; filters/reset; upload-date sort; pages | Work on fixture plus locally created rows; filtered/no-data states exist. | Same. | IMPLEMENTED | — |
| 39 | Documents | Name/row `...` for reviewable fixture/local simulated records | Both link to their own Review route. | Same. | IMPLEMENTED | — |
| 40 | Documents | Other row `...` and non-review document names | No Details/preview/download/renewal; row action unavailable, name plain text. | Provide an approved open/manage path for documents that are not awaiting review. | MISSING | P0 — REQUIRED BEFORE E2 |
| 41 | Review | Breadcrumb/back; zoom/expand; editable fields and validation | Navigate correctly; controls alter viewer/form locally; date/required checks work. | Same E1 UI. | IMPLEMENTED | — |
| 42 | Review | Reject, Save Draft, Confirm and Save | E1-028 approve/reject use one shared owned transaction, derive compliance and record one Activity/Audit event. Rejection retains history and reopens supplier upload. Draft remains form-local; reload resets E1 memory. | Same local review lifecycle; storage/durability later. | IMPLEMENTED | — |
| 43 | Review | Sample file viewer/local document preview | Fixture is HTML simulation; local file has filename-only notice because bytes are not stored. | Private viewer and document bytes require storage/authorization. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 44 | Requirements | Template search/selection; new-draft name/category/description; draft Cancel/Save/guard | Company-scoped local draft, uniqueness, at-least-one-document validation, and dirty-draft guard work. | Same E1 creation flow. | IMPLEMENTED | — |
| 45 | Requirements | Add Document drawer suggestion/custom modes; search/selection/rules/Cancel/Add | Both modes work; catalog names immutable; duplicates rejected; custom candidate marked pending after save. | Same E1 local contract. | IMPLEMENTED | — |
| 46 | Requirements | Existing document required/alert/validity controls; Save/Cancel | Rule edits are staged, saved, or canceled locally. | Same, with all template mutations following one transaction model. | IMPLEMENTED | — |
| 47 | Requirements | Edit existing template name/description/category | Metadata changes use the same validated, company-scoped draft as document rules; own name is allowed and duplicate names are blocked. | Same E1 local contract. | IMPLEMENTED | — |
| 48 | Requirements | Remove or edit an added document's name/issuer/details | Draft-only removal and custom metadata correction work; catalog names remain read-only. | Same E1 local contract. | IMPLEMENTED | — |
| 49 | Requirements | Add Document to an existing template, then `Anulează` | Add stages in the working copy; Cancel restores the committed count (`5 → 6 → 5`); Save commits the complete draft and deferred custom-candidate learning. | Same E1 local contract. | IMPLEMENTED | — |
| 50 | Requirements | `Previzualizare` tab | Read-only supplier presentation reflects staged documents, optionality and appearance with safe sample supplier/files; shared with Portal. | Same E1 preview; real supplier assignment remains separate. | IMPLEMENTED | — |
| 51 | Requirements | Template Duplicate and Delete | Header Duplicate opens a copied, independent create draft; footer Delete confirms before removing only the active company's template and selects a neighbor/empty state. | Same E1 local behavior; E1-027 snapshots/history survive source-template deletion. | IMPLEMENTED | — |
| 52 | Requirements/Vendors | Category matching and assignment | E1-027 explicitly applies one/multiple compatible company templates after a union preview; ID deduplication, independent rule snapshots, provenance chips and non-destructive category changes work. | Same E1 snapshot contract; automatic assignment/live synchronization remain deferred. | IMPLEMENTED | — |
| 53 | Requirements | Custom candidate catalog publishing | Candidate record is pending, not shown as published suggestion. | Deduplication/approval/publishing needs future catalog governance. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 54 | Notifications | Category tabs, range, summary/section `Vezi toate`, filtered reset, audit CSV | Local filters, expand/scroll, reset, and newest-first CSV download work. | Same E1 snapshot behavior. | IMPLEMENTED | — |
| 55 | Notifications | Operational rows and audit timeline | Read-only operational fixtures and fixture/local vendor audit records; no row actions/link to vendor or document. | Decide contextual destination for actionable records; audit history may remain read-only. | PARTIAL | P1 — COMPLETE BEFORE BACKEND IF PRACTICAL |
| 56 | Bell | Trigger, mark all read, supported review item, footer, Escape/outside | Works; read badges synchronize with sidebar/full Notifications during client navigation. | Same E1 local behavior. | IMPLEMENTED | — |
| 57 | Bell | Other five preview items | Static rather than linked; only one has a deterministic Review route. | Connect records with real destinations once those Details/Review routes exist. | PARTIAL | P1 — COMPLETE BEFORE BACKEND IF PRACTICAL |
| 58 | Bell/Notifications | Read history/delivery/audit after reload | Local read/audit state resets; operational notices remain fixture snapshots. | Durable read/delivery/audit records after backend/job integration. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 59 | Members & Access | Invite Member drawer, role choice, Cancel/X, submit | Validates and adds company-keyed pending invitation; billing seat count excludes pending. | Same E1 preview; email acceptance/provisioning later. | PARTIAL | BACKEND_DEFERRED |
| 60 | Members & Access | Every member `...` | Unavailable for active and pending members. | Decide role edit, resend/revoke invitation, and member removal permissions/confirmation. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 61 | Members & Access | Role-based authorization | Role is shown consistently, but no route/action gate is enforced. | Enforce company-scoped permissions at server boundary. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 62 | Plan & Billing | Upgrade, all invoices, billing update, card change, invoice download/`...` | Every operation is visibly unavailable; fixture readout and company-specific empty states work. | Provider-backed billing/invoice resources and authorized changes. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 63 | Plan & Billing | Invoice sort glyphs | Decorative arrows in column headings; no sorting controls. | Decide if local sort is useful before provider integration. | PARTIAL | P1 — COMPLETE BEFORE BACKEND IF PRACTICAL |
| 64 | Profile dropdown | Open/close, active company role, `Companiile mele` | Accessible popover and company link work. | Same. | IMPLEMENTED | — |
| 65 | Profile dropdown | My Profile, My Invitations, Help Center | Present but unavailable; profile/invitations routes 404 and no help URL. | Approve global-user profile/invitation/help contracts. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 66 | Profile dropdown | Logout | Unavailable because there is no session. | Real logout only with authentication. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |
| 67 | My Companies | Switch, Create tile, form/Cancel, duplicate-CUI validation | Local create activates new company; sidebar/profile/settings/plan update from shared company state. | Same E1 local behavior. | IMPLEMENTED | — |
| 68 | My Companies | Each company card `...` | Unavailable; no edit/archive/leave/company-details action. | Decide allowed company management operations, especially for non-admin members. | DESIGN_REQUIRED | DESIGN_REQUIRED |
| 69 | Company switcher | Open, pick company, My Companies footer, Escape/outside | Works; active workspace and displayed role update without changing URL. | Same. | IMPLEMENTED | — |
| 70 | Cross-screen | Alternate company after switch | Shell hides Demo-only Dashboard/Vendors/Documents/Notifications; Requirements and Settings are company-aware, but no vendor start action is exposed in empty workspace. | Decide and implement usable first-run company workspace without leaking Demo data. | PARTIAL | P0 — REQUIRED BEFORE E2 |
| 71 | Cross-screen | Local data ownership and summary projection | Templates, custom types and requirements are company-keyed; vendors/documents carry company ownership, with the alternate-company operational shell still gated; current Dashboard/vendor counts and notification expiry/missing sections now share E1 records/reference dates; historical operational notices retain separate read/delivery semantics. | Current-document demo projections are coherent in E1-028A; complete the alternate-company operational workspace, then replace local records with server adapters. | BUG / INCONSISTENT | P0 — REQUIRED BEFORE E2 |
| 72 | Data surfaces | Empty/filtered-empty states | Documents, Notifications, Requirements, new Vendor, alternate workspace, My Companies and invoices have contextual states; Vendors has a basic filtered-empty row. | Keep meaningful recovery where present; improve only when implementing the corresponding flow. | IMPLEMENTED | — |
| 73 | Data surfaces | Loading, network error, retry | None on synchronous fixture screens; form/file validation errors are local. | Introduce per-screen loading/error/retry with API and persistence, not preemptively. | INTENTIONALLY_DEFERRED | BACKEND_DEFERRED |

Items that merely display data—contact cards, static KPI copy, notification rows without interactive markup, status badges, banner art—were not counted as controls. Conversely, static chevrons/sort glyphs and `aria-disabled` buttons were counted because they visually promise an action. No live `href="#"`, empty `onClick`, console-only action, or link to a missing product route was found in the inspected production UI; the working `#preturi` and `#portal-help` anchors are intentional.

## 4. CRUD Coverage

“Local” means memory-only. “Fixture” means read-only seeded presentation data. The Gap column states MVP need, not a demand for full CRUD on every entity.

| Entity | Create | Read | Update | Delete / Archive | Gap |
| --- | --- | --- | --- | --- | --- |
| Vendor | Local Add Vendor | Details for every listed fixture/local identity; absent fields safely omitted | Atomic metadata/category editing, primary Contacts, threaded Notes and independent Active/Inactive lifecycle | Confirmed non-primary contacts and note threads only | Explicit snapshot assignment and contact-based Invite simulation work; real delivery and vendor archive/deletion remain separate. |
| Requirement Template | Local draft + Save and Duplicate, company-keyed | List/editor | Atomic metadata, appearance, and document/rule Save/Cancel | Confirmed local Delete | Read-only supplier Preview is implemented; assigned vendor snapshots/history survive source deletion. |
| Requirement Template Document | Catalog/custom Add in draft | Editor table | Required/alert/validity, custom metadata and appearance | Draft-only removal | Catalog names and appearance remain immutable; no global catalog publication. |
| Vendor Requirement | E1-027 confirmed snapshot assignment or manual catalog/custom upload | Vendor Documents table | Missing-row upload association; provenance union | Confirmed requirement removal, including an associated local upload | Independent from source templates; no live sync or authoritative compliance calculation. |
| Uploaded Document | Vendor Details/Supplier Portal local metadata create | Global/Vendor tables; Review for every pending record | E1-028 shared approve/reject, confirmed metadata and derived compliance | E1-027 associated-requirement deletion | Rejected records remain historical; supplier replacement creates a new identity. General non-review management/version UX still needs design. File bytes are not stored. |
| Member / Invitation | Local pending invitation | Company-keyed members; billing seat summary | None | None | Resend/revoke/role changes need UX/permission decision; email/acceptance/auth remain backend work. |
| Company | Local create and activate | Global My Companies, switcher, company settings | Active selection only | None | Company Profile edit route is missing; archive/leave policy needs design. |
| Notification | Fixture event only | Bell/full page; audit read-only | Mark all read locally | No deletion (not required) | Durable delivery/read/audit is backend; contextual links are useful when destinations exist. |

## 5. Missing Screens / Flows

| Name | Entry point and why it matters | Product/design decision needed? | Dependencies | Recommended task |
| --- | --- | --- | --- | --- |
| Vendor requirement assignment | E1-027 implements category-compatible multi-select, confirmed snapshot union, provenance/removal and upload. | Resolved by the approved E1-027 brief/mockup; automatic assignment/live sync remain out of scope. | E1-025A edit lifecycle, shared category IDs and local uploads. | E1-027 complete. |
| Vendor invite continuation | E1-027B connects owned contacts to local invitation simulation; noncanonical vendors have an honest unavailable-portal message instead of a fake token. | Local contact/simulation scope resolved by E1-027B; real token/delivery requires backend design. | Contacts, local vendor identity and requirement assignment. | Local flow complete; delivery deferred. |
| Existing template lifecycle | Atomic metadata/document/rule/appearance Save/Cancel, independent Duplicate, and confirmed Delete and read-only supplier Preview are implemented. | Resolved for snapshot assignments: source deletion preserves vendor requirements/history. | Existing Requirements state/drawer. | E1-025A/B/C/D and E1-027 complete. |
| Document management and renewal | Most Documents and Vendor rows cannot open; no replacement/history path. | Yes: non-review Details, file access, renewal/versions, destructive actions. | Shared review outcome, storage later. | E1-029 design gate. |
| Company Profile | Sidebar advertises it; no route to correct legal/contact/company information. | Yes; no canonical screen. | Global-user versus active-company ownership/permissions. | E1-030. |
| First-run alternate-company workspace | Create/switch works, but operational shell is a generic no-data screen with no vendor creation entry. | Yes for empty workspace entry and data ownership; do not leak Demo fixtures. | Company-scoped vendor/document state. | E1-031. |
| My Profile / My Invitations / Help | Profile and public menus advertise destinations that do not exist. | Yes; distinguish global-user invitations from outgoing company-member invitations. | Identity/invitation model and support/legal destinations. | E1-032. |
| Reports | Sidebar advertises it; `/reports` is 404 and no approved report mockup/requirements exist. | Yes: decide MVP inclusion or visibly defer/remove affordance; do not invent charts. | Product scope; later data/reporting backend if approved. | E1-033. |

## 6. Inert / Dead UI

Inventory rows **04–06, 09, 11, 16, 19–20, 22–24, 37, 40, 53, 57, 60, 62–63, 65–66, 68, 70** cover visually actionable controls that are inactive, incomplete, or lead to an incomplete flow. Not all are E1 coding tasks: provider-backed controls (for example Logout, invoice download, real upload) have a concrete service dependency; undefined menus/screens require design. In particular:

- Landing account-entry links are functional; remaining public marketing actions lack approved destinations or content.
- Dashboard panel links, most Dashboard row ellipses and most Global Documents ellipses do not provide a usable path (P0/P1 as inventoried). Vendor Contacts/Activity/Notes, requirement upload/removal and contact-based invitation simulation are implemented.
- Requirements `Previzualizare` is read-only and reflects current drafts; template Duplicate/Delete work as separate header/footer actions, while unrelated row ellipses remain deferred. The removed `Setări și aplicabilitate` tab must **not** be restored.
- Reports and Company Profile are unavailable sidebar controls; My Profile/My Invitations/Help/Logout are unavailable profile rows.
- My Companies company-card ellipses, Members row ellipses, Supplier Portal uploaded-row ellipses, Landing marketing controls, Login forgot-password, and Billing mutations are also unavailable for the reasons classified above.

An `aria-disabled` affordance prevents accidental navigation, but it is still visible and does not itself resolve the product gap. Repeated controls are grouped here; §3 states their behavior and disposition individually.

## 7. Intentionally Deferred

| Dependency | Current honest E1 behavior | Implement when |
| --- | --- | --- |
| Clerk identity/session and authorization | Login/Onboarding only route locally; roles are presentation data; Logout/reset inactive. | Auth and company-scoped permission boundary is implemented. |
| Backend/DB/API persistence | Vendor, document, template, company, invitation, and read-state mutations are browser-memory only; reload resets. | Domain/API ownership and persistence tasks begin. |
| Private document storage and supplier capability security | Internal Add Document retains metadata only; Supplier Portal selects files locally; demo token is a fixture lookup, not access control. | Authorized upload/download/versioning and scoped signed invitations exist. |
| OCR/AI and verification | Extraction is an exact deterministic demo prefill; Review confirmation is human confirmation, never authoritative verification. | Stored files, processing jobs, extraction provenance, and independent verification policy exist. |
| Email/reminders/notification delivery and audit durability | Invite Vendor says nothing sent; Invite Member adds pending local row; bell/read operate on fixtures, audit/CSV also include company-owned local vendor actions. | Email/job/event/audit services and authorization exist. |
| Billing/payment/invoices | Plan figures are company fixtures; upgrade/card/profile/download controls remain unavailable. | Payment provider, invoice resource, and billing permissions are approved. |
| Remote loading/error/retry | Fixture screens render synchronously and need no fake spinners or retry controls. | API-backed data fetching is integrated. |
| Advanced requirement applicability | One template category and one vendor category are the MVP contract; industry is descriptive. | Product approves multiple categories, location/country, conditional rules or automatic assignment. |

## 8. State / Data Consistency Findings

1. `company-state.ts` is the shared source for global current user, accessible companies, active company, and active membership. Profile, My Companies, switcher, Members, and Billing read it consistently. Memberships and subscription/billing belong to a company; profile identity is global. Local member invitations are keyed by company and do not consume seats until active.
2. `requirements-state.ts` is company-keyed and shares the same `VendorCategory` IDs as Add Vendor. E1-027 uses category equality for explicit company-owned template selection, never automatic assignment. New vendors start empty until configuration/upload, and category edits preserve snapshots/history. `Vendor.industry` is not used for matching, correctly.
3. `created-vendors.ts` holds seeded/created vendor lifecycle state and `created-documents.ts` holds local upload metadata with company ownership (legacy records default to Demo Company). E1-027 requirements/custom types are company-scoped; the authenticated shell still hides Demo-only operational pages in another workspace. A newly created company remains unable to start vendor/document work through that gated shell.
4. E1-028 seeds a shared current document dataset and associates configured Vendor Requirements by stable IDs. Approve/reject update Documents counts/Needs Review, Vendor Details rows/missing banner, configured Vendor compliance/list summaries and token-scoped Supplier Portal without refresh. Rejected records are retained but excluded from current projections; replacement has a new ID. Activity/Audit consume one company/vendor-owned resolution event. Template Preview remains illustrative, sharing only supplier presentation/progress semantics. E1-028A normalizes dates to one 2026 reference and derives current Dashboard/vendor metrics, completion/expiry and notification expiry/missing sections from the shared records. Historical operational notices retain read/delivery semantics; successful local audit actions also appear as recent activity without creating notifications.
5. Existing Requirements metadata, documents, rules, and custom metadata use one staged working copy. Save commits it and any new custom candidates together; Cancel restores committed state. Dirty-draft navigation protection covers both new and existing templates.
6. All module stores are process-local browser state. Direct reload resets created company/vendor/document/invitation/template and notification read changes; locally generated Details/Review URLs then show recovery states. This limitation is honestly documented, but E1 must not imply durability.
7. E1-027B Contacts and Notes use company/vendor IDs in the existing vendor store. Primary contacts synchronize Vendor Edit and Details summary; legacy vendor notes map to a general thread. Notes drafts protect thread/tab/navigation/Back/company changes, and no supplier portal exposes contacts or internal notes.

Normal/empty/loading/error coverage for the main data surfaces:

| Surface | Normal and empty behavior now | Loading / error classification |
| --- | --- | --- |
| Dashboard | Demo snapshot; alternate company shows no-data content without a usable vendor-start action (`NEEDED_BEFORE_BACKEND`, row 70). | Synchronous fixture; remote loading/error/retry `IMPLEMENT_WITH_BACKEND`. |
| Vendors and Vendor Details | Demo list, filtered-empty row, local-vendor Details and no-requirements state; alternate workspace cannot begin Add Vendor (`NEEDED_BEFORE_BACKEND`). Lost local ID has recovery link. | Synchronous fixture; remote loading/error/retry `IMPLEMENT_WITH_BACKEND`. |
| Documents and Review | Demo/local list and filtered-empty states; Review handles unsupported or lost local IDs, but non-review rows lack an open path (`NEEDED_BEFORE_BACKEND`). | Synchronous fixture; remote loading/error/retry `IMPLEMENT_WITH_BACKEND`. |
| Requirements | Existing templates, company-empty state with create action, compact empty-documents editor state, validation errors, and atomic existing-template Save/Cancel are present. | Synchronous fixture; remote loading/error/retry `IMPLEMENT_WITH_BACKEND`. |
| Notifications and bell | Fixture records, filter-empty state, read badges and local mark-all-read; alternate workspace no-data view. | Synchronous fixture; remote loading/error/retry `IMPLEMENT_WITH_BACKEND`. |
| Members, Billing and My Companies | Member/invitation rows or new-company membership, company-specific plan/invoice empty states, and at least one accessible company; local form errors are present. | Synchronous fixture; provider/network loading/error/retry `IMPLEMENT_WITH_BACKEND`. |
| Supplier portal | Token-scoped current requirements, shared Missing/In Review/Uploaded states, local metadata/validation feedback and unsupported-token 404; no real transfer progress or retry. | Secure upload progress/failure/retry `IMPLEMENT_WITH_BACKEND`. |

## 9. RO / EN Routing Findings

- All 14 implemented product route families rendered in both locales in the browser; locale controls preserved the corresponding route in inspected public, supplier, and authenticated shells. Existing sidebar/breadcrumb targets worked under direct and client navigation.
- The default `/` is Romanian Landing and `/en` is English Landing. Dashboard is `/dashboard` or `/en/dashboard`; no `Dashboard > Dashboard` breadcrumb appears.
- Named absent routes (`/reports`, `/company/settings/profile`, `/profile`, `/profile/invitations`) were 404 in both locales, but their current menu controls were unavailable rather than live broken links. Unknown supplier tokens and unknown fixture vendor/review IDs also 404 deliberately.
- E1-026A provides Details for all 24 listed vendor fixtures using only known metadata; only `construct-pro` has detailed document/contact fixtures. Only `construct-pro-tax-2024` has initial Review. Locally created supported IDs work within the current browser session; lost IDs have a return link.
- `Prețuri` and supplier `Vezi secțiunea de ajutor` use real in-page anchors. No production `href="#"` placeholder was found.
- English strings are working translations awaiting Product Owner approval, not a second approved copy contract.

## 10. Responsive Interaction Findings

At 320px, the Add Vendor, Add Document, Add Requirement Document, Invite Member, and Invite Vendor drawers finished their entrance animations fully inside the viewport (`left=0`, `right=320`) and remained internally scrollable. The bell, profile menu, and company switcher remained within the viewport. Existing targeted responsive E2E coverage exercises the wider breakpoint matrix and page-level containment. No new functional clipping, inaccessible required action, or impossible drawer scroll was observed in this audit. This is not a visual-fidelity reapproval or an E2 polish pass.

## 11. Recommended Remaining E1 Backlog

Order reflects dependencies. E1-024, E1-025A/B/C/D, E1-026A/B and E1-027/A/B are complete. E1-026A closes vendor Details coverage and local Active/Inactive lifecycle; E1-026B closes atomic metadata editing; E1-027B closes Contacts/Activity/threaded Notes and local contact-based invitation simulation. `DESIGN_REQUIRED first` is a gate, not permission to invent behavior. Sizes are estimates for the proposed scope, not detailed tickets.

| Order / proposed ID | Title | Priority | Size | Dependencies | DESIGN_REQUIRED first? | One-sentence scope |
| --- | --- | --- | --- | --- | --- | --- |
| 1 / E1-027B — local scope complete | Complete vendor invitation continuation | P0 | L | E1-026A/B Vendor list/Details/Add Vendor | Approved Contacts/Activity/Notes brief implemented | Contact-based local invitation simulation is connected; real token/email/portal delivery remains backend-deferred. |
| 2 / E1-027 — complete | Apply requirement templates to vendors | P0 | L | E1-025A, E1-026, shared category IDs | Approved brief/mockup implemented | Explicit multi-template snapshots, stable type IDs, provenance-only removal, requirement/upload deletion and category relevance warning. |
| 3 / E1-028 — complete | Propagate document review outcomes | P0 | L | Shared documents, Vendor Requirements, Activity/Audit | Approved lifecycle brief implemented | Company-scoped approve/reject, retained rejected history, replacement upload identity, derived counts/compliance and shared supplier states/progress; draft remains form-local. |
| 4 / E1-029 | Define document open, replacement and history | P0 | L | E1-028; storage later | Yes | Give non-review document rows a meaningful management path and define renewal/version behavior, while keeping bytes/backend deferred. |
| 5 / E1-030 | Design Company Profile and global-user destinations | P0 | M | Active-company/global-user boundary | Yes | Approve and implement the missing Company Profile route; separately decide My Profile/My Invitations/help URLs. |
| 6 / E1-031 | Enable a new company's operational workspace | P0 | L | E1-026/027, company-owned local data | Yes for first-run empty state | Allow a newly created/switched company to start its own vendor/requirements work without Demo data leakage. |
| 7 / E1-032 | Resolve secondary navigation and management menus | P1 | L | E1-026/029/030 | Yes | Assign outcomes or remove misleading affordances for row ellipses, bulk selection, sort/filter glyphs, member/company actions, and contextual notifications. |
| 8 / E1-033 | Decide public help/legal/marketing and Reports scope | P1 | S | Product/legal/content decisions | Yes | Approve destinations or explicit deferrals for public help/terms, video/features/pricing, and the visible Reports item; do not invent reports. |

The sequence intentionally does **not** include real auth, storage, email, OCR, payments, or backend-derived loading states as E1 UI tasks. P0 design-gated rows cannot begin implementation until Product Owner decisions exist. The exact boundary between a local E1 simulation and later backend behavior must remain visibly honest.

## Decision Output

**READY BEFORE E2:** implemented route shells, locale navigation, and Landing account-entry links (E1-024); Login/Onboarding local validation; accessible shared drawers/popovers; Add Vendor, all listed Vendor Details/name links, Open/Active/Inactive menus and removal of unsupported selection (E1-026A), atomic vendor metadata/category editing (E1-026B), explicit snapshot-based template assignment/upload/removal (E1-027), shared authenticated search/filters (E1-027A) and Contacts/Activity/Notes with contact-based invitation simulation (E1-027B); shared approve/reject outcomes, supplier replacement upload, current counts/compliance and Activity/Audit resolution (E1-028); Add Document, Create Template, atomic existing-template editing, appearance, duplicate, delete and supplier Preview (E1-025A/B/C/D), Invite Member, Create/Switch Company local happy paths; Documents/Vendors/Notifications filters; bell mark-all-read; audit CSV.

**IMPLEMENT BEFORE E2:** document management/renewal path (E1-029); Company Profile and usable new-company workspace (E1-030/031). Shared Review outcomes are complete in E1-028, and vendor contact-based invitation simulation and Contacts/Activity/Notes are complete in E1-027B; delivery remains deferred. The design-gated parts require approval first.

**DESIGN FIRST:** vendor archive; document open/replacement/history; Company Profile; first-run company workspace; member/company row actions; My Profile/My Invitations/help/legal/marketing destinations; Reports inclusion versus explicit deferral.

**DEFER TO BACKEND:** identity/session/logout/reset, permissions, durable company/vendor/template/document/invitation state, secure supplier tokens and file storage, real extraction/verification, email/reminders, persistent notification/audit history, payment and invoice resources, remote loading/error/retry.

**OPTIONAL / LATER:** advanced applicability and automatic assignment, bulk supplier operations unless approved, marketing video/feature detail and Reports implementation unless product scope explicitly elevates them. Visible inactive controls still need a deliberate presentation/destination decision.
