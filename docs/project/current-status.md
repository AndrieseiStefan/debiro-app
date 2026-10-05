# Current Status

**Project stage:** Canonical UI implementation underway; full MVP epic sequence pending

**Visible brand:** DEBIRO (text-only; technical identifiers remain `debiro`)

**Primary domain:** `debiro.ro`

**Market focus:** Romania first

**Domain strategy:** Single domain

**Technical stack:** Accepted in [ADR-0002](../decisions/0002-application-architecture-and-stack.md), with authentication revised by [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md). The frontend foundation and the experiences represented by all thirty approved mockups have fixture/browser-local implementations, with documented unsupported actions; backend/auth integrations are not.

## Design state

Thirty approved product mockups are tracked in `docs/design/mockups/`. They are canonical contracts requiring:

- UI fidelity as close to 1:1 as technically practical
- Interaction fidelity as close to 1:1 as technically practical
- Exact approved Romanian product copy
- Close reproduction of typography and visual treatment
- Replacement of placeholder branding with uppercase `DEBIRO`

The final logo is not yet designed and must not be invented.

## Implemented

- Canonical repository documentation and project-memory rules
- High-level product, roadmap, design, decision, and development guidance
- An accepted, documented architecture/stack and cost model; no external providers provisioned
- Next.js/React/strict TypeScript application scaffold with CSS Modules and semantic mockup-derived tokens
- Romanian-default and English `next-intl` routing, foundation and implemented-screen catalogs, typed view-data convention
- Reusable low-level UI/layout primitives, accessibility baseline, Vitest/RTL and Playwright test tooling, deterministic visual capture, development-only design-system preview
- E1-001 canonical landing page at `/` (Romanian) and `/en` (English), using a typed static dashboard preview and no provider data; see [landing page](../features/landing-page.md)
- E1-024 public account entry links from Landing to existing locale-matched Login and Onboarding routes, without authentication or persistence
- E1-002/E1-012 canonical three-step onboarding at `/onboarding` (Romanian) and `/en/onboarding` (English), using typed fixtures and browser-local interactions only; Steps 2 and 3 are optional and no data is persisted or sent; see [onboarding](../features/onboarding.md)
- E1-014 canonical existing-user login at `/login` and `/en/login`, using local form validation and fixture-backed Dashboard navigation without a real session or social sign-in; see [login](../features/login.md)
- E1-003 canonical dashboard overview at `/dashboard` (Romanian) and `/en/dashboard` (English), using an independent authenticated app shell and deterministic view fixture; see [dashboard](../features/dashboard.md)
- E1-004/E1-026A/A1 Vendors List at `/vendors` and `/en/vendors`, with local search/category/compliance filters, five-column semantic sorting, pagination/page size, name-to-Details links for every vendor, contextual Open/Active/Inactive actions and active-only compliance summaries; unsupported bulk selection is removed; see [vendors](../features/vendors.md)
- E1-005/E1-026A/B/E1-027 Vendor Details at `/vendors/[vendorId]` and `/en/vendors/[vendorId]`, with identity-driven coverage for all listed vendors, safe absent-data states, inactive indicators, shared-form atomic metadata editing, local document search and snapshot-based template application/upload/removal; see [vendor details](../features/vendor-details.md)
- E1-006/E1-023/E1-025A/B/C/D Document Requirements at `/requirements` and `/en/requirements`, with company-scoped browser-memory templates, atomic template/document/rule and appearance editing, catalog/custom Add Document drawer, local template duplicate/delete, read-only supplier Preview reflecting current drafts, and Save-only custom-candidate learning; see [requirements](../features/requirements.md)
- E1-027A shared authenticated SearchInput, FilterTrigger and responsive FilterPanel; Vendors category/compliance, Vendor Documents status and Global Documents existing filters apply immediately, expose active counts and preserve search on Reset; Requirements searches reuse the same input; see [search/filter contract](../design/ui-foundation.md#authenticated-search-and-filters-e1-027a)
- E1-027 vendor requirement template application — multi-select/confirmation, identity-based deduplication, independent snapshots/provenance, company custom document types, missing-row upload, explicit requirement/document removal and category-change relevance warning; browser-memory only; see [vendor requirements](../features/vendor-requirements.md)
- E1-027B Vendor Contacts, complete vendor-scoped Activity and threaded Notes — company/vendor-owned primary-contact synchronization and contact-based Invite simulation, shared local audit events/search/filters/pagination and plain-text Save/dirty-navigation/delete lifecycle. E1-027B1 restores the live missing-requirement banner, removes the duplicate empty-note action and makes titles explicitly editable with new-draft focus/selection; browser-memory only; see [vendor details](../features/vendor-details.md#contacts-activity-and-notes-e1-027b)
- E1-028 shared document review lifecycle — company/vendor-owned approve/reject transactions, retained rejected-upload history, replacement identities, separate supplier requirement/internal compliance states, live Documents and configured Vendor compliance/counts, Supplier Portal progress and one shared Activity/Audit resolution event; tab-local browser memory only; see [vendor requirements](../features/vendor-requirements.md#shared-review-lifecycle-e1-028)
- E1-028A coherent fixture dates and derived aggregates — one 2026-10-02 demo reference, UTC expiry/countdown labels, current Documents/Vendors/Dashboard metrics, actual completion and next-expiry values, shared Notifications expiry/missing and Activity/Audit projections; existing lifecycle/optionality rules preserved, no invented requirements or backend behavior; see [fixture data](fixture-data.md)
- E1-028A1 requirement-driven vendor compliance — shared List/Details/Dashboard projection, Noncompliant → Attention → Compliant precedence, owned current requirement references only, optional missing/expired exclusions and Compliant for zero configured requirements; file ratios remain informational and inactive summary rules unchanged; see [vendor requirements](../features/vendor-requirements.md#shared-review-lifecycle-e1-028)
- E1-029 shared document details/actions, internal renewal with new current identities and retained version history, current-only projections, role/company checks and traceable Activity/Audit; supplier uploads still require review and actual selected bytes are tab-memory only; see [document management](../features/document-management.md)
- E1-029E version-ID-owned file retention/download, exact previous/rejected upload bytes preserved through renewal/re-upload, independent real demo PDFs for every seeded version including both ISU versions, active company/vendor/membership checks and safe failed-download feedback; no durable storage is introduced; see [document management](../features/document-management.md#access-and-file-limits)
- E1-029A/B/C/D canonical wide Document Details with six information rows, single-icon compliance badges, file/actions cards and a three-version compact preview, including a two-version ISU fixture; full History uses the canonical compact timeline, current-version menu only and read-only historical rows with actual-file Download. History and current Details retain same-drawer Back navigation with selected context and focus preserved. Manual expire/general deletion remain visibly disabled without approved contracts; see [document management](../features/document-management.md#canonical-details-and-drawer-navigation-e1-029ab)
- E1-007 canonical Invite Vendor drawer from Vendor Details, with local form validation and a deterministic demo link but no email delivery; see [invite vendor](../features/invite-vendor.md)
- E1-008 canonical Supplier Upload Portal at `/upload/demo-construct-pro` and `/en/upload/demo-construct-pro`, with an external-supplier layout, typed token fixture, shared Preview/Portal requirement presentation and local upload metadata feeding the E1-028 review lifecycle; file bytes are retained only in private tab memory, never sent or stored on a server; see [supplier upload portal](../features/supplier-upload-portal.md)
- E1-009 canonical Document Review at `/documents/construct-pro-tax-2024/review` and `/en/documents/construct-pro-tax-2024/review`, with typed document/extraction fixtures and browser-local human review only; see [document review](../features/document-review.md)
- E1-010 canonical Notifications and Audit Activity at `/notifications` and `/en/notifications`, with separate typed operational/audit fixtures, local filters, timeline, and CSV export; see [notifications and audit](../features/notifications-audit.md)
- E1-011 canonical Documents page at `/documents` and `/en/documents`, with a shared seeded/current document dataset, derived counts, local list controls and Review routes for every pending record; see [documents](../features/documents.md)
- E1-015 Add Vendor drawer from Vendors, using shared drawer mechanics with Invite Vendor and browser-memory vendors shown in the existing list/details screens; see [add vendor](../features/add-vendor.md)
- E1-016 Add Document drawer from Vendor Details, using shared drawer mechanics, local file validation/metadata, exact-match demo extraction, and browser-memory document mapping into Vendor Details, Documents, and Review; see [add document](../features/add-document.md)
- E1-017 bell notification preview in the authenticated shell, reusing E1-010 activity, with derived unread counts and browser-local mark-all-read state; see [notifications and audit](../features/notifications-audit.md)
- E1-018 Company Settings > Members & Access at `/company/settings/members` and `/en/company/settings/members`, with company-scoped fixture memberships, an Invite Member drawer, and browser-local pending invitations; see [company members and access](../features/company-members-access.md)
- E1-019 Company Settings > Plan & Billing at `/company/settings/billing` and `/en/company/settings/billing`, reusing the active company's E1-018 membership counts for seat usage and showing fixture billing, payment, plan, and invoices without real payment operations; see [company plan and billing](../features/company-plan-billing.md)
- E1-020 global-user profile dropdown in the authenticated shell, reusing the current-user, active-company membership, and accessible-company fixture data without fake destinations or logout; see [profile dropdown](../features/profile-dropdown.md)
- E1-021/022 My Companies at `/profile/companies` and `/en/profile/companies`, a shared browser-memory accessible-company and active-workspace source, local company creation, and a sidebar company switcher; see [My Companies](../features/my-companies.md)
- Landing-page CTA alignment and visible brand casing standardized to `DEBIRO`; the three-mode responsive contract, shared centered 1350px page shell, shared 66px public header, stacked hero reflow, and boundary/safety viewport regression matrix are implemented in [UI foundation](../design/ui-foundation.md#page-shell-contract)

## Architecture decision

TypeScript/Node.js 24 LTS, Next.js App Router modular monolith, typed fixture-to-real view boundary, same-origin JSON/API service boundary, Neon managed PostgreSQL with Drizzle, Clerk identity/sessions only, debiro-owned organization tenancy and PostgreSQL RLS, private R2 EU documents, pg-boss jobs drained by Railway cron, Poppler/Tesseract text processing, gated OpenAI structured extraction, Resend email, `next-intl`, Railway EU West hosting, Vitest and Playwright. The revised Initial MVP model is ~$18.7/month gross at 60% Neon activity (~$26.5 always-active ceiling); US identity/email transfer review remains a production gate. See [architecture](../architecture/README.md), [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md), and the [dated cost model](../architecture/cost-model.md).

## Not implemented

- Functional onboarding persistence, accounts, and invitation delivery
- Product-owner visual approval and approved regression baselines
- Backend or API
- Database, schemas, or migrations
- Authentication or authorization
- Document storage or upload system
- Document processing, OCR, or AI extraction
- Real notification delivery, email, or scheduled reminders; persistent audit history
- Billing

## Next

The experiences represented by all thirty tracked canonical mockups have fixture/browser-local implementations with documented unsupported actions; product-owner visual approval remains pending. The complete epic sequence through MVP remains undocumented and should be finalized as a separate planning checkpoint before broader backlog execution. The UI foundation is documented in [UI foundation](../design/ui-foundation.md).
