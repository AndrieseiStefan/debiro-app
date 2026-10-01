# Current Status

**Project stage:** Canonical UI implementation underway; full MVP epic sequence pending

**Visible brand:** DEBIRO (text-only; technical identifiers remain `debiro`)

**Primary domain:** `debiro.ro`

**Market focus:** Romania first

**Domain strategy:** Single domain

**Technical stack:** Accepted in [ADR-0002](../decisions/0002-application-architecture-and-stack.md), with authentication revised by [ADR-0003](../decisions/0003-cost-and-auth-architecture-review.md). The frontend foundation and all twenty-six approved fixture/browser-local canonical mockup states are implemented; backend/auth integrations are not.

## Design state

Twenty-six approved product mockups are tracked in `docs/design/mockups/`. They are canonical contracts requiring:

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
- E1-004 canonical Vendors List at `/vendors` (Romanian) and `/en/vendors` (English), reusing the authenticated shell with typed presentation fixtures and local list controls; see [vendors](../features/vendors.md)
- E1-005 canonical Vendor Details at `/vendors/construct-pro` and `/en/vendors/construct-pro`, with a dynamic fixture-backed route, document search, and list-to-details navigation; see [vendor details](../features/vendor-details.md)
- E1-006/E1-023/E1-025A/B/C/D Document Requirements at `/requirements` and `/en/requirements`, with company-scoped browser-memory templates, atomic template/document/rule and appearance editing, catalog/custom Add Document drawer, local template duplicate/delete, read-only supplier Preview reflecting current drafts, and Save-only custom-candidate learning; see [requirements](../features/requirements.md)
- E1-007 canonical Invite Vendor drawer from Vendor Details, with local form validation and a deterministic demo link but no email delivery; see [invite vendor](../features/invite-vendor.md)
- E1-008 canonical Supplier Upload Portal at `/upload/demo-construct-pro` and `/en/upload/demo-construct-pro`, with an external-supplier layout, typed token fixture, shared Preview/Portal requirement presentation, and browser-local file selection only; see [supplier upload portal](../features/supplier-upload-portal.md)
- E1-009 canonical Document Review at `/documents/construct-pro-tax-2024/review` and `/en/documents/construct-pro-tax-2024/review`, with typed document/extraction fixtures and browser-local human review only; see [document review](../features/document-review.md)
- E1-010 canonical Notifications and Audit Activity at `/notifications` and `/en/notifications`, with separate typed operational/audit fixtures, local filters, timeline, and CSV export; see [notifications and audit](../features/notifications-audit.md)
- E1-011 canonical Documents page at `/documents` and `/en/documents`, with typed document-to-vendor summary fixtures, local list controls, and a link to the existing review fixture; see [documents](../features/documents.md)
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

All twenty-six tracked canonical mockup states have fixture/browser-local implementations; product-owner visual approval remains pending. The complete epic sequence through MVP remains undocumented and should be finalized as a separate planning checkpoint before broader backlog execution. The UI foundation is documented in [UI foundation](../design/ui-foundation.md).
