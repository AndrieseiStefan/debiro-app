import {describe, expect, it} from 'vitest';
import {createLocalVendor, updateVendorMetadata} from '@/features/vendors/created-vendors';
import {applyVendorTemplates, assignmentSummary, associateRequirementUpload, getVendorRequirements, readVendorRequirements, removeAppliedTemplate, removeVendorRequirement} from '@/features/vendors/vendor-requirements';
import {addRequirementDocument, deleteRequirementTemplate, getCompanyDocumentTypes, getRequirementsWorkspace, readRequirementsState, saveExistingRequirementEdit, saveRequirementDraft, selectRequirementTemplate, startRequirementDraft, updateCustomRequirementDocument, updateExistingRequirementTemplate, updateRequirementDocument, updateRequirementDraft} from '@/features/requirements/requirements-state';
import {availableDocumentTypes, documentIdentityKey, templateDocumentType} from '@/features/requirements/document-types';
import {createLocalDocument, readCreatedDocuments} from '@/features/documents/created-documents';
import type {RequirementDocumentInput} from '@/features/requirements/types';

const rules = {required: true, expiryWarningDays: 30 as const, validityMonths: 12 as const};
function vendor(companyId: string) {return createLocalVendor({name: 'Test Vendor', cui: 'RO24681357', category: 'construction', email: 'test@example.com'}, companyId);}
function template(companyId: string, name: string, documents: RequirementDocumentInput[], categoryId: 'construction' | 'software' = 'construction') {
  startRequirementDraft(companyId); updateRequirementDraft(companyId, {name, categoryId});
  for (const document of documents) expect(addRequirementDocument(companyId, document)).toBe('added');
  expect(saveRequirementDraft(companyId)).toBe('saved');
  return getRequirementsWorkspace(readRequirementsState(), companyId).templates.at(-1)!;
}
function workspace(companyId: string, id: string) {return getVendorRequirements(readVendorRequirements(), companyId, id);}
function upload(companyId: string, vendorId: string, type: NonNullable<ReturnType<typeof templateDocumentType>>) {
  return createLocalDocument({companyId, vendorId, vendorName: 'Test Vendor', vendorRegistrationNumber: 'RO24681357', vendorRegistrationCode: '',
    typeSnapshot: type, documentName: type.name, documentType: type.documentTypeSource === 'company' ? 'custom' : 'tax', filename: 'test.pdf', fileType: 'application/pdf', fileSize: 20,
    expiresAt: null, extractionRequested: false, reviewRequired: false, createdAt: '2025-01-15T12:00:00Z', uploadedAt: '2025-01-15', uploadedBy: 'Test User'});
}

