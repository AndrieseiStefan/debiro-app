import {getActiveCompany, readCompanyState} from '@/features/companies/company-state';
import {documentAccess} from '@/features/documents/document-access';
import {activeDocuments, type CreatedDocument} from '@/features/documents/created-documents';
import {documentDetailsHref, documentManagementHref} from '@/features/documents/document-management';
import {companyDocumentList} from '@/features/company-documents/company-documents-state';
import type {CompanyDocumentsState, CompanyDocumentWorkspace} from '@/features/company-documents/types';
import {employeeAccess, employeeWorkspace, employeeDocumentWorkspace, companyEmployeeActivity} from '@/features/employees/employees-state';
import {projectEmployeeDocuments} from '@/features/employees/employee-document-projections';
import {employeeName} from '@/features/employees/projections';
import type {EmployeeState} from '@/features/employees/types';
import type {EmployeeActivity} from '@/features/employees/employee-document-types';
import {vendorListItems, type getVendorState} from '@/features/vendors/created-vendors';
import {getVendorRequirements, type VendorRequirementsWorkspace} from '@/features/vendors/vendor-requirements';
import {calendarDaysUntil, fixtureReferenceTime} from '@/lib/fixture-clock';
import {companyAuditEvents, companyNotifications} from './company-projections';
import {activityIcons, attentionCopy, employeeEventCopy} from './presentation';
import {notificationsFixture} from './fixtures';
import type {AuditEvent, LocalizedText, NotificationActivityItem, NotificationDomain, NotificationsViewModel} from './types';

export type WorkspaceSources = {vendorState: ReturnType<typeof getVendorState>; requirements: Record<string, VendorRequirementsWorkspace>; documents: CreatedDocument[]; companyDocuments: CompanyDocumentsState; employees: EmployeeState; events: AuditEvent[]};
export type WorkspaceAttention = {id: string; companyId: string; domain: NotificationDomain; entityId: string; entityName: string; documentName: LocalizedText; requirement: LocalizedText; requirementId?: string; documentId?: string; required: boolean; status: 'missing' | 'expired' | 'needs_review' | 'expiring_soon'; expiresAt: string | null; daysRemaining: number | null; href?: string};
export type WorkspaceActivity = {id: string; sourceId: string; companyId: string; entityId: string; entityName: string; action: LocalizedText; description: LocalizedText; occurredAt: string; actorName?: string; actorId?: string | null; actorType: 'user' | 'system'; eventType: AuditEvent['eventType']; requirementId?: string; documentId?: string; dateOnly?: boolean; href?: string} & ({domain: 'employee'; event: EmployeeActivity} | {domain: 'vendor' | 'company_document'; event: AuditEvent});
const validTime = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const localized = (value: LocalizedText | undefined): value is LocalizedText => typeof value?.ro === 'string' && typeof value?.en === 'string';
const distinct = <T extends {id: string}>(items: T[]) => [...new Map(items.map((item) => [item.id, item])).values()];
const orderedActivity = (a: WorkspaceActivity, b: WorkspaceActivity) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.id.localeCompare(b.id);

