import {approvedCompliance} from '@/features/documents/compliance';
import {normalizeDocumentName} from '@/features/requirements/catalog';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import type {CompanyDocumentListRow, CompanyDocumentRecord, CompanyDocumentRequirement, CompanyDocumentSort, CompanyDocumentsState} from './types';

export const companyDocumentTypes = ['tax', 'registration', 'fire', 'insurance', 'inspector', 'financial', 'environment', 'safety', 'iso', 'permit', 'custom'] as const;
const documentTypes: readonly string[] = companyDocumentTypes;
const isoDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value.slice(0, 10)}T12:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10);
const nullableDate = (value: unknown) => value === null || isoDate(value);
const nullableText = (value: unknown) => value === null || typeof value === 'string';
const localizedText = (value: {ro?: unknown; en?: unknown} | undefined) => typeof value?.ro === 'string' && typeof value?.en === 'string';
function validRequirement(value: CompanyDocumentRequirement, companyId: string) {
  return value && typeof value.id === 'string' && value.companyId === companyId && localizedText(value.name) && documentTypes.includes(value.documentType) &&
    nullableText(value.issuer) && typeof value.required === 'boolean' && [7, 15, 30, 60, 90].includes(value.expiryWarningDays) && nullableText(value.currentDocumentId) &&
    (value.templateId === undefined || nullableText(value.templateId)) && (value.templateRequirementId === undefined || nullableText(value.templateRequirementId)) && (value.createdAt === undefined || isoDate(value.createdAt));
}
function validDocument(value: CompanyDocumentRecord, companyId: string) {
  return value && typeof value.id === 'string' && value.companyId === companyId && localizedText(value.documentName) && documentTypes.includes(value.documentType) &&
    typeof value.filename === 'string' && isoDate(value.uploadedAt) && nullableDate(value.expiresAt) && nullableDate(value.updatedAt) &&
    nullableText(value.issuer) && nullableText(value.updatedByDisplayName) && ['approved', 'pending', 'rejected'].includes(value.reviewOutcome) &&
    (value.supersededById === undefined || typeof value.supersededById === 'string') && (value.manuallyExpiredAt === undefined || isoDate(value.manuallyExpiredAt)) &&
    (value.requirementId === undefined || typeof value.requirementId === 'string') && (value.version === undefined || Number.isInteger(value.version) && value.version > 0) &&
    (value.fileSize === undefined || Number.isFinite(value.fileSize) && value.fileSize >= 0) && (value.fileType === undefined || typeof value.fileType === 'string') &&
    (value.createdAt === undefined || isoDate(value.createdAt)) && (value.uploadedBy === undefined || typeof value.uploadedBy === 'string') &&
    (value.reviewedAt === undefined || nullableDate(value.reviewedAt)) && (value.reviewedBy === undefined || nullableText(value.reviewedBy)) && (value.rejectionReason === undefined || nullableText(value.rejectionReason));
}
const uniqueIds = (values: {id: string}[]) => new Set(values.map((value) => value.id)).size === values.length;

