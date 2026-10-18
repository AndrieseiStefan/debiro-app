import type {CompanyDocumentRecord, CompanyDocumentRequirement} from '@/features/company-documents/types';
import type {DocumentTypeSnapshot} from '@/features/requirements/document-types';
import type {DocumentMutation} from '@/features/documents/owned-document-engine';

export type EmployeeDocumentRequirement = CompanyDocumentRequirement & {
  employeeId: string;
  typeSnapshot?: DocumentTypeSnapshot;
  sourceTemplateIds: string[];
};
export type EmployeeDocumentVersion = CompanyDocumentRecord & {employeeId: string; requirementId: string; version: number};
export type EmployeeDocumentWorkspace = {requirements: EmployeeDocumentRequirement[]; documents: EmployeeDocumentVersion[]};
export type EmployeeActivity = Omit<DocumentMutation, 'type'> & {
  id: string; companyId: string; employeeId: string;
  type: DocumentMutation['type'] | 'employee_created' | 'employee_edited';
  occurredAt: string; actorId: string; actorName: string;
};
export type EmployeeTrackingStatus = 'not_configured' | 'complete' | 'attention';
