import type {CreatedDocument} from '@/features/documents/created-documents';
import {notificationDocuments} from '@/features/notifications/document-projections';
import type {AuditEvent} from '@/features/notifications/types';
import {vendorSummary} from '@/features/vendors/created-vendors';
import {getVendorRequirements, type VendorRequirementsWorkspace} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import type {VendorListItem} from '@/features/vendors/types';
import {fixtureReferenceTime, localizedDate, calendarDaysUntil} from '@/lib/fixture-clock';
import type {DashboardViewModel} from './types';

export function projectDashboard(view: DashboardViewModel, companyId: string, vendors: VendorListItem[], workspaces: Record<string, VendorRequirementsWorkspace>, records: CreatedDocument[], events: AuditEvent[]): DashboardViewModel {
  const projected = vendors.map((vendor) => projectVendorDocuments(vendor, getVendorRequirements(workspaces, companyId, vendor.id), records, companyId));
  const counts = vendorSummary(projected);
  const percent = (value: number) => counts.all ? Math.round(value / counts.all * 100) : 0;
  const {missingDocuments, expiringDocuments} = notificationDocuments(companyId, vendors, workspaces, records);
  const expired = records.filter((document) => (document.companyId ?? 'demo-company') === companyId && document.reviewOutcome === 'approved' && document.complianceStatus === 'expired');
  const attention = [...expired.map((document) => ({id: document.id, supplier: document.vendorName, document: document.documentName, status: 'expired' as const, expiry: localizedDate(document.expiresAt!)})),
    ...expiringDocuments.map((document) => ({id: document.id, supplier: document.vendorName, document: document.documentName, status: 'expiring' as const, expiry: localizedDate(document.expiresAt)})),
    ...missingDocuments.map((document) => ({id: document.id, supplier: document.vendorName, document: document.documentName, status: 'missing' as const, expiry: {ro: '—', en: '—'}}))];
  const recent = events.filter((event) => ['document_upload', 'document_expiring', 'vendor_added'].includes(event.eventType)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 4);
  return {...view, suppliers: {...view.suppliers, total: counts.all, compliant: counts.compliant, attention: counts.attention, noncompliant: counts.noncompliant,
    // Missing requirements are already represented by the existing compliance categories.
    missingDocuments: 0, percentages: {compliant: percent(counts.compliant), attention: percent(counts.attention), noncompliant: percent(counts.noncompliant), missingDocuments: 0}},
    documentsRequiringAttention: attention,
    recentActivity: recent.map((event) => {const days = calendarDaysUntil(event.occurredAt, fixtureReferenceTime);
      const time = new Intl.DateTimeFormat('ro-RO', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'}).format(new Date(event.occurredAt));
      return {id: event.id, kind: event.eventType === 'document_upload' ? 'uploaded' : event.eventType === 'document_expiring' ? 'expiring' : 'added',
        supplier: vendors.find((vendor) => vendor.id === event.vendorId)?.name ?? '—', document: event.eventType === 'vendor_added' ? undefined : event.description,
        time: event.dateOnly ? localizedDate(event.occurredAt) : days === 0 ? {ro: `azi, ${time}`, en: `today, ${time}`} : days === -1 ? {ro: `ieri, ${time}`, en: `yesterday, ${time}`} : localizedDate(event.occurredAt)};})};
}
