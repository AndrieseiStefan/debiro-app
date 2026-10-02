import type {RequirementTemplateDocument} from './types';
import type {SupplierIdentity, SupplierRequirementDocument} from '@/features/supplier-requirements/types';

const uploadedAt = (value: string) => Object.fromEntries((['ro', 'en'] as const).map((language) => [language,
  new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'}).format(new Date(value))])) as {ro: string; en: string};

/** Safe illustrative supplier, never a template name or an actual assignment. */
export const previewSupplier: SupplierIdentity = {name: 'SC Construct Expert SRL', registrationNumber: 'RO87654321'};
const previewFiles: Record<string, Pick<SupplierRequirementDocument, 'status' | 'uploadedFile' | 'uploadedAt'>> = {
  registration: {status: 'uploaded', uploadedFile: 'certificat_onrc.pdf', uploadedAt: uploadedAt('2026-10-01T10:24:00Z')},
  liability: {status: 'uploaded', uploadedFile: 'asigurare_rc.pdf', uploadedAt: uploadedAt('2026-09-30T16:03:00Z')},
  iso: {status: 'in_review', uploadedFile: 'certificare_iso.pdf', uploadedAt: uploadedAt('2026-09-30T16:03:00Z')}
};

/** Project only current rules; illustrative files never create or change rules. */
export function supplierPreviewDocuments(documents: RequirementTemplateDocument[]): SupplierRequirementDocument[] {
  return documents.map((document) => ({
    id: document.id, catalogDocumentTypeId: document.catalogDocumentTypeId,
    customName: document.customName, customDescription: document.customDescription,
    iconKey: document.iconKey, iconColorKey: document.iconColorKey, required: document.required,
    ...(document.catalogDocumentTypeId ? previewFiles[document.catalogDocumentTypeId] ?? {status: 'missing' as const} : {status: 'missing' as const})
  }));
}
