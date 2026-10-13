import {describe, expect, it, vi} from 'vitest';
import {catalogDocument} from '@/features/requirements/catalog';
import {starterRequirementTemplates, searchStarterTemplates} from '@/features/requirements/starter-templates';
import {vendorCategories} from '@/features/vendors/types';
import {createCompany, getActiveCompany, getCurrentMembership, readCompanyState, switchActiveCompany} from '@/features/companies/company-state';
import {createLocalVendor} from '@/features/vendors/created-vendors';
import {applyVendorTemplates, getVendorRequirements, readVendorRequirements} from '@/features/vendors/vendor-requirements';
import {initializeCompanySetup} from '@/features/onboarding/company-setup';
import {
  addRequirementDocument, cloneStarterTemplate, deleteRequirementTemplate, discardRequirementDraft, duplicateRequirementTemplate,
  getRequirementsWorkspace, readRequirementsState, saveExistingRequirementEdit, saveRequirementDraft, selectRequirementTemplate,
  startRequirementDraft, updateExistingRequirementTemplate, updateRequirementDocument, updateRequirementDraft
} from '@/features/requirements/requirements-state';

let sequence = 0;
function company() {
  const result = createCompany({name: `Starter Company ${++sequence}`, taxId: `RO-STARTER-${sequence}`, country: 'RO', industry: 'professional'});
  if (!result.ok) throw new Error(result.reason);
  return result.id;
}
function workspace(id: string) {return getRequirementsWorkspace(readRequirementsState(), id);}

