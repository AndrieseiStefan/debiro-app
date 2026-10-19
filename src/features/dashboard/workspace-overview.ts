import {documentAccess} from '@/features/documents/document-access';
import {activeDocuments, type CreatedDocument} from '@/features/documents/created-documents';
import {documentDetailsHref, documentManagementHref} from '@/features/documents/document-management';
import {approvedCompliance} from '@/features/documents/compliance';
import {companyDocumentList} from '@/features/company-documents/company-documents-state';
import {companyDocumentMetrics, sortCompanyDocuments} from '@/features/company-documents/projections';
import type {CompanyDocumentsState} from '@/features/company-documents/types';
import {employeeAccess, employeeDocumentWorkspace, employeeWorkspace, getEmployeeActivity} from '@/features/employees/employees-state';
import {employeeDocumentMetrics, employeeListDocumentMetrics, projectEmployeeDocuments} from '@/features/employees/employee-document-projections';
import {employeeName} from '@/features/employees/projections';
import type {EmployeeState} from '@/features/employees/types';
import {vendorListItems, type useVendorState} from '@/features/vendors/created-vendors';
import {getVendorRequirements, type VendorRequirementsWorkspace} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import {companyAuditEvents} from '@/features/notifications/company-projections';
import {notificationDocuments} from '@/features/notifications/document-projections';
import type {AuditEvent} from '@/features/notifications/types';
import type {EmployeeActivity} from '@/features/employees/employee-document-types';
import {activityIcons} from '@/features/notifications/presentation';
import {calendarDaysUntil, fixtureReferenceTime} from '@/lib/fixture-clock';
import {projectDashboard} from './projections';
import type {DashboardViewModel} from './types';