/** Pure company-owned projection. The page/session boundary separately enforces active membership. */
export function projectCompanyDocuments(snapshot: CompanyDocumentsState, companyId: string, locale: 'ro' | 'en', files: ReadonlyMap<string, Blob> = new Map(), referenceTime = fixtureReferenceTime) {
  const empty = {rows: [] as CompanyDocumentListRow[], error: false};
  if (!snapshot?.byCompany || typeof snapshot.byCompany !== 'object' || Array.isArray(snapshot.byCompany)) return {...empty, error: true};
  const workspace = snapshot.byCompany[companyId];
  if (workspace === undefined) return empty;
  if (!workspace || !Array.isArray(workspace.requirements) || !Array.isArray(workspace.documents) ||
    !workspace.requirements.every((item) => validRequirement(item, companyId)) || !workspace.documents.every((item) => validDocument(item, companyId)) ||
    !uniqueIds(workspace.requirements) || !uniqueIds(workspace.documents) ||
    workspace.documents.some((document) => document.requirementId && !workspace.requirements.some((requirement) => requirement.id === document.requirementId)) ||
    workspace.requirements.some((requirement) => workspace.documents.some((document) => document.id === requirement.currentDocumentId && document.requirementId && document.requirementId !== requirement.id))) return {...empty, error: true};
  const current = workspace.documents.filter((item) => !item.supersededById && item.reviewOutcome !== 'rejected' &&
    (!item.requirementId || workspace.requirements.some((requirement) => requirement.id === item.requirementId && requirement.currentDocumentId === item.id)));
  const linked = new Set<string>();
  function row(requirement: CompanyDocumentRequirement | null, document?: CompanyDocumentRecord): CompanyDocumentListRow {
    if (document) linked.add(document.id);
    const file = document && files.get(document.id);
    return {id: requirement?.id ?? document!.id, companyId, requirementId: requirement?.id ?? null,
      name: (document?.documentName ?? requirement!.name)[locale], documentType: document?.documentType ?? requirement!.documentType,
      issuer: document ? document.issuer : requirement?.issuer ?? null, required: requirement?.required ?? false, currentDocumentId: document?.id ?? null,
      status: !document ? 'missing' : document.reviewOutcome === 'pending' ? 'needs_review' : approvedCompliance(document.expiresAt, requirement?.expiryWarningDays ?? 30, referenceTime, document.manuallyExpiredAt),
      expiresAt: document?.expiresAt ?? null, updatedAt: document?.updatedAt ?? null, updatedByDisplayName: document?.updatedByDisplayName ?? null,
      hasDownloadableFile: Boolean(file instanceof Blob && file.size > 0)};
  }
  const rows = workspace.requirements.map((item) => row(item, current.find((document) => document.id === item.currentDocumentId)));
  rows.push(...current.filter((document) => !linked.has(document.id)).map((document) => row(null, document)));
  return {rows, error: false};
}

export function companyDocumentMetrics(rows: CompanyDocumentListRow[]) {
  return {total: new Set(rows.flatMap((row) => row.currentDocumentId ? [row.currentDocumentId] : [])).size,
    attention: new Set(rows.filter((row) => row.status === 'missing' ? row.required : row.status !== 'valid').map((row) => row.requirementId ?? row.id)).size,
    activeShares: 0}; // No sharing domain exists until E1C-004.
}
export function eligibleCompanyDocumentIds(rows: CompanyDocumentListRow[]) {
  return rows.filter((row) => row.currentDocumentId && row.hasDownloadableFile).map((row) => row.id);
}
export function filterCompanyDocuments(rows: CompanyDocumentListRow[], query: string, type: string, status: string, typeLabel: (type: CompanyDocumentListRow['documentType']) => string) {
  const needle = normalizeDocumentName(query);
  return rows.filter((row) => (type === 'all' || row.documentType === type) && (status === 'all' || row.status === status) &&
    (!needle || normalizeDocumentName(`${row.name} ${typeLabel(row.documentType)} ${row.issuer ?? ''}`).includes(needle)));
}
export function sortCompanyDocuments(rows: CompanyDocumentListRow[], sort: CompanyDocumentSort, locale: string) {
  const collator = new Intl.Collator(locale, {sensitivity: 'base', numeric: true});
  const severity = {missing: 0, expired: 1, needs_review: 2, expiring_soon: 3, valid: 4};
  return rows.toSorted((a, b) => {
    let primary: number;
    if (sort.column === 'name') primary = collator.compare(a.name, b.name);
    else if (sort.column === 'status') primary = severity[a.status] - severity[b.status];
    else {
      const left = a[sort.column], right = b[sort.column];
      if (left === null || right === null) return left === right ? collator.compare(a.name, b.name) || a.id.localeCompare(b.id) : left === null ? 1 : -1;
      primary = Date.parse(left) - Date.parse(right);
    }
    return primary * (sort.direction === 'ascending' ? 1 : -1) || collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}
