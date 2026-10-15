import {describe, expect, it} from 'vitest';
import {
  addRequirementDocument, discardRequirementDraft, duplicateRequirementTemplate, getRequirementTemplate, getRequirementsWorkspace,
  listRequirementTemplates, readRequirementsState, saveExistingRequirementEdit, saveRequirementDraft, selectRequirementTemplate,
  selectRequirementTemplateScope, startRequirementDraft, updateExistingRequirementTemplate, updateRequirementDraft, validateRequirementDraft
} from '@/features/requirements/requirements-state';
import {isRequirementTemplateScope, requirementTemplateScope, templateAppliesToTarget} from '@/features/requirements/template-scope';
import type {RequirementTemplateScope} from '@/features/requirements/types';
import {applyVendorTemplates, getVendorRequirements, readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {createLocalVendor} from '@/features/vendors/created-vendors';

const rule = {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12} as const;
const workspace = (company: string) => getRequirementsWorkspace(readRequirementsState(), company);
function create(company: string, scope: RequirementTemplateScope, name: string) {
  startRequirementDraft(company, scope);
  updateRequirementDraft(company, {name, ...(scope === 'vendor' && {categoryId: 'construction' as const})});
  expect(addRequirementDocument(company, rule)).toBe('added');
  expect(saveRequirementDraft(company)).toBe('saved');
  return workspace(company).templates.at(-1)!;
}

describe('additive requirement template target scopes', () => {
  it('reads legacy vendor templates/drafts without rewriting source records or unrelated companies', () => {
    const snapshot = structuredClone(readRequirementsState());
    const raw = snapshot.byCompany['demo-company'];
    raw.templates.forEach((template) => Reflect.deleteProperty(template, 'scope'));
    Reflect.deleteProperty(raw, 'selectedScope');
    raw.draft = {id: 'legacy-draft', scope: 'vendor', name: 'Legacy draft', description: '', categoryId: '', iconKey: 'file', iconColorKey: 'blue', documents: [], isNew: true, isDirty: true};
    Reflect.deleteProperty(raw.draft, 'scope');
    const before = structuredClone(snapshot);
    const projected = getRequirementsWorkspace(snapshot, 'demo-company');
    expect(projected.selectedScope).toBe('vendor');
    expect(projected.draft).toMatchObject({id: 'legacy-draft', scope: 'vendor', name: 'Legacy draft'});
    expect(projected.templates.map(({scope, ...template}) => {expect(scope).toBe('vendor'); return template;})).toEqual(raw.templates);
    expect(getRequirementTemplate(snapshot, 'demo-company', raw.templates[0].id)).toMatchObject({scope: 'vendor'});
    expect(listRequirementTemplates(snapshot, 'demo-company', 'company')).toEqual([]);
    expect(snapshot).toEqual(before);
    expect(requirementTemplateScope({})).toBe('vendor');
    expect(templateAppliesToTarget(raw.templates[0], 'vendor', 'construction')).toBe(true);
  });

  it('creates all scopes in the same store and requires category only for vendors', () => {
    const company = 'unit-template-scopes';
    for (const scope of ['vendor', 'company', 'employee'] as const) {
      startRequirementDraft(company, scope); updateRequirementDraft(company, {name: `${scope} template`});
      expect(validateRequirementDraft(workspace(company))).toBe(scope === 'vendor' ? 'category' : 'documents');
      if (scope === 'vendor') updateRequirementDraft(company, {categoryId: 'construction'});
      addRequirementDocument(company, rule);
      expect(saveRequirementDraft(company)).toBe('saved');
      expect(workspace(company).templates.at(-1)).toMatchObject({companyId: company, scope, categoryId: scope === 'vendor' ? 'construction' : null});
      expect(listRequirementTemplates(readRequirementsState(), company, scope)).toHaveLength(1);
    }
    expect(workspace(company).templates).toHaveLength(3);
    expect(workspace('unit-template-other').templates).toEqual([]);
    selectRequirementTemplateScope(company, 'company');
    expect(workspace(company).selectedId).toBe(listRequirementTemplates(readRequirementsState(), company, 'company')[0].id);
    expect(getRequirementTemplate(readRequirementsState(), 'unit-template-other', workspace(company).selectedId!)).toBeNull();
  });

  it('preserves legacy and unreadable stored records during unrelated creation and editing', () => {
    const company = 'unit-preserve-scope-storage';
    const legacy = {...structuredClone(workspace('demo-company').templates[0]), companyId: company};
    Reflect.deleteProperty(legacy, 'scope');
    const unreadable = {...structuredClone(legacy), id: 'future-scope'};
    Reflect.set(unreadable, 'scope', 'unknown');
    readRequirementsState().byCompany[company] = {templates: [legacy, unreadable], selectedScope: 'vendor', selectedId: legacy.id, draft: null, editDraft: null};
    const original = structuredClone(legacy), hidden = structuredClone(unreadable);
    create(company, 'company', 'Additional company template');
    expect(readRequirementsState().byCompany[company].templates.slice(0, 2)).toEqual([original, hidden]);
    expect(workspace(company).templates).toHaveLength(2);
    selectRequirementTemplate(company, legacy.id);
    updateExistingRequirementTemplate(company, 'ro', {description: 'Explicit vendor edit'});
    expect(saveExistingRequirementEdit(company)).toBe('saved');
    expect(getRequirementTemplate(readRequirementsState(), company, legacy.id)).toMatchObject({scope: 'vendor', categoryId: original.categoryId, documents: original.documents});
    expect(readRequirementsState().byCompany[company].templates.find((template) => template.id === hidden.id)).toEqual(hidden);
  });

  it('preserves company-wide name uniqueness, cancellation and required document validation', () => {
    const company = 'unit-scope-validation'; create(company, 'vendor', 'Existing name');
    startRequirementDraft(company, 'company'); updateRequirementDraft(company, {name: '  EXISTING   NAME '});
    expect(saveRequirementDraft(company)).toBe('duplicateName');
    expect(selectRequirementTemplateScope(company, 'employee')).toBe(false);
    discardRequirementDraft(company);
    expect(selectRequirementTemplateScope(company, 'employee')).toBe(true);
    startRequirementDraft(company); updateRequirementDraft(company, {name: 'New employee template'});
    expect(saveRequirementDraft(company)).toBe('documents');
    discardRequirementDraft(company);
    expect(workspace(company).templates).toHaveLength(1);
  });

  it('edits and duplicates non-vendor templates without category or scope/ownership changes', () => {
    const company = 'unit-scope-edit'; const template = create(company, 'company', 'Company requirements');
    const change = {name: 'Forbidden', scope: 'employee', companyId: 'foreign'};
    expect(updateExistingRequirementTemplate(company, 'en', change)).toBe(false);
    expect(workspace(company).editDraft).toBeNull();
    updateExistingRequirementTemplate(company, 'en', {name: 'Edited company requirements'});
    expect(saveExistingRequirementEdit(company)).toBe('saved');
    expect(getRequirementTemplate(readRequirementsState(), company, template.id)).toMatchObject({scope: 'company', companyId: company, categoryId: null, title: {en: 'Edited company requirements'}});
    expect(duplicateRequirementTemplate(company, 'en')).toBe(true);
    expect(workspace(company).draft).toMatchObject({scope: 'company', categoryId: ''});
    expect(saveRequirementDraft(company)).toBe('saved');
    expect(workspace(company).templates).toHaveLength(2);
    selectRequirementTemplate(company, template.id);
    updateExistingRequirementTemplate(company, 'en', {description: 'Staged'});
    readRequirementsState().byCompany[company].editDraft!.scope = 'employee';
    const before = structuredClone(workspace(company).templates);
    expect(saveExistingRequirementEdit(company)).toBe('scope');
    expect(workspace(company).templates).toEqual(before);
  });

  it('rejects invalid scope without publishing or losing existing company session state', () => {
    const company = 'unit-invalid-scope'; create(company, 'vendor', 'Keep vendor');
    for (const invalid of ['unknown', null, 42]) {
      const before = readRequirementsState();
      expect(isRequirementTemplateScope(invalid)).toBe(false);
      expect(requirementTemplateScope({scope: invalid})).toBeNull();
      expect(startRequirementDraft(company, invalid as RequirementTemplateScope)).toBe(false);
      expect(selectRequirementTemplateScope(company, invalid as RequirementTemplateScope)).toBe(false);
      expect(readRequirementsState()).toBe(before);
    }
    const snapshot = structuredClone(readRequirementsState());
    const before = structuredClone(snapshot);
    Reflect.set(snapshot.byCompany[company].templates[0], 'scope', 'invalid');
    expect(listRequirementTemplates(snapshot, company, 'vendor')).toEqual([]);
    Reflect.set(snapshot.byCompany[company], 'templates', [null, {scope: 'company'}, {...before.byCompany[company].templates[0], documents: [null]}]);
    Reflect.set(snapshot.byCompany[company], 'draft', {scope: 'employee', documents: 'broken'});
    expect(getRequirementsWorkspace(snapshot, company)).toMatchObject({templates: [], draft: null});
    expect(getRequirementsWorkspace({} as typeof snapshot, company).templates).toEqual([]);
    expect(workspace(company).templates).toEqual(before.byCompany[company].templates);
  });

  it('rejects company/employee application atomically even with a forged matching vendor category', () => {
    const company = 'unit-scope-assignment';
    const vendor = createLocalVendor({name: 'Scoped vendor', cui: 'RO-SCOPED', category: 'construction', email: 'scope@example.test'}, company);
    const vendorTemplate = create(company, 'vendor', 'Vendor only');
    for (const scope of ['company', 'employee'] as const) {
      const template = create(company, scope, `${scope} only`);
      readRequirementsState().byCompany[company].templates.find((item) => item.id === template.id)!.categoryId = 'construction';
      const before = structuredClone(getVendorRequirements(readVendorRequirements(), company, vendor.id));
      expect(templateAppliesToTarget({...template, categoryId: 'construction'}, 'vendor', 'construction')).toBe(false);
      expect(templateAppliesToTarget(template, scope)).toBe(true);
      expect(applyVendorTemplates(company, vendor.id, [vendorTemplate.id, template.id])).toBeNull();
      expect(getVendorRequirements(readVendorRequirements(), company, vendor.id)).toEqual(before);
    }
    expect(applyVendorTemplates(company, vendor.id, [vendorTemplate.id])).toMatchObject({addedCount: 1});
    expect(getVendorRequirements(readVendorRequirements(), company, vendor.id).requirements[0]).toMatchObject({required: true, catalogDocumentTypeId: 'tax'});
  });
});