export const dashboardPreviewLimit = 5;
type Domain = 'vendor' | 'company_document' | 'employee';
export type OverviewExpiration = {id: string; domain: Domain; name: string; owner: string; expiresAt: string; daysRemaining: number; href?: string; requirementId?: string; documentId: string};
export type OverviewActivity = {id: string; occurredAt: string; dateOnly?: boolean; href?: string} & ({domain: 'vendor'; event: AuditEvent; context: string} | {domain: 'employee'; event: EmployeeActivity; context: string});
type Input = {base: DashboardViewModel; vendorState: ReturnType<typeof useVendorState>; requirements: Record<string, VendorRequirementsWorkspace>; documents: CreatedDocument[]; companyDocuments: CompanyDocumentsState; employees: EmployeeState; events: AuditEvent[]};
const timestamp = (value: string) => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Read-only composition of the dedicated directories' selectors. Never records or repairs data. */
export function workspaceOverview(companyId: string, locale: 'ro' | 'en', input: Input) {
  const access = documentAccess(companyId), personnel = employeeAccess(companyId);
  const collator = new Intl.Collator(locale, {sensitivity: 'base', numeric: true});
  let vendorError = false;
  let vendors: ReturnType<typeof vendorListItems> = [];
  let documents: CreatedDocument[] = [];
  try {if (access.visible) {
    const owned = vendorListItems(input.vendorState, companyId);
    documents = input.documents.filter((document) => document && document.companyId === companyId && owned.some((vendor) => vendor.id === document.vendorId));
    vendors = owned.map((vendor) => projectVendorDocuments(vendor, getVendorRequirements(input.requirements, companyId, vendor.id), documents, companyId));
  }} catch {vendorError = true;}
  // Existing chart counts/percentages and Vendor directory lifecycle rules remain authoritative.
  let vendorView: DashboardViewModel;
  try {vendorView = projectDashboard(input.base, companyId, vendors, input.requirements, vendorError || !access.visible ? [] : documents, []);} catch {vendorError = true; vendorView = projectDashboard(input.base, companyId, [], {}, [], []);}
  const severity = {noncompliant: 0, attention: 1, compliant: 2};
  const vendorPreview = vendors.filter((vendor) => vendor.lifecycleStatus === 'active' && vendor.status !== 'compliant').toSorted((a, b) => severity[a.status] - severity[b.status] || (a.nextExpiry.date ?? '\uffff').localeCompare(b.nextExpiry.date ?? '\uffff') || collator.compare(a.name, b.name) || a.id.localeCompare(b.id)).slice(0, dashboardPreviewLimit);
  const company = access.visible ? companyDocumentList(input.companyDocuments, companyId, locale) : {rows: [], error: false};
  const companyMetrics = companyDocumentMetrics(company.rows);
  const companyAttention = company.rows.filter((row) => row.status === 'missing' ? row.required : row.status !== 'valid');
  const companyPreview = sortCompanyDocuments(companyAttention, {column: 'status', direction: 'ascending'}, locale).slice(0, dashboardPreviewLimit);
  const staff = personnel.visible ? employeeWorkspace(companyId, input.employees) : {employees: [], error: false};
  const employeeEntries = staff.employees.map((employee) => {
    // Do not even read restricted personnel workspaces/events for an ordinary member.
    const owned = personnel.manage ? employeeDocumentWorkspace(companyId, employee.id, input.employees) : null;
    const projected = owned && projectEmployeeDocuments(owned, companyId, employee.id, locale);
    return {employee, name: employeeName(employee), href: `/company/employees/${encodeURIComponent(employee.id)}`, rows: projected?.rows ?? [], metrics: projected && !projected.error ? employeeDocumentMetrics(projected.rows) : null};
  });
  const employeeMetrics = employeeListDocumentMetrics(staff.employees, new Map(employeeEntries.map((entry) => [entry.employee.id, entry.metrics])));
  const activeEmployees = employeeEntries.filter((entry) => entry.employee.employmentStatus === 'active');
  const employeeTracking = personnel.manage && !staff.error && !employeeMetrics.error ? {
    total: activeEmployees.length,
    complete: activeEmployees.filter((entry) => entry.metrics?.tracking === 'complete').length,
    attention: activeEmployees.filter((entry) => entry.metrics?.tracking === 'attention').length,
    not_configured: activeEmployees.filter((entry) => entry.metrics?.tracking === 'not_configured').length
  } : null;
  // Presentation urgency uses projected required-row statuses, never another tracking/expiry rule.
  const attentionStatuses = ['expired', 'missing', 'expiring_soon'] as const;
  const employeePreview = activeEmployees.filter((entry) => entry.metrics?.tracking === 'attention').map((entry) => {
    const status = attentionStatuses.find((status) => entry.rows.some((row) => row.required && row.status === status));
    const issues = entry.rows.filter((row) => row.required && row.status === status);
    return {...entry, attention: status ? {status, count: issues.length, deadline: issues.flatMap((row) => row.expiresAt ? [row.expiresAt] : []).sort()[0] ?? null} : null};
  }).toSorted((a, b) => attentionStatuses.indexOf(a.attention?.status ?? 'expiring_soon') - attentionStatuses.indexOf(b.attention?.status ?? 'expiring_soon') || (a.attention?.deadline ?? '\uffff').localeCompare(b.attention?.deadline ?? '\uffff') || collator.compare(a.name, b.name) || a.employee.id.localeCompare(b.employee.id)).slice(0, dashboardPreviewLimit);
  const current = access.visible && !vendorError ? activeDocuments(documents, companyId) : [];
  const activity: OverviewActivity[] = [];
  if (access.visible) for (const event of companyAuditEvents(companyId, input.events.filter((event) => event && event.companyId === companyId))) {
    // E1 demo reminder delivery is unavailable: never promote seeded delivery claims.
    if (!event || !timestamp(event.occurredAt) || event.eventType === 'reminder' || !Object.hasOwn(activityIcons, event.eventType) || typeof event.action?.[locale] !== 'string' || typeof event.description?.[locale] !== 'string') continue;
    const vendor = vendors.find((item) => item.id === event.vendorId);
    const document = documents.find((item) => item.id === event.documentId);
    const href = document ? document.complianceStatus === 'needs_review' && !access.review ? documentManagementHref(document, `/vendors/${document.vendorId}`) : documentDetailsHref(document, `/vendors/${document.vendorId}`) : vendor ? `/vendors/${vendor.id}` : undefined;
    activity.push({id: `vendor:${event.id}`, domain: 'vendor', event, occurredAt: event.occurredAt, dateOnly: event.dateOnly, context: [vendor?.name, event.description?.[locale]].filter(Boolean).join(' — '), href});
  }
  if (personnel.manage) for (const entry of employeeEntries) for (const event of getEmployeeActivity(companyId, entry.employee.id)) {
    activity.push({id: `employee:${event.id}`, domain: 'employee', event, occurredAt: event.occurredAt, context: entry.name, href: entry.href});
  }
  const expirations: OverviewExpiration[] = [];
  if (access.visible && !vendorError) for (const item of notificationDocuments(companyId, vendors, input.requirements, documents).expiringDocuments) {
    const document = current.find((document) => document.id === item.id), vendor = vendors.find((vendor) => vendor.id === item.vendorId);
    if (document && vendor && timestamp(item.expiresAt) && item.daysRemaining >= 0) expirations.push({id: `vendor:${item.id}`, domain: 'vendor', name: item.documentName[locale], owner: vendor.name, expiresAt: item.expiresAt, daysRemaining: item.daysRemaining, documentId: item.id, href: documentDetailsHref(document, `/vendors/${vendor.id}`)});
  }
  if (access.visible && !company.error) for (const row of company.rows) {
    const record = input.companyDocuments.byCompany[companyId]?.documents.find((item) => item.id === row.currentDocumentId);
    const requirement = input.companyDocuments.byCompany[companyId]?.requirements.find((item) => item.id === row.requirementId);
    if (record?.expiresAt && approvedCompliance(record.expiresAt, requirement?.expiryWarningDays ?? 30, fixtureReferenceTime, record.manuallyExpiredAt) === 'expiring_soon') expirations.push({id: `company:${row.id}`, domain: 'company_document', name: row.name, owner: '', expiresAt: record.expiresAt, daysRemaining: calendarDaysUntil(record.expiresAt), documentId: record.id, requirementId: row.requirementId ?? undefined, ...(!row.requirementId && {href: '/company/documents'})});
  }
  if (personnel.manage) for (const entry of employeeEntries.filter((entry) => entry.employee.employmentStatus === 'active')) for (const row of entry.rows) {
    if (row.status === 'expiring_soon' && row.currentDocumentId && row.expiresAt) expirations.push({id: `employee:${entry.employee.id}:${row.id}`, domain: 'employee', name: row.name, owner: entry.name, expiresAt: row.expiresAt, daysRemaining: calendarDaysUntil(row.expiresAt), documentId: row.currentDocumentId, href: entry.href});
  }
  return {available: access.visible, canManage: access.replace, vendorView, vendorError, vendorPreview, inactiveVendors: vendors.filter((vendor) => vendor.lifecycleStatus === 'inactive').length,
    company: {...company, metrics: companyMetrics, preview: companyPreview, expiring: company.rows.filter((row) => row.status === 'expiring_soon').length, valid: company.rows.filter((row) => row.status === 'valid').length},
    employees: {total: staff.employees.length, active: activeEmployees.length, inactive: staff.employees.length - activeEmployees.length, metrics: employeeMetrics, tracking: employeeTracking, restricted: !personnel.manage, error: staff.error || personnel.manage && employeeMetrics.error, preview: employeePreview},
    activity: [...new Map(activity.map((event) => [event.id, event])).values()].toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)).slice(0, dashboardPreviewLimit),
    expirations: expirations.toSorted((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id.localeCompare(b.id)).slice(0, dashboardPreviewLimit)};
}
export type WorkspaceOverview = ReturnType<typeof workspaceOverview>;