/** Authorized read-side composition only: no recording, timestamp repair or store writes. */
export function notificationWorkspace(companyId: string, locale: 'ro' | 'en', input: WorkspaceSources, fixtures: Pick<NotificationsViewModel, 'notifications' | 'auditEvents'> = notificationsFixture) {
  const access = documentAccess(companyId), personnel = employeeAccess(companyId);
  const companyName = getActiveCompany(readCompanyState())?.company.id === companyId ? getActiveCompany(readCompanyState())!.company.name : '';
  const attention: WorkspaceAttention[] = [], activity: WorkspaceActivity[] = [];
  let vendors: ReturnType<typeof vendorListItems> = [], documents: CreatedDocument[] = [];
  const errors = {vendor: false, company: false, employee: false, activity: !Array.isArray(input.events)};
  if (access.visible) try {
    vendors = vendorListItems(input.vendorState, companyId);
    documents = input.documents.filter((item) => item && item.companyId === companyId && vendors.some((vendor) => vendor.id === item.vendorId));
    const current = activeDocuments(documents, companyId);
    for (const vendor of vendors) {
      const requirements = getVendorRequirements(input.requirements, companyId, vendor.id).requirements;
      for (const requirement of requirements) {
        if (requirement.companyId !== companyId || requirement.vendorId !== vendor.id || !localized(requirement.name)) continue;
        const record = current.find((item) => item.vendorId === vendor.id && item.id === requirement.uploadedDocumentId);
        if (!record && requirement.required) attention.push({id: `vendor:${requirement.id}`, companyId, domain: 'vendor', entityId: vendor.id, entityName: vendor.name, documentName: requirement.name, requirement: requirement.description ?? requirement.name, requirementId: requirement.id, required: true, status: 'missing', expiresAt: null, daysRemaining: null, href: `/vendors/${vendor.id}`});
      }
      for (const record of current.filter((item) => item.vendorId === vendor.id)) {
        const status = record.complianceStatus;
        if (!['expired', 'needs_review', 'expiring_soon'].includes(status) || !localized(record.documentName)) continue;
        const requirement = requirements.find((item) => item.uploadedDocumentId === record.id);
        const days = record.expiresAt && validTime(record.expiresAt) ? calendarDaysUntil(record.expiresAt) : null;
        if (status === 'expiring_soon' && (days === null || !Number.isFinite(days) || days < 0)) continue;
        attention.push({id: `vendor:${requirement?.id ?? record.id}`, companyId, domain: 'vendor', entityId: vendor.id, entityName: vendor.name, documentName: record.documentName, requirement: requirement?.name ?? record.documentName, requirementId: requirement?.id, documentId: record.id, required: requirement?.required ?? false, status: status as WorkspaceAttention['status'], expiresAt: days === null ? null : record.expiresAt, daysRemaining: days, href: record.complianceStatus === 'needs_review' && !access.review ? documentManagementHref(record, `/vendors/${vendor.id}`) : documentDetailsHref(record, `/vendors/${vendor.id}`)});
      }
    }
  } catch {errors.vendor = true;}
  function ownedRows(domain: 'company_document' | 'employee', entityId: string, entityName: string, workspace: CompanyDocumentWorkspace, rows: ReturnType<typeof companyDocumentList>['rows']) {
    for (const row of rows) {
      if (row.status === 'valid' || row.status === 'missing' && !row.required || domain === 'employee' && (row.status === 'needs_review' || row.status === 'expired' && !row.required)) continue;
      const requirement = workspace.requirements.find((item) => item.id === row.requirementId);
      const record = workspace.documents.find((item) => item.id === row.currentDocumentId);
      const days = row.expiresAt && validTime(row.expiresAt) ? calendarDaysUntil(row.expiresAt) : null;
      if (row.status === 'expiring_soon' && (days === null || !Number.isFinite(days) || days < 0)) continue;
      attention.push({id: `${domain === 'company_document' ? 'company' : 'employee'}:${domain === 'employee' ? `${entityId}:` : ''}${row.id}`, companyId, domain, entityId, entityName, documentName: record?.documentName ?? requirement!.name, requirement: requirement?.name ?? record!.documentName, requirementId: row.requirementId ?? undefined, documentId: row.currentDocumentId ?? undefined, required: row.required, status: row.status, expiresAt: days === null ? null : row.expiresAt, daysRemaining: days, href: domain === 'employee' ? `/company/employees/${encodeURIComponent(entityId)}` : '/company/documents'});
    }
  }
  if (access.visible) try {
    const projected = companyDocumentList(input.companyDocuments, companyId, locale);
    errors.company = projected.error;
    if (!projected.error && projected.rows.length) ownedRows('company_document', companyId, companyName, input.companyDocuments.byCompany[companyId], projected.rows);
  } catch {errors.company = true;}
  const staff = personnel.manage ? employeeWorkspace(companyId, input.employees) : {employees: [], error: false};
  if (personnel.manage) try {
    errors.employee = staff.error;
    for (const employee of staff.employees.filter((item) => item.employmentStatus === 'active')) {
      const owned = employeeDocumentWorkspace(companyId, employee.id, input.employees);
      if (!owned) {errors.employee = true; continue;}
      const projected = projectEmployeeDocuments(owned, companyId, employee.id, locale);
      if (projected.error) {errors.employee = true; continue;}
      ownedRows('employee', employee.id, employeeName(employee), owned, projected.rows);
    }
  } catch {errors.employee = true;}
  if (access.visible) for (const event of companyAuditEvents(companyId, input.events, fixtures.auditEvents)) {
    if (!event || event.domain === 'employee' || event.eventType === 'employee_created' || event.eventType === 'employee_edited' || typeof event.id !== 'string' || !event.id.trim() || !validTime(event.occurredAt) || !localized(event.action) || !localized(event.description) || !Object.hasOwn(activityIcons, event.eventType) || !['user', 'system'].includes(event.actorType) || event.actorName !== undefined && typeof event.actorName !== 'string' || event.domain !== undefined && !['vendor', 'company_document'].includes(event.domain)) continue;
    const domain = event.domain ?? (event.vendorId ? 'vendor' : 'company_document');
    const vendor = vendors.find((item) => item.id === event.vendorId), record = documents.find((item) => item.id === event.documentId && item.vendorId === event.vendorId);
    const entityId = event.vendorId ?? companyId;
    const href = domain === 'vendor' ? record ? record.complianceStatus === 'needs_review' && !access.review ? documentManagementHref(record, `/vendors/${record.vendorId}`) : documentDetailsHref(record, `/vendors/${record.vendorId}`) : vendor ? `/vendors/${vendor.id}` : undefined : event.domain === 'company_document' || event.documentId || event.requirementId ? '/company/documents' : undefined;
    activity.push({...event, id: `${domain === 'vendor' ? 'vendor' : 'company'}:${event.id}`, sourceId: event.id, domain, entityId, entityName: vendor?.name ?? (domain === 'company_document' ? companyName : ''), href, event});
  }
  if (personnel.manage) for (const event of companyEmployeeActivity(companyId, input.employees)) {
    const employee = staff.employees.find((item) => item.id === event.employeeId);
    const copy = employeeEventCopy(event.type);
    if (!copy) continue;
    const owned = input.employees.byCompany[companyId]?.documentWorkspaces?.[event.employeeId];
    const documentName = Array.isArray(owned?.documents) ? owned.documents.find((item) => item.id === event.documentId)?.documentName : undefined;
    activity.push({id: `employee:${event.id}`, sourceId: event.id, companyId, domain: 'employee', entityId: event.employeeId, entityName: employee ? employeeName(employee) : '', eventType: event.type as AuditEvent['eventType'], action: copy, description: localized(documentName) ? documentName : {ro: '', en: ''}, occurredAt: event.occurredAt, actorId: event.actorId, actorName: event.actorName, actorType: 'user', documentId: event.documentId, requirementId: event.requirementId, href: employee ? `/company/employees/${encodeURIComponent(employee.id)}` : undefined, event});
  }
  const currentAttention = distinct(attention).toSorted((a, b) => (a.expiresAt ?? '\uffff').localeCompare(b.expiresAt ?? '\uffff') || `${a.domain}:${a.entityId}`.localeCompare(`${b.domain}:${b.entityId}`) || (a.requirementId ?? a.id).localeCompare(b.requirementId ?? b.id));
  const events = distinct(activity).toSorted(orderedActivity);
  const referenceTime = events.reduce((latest, event) => Date.parse(event.occurredAt) > Date.parse(latest) ? event.occurredAt : latest, fixtureReferenceTime);
  const notifications: NotificationActivityItem[] = access.visible ? companyNotifications(companyId, input.events, vendors, fixtures.notifications).filter((item) => item && (item.domain !== 'employee' || personnel.manage) && (item.domain === undefined || ['vendor', 'company_document', 'employee'].includes(item.domain)) && typeof item.id === 'string' && item.id.trim() && typeof item.isUnread === 'boolean' && validTime(item.occurredAt) && localized(item.title) && localized(item.description) && Object.hasOwn(activityIcons, item.type) && (item.entityName === undefined || typeof item.entityName === 'string') && (item.vendorName === undefined || typeof item.vendorName === 'string') && (item.documentName === undefined || localized(item.documentName))).map((item) => {
    const owner = events.find((event) => event.sourceId === item.id || event.id === item.id || event.sourceId === item.id.replace(/^notice-/, 'audit-'));
    const record = documents.find((record) => record.id === item.documentId && record.vendorId === item.vendorId);
    return {...item, domain: owner?.domain ?? item.domain ?? 'vendor', entityId: owner?.entityId ?? item.entityId ?? item.vendorId, entityName: owner?.entityName ?? item.entityName ?? item.vendorName, href: owner?.href ?? (record ? record.complianceStatus === 'needs_review' && !access.review ? documentManagementHref(record, `/vendors/${record.vendorId}`) : documentDetailsHref(record, `/vendors/${record.vendorId}`) : vendors.some((vendor) => vendor.id === item.vendorId) ? `/vendors/${item.vendorId}` : undefined)};
  }) : [];
  // Employee operations remain actual Activity/Audit, not new user notifications.
  // Current state is informational, not an event/delivery. It has no invented
  // occurrence time or unread flag and is never admitted to Activity/Audit/CSV.
  notifications.push(...currentAttention.filter((item) => item.domain === 'company_document' || item.domain === 'employee' && item.required).map((item): NotificationActivityItem => ({id: `attention:${item.id}:${item.status}:${item.documentId ?? 'missing'}`, companyId, domain: item.domain, entityId: item.entityId, entityName: item.entityName, documentId: item.documentId, requirementId: item.requirementId, documentName: item.documentName, type: 'status_changed', title: attentionCopy(item.status), description: {ro: `${item.documentName.ro} — ${item.entityName}`, en: `${item.documentName.en} — ${item.entityName}`}, isUnread: false, occurredAt: '', actor: 'system', sourceKind: 'attention', href: item.href})));
  return {attention: currentAttention, activity: events, notifications: distinct(notifications), referenceTime, errors};
}