describe('global starter catalog and company snapshots', () => {
  it('has six deeply read-only, category-valid, company-independent catalog sources', () => {
    expect(starterRequirementTemplates).toHaveLength(6);
    expect(new Set(starterRequirementTemplates.map((source) => source.id)).size).toBe(6);
    for (const source of starterRequirementTemplates) {
      expect(source).not.toHaveProperty('companyId'); expect(source.active).toBe(true);
      expect(vendorCategories).toContain(source.categoryId);
      expect(Object.isFrozen(source) && Object.isFrozen(source.title) && Object.isFrozen(source.subtitle) && Object.isFrozen(source.documents)).toBe(true);
      for (const document of source.documents) {
        expect(Object.isFrozen(document)).toBe(true); expect(catalogDocument(document.catalogDocumentTypeId)).not.toBeNull();
        expect(document).not.toHaveProperty('companyDocumentTypeId');
      }
    }
    expect(searchStarterTemplates('mentenanta', 'ro', () => '')).toHaveLength(1);
    expect(searchStarterTemplates('hardware', 'en', () => '')).toHaveLength(1);
    expect(searchStarterTemplates('Custom category label', 'en', (category) => category === 'software' ? 'Custom category label' : '')[0].id).toBe('starter-software');
    expect(searchStarterTemplates('no results', 'ro', () => '')).toEqual([]);
  });

  it('creates independent complete snapshots only on explicit use, retaining them through module lifetimes', async () => {
    const id = company(), source = starterRequirementTemplates.find((item) => item.id === 'starter-software')!;
    expect(workspace(id).templates).toEqual([]);
    expect(cloneStarterTemplate(id, source.id).status).toBe('cloned');
    const copy = workspace(id).templates[0];
    expect(copy).toMatchObject({companyId: id, title: source.title, subtitle: source.subtitle, categoryId: source.categoryId,
      iconKey: source.iconKey, iconColorKey: source.iconColorKey, starterTemplateId: source.id, starterTemplateVersion: source.version});
    expect(copy.id).not.toBe(source.id); expect(copy.title).not.toBe(source.title); expect(copy.subtitle).not.toBe(source.subtitle);
    expect(copy.documents).not.toBe(source.documents);
    copy.documents.forEach((document, index) => {expect(document).toMatchObject({...source.documents[index], templateId: copy.id}); expect(document).not.toBe(source.documents[index]);});
    const before = structuredClone(copy);
    expect(Reflect.set(source, 'version', source.version + 1)).toBe(false);
    expect(Reflect.set(source.documents[0], 'required', false)).toBe(false);
    expect(workspace(id).templates[0]).toEqual(before);
    vi.resetModules();
    expect((await import('@/features/requirements/requirements-state')).readRequirementsState()).toBe(readRequirementsState());
  });

  it('isolates A/B copies, edits, duplicates, deletion and explicit vendor assignment', () => {
    const a = company(); cloneStarterTemplate(a, 'starter-software'); const first = workspace(a).templates[0];
    const b = company(); expect(workspace(b).templates).toEqual([]); cloneStarterTemplate(b, 'starter-software'); const second = workspace(b).templates[0];
    const sourceBefore = structuredClone(starterRequirementTemplates);
    expect(first.id).not.toBe(second.id);
    switchActiveCompany(a);
    updateExistingRequirementTemplate(a, 'ro', {name: 'A customized IT', iconColorKey: 'rose'});
    updateRequirementDocument(a, first.documents[0].id, {required: false, expiryWarningDays: 60});
    expect(saveExistingRequirementEdit(a)).toBe('saved');
    expect(workspace(b).templates[0]).toEqual(second); expect(starterRequirementTemplates).toEqual(sourceBefore);
    const vendor = createLocalVendor({name: 'IT vendor', cui: 'RO-IT-VENDOR', email: 'it@example.test', category: 'software'}, a);
    expect(getVendorRequirements(readVendorRequirements(), a, vendor.id).requirements).toEqual([]);
    expect(applyVendorTemplates(a, vendor.id, [second.id])).toBeNull();
    expect(applyVendorTemplates(a, vendor.id, [first.id])).toMatchObject({addedCount: 4});
    expect(duplicateRequirementTemplate(a, 'ro')).toBe(true); expect(saveRequirementDraft(a)).toBe('saved');
    expect(workspace(a).templates).toHaveLength(2);
    selectRequirementTemplate(a, first.id); expect(deleteRequirementTemplate(a)).toBe(true);
    expect(starterRequirementTemplates).toEqual(sourceBefore);
    expect(getVendorRequirements(readVendorRequirements(), a, vendor.id).requirements).toHaveLength(4);
    expect(cloneStarterTemplate(a, 'starter-software').status).toBe('cloned');
    switchActiveCompany(b); expect(workspace(b).templates).toEqual([second]);
    switchActiveCompany(a); expect(workspace(a).templates).toHaveLength(2);
  });

  it('prevents duplicate starters by provenance even after rename; custom name collisions remain distinct', () => {
    const id = company(); cloneStarterTemplate(id, 'starter-software'); const copy = workspace(id).templates[0];
    updateExistingRequirementTemplate(id, 'en', {name: 'Renamed'}); saveExistingRequirementEdit(id);
    expect(cloneStarterTemplate(id, 'starter-software')).toEqual({status: 'duplicate', templateId: copy.id});
    expect(workspace(id).templates).toHaveLength(1);
    const other = company(); startRequirementDraft(other); updateRequirementDraft(other, {name: 'Servicii IT', categoryId: 'software'});
    addRequirementDocument(other, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12}); saveRequirementDraft(other);
    expect(cloneStarterTemplate(other, 'starter-software').status).toBe('cloned');
    expect(workspace(other).templates[1].title).toEqual({ro: 'Servicii IT — copie', en: 'IT services — copy'});
  });

  it('rejects missing, foreign, read-only, malformed and dirty-state clone attempts without mutation', () => {
    const a = company(), b = company(), before = readRequirementsState();
    expect(cloneStarterTemplate(a, 'starter-software').status).toBe('accessDenied');
    expect(cloneStarterTemplate(b, 'not-found').status).toBe('notFound');
    expect(cloneStarterTemplate(b, 'starter-software', [{customName: 'Foreign custom', required: true, expiryWarningDays: 30, validityMonths: 12}]).status).toBe('invalid');
    expect(readRequirementsState()).toBe(before);
    const member = getCurrentMembership(getActiveCompany(readCompanyState())!)!;
    const role = member.role;
    for (const readOnlyRole of ['viewer', 'reviewer'] as const) {
      member.role = readOnlyRole;
      expect(cloneStarterTemplate(b, 'starter-software').status).toBe('accessDenied');
    }
    member.role = role;
    startRequirementDraft(b); updateRequirementDraft(b, {name: 'Keep my draft'});
    expect(cloneStarterTemplate(b, 'starter-software').status).toBe('dirty');
    expect(workspace(b).draft?.name).toBe('Keep my draft'); discardRequirementDraft(b);
  });

  it('preserves onboarding selected-only clones, General incomplete drafts and Configure later', () => {
    const configured = company(); initializeCompanySetup(configured, {template: 'construction', documents: ['registration', 'tax'], suppliers: []});
    expect(workspace(configured).templates).toHaveLength(1);
    expect(workspace(configured).templates[0]).toMatchObject({starterTemplateId: 'starter-construction', categoryId: 'construction'});
    expect(workspace(configured).templates[0].documents.map((document) => document.catalogDocumentTypeId)).toEqual(['registration', 'tax']);
    const general = company(); initializeCompanySetup(general, {template: 'general', documents: ['registration'], suppliers: []}, 'en');
    const draft = workspace(general).draft!;
    expect(draft).toMatchObject({name: 'General template', categoryId: ''}); expect(workspace(general).templates).toEqual([]);
    expect(saveRequirementDraft(general)).toBe('category');
    const vendor = createLocalVendor({name: 'General vendor', cui: 'RO-GENERAL', email: 'general@example.test', category: 'software'}, general);
    expect(applyVendorTemplates(general, vendor.id, [draft.id])).toBeNull();
    updateRequirementDraft(general, {categoryId: 'software'}); expect(saveRequirementDraft(general)).toBe('saved');
    expect(workspace(general).templates[0].starterTemplateId).toBeUndefined();
    const skipped = company(); initializeCompanySetup(skipped, {template: null, documents: [], suppliers: []});
    expect(workspace(skipped)).toMatchObject({templates: [], draft: null});
  });
});
