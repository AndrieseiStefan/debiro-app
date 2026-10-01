'use client';

import {useSyncExternalStore} from 'react';
import {catalogDocument} from '@/features/requirements/catalog';
import {documentIdentityKey, templateDocumentType, type DocumentTypeSnapshot} from '@/features/requirements/document-types';
import {getCompanyDocumentTypes, getRequirementsWorkspace, readRequirementsState} from '@/features/requirements/requirements-state';
import type {ExpiryWarningDays, LocalizedText, RequirementTemplate, ValidityMonths} from '@/features/requirements/types';
import {deleteLocalDocument, type CreatedDocument} from '@/features/documents/created-documents';
import {getVendorDetailsFixture} from './detail-fixtures';
import {getVendorMetadata, getVendorState, vendorFixtureCompanyId} from './created-vendors';
import type {VendorDocumentRow} from './types';

export type VendorRequirement = DocumentTypeSnapshot & {
  id: string; companyId: string; vendorId: string; required: boolean; expiryWarningDays?: ExpiryWarningDays; validityMonths?: ValidityMonths;
  sourceTemplateIds: string[]; sourceTemplateNames: Record<string, LocalizedText>; status: VendorDocumentRow['status'];
  uploadedDocumentId?: string; createdAt: string; fixtureRow?: VendorDocumentRow;
};
export type VendorAppliedTemplate = {vendorId: string; companyId: string; templateId: string; title: LocalizedText; appliedAt: string};
export type VendorRequirementsWorkspace = {requirements: VendorRequirement[]; appliedTemplates: VendorAppliedTemplate[]};

const fixtureView = getVendorDetailsFixture('construct-pro')!;
const seeded: VendorRequirement[] = fixtureView.documents.map((row) => {
  const catalogId = row.id === 'insurance' ? 'liability' : row.id;
  const type = catalogDocument(catalogId)!;
  return {documentTypeSource: 'catalog', catalogDocumentTypeId: catalogId, name: {...type.canonicalName}, description: {...type.description},
    iconKey: type.iconKey, iconColorKey: type.iconColorKey, id: `vendor-requirement:construct-pro:${catalogId}`, companyId: vendorFixtureCompanyId,
    vendorId: 'construct-pro', required: row.id !== 'iso', sourceTemplateIds: [], sourceTemplateNames: {}, status: row.status, fixtureRow: row,
    uploadedDocumentId: row.status === 'missing' ? undefined : ['tax', 'fire', 'registration'].includes(row.id) ? `construct-pro-${row.id}-2024` : `vendor-document:construct-pro:${row.id}`,
    createdAt: '2025-01-15T12:00:00.000Z'};
});
const empty: VendorRequirementsWorkspace = {requirements: [], appliedTemplates: []};
const initialState: Record<string, VendorRequirementsWorkspace> = {[`${vendorFixtureCompanyId}:construct-pro`]: {requirements: seeded, appliedTemplates: []}};
let state = initialState;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};};
export function useVendorRequirements() {return useSyncExternalStore(subscribe, () => state, () => initialState);}
export function readVendorRequirements() {return state;}
export function vendorBelongsToCompany(companyId: string, vendorId: string) {
  const vendors = getVendorState();
  const local = vendors.createdVendors.find((vendor) => vendor.id === vendorId);
  return local ? (local.companyId ?? vendorFixtureCompanyId) === companyId : companyId === vendorFixtureCompanyId && vendors.fixtureVendors.some((vendor) => vendor.id === vendorId);
}
export function getVendorRequirements(snapshot: typeof state, companyId: string, vendorId: string) {
  return vendorBelongsToCompany(companyId, vendorId) ? snapshot[`${companyId}:${vendorId}`] ?? empty : empty;
}
function publish(companyId: string, vendorId: string, workspace: VendorRequirementsWorkspace) {
  state = {...state, [`${companyId}:${vendorId}`]: workspace}; listeners.forEach((listener) => listener());
}

/** Ordered union: first new snapshot wins; existing rules/upload state are never overwritten. */
export function assignmentSummary(templates: RequirementTemplate[], existing: VendorRequirement[]) {
  const known = new Set(existing.map(documentIdentityKey));
  return templates.map((template) => {
    const added = template.documents.filter((document) => {
      const type = templateDocumentType(document);
      if (!type) return false;
      const key = documentIdentityKey(type);
      if (known.has(key)) return false;
      known.add(key); return true;
    });
    return {template, added, existingCount: template.documents.length - added.length};
  });
}

