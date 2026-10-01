import type {RequirementTemplateDocument} from './types';
import type {SupplierIdentity, SupplierRequirementDocument} from '@/features/supplier-requirements/types';

/** Safe illustrative supplier, never a template name or an actual assignment. */
export const previewSupplier: SupplierIdentity = {name: 'SC Construct Expert SRL', registrationNumber: 'RO87654321'};
const previewFiles: Record<string, Pick<SupplierRequirementDocument, 'status' | 'uploadedFile' | 'uploadedAt'>> = {
  registration: {status: 'uploaded', uploadedFile: 'certificat_onrc.pdf', uploadedAt: {ro: '12 mar. 2024, 10:24', en: '12 Mar 2024, 10:24'}},
  liability: {status: 'uploaded', uploadedFile: 'asigurare_rc.pdf', uploadedAt: {ro: '11 mar. 2024, 16:03', en: '11 Mar 2024, 16:03'}},
  iso: {status: 'pending', uploadedFile: 'certificare_iso.pdf', uploadedAt: {ro: '11 mar. 2024, 16:03', en: '11 Mar 2024, 16:03'}}
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
