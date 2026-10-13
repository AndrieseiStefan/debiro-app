import {describe, expect, it, vi} from 'vitest';
import {createCompany, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {createLocalVendor, getVendorMetadata, getVendorState, toVendorListItem, vendorListItems, retainVendorSetupDrafts} from '@/features/vendors/created-vendors';
import {activeDocuments, createLocalDocument, readDocumentRecords, updateDocumentRecord, type NewDocument} from '@/features/documents/created-documents';
import {applyVendorTemplates, associateRequirementUpload, getVendorRequirements, readVendorRequirements, resolveDocumentReview, replaceInternalDocument, markDocumentExpired, vendorCompliance} from '@/features/vendors/vendor-requirements';
import {getCompanyDocumentTypes, getRequirementsWorkspace, readRequirementsState, startRequirementDraft, updateRequirementDraft, addRequirementDocument, saveRequirementDraft} from '@/features/requirements/requirements-state';
import {templateDocumentType} from '@/features/requirements/document-types';
import {companyAuditEvents, companyNotifications} from '@/features/notifications/company-projections';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';
import {projectDashboard} from '@/features/dashboard/projections';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {accessibleDocument, documentHistory} from '@/features/documents/document-management';
import {initializeCompanySetup} from '@/features/onboarding/company-setup';
import {starterRequirementTemplates} from '@/features/requirements/starter-templates';
import {fixtureReferenceTime} from '@/lib/fixture-clock';

let sequence = 0;
function company() {
  const result = createCompany({name: `Workspace ${++sequence}`, taxId: `RO-WORK-${sequence}`, industry: 'professional', country: 'RO'});
  if (!result.ok) throw new Error(result.reason);
  return result.id;
}
function vendor(companyId: string) {return createLocalVendor({name: 'Owned vendor', cui: 'RO-VENDOR', email: 'owned@example.test', category: 'construction'}, companyId);}
function template(companyId: string, custom = false) {
  startRequirementDraft(companyId); updateRequirementDraft(companyId, {name: 'Owned template', categoryId: 'construction'});
  addRequirementDocument(companyId, {...(custom ? {customName: 'Owned custom document'} : {catalogDocumentTypeId: 'tax'}), required: true, expiryWarningDays: 30, validityMonths: 12});
  expect(saveRequirementDraft(companyId)).toBe('saved');
  return getRequirementsWorkspace(readRequirementsState(), companyId).templates[0];
}
function uploadInput(companyId: string, supplier: ReturnType<typeof vendor>, type: NonNullable<ReturnType<typeof templateDocumentType>>): NewDocument {
  return {companyId, vendorId: supplier.id, vendorName: supplier.name, vendorRegistrationNumber: supplier.cui, vendorRegistrationCode: '',
    documentName: type.name, documentType: type.documentTypeSource === 'company' ? 'custom' : 'tax', typeSnapshot: type, filename: 'owned.pdf',
    file: new File(['owned bytes'], 'owned.pdf', {type: 'application/pdf'}), fileType: 'application/pdf', fileSize: 11, expiresAt: null,
    extractionRequested: false, reviewRequired: false, uploadedBy: 'Andrei Popescu', uploadedAt: fixtureReferenceTime.slice(0, 10), createdAt: fixtureReferenceTime};
}
const review = {companyName: 'Owned vendor', documentType: 'tax', documentNumber: '', issuedAt: '', expiresAt: '01.01.2027', issuer: ''};

describe('company-owned operational workspace', () => {
  it('starts honestly empty while all Demo fixtures retain explicit ownership', () => {
    const id = company();
    expect(vendorListItems(getVendorState(), id)).toEqual([]);
    expect(activeDocuments(readDocumentRecords(), id)).toEqual([]);
    expect(getRequirementsWorkspace(readRequirementsState(), id).templates).toEqual([]);
    expect(companyAuditEvents(id, readLocalAuditEvents())).toEqual([]);
    expect(companyNotifications(id, readLocalAuditEvents(), [])).toEqual([]);
    const projected = projectDashboard(dashboardFixture, id, [], readVendorRequirements(), readDocumentRecords(), companyAuditEvents(id, readLocalAuditEvents()));
    expect(projected.suppliers).toMatchObject({total: 0, compliant: 0, attention: 0, noncompliant: 0, monthlyIncrease: 0});
    expect(projected.recentActivity).toEqual([]); expect(projected.documentsRequiringAttention).toEqual([]);
    expect(vendorListItems(getVendorState(), 'demo-company')).toHaveLength(24);
    expect(getVendorState().fixtureVendors.every((record) => record.companyId === 'demo-company')).toBe(true);
    expect(readDocumentRecords().every((record) => record.companyId === 'demo-company')).toBe(true);
    expect(getRequirementsWorkspace(readRequirementsState(), 'demo-company').templates).toHaveLength(6);
    expect(activeDocuments(readDocumentRecords(), 'demo-company').some((record) => record.id === 'vendor-document:construct-pro:insurance')).toBe(true);
  });

  it('isolates vendor/template/custom type creation and rejects foreign relationships before mutation', () => {
    const a = company(), first = vendor(a), source = template(a, true);
    const b = company(), second = vendor(b), other = template(b);
    expect(vendorListItems(getVendorState(), a).map((item) => item.id)).toEqual([first.id]);
    expect(vendorListItems(getVendorState(), b).map((item) => item.id)).toEqual([second.id]);
    expect(getVendorMetadata(getVendorState(), first.id, b)).toBeUndefined();
    expect(applyVendorTemplates(b, second.id, [source.id])).toBeNull();
    expect(applyVendorTemplates(a, second.id, [source.id])).toBeNull();
    expect(applyVendorTemplates(a, first.id, [source.id])).toMatchObject({addedCount: 1});
    expect(applyVendorTemplates(b, second.id, [other.id])).toMatchObject({addedCount: 1});
    const foreign = uploadInput(b, second, templateDocumentType(source.documents[0])!);
    const before = readDocumentRecords();
    expect(() => createLocalDocument(foreign)).toThrow('COMPANY_SCOPE_MISMATCH');
    expect(() => createLocalDocument({...foreign, vendorId: first.id})).toThrow('COMPANY_SCOPE_MISMATCH');
    expect(readDocumentRecords()).toBe(before);
    expect(getCompanyDocumentTypes(readRequirementsState(), b)).toEqual([]);
  });

  it('keeps upload/review/version/expiry projections and exact history in their owning company', () => {
    const a = company(), supplier = vendor(a), source = template(a);
    applyVendorTemplates(a, supplier.id, [source.id]);
    const document = createLocalDocument(uploadInput(a, supplier, templateDocumentType(source.documents[0])!));
    expect(associateRequirementUpload(a, supplier.id, document)).toBe(true);
    const workspace = () => getVendorRequirements(readVendorRequirements(), a, supplier.id);
    expect(vendorCompliance(workspace(), readDocumentRecords()).status).toBe('attention');
    const b = company();
    expect(accessibleDocument(readDocumentRecords(), b, document.id)).toBeUndefined();
    expect(documentHistory(readDocumentRecords(), b, document.id)).toEqual([]);
    expect(resolveDocumentReview(b, document.id, 'approved', review)).toBe('unavailable');
    expect(updateDocumentRecord(b, document.id, {issuer: 'Foreign'})).toBe(false);
    expect(updateDocumentRecord(a, document.id, {companyId: b})).toBe(false);
    expect(updateDocumentRecord(a, document.id, {companyId: ''})).toBe(false);
    expect(updateDocumentRecord(a, document.id, {vendorId: ''})).toBe(false);
    expect(updateDocumentRecord(a, document.id, {id: ''})).toBe(false);
    expect(updateDocumentRecord(a, document.id, {versionGroupId: 'construct-pro-tax-2024'})).toBe(false);
    expect(vendorListItems(getVendorState(), b)).toEqual([]);
    expect(companyAuditEvents(b, readLocalAuditEvents())).toEqual([]);
    switchActiveCompany(a);
    expect(resolveDocumentReview(a, document.id, 'approved', review)).toBe('saved');
    const result = replaceInternalDocument(a, document.id, {file: new File(['renewed'], 'renewed.pdf', {type: 'application/pdf'}), documentNumber: '', issuedAt: '', expiresAt: '01.01.2028', issuer: '', notes: ''});
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(documentHistory(readDocumentRecords(), a, result.document.id)).toHaveLength(2);
    expect(markDocumentExpired(a, result.document.id)).toBe(true);
    expect(vendorCompliance(workspace(), readDocumentRecords()).status).toBe('noncompliant');
    const notices = companyNotifications(a, readLocalAuditEvents(), [toVendorListItem(supplier)]);
    expect(notices.map((notice) => notice.type)).toContain('document_replaced');
    expect(notices.every((notice) => notice.companyId === a && !notice.isUnread)).toBe(true);
    switchActiveCompany(b); expect(activeDocuments(readDocumentRecords(), b)).toEqual([]);
    switchActiveCompany(a); expect(activeDocuments(readDocumentRecords(), a).map((record) => record.id)).toEqual([result.document.id]);
  });

  it('initializes only intentional onboarding choices and retains insufficient setup as ordinary drafts', () => {
    const skipped = company(); initializeCompanySetup(skipped, {template: null, documents: [], suppliers: []});
    expect(getRequirementsWorkspace(readRequirementsState(), skipped).templates).toEqual([]);
    const configured = company(); initializeCompanySetup(configured, {template: 'construction', documents: ['tax', 'insurance'], suppliers: [{name: 'Pending supplier', email: 'pending@example.test'}]});
    const workspace = getRequirementsWorkspace(readRequirementsState(), configured);
    expect(workspace.templates).toHaveLength(1);
    expect(workspace.templates[0]).toMatchObject({companyId: configured, starterTemplateId: 'starter-construction', categoryId: 'construction'});
    expect(workspace.templates[0].documents.map((rule) => rule.catalogDocumentTypeId)).toEqual(['tax', 'liability']);
    expect(vendorListItems(getVendorState(), configured)).toEqual([]);
    expect(getVendorState().pendingVendorDrafts[configured][0]).toMatchObject({name: 'Pending supplier', email: 'pending@example.test', cui: '', category: ''});
    const general = company(); initializeCompanySetup(general, {template: 'general', documents: ['registration'], suppliers: []});
    expect(getRequirementsWorkspace(readRequirementsState(), general)).toMatchObject({templates: [], draft: {categoryId: '', name: 'Șablon general'}});
    expect(starterRequirementTemplates.find((source) => source.id === 'starter-general')?.categoryId).toBeUndefined();
    switchActiveCompany(configured);
    createLocalVendor({name: 'Pending supplier', email: 'pending@example.test', cui: 'RO-PENDING', category: 'construction'}, configured);
    expect(getVendorState().pendingVendorDrafts[configured]).toEqual([]);
    expect(vendorListItems(getVendorState(), skipped)).toEqual([]);
  });

  it('reuses stores through client module reinitialization without user-global state contamination', async () => {
    const id = company(); const owned = vendor(id); retainVendorSetupDrafts(id, [{name: 'Draft', email: 'draft@example.test'}]);
    const before = getVendorState(), requirements = readRequirementsState(), user = readCompanyState().companies[0].members[0];
    vi.resetModules();
    const reloaded = await import('@/features/vendors/created-vendors');
    const reloadedRequirements = await import('@/features/requirements/requirements-state');
    expect(reloaded.getVendorState()).toBe(before); expect(reloadedRequirements.readRequirementsState()).toBe(requirements);
    expect(reloaded.vendorListItems(before, id).map((item) => item.id)).toEqual([owned.id]);
    expect(readCompanyState().companies[0].members[0]).toBe(user);
  });
});
