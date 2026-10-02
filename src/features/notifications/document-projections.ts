import {activeDocuments, type CreatedDocument} from '@/features/documents/created-documents';
import {calendarDaysUntil} from '@/lib/fixture-clock';
import {getVendorRequirements, type VendorRequirementsWorkspace} from '@/features/vendors/vendor-requirements';
import type {VendorListItem} from '@/features/vendors/types';
import type {ExpiringDocumentSummary, MissingDocumentSummary} from './types';

export function notificationDocuments(companyId: string, vendors: VendorListItem[], workspaces: Record<string, VendorRequirementsWorkspace>, records: CreatedDocument[]) {
  const current = activeDocuments(records, companyId);
  const expiringDocuments: ExpiringDocumentSummary[] = current.filter((document) => document.reviewOutcome === 'approved' && document.complianceStatus === 'expiring_soon' && document.expiresAt)
    .map((document) => ({id: document.id, vendorId: document.vendorId, vendorName: vendors.find((vendor) => vendor.id === document.vendorId)?.name ?? document.vendorName,
      documentName: document.documentName, expiresAt: document.expiresAt!, daysRemaining: calendarDaysUntil(document.expiresAt!), status: 'expiring'}));
  const missingDocuments: MissingDocumentSummary[] = vendors.flatMap((vendor) => getVendorRequirements(workspaces, companyId, vendor.id).requirements
    .filter((requirement) => !current.some((document) => document.vendorId === vendor.id && document.id === requirement.uploadedDocumentId))
    .map((requirement) => ({id: requirement.id, vendorId: vendor.id, vendorName: vendor.name, documentName: requirement.name,
      requirement: requirement.sourceTemplateIds.length ? requirement.sourceTemplateNames[requirement.sourceTemplateIds[0]] ?? requirement.name : requirement.description ?? requirement.name,
      dueAt: null, status: 'missing' as const})));
  return {expiringDocuments, missingDocuments};
}
