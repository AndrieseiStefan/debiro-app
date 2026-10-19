import type {CreatedDocument} from '@/features/documents/created-documents';
import type {DocumentComplianceStatus, DocumentReviewApplicability, DocumentReviewOutcome, DocumentType} from '@/features/documents/types';
import type {ExpiryWarningDays, LocalizedText} from '@/features/requirements/types';

/** Listing foundation only, not a second upload/review/version implementation. */
export type CompanyDocumentRecord = Pick<CreatedDocument,
  'id' | 'companyId' | 'documentName' | 'documentType' | 'filename' | 'uploadedAt' | 'expiresAt' |
  'supersededById' | 'previousDocumentId' | 'versionGroupId' | 'version' | 'manuallyExpiredAt'
> & {issuer: string | null; updatedAt: string | null; updatedByDisplayName: string | null;
  reviewApplicability?: DocumentReviewApplicability; reviewOutcome: DocumentReviewOutcome | 'not_required';
  // Optional additions keep E1C-002 tab-memory records readable without a reset/migration.
  requirementId?: string; fileType?: string; fileSize?: number; createdAt?: string; uploadedBy?: string;
  reviewedAt?: string | null; reviewedBy?: string | null; rejectionReason?: string | null;
};

export type CompanyDocumentRequirement = {
  id: string;
  companyId: string;
  name: LocalizedText;
  documentType: DocumentType;
  issuer: string | null;
  required: boolean;
  expiryWarningDays: ExpiryWarningDays;
  currentDocumentId: string | null;
  templateId?: string | null;
  templateRequirementId?: string | null;
  createdAt?: string;
};
export type CompanyDocumentWorkspace = {requirements: CompanyDocumentRequirement[]; documents: CompanyDocumentRecord[]};
export type CompanyDocumentsState = {byCompany: Record<string, CompanyDocumentWorkspace>};
export type CompanyDocumentStatus = 'missing' | DocumentComplianceStatus;
export type CompanyDocumentListRow = {
  id: string;
  companyId: string;
  requirementId: string | null;
  name: string;
  documentType: DocumentType;
  issuer: string | null;
  required: boolean;
  currentDocumentId: string | null;
  status: CompanyDocumentStatus;
  expiresAt: string | null;
  updatedAt: string | null;
  updatedByDisplayName: string | null;
  hasDownloadableFile: boolean;
};
export type CompanyDocumentSortColumn = 'name' | 'status' | 'expiresAt' | 'updatedAt';
export type CompanyDocumentSort = {column: CompanyDocumentSortColumn; direction: 'ascending' | 'descending'};