export function activityNotification(item: WorkspaceActivity): NotificationActivityItem {
  const type = item.eventType === 'document_replaced' ? 'document_upload' : ['document_confirmed', 'document_rejected', 'document_marked_expired', 'metadata_updated'].includes(item.eventType) ? 'status_changed' : Object.hasOwn(activityIcons, item.eventType) && !['employee_created', 'employee_edited', 'template_applied', 'vendor_invited', 'vendor_edited', 'vendor_active', 'vendor_inactive', 'requirement_removed'].includes(item.eventType) ? item.eventType as NotificationActivityItem['type'] : 'other';
  return {id: item.id, companyId: item.companyId, domain: item.domain, entityId: item.entityId, entityName: item.entityName, type, title: item.action, description: item.description, occurredAt: item.occurredAt, actor: item.actorType, actorName: item.actorName, documentId: item.documentId, documentName: item.documentId && (item.description.ro || item.description.en) ? item.description : undefined, isUnread: false, sourceKind: 'activity', dateOnly: item.dateOnly, href: item.href};
}

export function workspaceAuditEvents(items: WorkspaceActivity[]): AuditEvent[] {
  return items.map((item) => ({...('eventType' in item.event ? item.event : {}), id: item.sourceId, companyId: item.companyId, domain: item.domain, entityId: item.entityId, entityName: item.entityName, eventType: item.eventType, action: item.action, description: item.description, occurredAt: item.occurredAt, actorType: item.actorType, actorId: item.actorId, actorName: item.actorName, requirementId: item.requirementId, documentId: item.documentId, dateOnly: item.dateOnly}));
}
