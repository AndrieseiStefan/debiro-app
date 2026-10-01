import {validColorKey, validIconKey} from './appearance';
import {catalogDocument} from './catalog';
import type {RequirementTemplateDocument} from './types';

export type RequirementDocumentIdentity = Pick<RequirementTemplateDocument, 'catalogDocumentTypeId' | 'customName' | 'customDescription' | 'iconKey' | 'iconColorKey' | 'issuer'>;

/** One identity/appearance projection for the editor and supplier-facing views. */
export function documentDisplay(document: RequirementDocumentIdentity, language: 'ro' | 'en', context: 'editor' | 'supplier' = 'editor') {
  const catalog = document.catalogDocumentTypeId ? catalogDocument(document.catalogDocumentTypeId) : null;
  return {
    name: catalog?.canonicalName[language] ?? document.customName ?? '',
    detail: (context === 'supplier' ? catalog?.supplierDescription?.[language] : undefined) ?? catalog?.description[language] ?? document.customDescription ?? document.issuer ?? '',
    appearance: catalog ? {iconKey: catalog.iconKey, iconColorKey: catalog.iconColorKey}
      : {iconKey: validIconKey(document.iconKey), iconColorKey: validColorKey(document.iconColorKey)}
  };
}
