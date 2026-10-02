import {activeDocuments, type CreatedDocument} from '@/features/documents/created-documents';
import {localizedDate} from '@/lib/fixture-clock';
import {vendorCompliance, type VendorRequirementsWorkspace} from './vendor-requirements';
import type {VendorListItem} from './types';

/** Current owned files, never independently seeded completion/expiry snapshots. */
export function projectVendorDocuments(vendor: VendorListItem, workspace: VendorRequirementsWorkspace, records: CreatedDocument[], companyId: string): VendorListItem {
  const documents = activeDocuments(records, companyId).filter((document) => document.vendorId === vendor.id);
  const compliance = vendorCompliance(workspace, records);
  const accepted = documents.filter((document) => document.reviewOutcome === 'approved');
  const dated = accepted.filter((document) => document.expiresAt).sort((a, b) => a.expiresAt!.localeCompare(b.expiresAt!));
  const next = dated[0];
  return {...vendor,
    // No configured requirements remains Attention; do not invent obligations from uploads.
    status: compliance?.status ?? 'attention',
    documentCount: compliance?.validCount ?? accepted.filter((document) => document.complianceStatus !== 'expired').length,
    documentTarget: compliance?.total ?? documents.length,
    nextExpiry: next?.expiresAt ? {date: next.expiresAt, ...localizedDate(next.expiresAt), tone: next.complianceStatus === 'expired' ? 'danger' : next.complianceStatus === 'expiring_soon' ? 'warning' : 'neutral'}
      : {date: null, ro: '—', en: '—', tone: 'neutral'}
  };
}
