import {documentAccess} from '@/features/documents/document-access';
import {reviewDateToIso} from '@/features/documents/created-documents';
import {availableCompanyFile, companyDocumentList, readCompanyDocumentsState} from './company-documents-state';
import {eligibleCompanyDocumentIds} from './projections';
import type {CompanyDocumentListRow} from './types';

/** A logical listing identity and an exact uploaded version, never a name-based file lookup. */
export type ShareDocumentSelection = {documentId: string; documentVersionId: string};
export type ShareForm = {
  name: string; deliveryMethod: 'link' | 'email'; recipientName: string; recipientEmail: string;
  expiresOn: string; allowDownload: boolean; passwordProtected: boolean; password: string; message: string;
};
export type ShareField = 'name' | 'recipientEmail' | 'expiresOn' | 'password' | 'message' | 'documents' | 'preview';
export type ShareError = 'name' | 'email' | 'date' | 'password' | 'message' | 'empty' | 'file' | 'stale' | 'access' | 'preview';
export type ShareErrors = Partial<Record<ShareField, ShareError>>;
export type SharePreview = Omit<ShareForm, 'password' | 'expiresOn'> & {
  expiresAt: string;
  documents: (ShareDocumentSelection & {name: string})[];
};

/** Same current-version/actual-byte eligibility as the existing Company Documents toolbar. */
export function shareSelection(rows: CompanyDocumentListRow[], ids: string[]): ShareDocumentSelection[] {
  const eligible = new Set(eligibleCompanyDocumentIds(rows));
  return rows.filter((row) => eligible.has(row.id) && ids.includes(row.id)).map((row) => ({documentId: row.id, documentVersionId: row.currentDocumentId!}));
}

/** Recheck live ownership, current identity and bytes; never silently substitute a replacement. */
export function inspectShareSelection(companyId: string, selection: ShareDocumentSelection[], locale: 'ro' | 'en') {
  const state = readCompanyDocumentsState(), {rows, error} = companyDocumentList(state, companyId, locale);
  const eligible = new Set(eligibleCompanyDocumentIds(rows));
  const records = state?.byCompany?.[companyId]?.documents;
  return selection.map((item) => {
    const row = rows.find((row) => row.companyId === companyId && row.id === item.documentId);
    const record = !error && Array.isArray(records) ? records.find((record) => record?.companyId === companyId && record.id === item.documentVersionId) : undefined;
    const problem: ShareError | null = !documentAccess(companyId).visible ? 'access' : error || !row || !record || row.currentDocumentId !== item.documentVersionId ? 'stale' : !eligible.has(row.id) || !availableCompanyFile(companyId, item.documentVersionId) ? 'file' : null;
    return {...item, name: documentAccess(companyId).visible ? record?.documentName[locale] ?? row?.name ?? null : null, problem};
  });
}

// Real wall clock, not the fixture clock. Provisional E2 calendar-day policy, expressed in UTC.
export function sharingDate(days: number, now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
  return `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${date.getUTCFullYear()}`;
}

export function validateShareForm(form: ShareForm, now = new Date()): ShareErrors {
  const errors: ShareErrors = {};
  if (!form.name.trim() || form.name.trim().length > 100) errors.name = 'name';
  if (form.deliveryMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail.trim())) errors.recipientEmail = 'email';
  const date = reviewDateToIso(form.expiresOn), maximum = reviewDateToIso(sharingDate(30, now))!;
  if (!date || date <= now.toISOString().slice(0, 10) || date > maximum) errors.expiresOn = 'date';
  if (form.passwordProtected && (form.password.length < 8 || form.password.length > 128)) errors.password = 'password';
  if (form.message.length > 500) errors.message = 'message';
  return errors;
}

/** Synchronous, transient preview only. Never writes a share, token, password, file or audit event. */
export function prepareSharePreview(companyId: string, selection: ShareDocumentSelection[], form: ShareForm, locale: 'ro' | 'en', now = new Date()): {ok: true; preview: SharePreview} | {ok: false; errors: ShareErrors} {
  try {
    const errors = validateShareForm(form, now), documents = inspectShareSelection(companyId, selection, locale);
    if (!documentAccess(companyId).visible) errors.documents = 'access';
    else if (!selection.length) errors.documents = 'empty';
    else if (new Set(selection.map((item) => item.documentId)).size !== selection.length) errors.documents = 'stale';
    else if (documents.some((item) => item.problem)) errors.documents = documents.find((item) => item.problem)!.problem!;
    if (Object.keys(errors).length) return {ok: false, errors};
    return {ok: true, preview: {
      name: form.name.trim(), deliveryMethod: form.deliveryMethod, recipientName: form.recipientName.trim(),
      recipientEmail: form.deliveryMethod === 'email' ? form.recipientEmail.trim() : '',
      expiresAt: `${reviewDateToIso(form.expiresOn)}T23:59:59.999Z`, allowDownload: form.allowDownload,
      passwordProtected: form.passwordProtected, message: form.message.trim(),
      documents: documents.map(({documentId, documentVersionId, name}) => ({documentId, documentVersionId, name: name!}))
    }};
  } catch {return {ok: false, errors: {preview: 'preview'}};}
}
