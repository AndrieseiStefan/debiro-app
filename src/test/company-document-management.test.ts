import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {addCompanyDocument, applyCompanyTemplate, companyDocumentFile, companyDocumentHistory, downloadCompanyDocument, getCompanyDocumentDetails, markCompanyDocumentExpired, replaceCompanyDocument, reviewCompanyDocument, updateCompanyDocumentMetadata} from '@/features/company-documents/management';
import {companyDocumentList, readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {companyDocumentsFixture} from '@/features/company-documents/fixtures';
import {companyDocumentMetrics, sortCompanyDocuments} from '@/features/company-documents/projections';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {readRequirementsState} from '@/features/requirements/requirements-state';
import {readDocumentRecords} from '@/features/documents/created-documents';
import {readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import type {CompanyDocumentsState} from '@/features/company-documents/types';
import type {RequirementTemplate} from '@/features/requirements/types';

const companyId = 'demo-company';
type Owner = {state: CompanyDocumentsState; files: Map<string, Map<string, Blob>>; listeners: Set<() => void>};
const owner = () => Reflect.get(window, Symbol.for('debiro.company-documents-session')) as Owner;
const templateOwner = () => Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: ReturnType<typeof readRequirementsState>};
const originalTemplates = readRequirementsState();
const originalCompany = readCompanyState();
const input = (overrides = {}) => ({name: 'Company proof', documentType: 'tax' as const, issuer: 'ANAF', expiresAt: '31.12.2027', file: new File(['original bytes'], 'proof.pdf', {type: 'application/pdf'}), ...overrides});
function upload(overrides = {}) {
  const result = addCompanyDocument(companyId, input(overrides));
  if (!result.ok) throw new Error(result.reason);
  return result;
}
function role(value: 'administrator' | 'reviewer' | 'viewer', active = true) {
  const member = readCompanyState().companies[0].members.find((item) => item.isCurrentUser)!;
  member.role = value; member.status = active ? 'active' : 'invited';
}
beforeEach(() => {switchActiveCompany(companyId); owner().state = structuredClone(companyDocumentsFixture); owner().files = new Map(); templateOwner().state = structuredClone(originalTemplates); role('administrator');});
afterEach(() => {role('administrator'); switchActiveCompany(companyId); owner().state = companyDocumentsFixture; owner().files = new Map(); templateOwner().state = originalTemplates; vi.restoreAllMocks();});

describe('company document authorized transactions', () => {
  it('creates an optional standalone requirement and pending v1 with exact bytes and real provenance', () => {
    const file = input().file, result = upload({file});
    const details = getCompanyDocumentDetails(companyId, result.requirementId)!;
    expect(details).toMatchObject({status: 'needs_review', requirement: {companyId, required: false, templateId: null, templateRequirementId: null}, current: {version: 1, reviewOutcome: 'pending', uploadedBy: 'Andrei Popescu', fileType: 'application/pdf', fileSize: file.size, uploadedAt: fixtureReferenceTime}});
    expect(details.current?.requirementId).toBe(result.requirementId);
    expect(companyDocumentFile(companyId, result.requirementId, result.document.id)).toBe(file);
    expect(companyDocumentMetrics(companyDocumentList(readCompanyDocumentsState(), companyId, 'en').rows)).toEqual({total: 6, attention: 5, activeShares: 0});
    expect(details.history).toHaveLength(1);
  });

  it('rejects missing/zero/oversized/mismatched files, invalid dates/names/types and foreign requirements atomically', () => {
    const before = structuredClone(readCompanyDocumentsState());
    const cases = [input({file: undefined}), input({file: new File([], 'empty.pdf', {type: 'application/pdf'})}), input({file: new File(['bad'], 'script.html', {type: 'text/html'})}),
      input({file: new File(['bad'], 'pdf.pdf', {type: 'image/png'})}), input({file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {type: 'application/pdf'})}),
      input({name: '   '}), input({expiresAt: '31.02.2027'}), input({expiresAt: 'arbitrary'}), input({documentType: 'unknown'}), input({requirementId: 'foreign'})];
    for (const value of cases) {expect(addCompanyDocument(companyId, value as Parameters<typeof addCompanyDocument>[1]).ok).toBe(false); expect(readCompanyDocumentsState()).toEqual(before); expect(owner().files.size).toBe(0);}
    expect(addCompanyDocument(companyId, input({expiresAt: ''})).ok).toBe(true);
    for (const file of [new File(['jpeg bytes'], 'photo.JPEG', {type: 'image/jpeg'}), new File(['png bytes'], 'photo.png', {type: 'image/png'}), new File(['pdf bytes'], 'empty-mime.pdf')]) expect(addCompanyDocument(companyId, input({file})).ok).toBe(true);
  });

  it('applies only owned Company templates, snapshots rules once and never changes vendor/template sources', () => {
    const vendorBefore = structuredClone(readVendorRequirements()), filesBefore = structuredClone(readDocumentRecords());
    const state = templateOwner().state;
    const companyTemplate: RequirementTemplate = {...state.byCompany[companyId].templates[0], id: 'company-template', scope: 'company', categoryId: null,
      documents: [{id: 'company-rule', templateId: 'company-template', catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 15, validityMonths: 12}]};
    const employee = {...companyTemplate, id: 'employee-template', scope: 'employee' as const};
    state.byCompany[companyId].templates.push(companyTemplate, employee);
    const source = structuredClone(state);
    expect(applyCompanyTemplate(companyId, state.byCompany[companyId].templates[0].id).ok).toBe(false);
    expect(applyCompanyTemplate(companyId, employee.id).ok).toBe(false);
    expect(applyCompanyTemplate(companyId, companyTemplate.id)).toEqual({ok: true, added: 1});
    const requirement = readCompanyDocumentsState().byCompany[companyId].requirements.at(-1)!;
    expect(requirement).toMatchObject({templateId: companyTemplate.id, templateRequirementId: 'company-rule', required: true, expiryWarningDays: 15, currentDocumentId: null});
    expect(readRequirementsState()).toEqual(source);
    companyTemplate.documents[0].required = false; companyTemplate.documents[0].expiryWarningDays = 90;
    expect(applyCompanyTemplate(companyId, companyTemplate.id)).toEqual({ok: true, added: 0});
    expect(readCompanyDocumentsState().byCompany[companyId].requirements.at(-1)).toEqual(requirement);
    const result = upload({requirementId: requirement.id, required: false, documentType: 'custom'});
    expect(getCompanyDocumentDetails(companyId, result.requirementId)?.requirement.required).toBe(true);
    expect(result.document.documentType).toBe('tax');
    expect(readVendorRequirements()).toEqual(vendorBefore); expect(readDocumentRecords()).toEqual(filesBefore);
    switchActiveCompany('global-clean-services'); expect(applyCompanyTemplate('global-clean-services', companyTemplate.id).ok).toBe(false);
  });

  it('retains every version and exact file after replacement/rejection/reupload; history never fulfills current requirements', () => {
    const first = upload({required: true}), original = structuredClone(first.document);
    expect(reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved')).toEqual({ok: true});
    const approved = structuredClone(getCompanyDocumentDetails(companyId, first.requirementId)!.current!);
    const secondFile = new File(['replacement bytes'], 'proof.pdf', {type: 'application/pdf'});
    const replacement = replaceCompanyDocument(companyId, first.requirementId, first.document.id, input({file: secondFile}));
    if (!replacement.ok) throw new Error(replacement.reason);
    expect(getCompanyDocumentDetails(companyId, first.requirementId)?.status).toBe('needs_review');
    expect(replacement.document.version).toBe(2); expect(replacement.document.id).not.toBe(first.document.id);
    expect(companyDocumentFile(companyId, first.requirementId, first.document.id)).toBeDefined();
    expect(companyDocumentFile(companyId, first.requirementId, replacement.document.id)).toBe(secondFile);
    const beforeReject = structuredClone(readCompanyDocumentsState());
    expect(reviewCompanyDocument(companyId, first.requirementId, replacement.document.id, 'rejected', '  ').ok).toBe(false);
    expect(readCompanyDocumentsState()).toEqual(beforeReject);
    expect(reviewCompanyDocument(companyId, first.requirementId, replacement.document.id, 'rejected', '  Incorrect year  ')).toEqual({ok: true});
    const missing = getCompanyDocumentDetails(companyId, first.requirementId)!;
    expect(missing.status).toBe('missing'); expect(missing.current).toBeNull();
    expect(missing.history.map((item) => item.version)).toEqual([2, 1]); expect(missing.history[0].rejectionReason).toBe('Incorrect year');
    expect(missing.history[1]).toMatchObject({...approved, supersededById: replacement.document.id});
    const third = upload({requirementId: first.requirementId});
    expect(third.document.version).toBe(3); expect(companyDocumentHistory(companyId, first.requirementId)).toHaveLength(3);
    expect(original.filename).toBe(approved.filename);
    expect(reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved').ok).toBe(false);
    expect(replaceCompanyDocument(companyId, first.requirementId, first.document.id, input()).ok).toBe(false);
  });

  it('failed replacement leaves current metadata, history, exact files and KPIs unchanged', () => {
    const first = upload();
    const before = structuredClone(readCompanyDocumentsState()), files = new Map(owner().files.get(companyId));
    expect(replaceCompanyDocument(companyId, first.requirementId, first.document.id, input({expiresAt: '31.02.2027'})).ok).toBe(false);
    expect(readCompanyDocumentsState()).toEqual(before); expect(owner().files.get(companyId)).toEqual(files);
    expect(addCompanyDocument(companyId, input({requirementId: first.requirementId})).ok).toBe(false);
  });

  it('edits only current permitted metadata and invalidates approval without changing immutable upload identity', () => {
    const first = upload(); reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved');
    const current = getCompanyDocumentDetails(companyId, first.requirementId)!.current!;
    const file = companyDocumentFile(companyId, first.requirementId, current.id);
    expect(updateCompanyDocumentMetadata(companyId, first.requirementId, current.id, {name: 'Edited proof', issuer: 'Updated authority', expiresAt: ''})).toEqual({ok: true});
    const changed = getCompanyDocumentDetails(companyId, first.requirementId)!;
    expect(changed.status).toBe('needs_review'); expect(changed.current).toMatchObject({id: current.id, requirementId: current.requirementId, filename: current.filename, uploadedAt: current.uploadedAt, uploadedBy: current.uploadedBy, version: current.version, reviewOutcome: 'pending', reviewedAt: null, expiresAt: null});
    expect(companyDocumentFile(companyId, first.requirementId, current.id)).toBe(file); expect(changed.history).toHaveLength(1);
    expect(updateCompanyDocumentMetadata(companyId, first.requirementId, current.id, {name: '  ', issuer: '', expiresAt: ''}).ok).toBe(false);
  });

  it('manual expiry preserves original date/version/file/history and blocks duplicates or unsupported states', () => {
    const first = upload();
    expect(markCompanyDocumentExpired(companyId, first.requirementId, first.document.id).ok).toBe(false);
    reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved');
    expect(markCompanyDocumentExpired(companyId, first.requirementId, first.document.id)).toEqual({ok: true});
    const details = getCompanyDocumentDetails(companyId, first.requirementId)!;
    expect(details.status).toBe('expired'); expect(details.current).toMatchObject({expiresAt: '2027-12-31', version: 1, manuallyExpiredAt: fixtureReferenceTime});
    expect(details.history).toHaveLength(1); expect(companyDocumentFile(companyId, first.requirementId, first.document.id)).toBeDefined();
    expect(markCompanyDocumentExpired(companyId, first.requirementId, first.document.id).ok).toBe(false);
  });

  it('enforces Administrator writes, Reviewer review, Viewer read and inactive/cross-company denial at operation boundaries', () => {
    const first = upload(); role('reviewer');
    expect(addCompanyDocument(companyId, input()).ok).toBe(false); expect(applyCompanyTemplate(companyId, 'construction').ok).toBe(false);
    expect(updateCompanyDocumentMetadata(companyId, first.requirementId, first.document.id, {name: 'Hack', issuer: '', expiresAt: ''}).ok).toBe(false);
    expect(reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved').ok).toBe(true);
    role('viewer'); expect(getCompanyDocumentDetails(companyId, first.requirementId)).not.toBeNull(); expect(companyDocumentFile(companyId, first.requirementId, first.document.id)).toBeDefined();
    expect(reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'rejected', 'No').ok).toBe(false);
    role('administrator', false); expect(getCompanyDocumentDetails(companyId, first.requirementId)).toBeNull(); expect(companyDocumentFile(companyId, first.requirementId, first.document.id)).toBeNull();
    role('administrator'); switchActiveCompany('global-clean-services');
    expect(getCompanyDocumentDetails(companyId, first.requirementId)).toBeNull(); expect(companyDocumentFile('global-clean-services', first.requirementId, first.document.id)).toBeNull();
    expect(reviewCompanyDocument('global-clean-services', first.requirementId, first.document.id, 'approved').ok).toBe(false);
    switchActiveCompany(companyId); expect(companyDocumentFile(companyId, first.requirementId, first.document.id)).toBeDefined();
    expect(readCompanyState().companies).toBe(originalCompany.companies);
  });

  it('downloads only exact owned current/historical bytes with original filenames, never metadata substitutes', () => {
    const create = vi.fn(() => 'blob:test'); Object.defineProperty(URL, 'createObjectURL', {configurable: true, value: create});
    Object.defineProperty(URL, 'revokeObjectURL', {configurable: true, value: vi.fn()});
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(downloadCompanyDocument(companyId, 'company-requirement:registration', 'company-document:registration')).toBe(false); expect(create).not.toHaveBeenCalled();
    const file = input().file, first = upload({file}); expect(downloadCompanyDocument(companyId, first.requirementId, first.document.id)).toBe(true); expect(create).toHaveBeenLastCalledWith(file);
    expect((clicked.mock.instances[0] as HTMLAnchorElement).download).toBe('proof.pdf');
    replaceCompanyDocument(companyId, first.requirementId, first.document.id, input({file: new File(['new'], 'new.pdf', {type: 'application/pdf'})}));
    expect(downloadCompanyDocument(companyId, first.requirementId, first.document.id)).toBe(true); expect(create).toHaveBeenLastCalledWith(file);
    switchActiveCompany('global-clean-services'); expect(downloadCompanyDocument(companyId, first.requirementId, first.document.id)).toBe(false);
  });

  it('extends legacy E1C-002 history without rewriting it and rejects corrupted workspace mutations', () => {
    expect(companyDocumentHistory(companyId, 'company-requirement:registration').map((record) => record.version)).toEqual([2, 1]);
    const state = structuredClone(readCompanyDocumentsState());
    const result = replaceCompanyDocument(companyId, 'company-requirement:registration', 'company-document:registration', input());
    if (!result.ok) throw new Error(result.reason);
    expect(result.document.version).toBe(3); expect(companyDocumentHistory(companyId, 'company-requirement:registration')).toHaveLength(3);
    expect(readCompanyDocumentsState().byCompany[companyId].documents.find((item) => item.id === 'company-document:registration-v1')).toEqual(state.byCompany[companyId].documents.at(-1));
    owner().state.byCompany[companyId].documents[0].companyId = 'foreign'; const corrupted = structuredClone(owner().state);
    expect(addCompanyDocument(companyId, input()).ok).toBe(false); expect(owner().state).toEqual(corrupted);
    owner().state = structuredClone(companyDocumentsFixture); owner().files.set(companyId, {} as Map<string, Blob>);
    expect(companyDocumentFile(companyId, 'company-requirement:registration', 'company-document:registration')).toBeNull();
    expect(addCompanyDocument(companyId, input()).ok).toBe(false); expect(owner().state).toEqual(companyDocumentsFixture);
  });

  it('sorts ISO timestamps chronologically, not lexically across timezone offsets', () => {
    const rows = companyDocumentList(readCompanyDocumentsState(), companyId, 'en').rows.slice(0, 2);
    rows[0].updatedAt = '2027-01-01T00:00:00+02:00'; rows[1].updatedAt = '2026-12-31T23:00:00Z';
    expect(sortCompanyDocuments(rows, {column: 'updatedAt', direction: 'ascending'}, 'en')[0].id).toBe(rows[0].id);
  });

  it('reuses the same company tab-memory owner after module reinitialization without losing metadata or exact bytes', async () => {
    const first = upload(), bytes = companyDocumentFile(companyId, first.requirementId, first.document.id);
    const snapshot = readCompanyDocumentsState();
    vi.resetModules();
    const fresh = await import('@/features/company-documents/company-documents-state');
    expect(fresh.readCompanyDocumentsState()).toBe(snapshot);
    expect(fresh.availableCompanyFile(companyId, first.document.id)).toBe(bytes);
  });

  it('uses the requirement current pointer as authority for managed versions, never counting unreferenced history as a second current file', () => {
    const first = upload({required: true});
    owner().state = {...owner().state, byCompany: {...owner().state.byCompany, [companyId]: {...owner().state.byCompany[companyId], requirements: owner().state.byCompany[companyId].requirements.map((item) => item.id === first.requirementId ? {...item, currentDocumentId: null} : item)}}};
    const rows = companyDocumentList(readCompanyDocumentsState(), companyId, 'en').rows;
    expect(rows.filter((row) => row.id === first.requirementId)).toHaveLength(1);
    expect(rows.find((row) => row.id === first.requirementId)?.status).toBe('missing');
    expect(companyDocumentMetrics(rows)).toEqual({total: 5, attention: 5, activeShares: 0});
    expect(companyDocumentHistory(companyId, first.requirementId)).toHaveLength(1);
  });
});
