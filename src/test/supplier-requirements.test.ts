import {describe, expect, it} from 'vitest';
import {documentDisplay} from '@/features/requirements/document-presentation';
import {catalogDocuments} from '@/features/requirements/catalog';
import {supplierPreviewDocuments} from '@/features/requirements/supplier-preview';
import type {RequirementTemplateDocument} from '@/features/requirements/types';
import {getSupplierPortalFixture} from '@/features/supplier-portal/fixtures';
import {supplierRequirementProgress} from '@/features/supplier-requirements/types';

const rules = {templateId: 'demo-template', required: true, expiryWarningDays: 30 as const, validityMonths: 12 as const};

describe('supplier requirement presentation', () => {
  it('uses canonical catalog identity and appearance in both languages and contexts', () => {
    for (const catalog of catalogDocuments) for (const language of ['ro', 'en'] as const) {
      expect(documentDisplay({catalogDocumentTypeId: catalog.id}, language)).toEqual({
        name: catalog.canonicalName[language], detail: catalog.description[language],
        appearance: {iconKey: catalog.iconKey, iconColorKey: catalog.iconColorKey}
      });
      expect(documentDisplay({catalogDocumentTypeId: catalog.id}, language, 'supplier')).toEqual({
        name: catalog.canonicalName[language], detail: (catalog.supplierDescription ?? catalog.description)[language],
        appearance: {iconKey: catalog.iconKey, iconColorKey: catalog.iconColorKey}
      });
    }
    for (const document of getSupplierPortalFixture('demo-construct-pro')!.documents) {
      expect(documentDisplay(document, 'ro')).toEqual(documentDisplay({catalogDocumentTypeId: document.catalogDocumentTypeId}, 'ro'));
    }
  });

  it('projects only staged document identity/optionality without mutating template rules', () => {
    const documents: RequirementTemplateDocument[] = [
      {...rules, id: 'registration-rule', catalogDocumentTypeId: 'registration'},
      {...rules, id: 'custom-rule', required: false, customName: 'Aviz staged', customDescription: 'Descriere staged', iconKey: 'tools', iconColorKey: 'teal', issuer: 'Internal issuer'}
    ];
    const before = structuredClone(documents);
    const preview = supplierPreviewDocuments(documents);
    expect(preview).toHaveLength(2);
    expect(preview[0]).toMatchObject({id: 'registration-rule', status: 'uploaded', required: true, uploadedFile: 'certificat_onrc.pdf'});
    expect(preview[1]).toMatchObject({id: 'custom-rule', status: 'missing', required: false});
    expect(documentDisplay(preview[1], 'ro')).toEqual({name: 'Aviz staged', detail: 'Descriere staged', appearance: {iconKey: 'tools', iconColorKey: 'teal'}});
    for (const document of preview) {
      expect(document).not.toHaveProperty('expiryWarningDays');
      expect(document).not.toHaveProperty('validityMonths');
      expect(document).not.toHaveProperty('templateId');
      expect(document).not.toHaveProperty('issuer');
    }
    expect(documents).toEqual(before);
    expect(supplierPreviewDocuments(documents.slice(1))).toHaveLength(1);
  });

  it('counts only uploaded fixtures; review and local selection never complete a request', () => {
    const documents = getSupplierPortalFixture('demo-construct-pro')!.documents;
    expect(supplierRequirementProgress(documents)).toEqual({completed: 2, total: 4, percentage: 50});
    const locallySelected = documents.map((document) => ({...document, selectedLocally: true, uploadedFile: 'local.pdf'}));
    expect(supplierRequirementProgress(locallySelected)).toEqual({completed: 2, total: 4, percentage: 50});
    expect(supplierRequirementProgress([])).toEqual({completed: 0, total: 0, percentage: 0});
    expect(supplierPreviewDocuments([])).toEqual([]);
  });
});
