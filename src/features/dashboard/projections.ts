import {activeDocuments, type CreatedDocument} from '@/features/documents/created-documents';
import {attentionComplianceStatuses} from '@/features/documents/attention';
import type {AuditEvent} from '@/features/notifications/types';
import {vendorSummary} from '@/features/vendors/created-vendors';
import {getVendorRequirements, type VendorRequirementsWorkspace} from '@/features/vendors/vendor-requirements';
import {projectVendorDocuments} from '@/features/vendors/projections';
import type {VendorListItem} from '@/features/vendors/types';
import {fixtureReferenceTime, localizedDate, calendarDaysUntil} from '@/lib/fixture-clock';
import type {DashboardDocumentStatus, DashboardViewModel} from './types';

export function projectDashboard(view: DashboardViewModel, companyId: string, vendors: VendorListItem[], workspaces: Record<string, VendorRequirementsWorkspace>, records: CreatedDocument[], events: AuditEvent[]): DashboardViewModel {
  const projected = vendors.map((vendor) => projectVendorDocuments(vendor, getVendorRequirements(workspaces, companyId, vendor.id), records, companyId));
  const counts = vendorSummary(projected);
  const percent = (value: number) => counts.all ? Math.round(value / counts.all * 100) : 0;
  const attention = activeDocuments(records, companyId).filter((document) => attentionComplianceStatuses.some((status) => status === document.complianceStatus))
    .map((document) => ({id: document.id, supplier: document.vendorName, document: document.documentName, status: document.status as DashboardDocumentStatus,
      expiry: document.expiresAt ? localizedDate(document.expiresAt) : {ro: '—', en: '—'}}));
  const recent = events.filter((event) => event.companyId === companyId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 4);
  return {...view, suppliers: {...view.suppliers, total: counts.all, compliant: counts.compliant, attention: counts.attention, noncompliant: counts.noncompliant,
    monthlyIncrease: events.filter((event) => event.companyId === companyId && event.eventType === 'vendor_added' && event.occurredAt.slice(0, 7) === fixtureReferenceTime.slice(0, 7)).length,
    // Missing requirements are already represented by the existing compliance categories.
    missingDocuments: 0, percentages: {compliant: percent(counts.compliant), attention: percent(counts.attention), noncompliant: percent(counts.noncompliant), missingDocuments: 0}},
    documentsRequiringAttention: attention,
    recentActivity: recent.map((event) => {const days = calendarDaysUntil(event.occurredAt, fixtureReferenceTime);
      const time = new Intl.DateTimeFormat('ro-RO', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'}).format(new Date(event.occurredAt));
      return {id: event.id, kind: event.eventType === 'document_upload' ? 'uploaded' : event.eventType === 'document_expiring' ? 'expiring' : event.eventType === 'vendor_added' ? 'added' : 'updated',
        action: ['document_upload', 'document_expiring', 'vendor_added'].includes(event.eventType) ? undefined : event.action,
        supplier: vendors.find((vendor) => vendor.id === event.vendorId)?.name ?? '—', document: event.eventType === 'vendor_added' ? undefined : event.description,
        time: event.dateOnly ? localizedDate(event.occurredAt) : days === 0 ? {ro: `azi, ${time}`, en: `today, ${time}`} : days === -1 ? {ro: `ieri, ${time}`, en: `yesterday, ${time}`} : localizedDate(event.occurredAt)};})};
}
