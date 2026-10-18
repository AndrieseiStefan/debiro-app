import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {employeeDocumentEngine} from '@/features/employees/employee-documents';
import {createEmployee, employeeDocumentAccess, employeeDocumentBytes, employeeDocumentWorkspace, employeeWorkspace, getEmployeeActivity, readEmployeeState, setEmployeeStatus, updateEmployee} from '@/features/employees/employees-state';
import {employeeInput} from '@/features/employees/employee-form';
import {employeeDocumentMetrics, employeeListDocumentMetrics, projectEmployeeDocuments} from '@/features/employees/employee-document-projections';
import type {EmployeeState} from '@/features/employees/types';
import {readRequirementsState} from '@/features/requirements/requirements-state';
import {readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {readDocumentRecords} from '@/features/documents/created-documents';
import {readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {resolveTemplateSources} from '@/features/requirements/template-accents';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import type {CompanyDocumentInput} from '@/features/documents/owned-document-engine';

const companyId = 'demo-company', employeeId = 'employee:andrei-popescu', otherId = 'employee:cristina-mihai';
const initial = readEmployeeState(), initialTemplates = readRequirementsState(), companies = readCompanyState();
const owner = () => Reflect.get(window, Symbol.for('debiro.employees-session')) as {state: EmployeeState; files?: Map<string, Map<string, Map<string, Blob>>>};
const templates = () => Reflect.get(window, Symbol.for('debiro.requirements-session')) as {state: typeof initialTemplates};
const companyOwner = () => Reflect.get(window, Symbol.for('debiro.company-session')) as {state: typeof companies};
const engine = () => employeeDocumentEngine(companyId, employeeId);
const input = (values: Partial<CompanyDocumentInput> = {}): CompanyDocumentInput => ({name: 'Contract individual', documentType: 'custom', issuer: '', expiresAt: '', file: new File(['actual bytes'], 'employment.pdf', {type: 'application/pdf'}), ...values});
function upload(values: Partial<CompanyDocumentInput> = {}) {const result = engine().addCompanyDocument(companyId, input(values)); if (!result.ok) throw new Error(result.reason); return result;}
function rows(id = employeeId) {const value = employeeDocumentWorkspace(companyId, id)!; return projectEmployeeDocuments(value, companyId, id, 'ro').rows;}
beforeEach(() => {owner().state = structuredClone(initial); owner().files = new Map(); templates().state = structuredClone(initialTemplates); companyOwner().state = structuredClone(companies);});
afterEach(() => {owner().state = initial; owner().files = new Map(); templates().state = initialTemplates; companyOwner().state = companies; vi.restoreAllMocks();});
function template(id = 'employee-template', required = true) {
  const base = templates().state.byCompany[companyId].templates[0];
  const value = {...base, id, scope: 'employee' as const, categoryId: null, title: {ro: 'Dosar angajat', en: 'Employee file'}, accentToken: 'violet' as const, documents: [{id: `${id}-rule`, templateId: id, catalogDocumentTypeId: 'safety', required, expiryWarningDays: 30 as const, validityMonths: 12 as const}]};
  templates().state.byCompany[companyId].templates.push(value); return value;
}

describe('Employee ownership adaptation of shared document lifecycle', () => {
  it('aggregates active employee attention once and current expiring requirements without counting inactive history', () => {
    const configured = template(); engine().applyCompanyTemplate(companyId, configured.id);
    const requirementId = rows()[0].requirementId!;
    const record = upload({requirementId, expiresAt: '01.11.2026'});
    engine().reviewCompanyDocument(companyId, requirementId, record.document.id, 'approved');
    const staff = employeeWorkspace(companyId).employees;
    const metrics = new Map<string, ReturnType<typeof employeeDocumentMetrics> | null>(staff.map((employee) => [employee.id, employeeDocumentMetrics(rows(employee.id))]));
    expect(employeeListDocumentMetrics(staff, metrics)).toEqual({attention: 1, expiring: 1, error: false});
    setEmployeeStatus(companyId, employeeId, 'inactive');
    expect(employeeListDocumentMetrics(employeeWorkspace(companyId).employees, metrics)).toEqual({attention: 0, expiring: 0, error: false});
    expect(engine().companyDocumentHistory(companyId, requirementId)).toHaveLength(1);
    setEmployeeStatus(companyId, employeeId, 'active');
    metrics.set(employeeId, null);
    expect(employeeListDocumentMetrics(employeeWorkspace(companyId).employees, metrics)).toMatchObject({error: true});
  });

  it('starts unconfigured without invented documents, activity or files, and counts optional missing truthfully', () => {
    expect(rows()).toEqual([]); expect(getEmployeeActivity(companyId, employeeId)).toEqual([]);
    expect(employeeDocumentMetrics(rows())).toEqual({total: 0, uploaded: 0, valid: 0, expiring: 0, missing: 0, tracking: 'not_configured', nextDeadline: null});
    const optional = template('optional', false); expect(engine().applyCompanyTemplate(companyId, optional.id)).toEqual({ok: true, added: 1});
    expect(employeeDocumentMetrics(rows())).toMatchObject({total: 1, uploaded: 0, missing: 0, tracking: 'complete'});
    expect(owner().files?.size).toBe(0);
  });

  it('only applies owned employee templates, deduplicates shared identity, preserves rules/files and uses ordered source accents', () => {
    const first = template(), second = template('second'), company = {...first, id: 'wrong-company-scope', scope: 'company' as const}; templates().state.byCompany[companyId].templates.push(company);
    const vendor = templates().state.byCompany[companyId].templates[0];
    for (const id of [vendor.id, company.id, 'not-found']) expect(engine().applyCompanyTemplate(companyId, id).ok).toBe(false);
    expect(engine().applyCompanyTemplate(companyId, first.id)).toEqual({ok: true, added: 1});
    const requirement = employeeDocumentWorkspace(companyId, employeeId)!.requirements[0];
    expect(employeeDocumentMetrics(rows())).toMatchObject({total: 1, missing: 1, tracking: 'attention'}); expect(rows(otherId)).toEqual([]);
    const uploaded = upload({requirementId: requirement.id, documentType: 'custom'});
    const before = structuredClone(employeeDocumentWorkspace(companyId, employeeId));
    first.documents[0].required = false; first.documents[0].expiryWarningDays = 90 as 30;
    expect(engine().applyCompanyTemplate(companyId, first.id)).toEqual({ok: true, added: 0}); expect(employeeDocumentWorkspace(companyId, employeeId)).toEqual(before);
    expect(engine().applyCompanyTemplate(companyId, second.id)).toEqual({ok: true, added: 0});
    const merged = employeeDocumentWorkspace(companyId, employeeId)!.requirements[0]; expect(merged).toMatchObject({id: requirement.id, required: true, expiryWarningDays: 30, currentDocumentId: uploaded.document.id, sourceTemplateIds: [first.id, second.id]});
    expect(resolveTemplateSources(templates().state.byCompany[companyId].templates, companyId, 'employee', merged.sourceTemplateIds).map((source) => source.templateId)).toEqual([first.id, second.id]);
    expect(employeeDocumentBytes(companyId, employeeId, uploaded.document.id)).toBeDefined();
  });

  it('validates real file/date/name/type inputs without creating orphan requirements, versions, files or events', () => {
    for (const values of [{file: undefined}, {file: new File([], 'empty.pdf', {type: 'application/pdf'})}, {file: new File(['bad'], 'bad.exe', {type: 'application/octet-stream'})}, {file: new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', {type: 'application/pdf'})}, {name: ' '}, {expiresAt: '31.02.2026'}, {documentType: 'invented'}]) {
      const before = readEmployeeState(); expect(engine().addCompanyDocument(companyId, input(values as Partial<CompanyDocumentInput>)).ok).toBe(false); expect(readEmployeeState()).toBe(before); expect(owner().files?.size).toBe(0);
    }
    const before = readEmployeeState(); vi.spyOn(crypto, 'randomUUID').mockImplementationOnce(() => {throw new Error('save unavailable');});
    expect(engine().addCompanyDocument(companyId, input())).toEqual({ok: false, reason: 'unavailable'}); expect(readEmployeeState()).toBe(before);
    const created = upload(); expect(created.document).toMatchObject({companyId, employeeId, version: 1, reviewOutcome: 'pending'});
    expect(employeeDocumentWorkspace(companyId, employeeId)!.requirements[0]).toMatchObject({employeeId, required: false, templateId: null, sourceTemplateIds: []});
  });

  it('keeps pending/rejected/replacement history and exact files while only current versions affect metrics', () => {
    const first = upload({required: true}), file = employeeDocumentBytes(companyId, employeeId, first.document.id);
    expect(employeeDocumentMetrics(rows())).toMatchObject({total: 1, uploaded: 1, valid: 0, tracking: 'attention'});
    expect(engine().reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved')).toEqual({ok: true});
    expect(employeeDocumentMetrics(rows())).toMatchObject({valid: 1, tracking: 'complete'});
    const original = structuredClone(engine().getCompanyDocumentDetails(companyId, first.requirementId)!.current!);
    const replacementFile = new File(['second bytes'], 'employment.pdf', {type: 'application/pdf'});
    const replacement = engine().replaceCompanyDocument(companyId, first.requirementId, first.document.id, input({file: replacementFile})); if (!replacement.ok) throw new Error(replacement.reason);
    expect(replacement.document).toMatchObject({version: 2, employeeId, previousDocumentId: first.document.id, reviewOutcome: 'pending'});
    expect(engine().reviewCompanyDocument(companyId, first.requirementId, replacement.document.id, 'rejected', ' ')).toMatchObject({ok: false, reason: 'rejectionReason'});
    expect(engine().reviewCompanyDocument(companyId, first.requirementId, replacement.document.id, 'rejected', 'Wrong file')).toEqual({ok: true});
    expect(employeeDocumentMetrics(rows())).toMatchObject({total: 1, uploaded: 0, missing: 1, valid: 0, tracking: 'attention'});
    const third = upload({requirementId: first.requirementId}); expect(third.document.version).toBe(3);
    const history = engine().companyDocumentHistory(companyId, first.requirementId); expect(history.map((record) => record.version)).toEqual([3, 2, 1]);
    expect(history[2]).toMatchObject({...original, supersededById: replacement.document.id}); expect(history[1]).toMatchObject({rejectionReason: 'Wrong file', reviewOutcome: 'rejected'});
    expect(engine().companyDocumentFile(companyId, first.requirementId, first.document.id)).toBe(file); expect(engine().companyDocumentFile(companyId, first.requirementId, replacement.document.id)).toBe(replacementFile);
    expect(engine().replaceCompanyDocument(companyId, first.requirementId, first.document.id, input()).ok).toBe(false);
  });

  it('reuses expiry boundaries and manual expiry, preserves original metadata and resets human review on current edits only', () => {
    const first = upload({required: true, expiresAt: '01.11.2026'}); // 30 days from the shared E1 clock.
    expect(engine().reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved').ok).toBe(true);
    expect(employeeDocumentMetrics(rows())).toMatchObject({total: 1, expiring: 1, tracking: 'attention', nextDeadline: '2026-11-01'});
    expect(engine().markCompanyDocumentExpired(companyId, first.requirementId, first.document.id)).toEqual({ok: true});
    const current = engine().getCompanyDocumentDetails(companyId, first.requirementId)!.current!;
    expect(current.expiresAt).toBe('2026-11-01'); expect(current.manuallyExpiredAt).toBeTruthy(); expect(engine().companyDocumentHistory(companyId, first.requirementId)).toHaveLength(1); expect(rows()[0].status).toBe('expired');
    expect(engine().markCompanyDocumentExpired(companyId, first.requirementId, first.document.id).ok).toBe(false);
    const second = engine().replaceCompanyDocument(companyId, first.requirementId, first.document.id, input({expiresAt: '01.12.2026'})); if (!second.ok) throw new Error(second.reason);
    expect(second.document.manuallyExpiredAt).toBeUndefined(); engine().reviewCompanyDocument(companyId, first.requirementId, second.document.id, 'approved');
    const old = structuredClone(engine().companyDocumentHistory(companyId, first.requirementId)[1]);
    expect(engine().updateCompanyDocumentMetadata(companyId, first.requirementId, second.document.id, {name: 'Updated', issuer: '', expiresAt: '', language: 'en'})).toEqual({ok: true});
    expect(rows()[0].status).toBe('needs_review'); expect(engine().companyDocumentHistory(companyId, first.requirementId)[1]).toEqual(old);
  });

  it.each(['reviewer', 'viewer'] as const)('denies all personnel document access to %s without changing basic profile or company-document permissions', (role) => {
    const first = upload(); const member = companyOwner().state.companies[0].members.find((item) => item.isCurrentUser)!; member.role = role;
    expect(employeeWorkspace(companyId).employees).toHaveLength(8); expect(employeeWorkspace(companyId).documentWorkspaces).toBeUndefined();
    expect(employeeDocumentAccess(companyId, employeeId).visible).toBe(false); expect(employeeDocumentWorkspace(companyId, employeeId)).toBeNull(); expect(employeeDocumentBytes(companyId, employeeId, first.document.id)).toBeNull(); expect(getEmployeeActivity(companyId, employeeId)).toEqual([]);
    expect(engine().getCompanyDocumentDetails(companyId, first.requirementId)).toBeNull(); expect(engine().companyDocumentHistory(companyId, first.requirementId)).toEqual([]);
    expect(engine().addCompanyDocument(companyId, input())).toMatchObject({ok: false, reason: 'access'}); expect(engine().reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'approved')).toMatchObject({ok: false, reason: 'access'});
    expect(engine().downloadCompanyDocument(companyId, first.requirementId, first.document.id)).toBe(false);
  });

  it('blocks cross-employee/company and stale operations, retains inactive files and does not alter existing Vendor/Company sources', () => {
    const companyDocuments = structuredClone(readCompanyDocumentsState()), vendorFiles = structuredClone(readDocumentRecords()), vendorRequirements = structuredClone(readVendorRequirements());
    const first = upload({required: true}), bytes = employeeDocumentBytes(companyId, employeeId, first.document.id), other = employeeDocumentEngine(companyId, otherId);
    expect(other.getCompanyDocumentDetails(companyId, first.requirementId)).toBeNull(); expect(other.companyDocumentFile(companyId, first.requirementId, first.document.id)).toBeNull();
    expect(other.addCompanyDocument(companyId, input({requirementId: first.requirementId})).ok).toBe(false);
    expect(engine().reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'unknown' as 'approved').ok).toBe(false);
    setEmployeeStatus(companyId, employeeId, 'inactive'); expect(employeeDocumentBytes(companyId, employeeId, first.document.id)).toBe(bytes);
    const employee = employeeWorkspace(companyId).employees.find((item) => item.id === employeeId)!; updateEmployee(companyId, employeeId, {...employeeInput(employee), firstName: 'Changed'}); expect(employeeDocumentBytes(companyId, employeeId, first.document.id)).toBe(bytes);
    switchActiveCompany('global-clean-services'); expect(engine().getCompanyDocumentDetails(companyId, first.requirementId)).toBeNull(); expect(engine().replaceCompanyDocument(companyId, first.requirementId, first.document.id, input()).ok).toBe(false);
    switchActiveCompany(companyId); expect(employeeDocumentBytes(companyId, employeeId, first.document.id)).toBe(bytes);
    expect(readCompanyDocumentsState()).toEqual(companyDocuments); expect(readDocumentRecords()).toEqual(vendorFiles); expect(readVendorRequirements()).toEqual(vendorRequirements);
  });

  it('rejects corrupted employee references/current pointers/version chains without repair', () => {
    const first = upload(), before = structuredClone(readEmployeeState());
    for (const corrupt of [
      (state: EmployeeState) => {state.byCompany[companyId].documentWorkspaces![employeeId].documents[0].employeeId = otherId;},
      (state: EmployeeState) => {state.byCompany[companyId].documentWorkspaces![employeeId].requirements[0].currentDocumentId = 'not-owned';},
      (state: EmployeeState) => {state.byCompany[companyId].documentWorkspaces![employeeId].documents[0].previousDocumentId = first.document.id;},
      (state: EmployeeState) => {state.byCompany[companyId].documentWorkspaces![employeeId] = null as never;}
    ]) {const state = structuredClone(before); corrupt(state); owner().state = state; expect(employeeDocumentWorkspace(companyId, employeeId)).toBeNull(); expect(engine().addCompanyDocument(companyId, input()).ok).toBe(false); expect(readEmployeeState()).toBe(state);}
  });

  it('records only real successful events with stable owner/actor/timestamps, no fake historical fixture events', () => {
    expect(getEmployeeActivity(companyId, employeeId)).toEqual([]);
    const first = upload(), event = getEmployeeActivity(companyId, employeeId)[0]; expect(event).toMatchObject({employeeId, companyId, documentId: first.document.id, type: 'document_upload', actorName: 'Andrei Popescu'}); expect(event.occurredAt).not.toBe(fixtureReferenceTime);
    const before = getEmployeeActivity(companyId, employeeId); engine().reviewCompanyDocument(companyId, first.requirementId, first.document.id, 'rejected', ''); expect(getEmployeeActivity(companyId, employeeId)).toEqual(before);
    const profile = createEmployee(companyId, {...employeeInput(), firstName: 'Ana', lastName: 'New', email: 'new@employee.test', jobTitle: 'New title', hireDate: '2026-10-01'}); if (!profile.ok) throw new Error(profile.reason);
    expect(getEmployeeActivity(companyId, profile.employee.id)).toHaveLength(1); expect(getEmployeeActivity(companyId, profile.employee.id)[0].type).toBe('employee_created');
  });
});
