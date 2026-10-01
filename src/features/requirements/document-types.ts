import {catalogDocument, catalogDocuments, normalizeDocumentName} from './catalog';
import {validColorKey, validIconKey, type Appearance} from './appearance';
import type {LocalizedText, RequirementTemplateDocument} from './types';

export type DocumentTypeIdentity =
  | {documentTypeSource: 'catalog'; catalogDocumentTypeId: string; companyDocumentTypeId?: never}
  | {documentTypeSource: 'company'; companyDocumentTypeId: string; catalogDocumentTypeId?: never};
export type DocumentTypeSnapshot = DocumentTypeIdentity & Appearance & {name: LocalizedText; description?: LocalizedText; issuer?: string};
export type CompanyDocumentType = Appearance & {id: string; companyId: string; name: string; normalizedName: string; description?: string; issuer?: string; createdAt: string};

export function documentIdentityKey(identity: DocumentTypeIdentity) {
  return identity.documentTypeSource === 'catalog' ? `catalog:${identity.catalogDocumentTypeId}` : `company:${identity.companyDocumentTypeId}`;
}

/** Resolve only committed custom types; draft editing and global candidate learning stay separate. */
export function resolveCompanyDocumentTypes(companyId: string, documents: RequirementTemplateDocument[], existing: CompanyDocumentType[], now: string) {
  const types = [...existing];
  const resolved = documents.map((document) => {
    if (document.customName === undefined) return document;
    const name = document.customName.trim().replace(/\s+/g, ' ');
    const normalizedName = normalizeDocumentName(name);
    let type = types.find((item) => item.companyId === companyId && item.normalizedName === normalizedName);
    if (!type) {
      type = {id: `company-document-type-${crypto.randomUUID()}`, companyId, name, normalizedName,
        description: document.customDescription?.trim() || undefined, issuer: document.issuer?.trim() || undefined,
        iconKey: validIconKey(document.iconKey), iconColorKey: validColorKey(document.iconColorKey), createdAt: now};
      types.push(type);
    }
    return {...document, companyDocumentTypeId: type.id, customName: name};
  });
  return {documents: resolved, types};
}

export function templateDocumentType(document: RequirementTemplateDocument): DocumentTypeSnapshot | null {
  if (document.catalogDocumentTypeId) {
    const type = catalogDocument(document.catalogDocumentTypeId);
    return type ? {documentTypeSource: 'catalog', catalogDocumentTypeId: type.id, name: {...type.canonicalName}, description: {...type.description}, iconKey: type.iconKey, iconColorKey: type.iconColorKey, issuer: document.issuer} : null;
  }
  return document.companyDocumentTypeId ? {documentTypeSource: 'company', companyDocumentTypeId: document.companyDocumentTypeId,
    name: {ro: document.customName!, en: document.customName!}, description: {ro: document.customDescription ?? '', en: document.customDescription ?? ''},
    issuer: document.issuer, iconKey: validIconKey(document.iconKey), iconColorKey: validColorKey(document.iconColorKey)} : null;
}

/** Legacy upload values retain their URLs/filters while liability has one canonical identity. */
export function uploadTypeValue(type: DocumentTypeIdentity) {
  return type.documentTypeSource === 'company' ? type.companyDocumentTypeId : type.catalogDocumentTypeId === 'liability' ? 'insurance' : type.catalogDocumentTypeId;
}

export function availableDocumentTypes(companyId: string, companyTypes: CompanyDocumentType[]) {
  return [...catalogDocuments.map((type): DocumentTypeSnapshot => ({documentTypeSource: 'catalog', catalogDocumentTypeId: type.id,
    name: type.canonicalName, description: type.description, iconKey: type.iconKey, iconColorKey: type.iconColorKey})),
  ...companyTypes.filter((type) => type.companyId === companyId).map((type): DocumentTypeSnapshot => ({documentTypeSource: 'company', companyDocumentTypeId: type.id,
    name: {ro: type.name, en: type.name}, description: {ro: type.description ?? '', en: type.description ?? ''}, issuer: type.issuer, iconKey: type.iconKey, iconColorKey: type.iconColorKey}))];
}