describe('vendor template snapshots and local document lifecycle', () => {
  it('previews without mutation, merges catalog identities, and preserves existing upload/rules', () => {
    const company = 'assignment-catalog'; const supplier = vendor(company);
    const a = template(company, 'A', ['tax', 'registration', 'fire', 'iso', 'permit'].map((id) => ({...rules, catalogDocumentTypeId: id})));
    const types = availableDocumentTypes(company, []);
    for (const id of ['tax', 'registration']) expect(associateRequirementUpload(company, supplier.id, upload(company, supplier.id, types.find((type) => type.catalogDocumentTypeId === id)!))).toBe(true);
    const before = structuredClone(workspace(company, supplier.id));
    const summary = assignmentSummary([a], before.requirements);
    expect(summary[0].added).toHaveLength(3); expect(summary[0].existingCount).toBe(2);
    expect(workspace(company, supplier.id)).toEqual(before);
    expect(applyVendorTemplates(company, supplier.id, [a.id])).toMatchObject({addedCount: 3, existingCount: 2});
    const after = workspace(company, supplier.id);
    expect(after.requirements).toHaveLength(5);
    for (const existing of before.requirements) expect(after.requirements.find((item) => item.id === existing.id)).toMatchObject({...existing, sourceTemplateIds: [a.id], sourceTemplateNames: {[a.id]: a.title}});
    const b = template(company, 'B', [{...rules, catalogDocumentTypeId: 'permit'}, {...rules, catalogDocumentTypeId: 'safety'}]);
    expect(applyVendorTemplates(company, supplier.id, [a.id, b.id])).toMatchObject({addedCount: 1, existingCount: 5});
    expect(workspace(company, supplier.id).requirements).toHaveLength(6);
    expect(workspace(company, supplier.id).requirements.find((item) => item.catalogDocumentTypeId === 'permit')!.sourceTemplateIds).toEqual([a.id, b.id]);
    expect(applyVendorTemplates(company, supplier.id, [a.id, b.id, a.id])).toMatchObject({addedCount: 0});
    expect(workspace(company, supplier.id).appliedTemplates).toHaveLength(2);
  });

  it('resolves custom types only after Save, reuses normalized identity within a company, and snapshots metadata', () => {
    const company = 'assignment-custom'; const supplier = vendor(company);
    startRequirementDraft(company); updateRequirementDraft(company, {name: 'A', categoryId: 'construction'});
    addRequirementDocument(company, {...rules, customName: ' Fișă acces  șantier ', customDescription: 'First', issuer: 'Office', iconKey: 'shield', iconColorKey: 'violet'});
    expect(getCompanyDocumentTypes(readRequirementsState(), company)).toHaveLength(0);
    expect(saveRequirementDraft(company)).toBe('saved');
    const a = getRequirementsWorkspace(readRequirementsState(), company).templates[0];
    const b = template(company, 'B', [{...rules, required: false, customName: 'FISA ACCES SANTIER', customDescription: 'Second'}]);
    expect(a.documents[0].companyDocumentTypeId).toBe(b.documents[0].companyDocumentTypeId);
    expect(getCompanyDocumentTypes(readRequirementsState(), company)).toHaveLength(1);
    expect(assignmentSummary([a, b], []).map((item) => item.added.length)).toEqual([1, 0]);
    applyVendorTemplates(company, supplier.id, [a.id, b.id]);
    const saved = workspace(company, supplier.id).requirements[0];
    expect(saved).toMatchObject({documentTypeSource: 'company', required: true, description: {ro: 'First', en: 'First'}, issuer: 'Office', iconKey: 'shield', iconColorKey: 'violet', expiryWarningDays: 30, validityMonths: 12, sourceTemplateIds: [a.id, b.id]});
    selectRequirementTemplate(company, a.id); updateRequirementDocument(company, a.documents[0].id, {required: false, expiryWarningDays: 90});
    updateCustomRequirementDocument(company, a.documents[0].id, {customName: 'Different document', iconColorKey: 'rose'});
    expect(saveExistingRequirementEdit(company)).toBe('saved');
    expect(workspace(company, supplier.id).requirements[0]).toEqual(saved);
    removeAppliedTemplate(company, supplier.id, a.id);
    expect(workspace(company, supplier.id).requirements[0]).toEqual(saved);
    deleteRequirementTemplate(company);
    expect(workspace(company, supplier.id).requirements[0]).toEqual(saved);
    const sameNameOtherCompany = template('assignment-other', 'Other', [{...rules, customName: 'Fișă acces șantier'}]);
    expect(sameNameOtherCompany.documents[0].companyDocumentTypeId).not.toBe(saved.companyDocumentTypeId);
    expect(availableDocumentTypes('assignment-other', getCompanyDocumentTypes(readRequirementsState(), company)).some((type) => type.documentTypeSource === 'company')).toBe(false);
  });

  it('rejects incompatible and foreign assignments/operations, while category edits preserve configured data', () => {
    const company = 'assignment-scope'; const supplier = vendor(company);
    const a = template(company, 'A', [{...rules, catalogDocumentTypeId: 'tax'}]);
    const incompatible = template(company, 'Incompatible', [{...rules, catalogDocumentTypeId: 'fire'}], 'software');
    expect(applyVendorTemplates(company, supplier.id, [a.id, incompatible.id])).toBeNull();
    expect(workspace(company, supplier.id).requirements).toHaveLength(0);
    expect(applyVendorTemplates('another-company', supplier.id, [a.id])).toBeNull();
    applyVendorTemplates(company, supplier.id, [a.id]);
    const saved = structuredClone(workspace(company, supplier.id));
    expect(getVendorRequirements(readVendorRequirements(), 'another-company', supplier.id).requirements).toHaveLength(0);
    expect(removeVendorRequirement('another-company', supplier.id, saved.requirements[0].id)).toBe(false);
    removeAppliedTemplate('another-company', supplier.id, a.id);
    expect(updateVendorMetadata(company, supplier.id, {...supplier, category: 'software'})).toBe('saved');
    expect(workspace(company, supplier.id)).toEqual(saved);
    expect(applyVendorTemplates(company, supplier.id, [a.id])).toBeNull();
  });

  it('associates missing requirements by identity, and deletes the requirement and its actual local upload together', () => {
    const company = 'assignment-upload'; const supplier = vendor(company);
    const a = template(company, 'A', [{...rules, customName: 'Special permit'}, {...rules, catalogDocumentTypeId: 'tax'}]);
    applyVendorTemplates(company, supplier.id, [a.id]);
    const missing = workspace(company, supplier.id).requirements[0];
    const document = upload(company, supplier.id, missing);
    expect(associateRequirementUpload(company, supplier.id, document, missing.id)).toBe(true);
    const associated = workspace(company, supplier.id).requirements[0];
    expect(associated).toMatchObject({uploadedDocumentId: document.id, status: 'in_review'});
    expect(documentIdentityKey(associated)).toBe(documentIdentityKey(missing));
    removeAppliedTemplate(company, supplier.id, a.id);
    expect(workspace(company, supplier.id).requirements[0]).toEqual(associated);
    expect(readCreatedDocuments().some((item) => item.id === document.id)).toBe(true);
    expect(removeVendorRequirement(company, supplier.id, missing.id)).toBe(true);
    expect(readCreatedDocuments().some((item) => item.id === document.id)).toBe(false);
    expect(workspace(company, supplier.id).requirements).toHaveLength(1);
    expect(removeVendorRequirement(company, supplier.id, workspace(company, supplier.id).requirements[0].id)).toBe(true);
    expect(workspace(company, supplier.id).requirements).toHaveLength(0);
  });

  it('uses IDs rather than localized names and preserves seeded uploaded fixture metadata', () => {
    const before = workspace('demo-company', 'construct-pro').requirements.find((item) => item.catalogDocumentTypeId === 'liability')!;
    const fixture = getRequirementsWorkspace(readRequirementsState(), 'demo-company').templates[0];
    expect(applyVendorTemplates('demo-company', 'construct-pro', [fixture.id])).toMatchObject({addedCount: 2, existingCount: 3});
    const after = workspace('demo-company', 'construct-pro').requirements.find((item) => item.id === before.id)!;
    expect(after.fixtureRow).toEqual(before.fixtureRow); expect(after.uploadedDocumentId).toBe(before.uploadedDocumentId);
    expect(after.required).toBe(before.required); expect(after.status).toBe(before.status);
    selectRequirementTemplate('demo-company', fixture.id); updateExistingRequirementTemplate('demo-company', 'en', {name: 'Renamed template'}); saveExistingRequirementEdit('demo-company');
    expect(workspace('demo-company', 'construct-pro').appliedTemplates[0].title).toEqual(fixture.title);
  });
});
