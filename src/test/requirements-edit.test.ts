import {describe, expect, it} from 'vitest';
import {
  addRequirementDocument, discardExistingRequirementEdit, getCatalogCandidates, getRequirementsWorkspace,
  readRequirementsState, removeRequirementDocument, saveExistingRequirementEdit, saveRequirementDraft,
  selectRequirementTemplate, startRequirementDraft, updateCustomRequirementDocument,
  updateExistingRequirementTemplate, updateRequirementDocument, updateRequirementDraft,
  validateExistingRequirementEdit
} from '@/features/requirements/requirements-state';
import {normalizeDocumentName} from '@/features/requirements/catalog';

let sequence = 0;
function createTemplate() {
  const companyId = `edit-lifecycle-${++sequence}`;
  startRequirementDraft(companyId);
  updateRequirementDraft(companyId, {name: `Original ${sequence}`, description: 'Original description', categoryId: 'construction'});
  expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'registration', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe('added');
  expect(addRequirementDocument(companyId, {customName: `Original custom ${sequence}`, customDescription: 'Original custom description', issuer: 'Original issuer', required: false, expiryWarningDays: 15, validityMonths: 24})).toBe('added');
  expect(saveRequirementDraft(companyId)).toBe('saved');
  const template = getRequirementsWorkspace(readRequirementsState(), companyId).templates[0];
  return {companyId, template, catalogId: template.documents[0].id, customId: template.documents[1].id};
}

function workspace(companyId: string) {
  return getRequirementsWorkspace(readRequirementsState(), companyId);
}

