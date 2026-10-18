import * as company from './management';
import {documentAccess} from '@/features/documents/document-access';
import type {OwnedDocumentEngine} from '@/features/documents/owned-document-engine';

/** Shared manager/upload/picker bind their operations to an explicitly authorized owner. */
export type DocumentManagementAdapter = OwnedDocumentEngine & {scope: 'company' | 'employee'; access: typeof documentAccess};
export const companyDocumentAdapter: DocumentManagementAdapter = {...company, scope: 'company', access: documentAccess};
