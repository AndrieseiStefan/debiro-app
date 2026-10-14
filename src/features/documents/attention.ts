import {documentStatus} from './compliance';
import type {DocumentComplianceStatus, DocumentStatus} from './types';

/** The canonical uploaded-document attention subset, not missing requirements. */
export const attentionComplianceStatuses = ['needs_review', 'expiring_soon', 'expired'] as const satisfies readonly DocumentComplianceStatus[];
export const attentionDocumentStatuses: readonly DocumentStatus[] = attentionComplianceStatuses.map(documentStatus);
export const documentsAttentionHref = '/documents?attention=1';
