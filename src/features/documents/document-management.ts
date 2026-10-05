'use client';

import {vendorOwnedByCompany} from '@/features/vendors/created-vendors';
import {documentAccess} from './document-access';
import {documentFile, readDocumentRecords, type CreatedDocument} from './created-documents';

export type DocumentSelection = {documentId?: string; documentAction?: string};

export function accessibleDocument(records: CreatedDocument[], companyId: string, id: string, vendorId?: string) {
  if (!documentAccess(companyId).visible) return undefined;
  return records.find((item) => item.id === id && (item.companyId ?? 'demo-company') === companyId
    && (!vendorId || item.vendorId === vendorId) && vendorOwnedByCompany(companyId, item.vendorId));
}

export function documentHistory(records: CreatedDocument[], companyId: string, id: string, vendorId?: string) {
  const selected = accessibleDocument(records, companyId, id, vendorId);
  if (!selected) return [];
  const group = selected.versionGroupId ?? selected.id;
  return records.filter((item) => (item.companyId ?? 'demo-company') === companyId && item.vendorId === selected.vendorId && (item.versionGroupId ?? item.id) === group)
    .sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
}

export function documentManagementHref(document: CreatedDocument, contextPath: string, action?: string) {
  return `${contextPath}?document=${encodeURIComponent(document.id)}${action ? `&documentAction=${encodeURIComponent(action)}` : ''}`;
}

export function documentDetailsHref(document: CreatedDocument, contextPath: string) {
  return document.complianceStatus === 'needs_review' && !document.supersededById && document.reviewOutcome !== 'rejected'
    ? document.reviewRoute ?? `/documents/${document.id}/review` : documentManagementHref(document, contextPath);
}

export function downloadDocument(companyId: string, id: string, vendorId?: string) {
  const record = accessibleDocument(readDocumentRecords(), companyId, id, vendorId);
  const file = record && documentFile(companyId, id, record.vendorId);
  if (!record || !file) return false;
  let url: string | undefined;
  try {
    url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = record.filename;
    anchor.click();
    return true;
  } catch {
    // Missing/stale bytes or a browser download failure must not become fake success.
    return false;
  } finally {
    const downloadUrl = url;
    if (downloadUrl) window.setTimeout(() => {
      try {URL.revokeObjectURL(downloadUrl);} catch { /* The browser may already have invalidated this temporary reference. */ }
    }, 1000);
  }
}
