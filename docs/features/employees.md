# Employee Management (E1C-005)

## Scope and shared presentation

`/company/employees` and `/en/company/employees` replace Coming Soon. Existing Company sidebar routes, dimensions, disclosures, active state and Company-rooted breadcrumbs are unchanged. The list composes shared PageHeader/primary action, document-density SummaryMetricCard, SearchInput, compact SelectField, DataTable styling, Avatar, StatusBadge, RowActionMenu, Button, Tooltip and Pagination. Pagination optionally accepts localized noun labels; existing document consumers retain their defaults.

The supplied mockup filenames are reversed: `employee-details.png` depicts the list, while `employees-list.png` depicts full Details. The pictured list and `employee-create-drawer.png` define this story's composition; originals are preserved. Explicit task requirements supersede illustrative document counts/ratios/deadlines/compliance, document filters, mandatory department and restrictive job-title selection. Shared typography/control geometry is reused, not recreated. Full document Details remains deferred.

Total Employees includes inactive records. Document KPIs show a dash and **Nesetat / Not Configured**, with shared hover/focus/touch Tooltip explanations. Rows distinguish neutral document configuration from actual Active/Inactive employment status. No document count, ratio, deadline or compliance is inferred. Bulk document download and reminders are focusable unavailable controls, never fake operations.

## Domain, state and authorization

`Employee`: stable ID, mandatory company ID, first/last name, company-unique email, optional phone, free-text job title, optional department ID, ISO hire date, employment status, creation/update timestamps. Creating one never creates a user or membership. Job title is not an application role.

`Department`: stable ID, mandatory company ID, name, creation/update timestamps. There is no global department catalog. Names retain original display formatting.

Names are trimmed/required/1–80 characters; job title is required/1–100. Email must be valid, at most 254 characters and case-insensitively unique inside the company; another company may use the same email. Optional phone accepts international/free-form text up to 32 characters. Hire date must be a real ISO calendar date. The UI reuses the established `DD.MM.YYYY` Field/parser, not a new date picker. New department names are trimmed/1–80 and case-insensitively unique per company.

`debiro.employees-session` uses the existing company-keyed `browserSession` convention. Client navigation, locale changes, module reinitialization and switch/return preserve tab-memory records. Reload/new tabs restore fixtures; this is not backend/durable persistence. Only Demo Company has eight deterministic fictional employees and owned departments. Other/new companies start empty. Existing company/vendor/template/document/sharing/review/compliance state is not reset or migrated.

Reads require active current-user membership in the active company. Writes require the existing Administrator company-management permission, not a generic document permission. Operations recheck access and record/department ownership. Reviewer/Viewer membership does not grant employee management. Foreign/stale IDs disclose no employee data. Malformed workspaces show a recoverable unavailable state without repair/overwrite. These E1 client checks are not a production authorization boundary.

`employees-state` owns list/get/create/update/status operations and department reads. Inline department creation is inside the employee save transaction, not an independent UI mutation: failed validation/save publishes neither record. A case-equivalent department created since opening is reused at save time. Editing preserves employee ID, company, creation timestamp and future extra associations. Inactive employees remain available/editable; there is no hard delete or reminder delivery.

## Interactions

Search reuses `normalizeDocumentName` for whitespace, case and diacritics over name/email/job title/resolved department. Employment status and owned-department filters compose with search. Name (default ascending), job title, department and status sorting use deterministic ID tiebreaks without mutating stored order. Pagination uses 10/20/50. Individual/all-visible selection persists across pages with deselect all. Company switching uses the existing Dashboard redirect and keyed workspace to clear selections/drawers/drafts without losing owned data.

One Add/Edit form uses shared Drawer/DrawerHeader, Surface, Field/SelectField and Buttons, with Personal Information and Professional Details sections. Job title accepts new free text and company-derived suggestions. Department supports existing, proposed inline creation and none. No general form autocomplete existed: a feature-local suggestion field composes shared Field/menu styling and the established combobox/listbox keyboard pattern. Arrows select, Enter confirms, Escape dismisses suggestions before the Drawer, and Tab leaves naturally. Shared close/backdrop, focus trapping/restoration, scroll locking and responsive mechanics remain intact. Failed saves retain values and localized errors; repeated submissions are guarded; success follows only committed changes.

`/company/employees/[employeeId]` displays owned name, job title, department, email/phone, hire date and employment status plus an honest document-unavailable notice. Invalid/foreign IDs show the same safe unavailable state and return link. No employee personnel information is added to public routes or logs.

## Deferred integration boundary

Employee documents, employee template application, compliance, active-employee reminders and Dashboard/Notifications/Global Search integration remain subsequent E1C work. Existing employee-scoped template definitions are untouched and not applied automatically. No medical, payroll, leave or full HR functionality is introduced.

Future E2 endpoints (documentation only): `GET/POST /employees`, `GET/PATCH /employees/:id`, `GET/POST /departments`. Server-side authenticated company resolution must authorize personnel access separately from generally shared company documents, enforce ownership/uniqueness and commit employee/department creation atomically. Errors: invalid data 400, unauthenticated 401, forbidden 403, absent/inaccessible employee/department 404, duplicate/conflicting state 409. No HTTP endpoints are implemented here.

## Validation

Unit/component tests cover field/date limits, unique emails, atomic department reuse/rollback, stable edit identity/associations, permissions, malformed state, isolation, session lifetime, normalized filtering, immutable sorting, pagination/selection, unavailable metrics/actions, free-text/keyboard suggestions, retained errors and owned Details. Production E2E covers RO/EN create/edit/status/details, validation, switching, empty/read-only companies, optional department, pagination, keyboard/focus and responsive containment. Ignored review captures: `artifacts/visual/e1c-005/` at 1920/1448/1280/1024/768/375/320px. Existing Vendor/Company Document/sharing/template/sidebar/company/search suites remain regression coverage.
