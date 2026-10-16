import {afterEach, describe, expect, it, vi} from 'vitest';
import {availableCompanyFile, companyDocumentList, readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {addCompanyDocument, replaceCompanyDocument, reviewCompanyDocument} from '@/features/company-documents/management';
import {inspectShareSelection, prepareSharePreview, shareSelection, sharingDate, validateShareForm, type ShareForm} from '@/features/company-documents/sharing';
import {companyDocumentMetrics} from '@/features/company-documents/projections';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {readDocumentRecords} from '@/features/documents/created-documents';
import type {CompanyDocumentsState} from '@/features/company-documents/types';

type Owner = {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>};
const owner = () => Reflect.get(window, Symbol.for('debiro.company-documents-session')) as Owner;
const initial = readCompanyDocumentsState(), companyId = 'demo-company';
const now = new Date('2026-11-29T15:25:00Z');
const form = (patch: Partial<ShareForm> = {}): ShareForm => ({name: '  Tender package  ', deliveryMethod: 'link', recipientName: '', recipientEmail: '', expiresOn: sharingDate(7, now), allowDownload: true, passwordProtected: false, password: '', message: '', ...patch});
const input = (name = 'Owned proof') => ({name, documentType: 'tax' as const, issuer: 'ANAF', expiresAt: '', file: new File(['private actual bytes'], `${name}.pdf`, {type: 'application/pdf'})});
function upload(name?: string) {const result = addCompanyDocument(companyId, input(name)); if (!result.ok) throw new Error(result.reason); return result;}
const rows = () => companyDocumentList(readCompanyDocumentsState(), companyId, 'en').rows;
afterEach(() => {owner().state = initial; owner().files.clear(); switchActiveCompany(companyId); vi.restoreAllMocks();});

describe('transient company sharing contracts', () => {
  it('reuses exact current-version and real-byte eligibility, excluding missing/metadata/history and foreign files', () => {
    expect(shareSelection(rows(), rows().map((row) => row.id))).toEqual([]);
    const uploaded = upload(), current = rows(), selections = shareSelection(current, [...current.map((row) => row.id), uploaded.requirementId]);
    expect(selections).toEqual([{documentId: uploaded.requirementId, documentVersionId: uploaded.document.id}]);
    expect(inspectShareSelection(companyId, selections, 'en')).toEqual([{...selections[0], name: 'Owned proof', problem: null}]);
    expect(prepareSharePreview('global-clean-services', selections, form(), 'en', now)).toEqual({ok: false, errors: {documents: 'access'}});
    expect(prepareSharePreview(companyId, [{documentId: 'vendor-record', documentVersionId: uploaded.document.id}], form(), 'en', now)).toEqual({ok: false, errors: {documents: 'stale'}});
  });

  it('requires a nonempty package and reports missing bytes without dropping the selected version', () => {
    expect(prepareSharePreview(companyId, [], form(), 'en', now)).toEqual({ok: false, errors: {documents: 'empty'}});
    const uploaded = upload(), selections = shareSelection(rows(), [uploaded.requirementId]);
    owner().files.clear();
    expect(inspectShareSelection(companyId, selections, 'en')[0]).toMatchObject({...selections[0], problem: 'file'});
    expect(prepareSharePreview(companyId, selections, form(), 'en', now)).toEqual({ok: false, errors: {documents: 'file'}});
  });

  it('rejects replacement/rejection/missing references and never silently substitutes new bytes', () => {
    const uploaded = upload(), selections = shareSelection(rows(), [uploaded.requirementId]);
    const replacement = replaceCompanyDocument(companyId, uploaded.requirementId, uploaded.document.id, input('New version'));
    expect(replacement.ok).toBe(true);
    expect(availableCompanyFile(companyId, uploaded.document.id)).toBeTruthy();
    expect(prepareSharePreview(companyId, selections, form(), 'en', now)).toEqual({ok: false, errors: {documents: 'stale'}});
    const next = shareSelection(rows(), [uploaded.requirementId]);
    expect(next[0].documentVersionId).not.toBe(selections[0].documentVersionId);
    expect(reviewCompanyDocument(companyId, uploaded.requirementId, next[0].documentVersionId, 'rejected', 'Not accepted').ok).toBe(true);
    expect(prepareSharePreview(companyId, next, form(), 'en', now)).toEqual({ok: false, errors: {documents: 'stale'}});
    owner().state = {...owner().state, byCompany: {...owner().state.byCompany, [companyId]: {...owner().state.byCompany[companyId], documents: null!}}};
    expect(inspectShareSelection(companyId, next, 'en')[0]).toMatchObject({name: null, problem: 'stale'});
  });

  it('validates trimmed names, email, password and message boundaries without requiring link recipients', () => {
    expect(validateShareForm(form({name: ' x ', recipientEmail: 'ignored-in-link'}), now)).toEqual({});
    expect(validateShareForm(form({name: ' '.repeat(3), deliveryMethod: 'email', passwordProtected: true, password: 'short', message: 'x'.repeat(501)}), now)).toEqual({name: 'name', recipientEmail: 'email', password: 'password', message: 'message'});
    for (const email of ['', 'a@', '@example.org', 'a b@example.org']) expect(validateShareForm(form({deliveryMethod: 'email', recipientEmail: email}), now).recipientEmail).toBe('email');
    for (const length of [8, 128]) expect(validateShareForm(form({passwordProtected: true, password: 'x'.repeat(length), name: 'x'.repeat(100), message: 'x'.repeat(500), deliveryMethod: 'email', recipientEmail: ' a@example.org '}), now)).toEqual({});
    expect(validateShareForm(form({name: 'x'.repeat(101), passwordProtected: true, password: 'x'.repeat(129)}), now)).toEqual({name: 'name', password: 'password'});
  });

  it('uses the real UTC clock with calendar/month/year boundaries and rejects invalid/old/beyond-policy dates', () => {
    expect(sharingDate(7, now)).toBe('06.12.2026'); expect(sharingDate(30, now)).toBe('29.12.2026');
    expect(sharingDate(7, new Date('2026-12-29T23:59:59Z'))).toBe('05.01.2027');
    for (const date of ['', '2026-12-01', '31.11.2026', '28.11.2026', '29.11.2026', '30.12.2026']) expect(validateShareForm(form({expiresOn: date}), now).expiresOn).toBe('date');
    expect(validateShareForm(form({expiresOn: '30.11.2026'}), now)).toEqual({});
    expect(validateShareForm(form({expiresOn: '29.12.2026'}), now)).toEqual({});
    vi.useFakeTimers(); vi.setSystemTime(now); expect(sharingDate(7)).toBe('06.12.2026'); vi.useRealTimers();
  });

  it('previews exact version identities without password/file refs, mutation, fake shares, or vendor changes', () => {
    const uploaded = upload(), selections = shareSelection(rows(), [uploaded.requirementId]);
    const before = readCompanyDocumentsState(), vendorBefore = readDocumentRecords(), companiesBefore = readCompanyState();
    const result = prepareSharePreview(companyId, selections, form({passwordProtected: true, password: 'never-persist-this', recipientName: ' Buyer ', message: ' Hello '}), 'en', now);
    expect(result).toEqual({ok: true, preview: {name: 'Tender package', deliveryMethod: 'link', recipientName: 'Buyer', recipientEmail: '', expiresAt: '2026-12-06T23:59:59.999Z', allowDownload: true, passwordProtected: true, message: 'Hello', documents: [{...selections[0], name: 'Owned proof'}]}});
    expect(JSON.stringify(result)).not.toContain('never-persist-this'); expect(JSON.stringify(result)).not.toContain('private actual bytes');
    expect(readCompanyDocumentsState()).toBe(before); expect(readDocumentRecords()).toBe(vendorBefore); expect(readCompanyState()).toBe(companiesBefore);
    expect(companyDocumentMetrics(rows()).activeShares).toBe(0);
  });

  it('fails closed after company switching and handles local preparation failure without mutating state', () => {
    const uploaded = upload(), selections = shareSelection(rows(), [uploaded.requirementId]);
    switchActiveCompany('global-clean-services');
    expect(inspectShareSelection(companyId, selections, 'en')[0]).toMatchObject({name: null, problem: 'access'});
    expect(prepareSharePreview(companyId, selections, form(), 'en', now)).toEqual({ok: false, errors: {documents: 'access'}});
    switchActiveCompany(companyId);
    expect(prepareSharePreview(companyId, selections, form(), 'en', new Date('invalid'))).toEqual({ok: false, errors: {preview: 'preview'}});
    expect(availableCompanyFile(companyId, uploaded.document.id)).toBeTruthy();
  });
});
