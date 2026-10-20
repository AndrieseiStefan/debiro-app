import {documentAccess} from '@/features/documents/document-access';
import type {CreatedDocument} from '@/features/documents/created-documents';
import {companyDocumentList} from '@/features/company-documents/company-documents-state';
import {companyDocumentMetrics, sortCompanyDocuments} from '@/features/company-documents/projections';
import type {CompanyDocumentsState} from '@/features/company-documents/types';
import {employeeAccess, employeeDocumentWorkspace, employeeWorkspace} from '@/features/employees/employees-state';
import {employeeDocumentMetrics, employeeListDocumentMetrics, projectEmployeeDocuments} from '@/features/employees/employee-document-projections';
import {employeeName} from '@/features/employees/projections';
import type {EmployeeState} from '@/features/employees/types';
import {vendorListItems, type useVendorState} from '@/features/vendors/created-vendors';
import {getVendorRequirements, type VendorRequirementsWorkspace} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import type {AuditEvent, NotificationDomain} from '@/features/notifications/types';
import {notificationWorkspace, type WorkspaceActivity} from '@/features/notifications/workspace-projections';
import {projectDashboard} from './projections';
import type {DashboardViewModel} from './types';

export const dashboardPreviewLimit = 5;
export type OverviewExpiration = {id: string; domain: NotificationDomain; name: string; owner: string; expiresAt: string; daysRemaining: number; href?: string; requirementId?: string; documentId: string};
export type OverviewActivity = WorkspaceActivity & {context: string};
type Input = {base: DashboardViewModel; vendorState: ReturnType<typeof useVendorState>; requirements: Record<string, VendorRequirementsWorkspace>; documents: CreatedDocument[]; companyDocuments: CompanyDocumentsState; employees: EmployeeState; events: AuditEvent[]};

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
  const unified = notificationWorkspace(companyId, locale, input);
  const activity: OverviewActivity[] = unified.activity.map((item) => ({...item, context: item.domain === 'employee' ? item.entityName : [item.entityName, item.description[locale]].filter(Boolean).join(' — ')}));
  const expirations: OverviewExpiration[] = unified.attention.filter((item) => item.status === 'expiring_soon' && item.documentId && item.expiresAt).map((item) => ({id: item.id, domain: item.domain, name: item.documentName[locale], owner: item.domain === 'company_document' ? '' : item.entityName, expiresAt: item.expiresAt!, daysRemaining: item.daysRemaining!, documentId: item.documentId!, requirementId: item.requirementId, ...(item.domain === 'company_document' && item.requirementId ? {} : {href: item.href})}));
  return {available: access.visible, canManage: access.replace, vendorView, vendorError, vendorPreview, inactiveVendors: vendors.filter((vendor) => vendor.lifecycleStatus === 'inactive').length,
    company: {...company, metrics: companyMetrics, preview: companyPreview, expiring: company.rows.filter((row) => row.status === 'expiring_soon').length, valid: company.rows.filter((row) => row.status === 'valid').length},
    employees: {total: staff.employees.length, active: activeEmployees.length, inactive: staff.employees.length - activeEmployees.length, metrics: employeeMetrics, tracking: employeeTracking, restricted: !personnel.manage, error: staff.error || personnel.manage && employeeMetrics.error, preview: employeePreview},
    activity: activity.slice(0, dashboardPreviewLimit),
    expirations: expirations.slice(0, dashboardPreviewLimit)};
}
export type WorkspaceOverview = ReturnType<typeof workspaceOverview>;
