import {describe, expect, it} from 'vitest';
import {appearanceColors, appearanceIcons, defaultAppearance, validColorKey, validIconKey} from '@/features/requirements/appearance';
import {catalogDocument} from '@/features/requirements/catalog';
import {
  addRequirementDocument, deleteRequirementTemplate, discardExistingRequirementEdit, discardRequirementDraft,
  duplicateRequirementTemplate, getCatalogCandidates, getRequirementsWorkspace, readRequirementsState,
  removeRequirementDocument, saveExistingRequirementEdit, saveRequirementDraft, selectRequirementTemplate,
  startRequirementDraft, updateCustomRequirementDocument, updateExistingRequirementTemplate, updateRequirementDraft
} from '@/features/requirements/requirements-state';

let sequence = 0;
function workspace(companyId: string) {return getRequirementsWorkspace(readRequirementsState(), companyId);}
function createTemplate() {
  const companyId = `appearance-company-${++sequence}`;
  startRequirementDraft(companyId);
  updateRequirementDraft(companyId, {name: `Template ${sequence}`, categoryId: 'construction', iconKey: 'building', iconColorKey: 'violet'});
  expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe('added');
  expect(addRequirementDocument(companyId, {customName: `Custom ${sequence}`, iconKey: 'truck', iconColorKey: 'teal', required: false, expiryWarningDays: 60, validityMonths: 24})).toBe('added');
  expect(saveRequirementDraft(companyId)).toBe('saved');
  return {companyId, template: workspace(companyId).templates[0]};
}

