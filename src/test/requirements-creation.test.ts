import {describe, expect, it} from 'vitest';
import {normalizeDocumentName, searchCatalog} from '@/features/requirements/catalog';
import {
  addRequirementDocument, discardRequirementDraft, getCatalogCandidates, getRequirementsWorkspace,
  isDuplicateDocument, readRequirementsState, saveRequirementDraft, startRequirementDraft,
  updateRequirementDraft, validateRequirementDraft
} from '@/features/requirements/requirements-state';
import type {RequirementTemplateDocument} from '@/features/requirements/types';

describe('requirements catalog and draft transaction', () => {
  it('normalizes names and searches names, descriptions, and aliases', () => {
    expect(normalizeDocumentName('  Declarație   SSM ')).toBe('declaratie ssm');
    expect(searchCatalog('  ANAF ')).toEqual(expect.arrayContaining([expect.objectContaining({id: 'tax'})]));
    expect(searchCatalog('quality management')).toEqual(expect.arrayContaining([expect.objectContaining({id: 'iso'})]));
  });

  it('blocks catalog and custom duplicates by logical identity', () => {
    const catalog: RequirementTemplateDocument = {id: 'one', templateId: 'draft', catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12};
    expect(isDuplicateDocument([catalog], {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe(true);
    expect(isDuplicateDocument([catalog], {customName: '  certificat   FISCAL ', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe(true);
    const custom: RequirementTemplateDocument = {id: 'two', templateId: 'draft', customName: 'Declarație specială', required: true, expiryWarningDays: 30, validityMonths: 12};
    expect(isDuplicateDocument([custom], {customName: 'declaratie  SPECIALA', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe(true);
  });

  it('validates draft fields and learns custom candidates only after Save', () => {
    const companyId = 'unit-requirements-company';
    startRequirementDraft(companyId);
    let workspace = getRequirementsWorkspace(readRequirementsState(), companyId);
    expect(validateRequirementDraft(workspace)).toBe('name');
    updateRequirementDraft(companyId, {name: '  Test   Template '});
    workspace = getRequirementsWorkspace(readRequirementsState(), companyId);
    expect(validateRequirementDraft(workspace)).toBe('category');
    updateRequirementDraft(companyId, {categoryId: 'construction'});
    workspace = getRequirementsWorkspace(readRequirementsState(), companyId);
    expect(validateRequirementDraft(workspace)).toBe('documents');
    expect(addRequirementDocument(companyId, {customName: '  Aviz   special ', customDescription: 'Local requirement', required: false, expiryWarningDays: 15, validityMonths: 24})).toBe('added');
    expect(getCatalogCandidates(readRequirementsState())).toHaveLength(0);
    discardRequirementDraft(companyId);
    expect(getCatalogCandidates(readRequirementsState())).toHaveLength(0);
    expect(getRequirementsWorkspace(readRequirementsState(), companyId).templates).toHaveLength(0);

    startRequirementDraft(companyId);
    updateRequirementDraft(companyId, {name: '  Test   Template ', categoryId: 'construction'});
    expect(addRequirementDocument(companyId, {customName: 'Aviz special', required: false, expiryWarningDays: 15, validityMonths: 24})).toBe('added');
    expect(saveRequirementDraft(companyId)).toBe('saved');
    workspace = getRequirementsWorkspace(readRequirementsState(), companyId);
    expect(workspace.draft).toBeNull();
    expect(workspace.templates[0].title.ro).toBe('Test Template');
    expect(workspace.templates[0].documents[0]).toMatchObject({customName: 'Aviz special', required: false, expiryWarningDays: 15, validityMonths: 24, templateId: workspace.templates[0].id});
    expect(getCatalogCandidates(readRequirementsState())).toEqual([expect.objectContaining({normalizedName: 'aviz special', usageCount: 1, status: 'pending'})]);
    expect(getRequirementsWorkspace(readRequirementsState(), 'another-company').templates).toHaveLength(0);

    startRequirementDraft(companyId);
    updateRequirementDraft(companyId, {name: '  test   template ', categoryId: 'construction'});
    expect(validateRequirementDraft(getRequirementsWorkspace(readRequirementsState(), companyId))).toBe('duplicateName');
    discardRequirementDraft(companyId);
  });
});
