'use client';

import {useSyncExternalStore} from 'react';
import {browserSession} from '@/lib/browser-session';
import {documentAccess} from '@/features/documents/document-access';
import {companyDocumentsFixture} from './fixtures';
import {projectCompanyDocuments} from './projections';
import type {CompanyDocumentsState} from './types';

// A new owner, never a reset/migration of vendor uploads, templates or existing company state.
const session = browserSession(Symbol.for('debiro.company-documents-session'), () => ({state: companyDocumentsFixture as CompanyDocumentsState,
  files: new Map<string, Map<string, Blob>>(), listeners: new Set<() => void>()}));
function subscribe(listener: () => void) {session.listeners.add(listener); return () => {session.listeners.delete(listener);};}
/** Called only after a fully validated company-domain transaction, never a fixture reset. */
export function commitCompanyDocuments(companyId: string, workspace: CompanyDocumentsState['byCompany'][string], file?: {id: string; bytes: File}, permission: 'replace' | 'review' = 'replace') {
  if (!documentAccess(companyId)[permission] || projectCompanyDocuments({byCompany: {[companyId]: workspace}}, companyId, 'ro').error || !(session.files instanceof Map)) return false;
  if (file && (!(file.bytes instanceof File) || !file.bytes.size || !workspace.documents.some((item) => item.id === file.id && item.companyId === companyId))) return false;
  if (session.files.has(companyId) && !(session.files.get(companyId) instanceof Map)) return false;
  const files = new Map(session.files);
  if (file) files.set(companyId, new Map([...(files.get(companyId) ?? []), [file.id, file.bytes]]));
  session.files = files;
  session.state = {...session.state, byCompany: {...session.state.byCompany, [companyId]: workspace}};
  session.listeners.forEach((listener) => listener());
  return true;
}
export function availableCompanyFile(companyId: string, id: string) {
  if (!documentAccess(companyId).visible) return null;
  const records = session.state?.byCompany?.[companyId]?.documents;
  const record = Array.isArray(records) && records.find((item) => item?.id === id && item.companyId === companyId);
  const files = session.files instanceof Map ? session.files.get(companyId) : undefined;
  const file = record && files instanceof Map ? files.get(id) : null;
  return file instanceof Blob && file.size > 0 ? file : null;
}
export function useCompanyDocumentsState() {return useSyncExternalStore(subscribe, () => session.state, () => companyDocumentsFixture);}
export function readCompanyDocumentsState() {return session.state;}
export function companyDocumentList(snapshot: CompanyDocumentsState, companyId: string, locale: 'ro' | 'en') {
  if (!documentAccess(companyId).visible) return {rows: [], error: false};
  const files = session.files instanceof Map ? session.files.get(companyId) : undefined;
  return projectCompanyDocuments(snapshot, companyId, locale, files instanceof Map ? files : undefined);
}