describe('existing requirement template atomic edits', () => {
  it('keeps metadata, rules, additions, removals, and custom metadata staged until Cancel or Save', () => {
    const {companyId, template, catalogId, customId} = createTemplate();
    const original = structuredClone(template);
    updateExistingRequirementTemplate(companyId, 'ro', {name: '  Changed   Template ', description: 'Changed description', categoryId: 'software'});
    updateRequirementDocument(companyId, catalogId, {required: false, expiryWarningDays: 60}, 'ro');
    updateCustomRequirementDocument(companyId, customId, {customName: 'Corrected custom', customDescription: 'Corrected description', issuer: 'Corrected issuer'}, 'ro');
    removeRequirementDocument(companyId, catalogId, 'ro');
    expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12}, 'ro')).toBe('added');
    expect(workspace(companyId).editDraft).toMatchObject({name: '  Changed   Template ', categoryId: 'software', isDirty: true});
    expect(workspace(companyId).editDraft?.documents).toHaveLength(2);
    expect(workspace(companyId).templates[0]).toEqual(original);
    discardExistingRequirementEdit(companyId);
    expect(workspace(companyId).editDraft).toBeNull();
    expect(workspace(companyId).templates[0]).toEqual(original);

    updateExistingRequirementTemplate(companyId, 'ro', {name: '  Changed   Template ', description: 'Changed description', categoryId: 'software'});
    updateRequirementDocument(companyId, catalogId, {required: false, expiryWarningDays: 60}, 'ro');
    updateCustomRequirementDocument(companyId, customId, {customName: 'Corrected custom', customDescription: 'Corrected description', issuer: 'Corrected issuer'}, 'ro');
    removeRequirementDocument(companyId, catalogId, 'ro');
    expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12}, 'ro')).toBe('added');
    expect(saveExistingRequirementEdit(companyId)).toBe('saved');
    const saved = workspace(companyId).templates[0];
    expect(saved).toMatchObject({title: {ro: 'Changed Template', en: 'Changed Template'}, subtitle: {ro: 'Changed description', en: 'Changed description'}, categoryId: 'software'});
    expect(saved.documents).toHaveLength(2);
    expect(saved.documents.some((document) => document.id === catalogId)).toBe(false);
    expect(saved.documents.find((document) => document.id === customId)).toMatchObject({customName: 'Corrected custom', customDescription: 'Corrected description', issuer: 'Corrected issuer'});
    expect(saved.documents.some((document) => document.catalogDocumentTypeId === 'tax')).toBe(true);
    expect(workspace(companyId).editDraft).toBeNull();
  });

  it('validates own name, another template name, blank fields, and document uniqueness', () => {
    const {companyId, template, catalogId, customId} = createTemplate();
    updateExistingRequirementTemplate(companyId, 'ro', {name: `  original    ${sequence} `});
    expect(validateExistingRequirementEdit(workspace(companyId))).toBeNull();
    discardExistingRequirementEdit(companyId);

    startRequirementDraft(companyId);
    updateRequirementDraft(companyId, {name: 'Second template', categoryId: 'construction'});
    expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe('added');
    expect(saveRequirementDraft(companyId)).toBe('saved');
    selectRequirementTemplate(companyId, template.id);
    updateExistingRequirementTemplate(companyId, 'ro', {name: '  SECOND   TEMPLATE '});
    expect(validateExistingRequirementEdit(workspace(companyId))).toBe('duplicateName');
    expect(saveExistingRequirementEdit(companyId)).toBe('duplicateName');
    updateExistingRequirementTemplate(companyId, 'ro', {name: '  '});
    expect(validateExistingRequirementEdit(workspace(companyId))).toBe('name');
    updateExistingRequirementTemplate(companyId, 'ro', {name: 'Valid name', categoryId: ''});
    expect(validateExistingRequirementEdit(workspace(companyId))).toBe('category');
    updateExistingRequirementTemplate(companyId, 'ro', {categoryId: 'construction'});
    updateCustomRequirementDocument(companyId, customId, {customName: 'Registration certificate'}, 'ro');
    expect(validateExistingRequirementEdit(workspace(companyId))).toBe('duplicateDocument');
    expect(saveExistingRequirementEdit(companyId)).toBe('duplicateDocument');
    updateCustomRequirementDocument(companyId, customId, {customName: '  '}, 'ro');
    expect(validateExistingRequirementEdit(workspace(companyId))).toBe('invalidDocument');
    updateCustomRequirementDocument(companyId, customId, {customName: 'Unique custom'}, 'ro');
    removeRequirementDocument(companyId, customId, 'ro');
    removeRequirementDocument(companyId, catalogId, 'ro');
    expect(validateExistingRequirementEdit(workspace(companyId))).toBe('documents');
    expect(workspace(companyId).templates.find((item) => item.id === template.id)).toEqual(template);
  });

  it('keeps localized seeded titles when saving only whitespace normalization', () => {
    const companyId = 'demo-company';
    const original = workspace(companyId).templates.find((template) => template.id === 'construction')!;
    updateExistingRequirementTemplate(companyId, 'ro', {name: `  ${original.title.ro}  `});
    expect(saveExistingRequirementEdit(companyId)).toBe('saved');
    expect(workspace(companyId).templates.find((template) => template.id === original.id)?.title).toEqual(original.title);
  });

  it('defers custom candidate learning and leaves canonical catalog names immutable', () => {
    const {companyId, template, catalogId} = createTemplate();
    const candidateName = `Staged candidate ${sequence}`;
    const before = getCatalogCandidates(readRequirementsState()).length;
    expect(addRequirementDocument(companyId, {customName: candidateName, required: true, expiryWarningDays: 30, validityMonths: 12}, 'ro')).toBe('added');
    expect(getCatalogCandidates(readRequirementsState())).toHaveLength(before);
    const stagedId = workspace(companyId).editDraft!.documents.at(-1)!.id;
    removeRequirementDocument(companyId, stagedId, 'ro');
    expect(saveExistingRequirementEdit(companyId)).toBe('missing');
    expect(getCatalogCandidates(readRequirementsState())).toHaveLength(before);
    updateCustomRequirementDocument(companyId, catalogId, {customName: 'Cannot rename catalog'}, 'ro');
    expect(workspace(companyId).templates[0].documents[0].catalogDocumentTypeId).toBe('registration');
    expect(workspace(companyId).editDraft?.documents[0].customName).toBeUndefined();
    discardExistingRequirementEdit(companyId);

    expect(addRequirementDocument(companyId, {customName: candidateName, required: true, expiryWarningDays: 30, validityMonths: 12}, 'ro')).toBe('added');
    discardExistingRequirementEdit(companyId);
    expect(getCatalogCandidates(readRequirementsState())).toHaveLength(before);
    expect(workspace(companyId).templates[0]).toEqual(template);

    expect(addRequirementDocument(companyId, {customName: candidateName, required: true, expiryWarningDays: 30, validityMonths: 12}, 'ro')).toBe('added');
    expect(saveExistingRequirementEdit(companyId)).toBe('saved');
    expect(getCatalogCandidates(readRequirementsState()).find((candidate) => candidate.normalizedName === normalizeDocumentName(candidateName))).toMatchObject({usageCount: 1, status: 'pending'});
    expect(workspace('another-edit-company').templates).toHaveLength(0);
  });
});