describe('requirement appearance and template lifecycle', () => {
  it('keeps starter provenance on editable company-owned copies', () => {
    const seeded = workspace('demo-company').templates.find((item) => item.id === 'construction')!;
    expect(seeded).toMatchObject({companyId: 'demo-company', starterTemplateId: 'starter-construction', starterTemplateVersion: 1});
    const before = structuredClone(seeded);
    updateExistingRequirementTemplate('demo-company', 'ro', {iconKey: 'shield', iconColorKey: 'rose'});
    expect(workspace('demo-company').templates.find((item) => item.id === seeded.id)).toEqual(before);
    discardExistingRequirementEdit('demo-company');
    expect(workspace('demo-company').templates.find((item) => item.id === seeded.id)).toEqual(before);
    updateExistingRequirementTemplate('demo-company', 'ro', {iconKey: 'shield', iconColorKey: 'rose'});
    expect(saveExistingRequirementEdit('demo-company')).toBe('saved');
    expect(workspace('demo-company').templates.find((item) => item.id === seeded.id)).toMatchObject({iconKey: 'shield', iconColorKey: 'rose', starterTemplateId: before.starterTemplateId});
  });

  it('defaults new and custom document appearance while catalog appearance remains canonical', () => {
    const companyId = `default-appearance-${++sequence}`;
    startRequirementDraft(companyId);
    expect(workspace(companyId).draft).toMatchObject(defaultAppearance);
    updateRequirementDraft(companyId, {name: `Default ${sequence}`, categoryId: 'software'});
    expect(addRequirementDocument(companyId, {customName: `Custom default ${sequence}`, required: true, expiryWarningDays: 30, validityMonths: 12})).toBe('added');
    expect(workspace(companyId).draft?.documents[0]).toMatchObject(defaultAppearance);
    expect(addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12})).toBe('added');
    expect(workspace(companyId).draft?.documents[1].iconKey).toBeUndefined();
    expect(catalogDocument('tax')).toMatchObject({iconKey: 'file', iconColorKey: 'rose'});
    expect(appearanceIcons).toContain('shield');
    expect(appearanceColors).toContain('teal');
    expect(validIconKey('invalid')).toBe(defaultAppearance.iconKey);
    expect(validColorKey('invalid')).toBe(defaultAppearance.iconColorKey);
  });

  it('stages custom appearance atomically and never counts appearance changes as new candidates', () => {
    const {companyId, template} = createTemplate();
    const customId = template.documents[1].id;
    const candidateBefore = getCatalogCandidates(readRequirementsState()).find((candidate) => candidate.displayName === `Custom ${sequence}`)?.usageCount;
    updateCustomRequirementDocument(companyId, customId, {iconKey: 'safety', iconColorKey: 'orange'});
    expect(workspace(companyId).templates[0].documents[1]).toMatchObject({iconKey: 'truck', iconColorKey: 'teal'});
    discardExistingRequirementEdit(companyId);
    expect(workspace(companyId).templates[0].documents[1]).toMatchObject({iconKey: 'truck', iconColorKey: 'teal'});
    updateCustomRequirementDocument(companyId, customId, {iconKey: 'safety', iconColorKey: 'orange'});
    expect(saveExistingRequirementEdit(companyId)).toBe('saved');
    expect(workspace(companyId).templates[0].documents[1]).toMatchObject({iconKey: 'safety', iconColorKey: 'orange'});
    expect(getCatalogCandidates(readRequirementsState()).find((candidate) => candidate.displayName === `Custom ${sequence}`)?.usageCount).toBe(candidateBefore);
    updateCustomRequirementDocument(companyId, template.documents[0].id, {iconKey: 'truck'});
    expect(workspace(companyId).templates[0].documents[0].catalogDocumentTypeId).toBe('tax');
    expect(workspace(companyId).editDraft?.documents[0].iconKey).toBeUndefined();
  });

  it('duplicates into an independent editable draft, gives unique names, and does not learn candidates', () => {
    const {companyId, template} = createTemplate();
    const candidatesBefore = structuredClone(getCatalogCandidates(readRequirementsState()));
    expect(duplicateRequirementTemplate(companyId, 'ro')).toBe(true);
    const firstDraft = workspace(companyId).draft!;
    expect(firstDraft).toMatchObject({name: `${template.title.ro} — copie`, duplicatedFromTemplateId: template.id, iconKey: 'building', iconColorKey: 'violet', categoryId: template.categoryId});
    expect(firstDraft.documents.map((item) => item.id)).not.toEqual(template.documents.map((item) => item.id));
    expect(firstDraft.documents[1]).toMatchObject({customName: template.documents[1].customName, iconKey: 'truck', iconColorKey: 'teal', required: false, expiryWarningDays: 60, validityMonths: 24});
    updateCustomRequirementDocument(companyId, firstDraft.documents[1].id, {iconColorKey: 'rose'});
    removeRequirementDocument(companyId, firstDraft.documents[0].id);
    expect(workspace(companyId).draft?.documents).toHaveLength(1);
    expect(workspace(companyId).templates[0]).toEqual(template);
    discardRequirementDraft(companyId);
    expect(workspace(companyId).templates).toHaveLength(1);
    expect(duplicateRequirementTemplate(companyId, 'ro')).toBe(true);
    expect(saveRequirementDraft(companyId)).toBe('saved');
    expect(workspace(companyId).templates[1]).toMatchObject({companyId, duplicatedFromTemplateId: template.id, title: {ro: `${template.title.ro} — copie`, en: `${template.title.ro} — copie`}});
    expect(getCatalogCandidates(readRequirementsState())).toEqual(candidatesBefore);
    selectRequirementTemplate(companyId, template.id);
    expect(duplicateRequirementTemplate(companyId, 'ro')).toBe(true);
    expect(workspace(companyId).draft?.name).toBe(`${template.title.ro} — copie 2`);
    expect(workspace(companyId).templates[0]).toEqual(template);
  });

  it('deletes only the active company template and selects a neighbor or empty state', () => {
    const {companyId, template} = createTemplate();
    const other = createTemplate();
    const otherBefore = structuredClone(workspace(other.companyId));
    expect(deleteRequirementTemplate(companyId)).toBe(true);
    expect(workspace(companyId)).toMatchObject({templates: [], selectedId: null});
    expect(workspace(other.companyId)).toEqual(otherBefore);
    expect(deleteRequirementTemplate(companyId)).toBe(false);
    expect(workspace('demo-company').templates.some((item) => item.id === template.id)).toBe(false);
  });
});