export function applyVendorTemplates(companyId: string, vendorId: string, templateIds: string[]) {
  if (!vendorBelongsToCompany(companyId, vendorId)) return null;
  const vendor = getVendorMetadata(getVendorState(), vendorId);
  const available = getRequirementsWorkspace(readRequirementsState(), companyId).templates;
  const templates = [...new Set(templateIds)].map((id) => available.find((template) => template.id === id));
  if (!templates.length || templates.some((template) => !template || template.companyId !== companyId || template.categoryId !== vendor?.category || template.documents.some((document) => !templateDocumentType(document)))) return null;
  const selected = templates as RequirementTemplate[];
  const workspace = getVendorRequirements(state, companyId, vendorId);
  const existingKeys = new Set(workspace.requirements.map(documentIdentityKey));
  const existingSelectedKeys = new Set(selected.flatMap((template) => template.documents.map((document) => documentIdentityKey(templateDocumentType(document)!))).filter((key) => existingKeys.has(key)));
  const requirements = workspace.requirements.map((requirement) => ({...requirement, sourceTemplateIds: [...requirement.sourceTemplateIds], sourceTemplateNames: {...requirement.sourceTemplateNames}}));
  const appliedTemplates = [...workspace.appliedTemplates];
  const now = new Date().toISOString();
  let addedCount = 0;
  for (const template of selected) {
    for (const document of template.documents) {
      const type = templateDocumentType(document)!;
      let requirement = requirements.find((item) => documentIdentityKey(item) === documentIdentityKey(type));
      if (!requirement) {
        requirement = {...type, id: `vendor-requirement-${crypto.randomUUID()}`, companyId, vendorId, required: document.required,
          expiryWarningDays: document.expiryWarningDays, validityMonths: document.validityMonths, sourceTemplateIds: [], sourceTemplateNames: {}, status: 'missing', createdAt: now};
        requirements.push(requirement); addedCount++;
      }
      if (!requirement.sourceTemplateIds.includes(template.id)) {
        requirement.sourceTemplateIds.push(template.id); requirement.sourceTemplateNames[template.id] = {...template.title};
      }
    }
    if (!appliedTemplates.some((item) => item.templateId === template.id)) appliedTemplates.push({companyId, vendorId, templateId: template.id, title: {...template.title}, appliedAt: now});
  }
  publish(companyId, vendorId, {requirements, appliedTemplates});
  return {addedCount, existingCount: existingSelectedKeys.size, templateCount: selected.length};
}

export function removeAppliedTemplate(companyId: string, vendorId: string, templateId: string) {
  if (!vendorBelongsToCompany(companyId, vendorId)) return;
  const workspace = getVendorRequirements(state, companyId, vendorId);
  publish(companyId, vendorId, {...workspace, appliedTemplates: workspace.appliedTemplates.filter((item) => item.templateId !== templateId)});
}

export function removeVendorRequirement(companyId: string, vendorId: string, requirementId: string) {
  if (!vendorBelongsToCompany(companyId, vendorId)) return false;
  const workspace = getVendorRequirements(state, companyId, vendorId);
  const requirement = workspace.requirements.find((item) => item.id === requirementId);
  if (!requirement || (requirement.uploadedDocumentId && !deleteLocalDocument(companyId, requirement.uploadedDocumentId))) return false;
  publish(companyId, vendorId, {...workspace, requirements: workspace.requirements.filter((item) => item.id !== requirementId)});
  return true;
}

export function associateRequirementUpload(companyId: string, vendorId: string, document: CreatedDocument, requirementId?: string) {
  if (!vendorBelongsToCompany(companyId, vendorId) || document.vendorId !== vendorId || (document.companyId ?? vendorFixtureCompanyId) !== companyId || !document.typeSnapshot) return false;
  const workspace = getVendorRequirements(state, companyId, vendorId);
  const requirement = workspace.requirements.find((item) => requirementId ? item.id === requirementId : documentIdentityKey(item) === documentIdentityKey(document.typeSnapshot!));
  if (requirementId && !requirement) return false;
  if (document.typeSnapshot.documentTypeSource === 'company' ? !getCompanyDocumentTypes(readRequirementsState(), companyId).some((type) => type.id === document.typeSnapshot?.companyDocumentTypeId) : !catalogDocument(document.typeSnapshot.catalogDocumentTypeId)) return false;
  if (requirement && (documentIdentityKey(requirement) !== documentIdentityKey(document.typeSnapshot) || requirement.uploadedDocumentId)) return false;
  const next: VendorRequirement = requirement ? {...requirement, fixtureRow: undefined, uploadedDocumentId: document.id, status: document.status}
    : {...document.typeSnapshot, id: `vendor-requirement-${crypto.randomUUID()}`, companyId, vendorId, required: false, sourceTemplateIds: [], sourceTemplateNames: {}, uploadedDocumentId: document.id, status: document.status, createdAt: document.createdAt};
  publish(companyId, vendorId, {...workspace, requirements: requirement ? workspace.requirements.map((item) => item.id === requirement.id ? next : item) : [...workspace.requirements, next]});
  return true;
}
