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
export function useCompanyDocumentsState() {return useSyncExternalStore(subscribe, () => session.state, () => companyDocumentsFixture);}
export function readCompanyDocumentsState() {return session.state;}
export function companyDocumentList(snapshot: CompanyDocumentsState, companyId: string, locale: 'ro' | 'en') {
  if (!documentAccess(companyId).visible) return {rows: [], error: false};
  const files = session.files instanceof Map ? session.files.get(companyId) : undefined;
  return projectCompanyDocuments(snapshot, companyId, locale, files instanceof Map ? files : undefined);
}
