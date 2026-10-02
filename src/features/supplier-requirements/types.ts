import type {RequirementDocumentIdentity} from '@/features/requirements/document-presentation';
import type {LocalizedText} from '@/features/requirements/types';

/** Supplier-facing presentation only; no upload authorization or assignment. */
export type SupplierRequirementDocument = RequirementDocumentIdentity & {
  id: string;
  required: boolean;
  status: SupplierRequirementStatus;
  uploadedFile?: string;
  uploadedAt?: LocalizedText;
  selectedLocally?: boolean;
};
export type SupplierRequirementStatus = 'missing' | 'in_review' | 'uploaded';

export type SupplierIdentity = {name: string; registrationNumber?: string; tagline?: LocalizedText};

export function supplierRequirementProgress(documents: SupplierRequirementDocument[]) {
  const completed = documents.filter((document) => document.status === 'uploaded').length;
  return {completed, total: documents.length, percentage: documents.length ? Math.round(completed / documents.length * 100) : 0};
}
