# Company-wide Dashboard (E1C-007A)

`/dashboard` and `/en/dashboard` implement [the approved redesign](../design/mockups/dashboard-redesign.png). The existing authenticated shell, company switcher, search, bell, profile menu, locale-aware routing and shared PageHeader remain unchanged. The header uses the approved generic DEBIRO greeting and company-overview description; there is no duplicate company selector/date picker, general Add Vendor CTA, old compliance callout or mountain banner. The Landing miniature Dashboard is unchanged.

## Presentation and reuse

Three linked `SummaryMetricCard` overview variants lead to Vendors, Company Documents and Employees. This opt-in variant composes the same Surface, AppIcon, native locale-aware link and focus/hover treatment; existing Dashboard/Documents/directory variants retain their geometry. Secondary counts are labeled independently, not forced into artificial mutually exclusive categories.

Desktop has three domain panels and two lower previews. At the existing 1199px boundary, the domain grid uses two columns with Employees spanning the row; below 768px it stacks. Activity and expirations use one column on reduced widths. A local container query wraps row metadata when a panel has at most 300px of content width, including narrow desktop columns, without squeezing names, hiding text or adding nested table scrolling. Existing Surface, SectionAction, Avatar, EmptyState/ErrorState, VendorComplianceBadge and document StatusBadge conventions are reused. Every preview is capped at five, without pagination or internal vertical scrolling.

The existing native CSS Vendor donut is retained. Its counts come from the same Vendor projection as the directory. Inactive vendors remain included in Total but excluded from the directory's active compliance counts; their remaining donut segment is neutral and explicitly labeled Inactive, never silently colored Noncompliant. The missing-requirement pseudo-category is not another Vendor compliance status.

## Read-only data contracts

`workspace-overview.ts` composes existing company-scoped selectors; it creates no store, entity, event, API, migration, dependency or status model. Vendor rows reuse `projectVendorDocuments`, `getVendorRequirements`, `vendorSummary` through the existing Dashboard projection. The directory's zero-requirement Compliant rule and active/inactive definitions are preserved. Attention vendors are ordered by existing severity, next document deadline, localized name and ID. Their file ratio is the existing informational directory ratio, never the source of compliance.

Company Documents uses `companyDocumentList`, `companyDocumentMetrics` and existing status sorting. Total counts current uploaded versions, while Attention also includes missing required requirements; optional missing rows are excluded. Expiring Soon is a labeled overlapping subset, not an independent exclusive category. Historic/rejected/superseded versions do not become listing rows. Document rows open the existing authorized CompanyDocumentManager in the exact requirement context, including missing requirements; legacy unbound rows use their existing Company Documents destination. No new query-parameter/deep-link protocol or details implementation is introduced.

Employees uses `employeeWorkspace`, `projectEmployeeDocuments`, `employeeDocumentMetrics` and `employeeListDocumentMetrics` exactly as the directory. Total includes inactive employees; Attention/Expiring Soon use the existing active-only definitions. Attention is required-document based, never review based. Zero requirements remain Not Configured; optional missing requirements do not create Attention. Preview ordering favors active/actionable employees, then deadline/name/ID. Entries use existing Employee Details routes. Existing first-vendor setup remains available inside the empty Vendors panel only to authorized company Administrators.

## Activity coverage and navigation

Recent Activity merges existing company-filtered Vendor audit records (`companyAuditEvents`, fixture and actual local audit records) with authorized `getEmployeeActivity` records. Original source IDs, actors, localized actions, actual timestamps and date-only provenance are preserved. IDs are namespaced/deduplicated; newest timestamp and stable ID determine the five-item preview. Seeded reminder-delivery claims are excluded because E1 delivery is unavailable. No new events are recorded, and metadata is never turned into invented historical activity.

Available Vendor/document contexts use existing Details/Review/History routes and permissions. Employee events use the owned Employee Details route. Events whose original entities no longer exist remain readable without broken navigation. The existing Notifications audit anchor (`/notifications#audit-title`) is used by View All Activity.

Current gap: Company Document lifecycle operations do not record audit events. This task does not synthesize them or change recording logic. Employee activity is recorded separately and is not yet present in Notifications. Notifications' domain extension and complete activity coverage belong to E1C-007B; its layout/filters/exports are unchanged here. Global Search remains unchanged and its additional-domain coverage belongs to E1C-007C.

## Upcoming expirations

Vendor expirations reuse `notificationDocuments`; Company and Employee entries reuse validated current listing rows. The existing `approvedCompliance` utility and configured requirement warning intervals determine Company date eligibility independently of review state (so a pending-review Company file can still have an upcoming date). Employee effective statuses already provide the no-review expiry projection. `calendarDaysUntil` and `localizedDate` retain the shared deterministic E1 clock and localization. No new hardcoded warning window is introduced.

Only current, non-rejected/non-superseded versions with genuinely upcoming dates are included; expired/manual-expired records are excluded. Employee expirations preserve active-only metrics and private access. Entries are ordered by actual expiry then stable domain/entity identity and capped at five. Vendor files use their existing Vendor/document destination; Company entries open the same Company manager; Employee files use their existing owning Details page because no document-specific Employee deep link exists. View All uses `/notifications#expiring-section`, not a misleading Vendor Documents-only destination. Notifications currently covers Vendor expirations only; unified coverage remains an explicit E1C-007B gap.

## Authorization, isolation and recovery

Existing active membership/document access gates Vendor/Company data. Employee document workspaces, private metric calculations, activity and expirations are read only after the existing Administrator personnel check; ordinary members receive the same restricted treatment as Employees. Basic Employee name/job-title navigation retains its established membership access. Restricted document names, counts and events are not hidden in tooltips/DOM attributes. Company switches recompute all inputs and unmount scoped document UI; no previous-company data is retained on Dashboard. No sessions are reset or rewritten.

Malformed Company/Employee data uses local existing error states without crashing other domains. Vendor projection failures are isolated likewise. Invalid event dates are ignored; missing entities have no broken action. Empty companies retain all five panels and truthful zero/empty states. No artificial loading or random/current-clock display values are introduced during render. E1 browser checks are not production server authorization.

## Validation

Unit/component coverage compares metrics with dedicated selectors, current versions and warning intervals, five-item limits (zero/below/exactly/above), deterministic sorting/deduplication, actual activity/no fabricated approval, Not Configured semantics, malformed sources, permissions and company isolation. Production browser tests cover existing exact document contexts, directory/section navigation, keyboard focus, direct/client layout equivalence, empty/populated company switching, Employee privacy, real file actions and RO/EN responsive containment. Comparison captures are ignored under `artifacts/visual/e1c-007a/` at 1920/1448/1280/1024/768/375/320px, not approved screenshot baselines. Development-only preview routes retain their production restriction.
