'use client';

import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {useSyncExternalStore} from 'react';
import {catalogDocument} from '@/features/requirements/catalog';
import {documentIdentityKey, templateDocumentType, type DocumentTypeSnapshot} from '@/features/requirements/document-types';
import {getCompanyDocumentTypes, getRequirementsWorkspace, readRequirementsState} from '@/features/requirements/requirements-state';
import type {ExpiryWarningDays, LocalizedText, RequirementTemplate, ValidityMonths} from '@/features/requirements/types';
import {activeDocuments, approvedCompliance, commitDocumentVersion, readDocumentRecords, reviewDateToIso, updateDocumentRecord, type CreatedDocument} from '@/features/documents/created-documents';
import {canManuallyExpire} from '@/features/documents/compliance';
import {documentAccess} from '@/features/documents/document-access';
import {uploadFileError} from '@/features/documents/upload-file';
import type {ReviewValues} from '@/features/document-review/types';
import type {SupplierRequirementDocument, SupplierRequirementStatus} from '@/features/supplier-requirements/types';
import {getVendorDetailsFixture} from './detail-fixtures';
import {getVendorMetadata, getVendorState, vendorFixtureCompanyId} from './created-vendors';
import type {VendorDocumentRow} from './types';
import {recordLocalAuditEvent} from '@/features/notifications/local-audit';
import {currentUser} from '@/features/companies/company-state';
import {browserSession} from '@/lib/browser-session';

export type VendorRequirement = DocumentTypeSnapshot & {
  id: string; companyId: string; vendorId: string; required: boolean; expiryWarningDays?: ExpiryWarningDays; validityMonths?: ValidityMonths;
  sourceTemplateIds: string[]; sourceTemplateNames: Record<string, LocalizedText>; status: SupplierRequirementStatus;
  uploadedDocumentId?: string; createdAt: string; fixtureRow?: VendorDocumentRow;
};
export type VendorAppliedTemplate = {vendorId: string; companyId: string; templateId: string; title: LocalizedText; appliedAt: string};
export type VendorRequirementsWorkspace = {requirements: VendorRequirement[]; appliedTemplates: VendorAppliedTemplate[]};

const fixtureView = getVendorDetailsFixture('construct-pro')!;
const seeded: VendorRequirement[] = fixtureView.documents.map((row) => {
  const catalogId = row.id === 'insurance' ? 'liability' : row.id;
  const type = catalogDocument(catalogId)!;
  const uploadedDocumentId = row.status === 'missing' ? undefined : ['tax', 'fire', 'registration'].includes(row.id) ? `construct-pro-${row.id}-2024` : `vendor-document:construct-pro:${row.id}`;
  const record = readDocumentRecords().find((document) => document.id === uploadedDocumentId);
  return {documentTypeSource: 'catalog', catalogDocumentTypeId: catalogId, name: {...type.canonicalName}, description: {...type.description},
    iconKey: type.iconKey, iconColorKey: type.iconColorKey, id: `vendor-requirement:construct-pro:${catalogId}`, companyId: vendorFixtureCompanyId,
    vendorId: 'construct-pro', required: row.id !== 'iso', sourceTemplateIds: [], sourceTemplateNames: {}, status: !record ? 'missing' : record.reviewOutcome === 'pending' ? 'in_review' : 'uploaded', fixtureRow: row,
    uploadedDocumentId,
    createdAt: fixtureReferenceTime};
});
const empty: VendorRequirementsWorkspace = {requirements: [], appliedTemplates: []};
type VendorRequirementsState = Record<string, VendorRequirementsWorkspace>;
const initialState: VendorRequirementsState = {[`${vendorFixtureCompanyId}:construct-pro`]: {requirements: seeded, appliedTemplates: []}};
// Current upload references must have the same session lifetime as their document versions.
const session = browserSession(Symbol.for('debiro.vendor-requirements-session'), () => ({state: initialState, initialState, listeners: new Set<() => void>()}));
const subscribe = (listener: () => void) => {session.listeners.add(listener); return () => {session.listeners.delete(listener);};};
export function useVendorRequirements() {return useSyncExternalStore(subscribe, () => session.state, () => session.initialState);}
export function readVendorRequirements() {return session.state;}
export function vendorBelongsToCompany(companyId: string, vendorId: string) {
  const vendors = getVendorState();
  const local = vendors.createdVendors.find((vendor) => vendor.id === vendorId);
  return local ? (local.companyId ?? vendorFixtureCompanyId) === companyId : companyId === vendorFixtureCompanyId && vendors.fixtureVendors.some((vendor) => vendor.id === vendorId);
}
export function getVendorRequirements(snapshot: VendorRequirementsState, companyId: string, vendorId: string) {
  return vendorBelongsToCompany(companyId, vendorId) ? snapshot[`${companyId}:${vendorId}`] ?? empty : empty;
}
function publish(companyId: string, vendorId: string, workspace: VendorRequirementsWorkspace) {
  session.state = {...session.state, [`${companyId}:${vendorId}`]: workspace}; session.listeners.forEach((listener) => listener());
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
  const workspace = getVendorRequirements(session.state, companyId, vendorId);
  const existingKeys = new Set(workspace.requirements.map(documentIdentityKey));
  const existingSelectedKeys = new Set(selected.flatMap((template) => template.documents.map((document) => documentIdentityKey(templateDocumentType(document)!))).filter((key) => existingKeys.has(key)));
  const requirements = workspace.requirements.map((requirement) => ({...requirement, sourceTemplateIds: [...requirement.sourceTemplateIds], sourceTemplateNames: {...requirement.sourceTemplateNames}}));
  const appliedTemplates = [...workspace.appliedTemplates];
  const now = fixtureReferenceTime;
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
  for (const template of selected) {
    if (!workspace.appliedTemplates.some((item) => item.templateId === template.id)) recordLocalAuditEvent(companyId, {vendorId, templateId: template.id, eventType: 'template_applied',
      action: {ro: 'Șablon aplicat', en: 'Template applied'}, description: {ro: `${template.title.ro} (${template.documents.length} documente)`, en: `${template.title.en} (${template.documents.length} documents)`}});
  }
  return {addedCount, existingCount: existingSelectedKeys.size, templateCount: selected.length};
}

export function removeAppliedTemplate(companyId: string, vendorId: string, templateId: string) {
  if (!vendorBelongsToCompany(companyId, vendorId)) return;
  const workspace = getVendorRequirements(session.state, companyId, vendorId);
  publish(companyId, vendorId, {...workspace, appliedTemplates: workspace.appliedTemplates.filter((item) => item.templateId !== templateId)});
}

export function removeVendorRequirement(companyId: string, vendorId: string, requirementId: string) {
  if (!vendorBelongsToCompany(companyId, vendorId)) return false;
  const workspace = getVendorRequirements(session.state, companyId, vendorId);
  const requirement = workspace.requirements.find((item) => item.id === requirementId);
  if (!requirement) return false;
  // Removing configuration never deletes evidence. The current file becomes unassociated.
  const document = readDocumentRecords().find((item) => item.id === requirement.uploadedDocumentId && (item.companyId ?? vendorFixtureCompanyId) === companyId && item.vendorId === vendorId);
  if (requirement.uploadedDocumentId && !document) return false;
  if (document) updateDocumentRecord(document.id, {vendorRequirementId: undefined});
  publish(companyId, vendorId, {...workspace, requirements: workspace.requirements.filter((item) => item.id !== requirementId)});
  recordLocalAuditEvent(companyId, {vendorId, requirementId, documentId: requirement.uploadedDocumentId, eventType: 'requirement_removed', action: {ro: 'Cerință eliminată', en: 'Requirement removed'}, description: requirement.name});
  return true;
}

export function associateRequirementUpload(companyId: string, vendorId: string, document: CreatedDocument, requirementId?: string) {
  if (!vendorBelongsToCompany(companyId, vendorId) || document.vendorId !== vendorId || (document.companyId ?? vendorFixtureCompanyId) !== companyId || !document.typeSnapshot) return false;
  const workspace = getVendorRequirements(session.state, companyId, vendorId);
  const requirement = workspace.requirements.find((item) => requirementId ? item.id === requirementId : documentIdentityKey(item) === documentIdentityKey(document.typeSnapshot!));
  if (requirementId && !requirement) return false;
  if (document.typeSnapshot.documentTypeSource === 'company' ? !getCompanyDocumentTypes(readRequirementsState(), companyId).some((type) => type.id === document.typeSnapshot?.companyDocumentTypeId) : !catalogDocument(document.typeSnapshot.catalogDocumentTypeId)) return false;
  const invalidated = requirement?.uploadedDocumentId ? readDocumentRecords().find((item) => item.id === requirement.uploadedDocumentId && item.vendorId === vendorId && (item.companyId ?? vendorFixtureCompanyId) === companyId && !item.supersededById && item.manuallyExpiredAt) : undefined;
  if (requirement && (documentIdentityKey(requirement) !== documentIdentityKey(document.typeSnapshot) || (requirement.uploadedDocumentId && !invalidated))) return false;
  if (document.reviewOutcome !== 'pending' || !readDocumentRecords().some((item) => item.id === document.id && item.reviewOutcome === 'pending')) return false;
  const next: VendorRequirement = requirement ? {...requirement, fixtureRow: undefined, uploadedDocumentId: document.id, status: 'in_review'}
    : {...document.typeSnapshot, id: `vendor-requirement-${crypto.randomUUID()}`, companyId, vendorId, required: false, sourceTemplateIds: [], sourceTemplateNames: {}, uploadedDocumentId: document.id, status: 'in_review', createdAt: document.createdAt};
  const previous = readDocumentRecords().filter((item) => item.id !== document.id && item.vendorRequirementId === next.id && item.vendorId === vendorId && (item.companyId ?? vendorFixtureCompanyId) === companyId).sort((a, b) => (b.version ?? 1) - (a.version ?? 1))[0];
  if (invalidated) updateDocumentRecord(invalidated.id, {supersededById: document.id});
  updateDocumentRecord(document.id, {vendorRequirementId: next.id, ...(previous && {versionGroupId: previous.versionGroupId ?? previous.id, version: (previous.version ?? 1) + 1, previousDocumentId: previous.id})}, () => publish(companyId, vendorId, {...workspace, requirements: requirement ? workspace.requirements.map((item) => item.id === requirement.id ? next : item) : [...workspace.requirements, next]}));
  return true;
}

/** One review transaction; screens only consume projections of these owned domain records. */
export function resolveDocumentReview(companyId: string, documentId: string, outcome: 'approved' | 'rejected', values?: ReviewValues) {
  if (!documentAccess(companyId).review) return 'unavailable' as const;
  const document = readDocumentRecords().find((item) => item.id === documentId);
  if (!document || document.supersededById || (document.companyId ?? vendorFixtureCompanyId) !== companyId || !vendorBelongsToCompany(companyId, document.vendorId)) return 'unavailable' as const;
  if (document.reviewOutcome !== 'pending') return 'resolved' as const;
  const workspace = getVendorRequirements(session.state, companyId, document.vendorId);
  const requirement = workspace.requirements.find((item) => item.id === document.vendorRequirementId);
  if (document.vendorRequirementId && (!requirement || requirement.uploadedDocumentId !== document.id || requirement.status !== 'in_review')) return 'unavailable' as const;
  const normalized = values && Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])) as ReviewValues | undefined;
  const issuedAt = normalized?.issuedAt ? reviewDateToIso(normalized.issuedAt) : undefined;
  const expiresAt = normalized?.expiresAt ? reviewDateToIso(normalized.expiresAt) : null;
  if (outcome === 'approved' && (!normalized?.companyName || !normalized.documentType || (normalized.issuedAt && !issuedAt) || (normalized.expiresAt && !expiresAt) || (issuedAt && expiresAt && expiresAt < issuedAt))) return 'invalid' as const;
  const now = fixtureReferenceTime;
  const complianceStatus = outcome === 'approved' ? approvedCompliance(expiresAt ?? null, requirement?.expiryWarningDays ?? 30, now) : document.complianceStatus;
  updateDocumentRecord(document.id, {reviewOutcome: outcome, reviewedAt: now, reviewedBy: currentUser.fullName,
    ...(outcome === 'approved' && {confirmedMetadata: normalized, documentNumber: normalized!.documentNumber || undefined, issuer: normalized!.issuer || undefined, issuedAt: issuedAt ?? undefined, expiresAt: expiresAt ?? null,
      complianceStatus, status: complianceStatus === 'expiring_soon' ? 'expiring' : complianceStatus === 'needs_review' ? 'review' : complianceStatus, reviewRoute: null})}, () => {
    if (requirement) publish(companyId, document.vendorId, {...workspace, requirements: workspace.requirements.map((item) => item.id === requirement.id
      ? {...item, status: outcome === 'approved' ? 'uploaded' : 'missing', uploadedDocumentId: outcome === 'approved' ? document.id : undefined, fixtureRow: undefined} : item)});
  });
  recordLocalAuditEvent(companyId, {vendorId: document.vendorId, documentId: document.id, eventType: outcome === 'approved' ? 'document_confirmed' : 'document_rejected',
    action: outcome === 'approved' ? {ro: 'Document confirmat', en: 'Document confirmed'} : {ro: 'Document respins', en: 'Document rejected'},
    description: {ro: `${document.documentName.ro} — ${document.filename}`, en: `${document.documentName.en} — ${document.filename}`}, occurredAt: now});
  return 'saved' as const;
}

export type InternalReplacement = {file: File; documentNumber: string; issuedAt: string; expiresAt: string; issuer: string; notes: string};

/** Explicit invalidation of the owned current version, never a metadata rewrite or new version. */
export function markDocumentExpired(companyId: string, documentId: string) {
  const access = documentAccess(companyId);
  if (!access.replace) return false;
  const document = activeDocuments(readDocumentRecords(), companyId).find((item) => item.id === documentId);
  if (!document || !vendorBelongsToCompany(companyId, document.vendorId) || !canManuallyExpire(document)) return false;
  const requirement = getVendorRequirements(session.state, companyId, document.vendorId).requirements.find((item) => item.id === document.vendorRequirementId);
  if (document.vendorRequirementId && (!requirement || requirement.uploadedDocumentId !== document.id)) return false;
  const now = fixtureReferenceTime;
  updateDocumentRecord(document.id, {manuallyExpiredAt: now, manuallyExpiredBy: access.member!.userId,
    complianceStatus: approvedCompliance(document.expiresAt, requirement?.expiryWarningDays ?? 30, now, now), status: 'expired'});
  recordLocalAuditEvent(companyId, {eventType: 'document_marked_expired', actorId: access.member!.userId, actorName: access.member!.fullName,
    vendorId: document.vendorId, requirementId: requirement?.id, documentId: document.id, documentVersion: document.version ?? 1, occurredAt: now,
    action: {ro: 'Document marcat ca expirat', en: 'Document marked as expired'}, description: {ro: `${document.documentName.ro} — ${document.filename}`, en: `${document.documentName.en} — ${document.filename}`}});
  return true;
}
/** Internal trusted update: new identity, preserved history, no supplier review transition. */
export function replaceInternalDocument(companyId: string, documentId: string, input: InternalReplacement) {
  const access = documentAccess(companyId);
  if (!access.replace) return {ok: false, reason: 'access'} as const;
  const previous = activeDocuments(readDocumentRecords(), companyId).find((item) => item.id === documentId);
  if (!previous || !vendorBelongsToCompany(companyId, previous.vendorId)) return {ok: false, reason: 'unavailable'} as const;
  const workspace = getVendorRequirements(session.state, companyId, previous.vendorId);
  const requirement = workspace.requirements.find((item) => item.id === previous.vendorRequirementId);
  if (previous.vendorRequirementId && (!requirement || requirement.uploadedDocumentId !== previous.id)) return {ok: false, reason: 'unavailable'} as const;
  const issuedAt = input.issuedAt.trim() ? reviewDateToIso(input.issuedAt) : undefined;
  const expiresAt = input.expiresAt.trim() ? reviewDateToIso(input.expiresAt) : null;
  if (uploadFileError(input.file) || (input.issuedAt.trim() && !issuedAt) || (input.expiresAt.trim() && !expiresAt) || (issuedAt && expiresAt && expiresAt < issuedAt)) return {ok: false, reason: 'invalid'} as const;
  const now = fixtureReferenceTime;
  const complianceStatus = approvedCompliance(expiresAt ?? null, requirement?.expiryWarningDays ?? 30, now);
  const replacement: CreatedDocument = {...previous, id: `local-document-${crypto.randomUUID()}`, companyId,
    versionGroupId: previous.versionGroupId ?? previous.id, version: (previous.version ?? 1) + 1, previousDocumentId: previous.id, supersededById: undefined,
    filename: input.file.name, fileType: input.file.type, fileSize: input.file.size, uploadedAt: now.slice(0, 10), createdAt: now, uploadedBy: access.member!.fullName,
    issuedAt: issuedAt ?? undefined, expiresAt: expiresAt ?? null, documentNumber: input.documentNumber.trim() || undefined, issuer: input.issuer.trim() || undefined, notes: input.notes.trim() || undefined,
    origin: 'local', updateSource: 'internal', manuallyExpiredAt: undefined, manuallyExpiredBy: undefined, extractionRequested: false, extractionState: 'none', extractedMetadata: undefined, confirmedMetadata: undefined,
    reviewOutcome: 'approved', reviewedAt: undefined, reviewedBy: undefined, reviewRoute: null, complianceStatus, status: complianceStatus === 'expiring_soon' ? 'expiring' : complianceStatus};
  commitDocumentVersion(previous, replacement, input.file, () => {
    if (requirement) publish(companyId, previous.vendorId, {...workspace, requirements: workspace.requirements.map((item) => item.id === requirement.id ? {...item, status: 'uploaded', uploadedDocumentId: replacement.id, fixtureRow: undefined} : item)});
  });
  recordLocalAuditEvent(companyId, {eventType: 'document_replaced', actorId: access.member!.userId, actorName: access.member!.fullName, vendorId: previous.vendorId,
    requirementId: requirement?.id, documentId: replacement.id, previousDocumentId: previous.id, documentVersion: replacement.version, previousDocumentVersion: previous.version ?? 1,
    occurredAt: now, action: {ro: 'Document înlocuit / reînnoit', en: 'Document replaced / renewed'}, description: {ro: `${replacement.documentName.ro} — ${replacement.filename}`, en: `${replacement.documentName.en} — ${replacement.filename}`}});
  return {ok: true, document: replacement} as const;
}

export function supplierVendorDocuments(workspace: VendorRequirementsWorkspace, records: CreatedDocument[], language: 'ro' | 'en' = 'ro'): SupplierRequirementDocument[] {
  return workspace.requirements.map((requirement) => {
    const document = records.find((item) => item.id === requirement.uploadedDocumentId && !item.supersededById && item.reviewOutcome !== 'rejected' && (item.companyId ?? vendorFixtureCompanyId) === requirement.companyId && item.vendorId === requirement.vendorId);
    return {id: requirement.id, catalogDocumentTypeId: requirement.catalogDocumentTypeId, customName: requirement.documentTypeSource === 'company' ? requirement.name[language] : undefined,
      customDescription: requirement.description?.[language], iconKey: requirement.iconKey, iconColorKey: requirement.iconColorKey, required: requirement.required, status: document && !document.manuallyExpiredAt ? requirement.status : 'missing',
      uploadedFile: document && !document.manuallyExpiredAt ? document.filename : undefined, uploadedAt: document && !document.manuallyExpiredAt ? {ro: new Intl.DateTimeFormat('ro-RO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(document.createdAt)), en: new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(document.createdAt))} : undefined};
  });
}

export function vendorCompliance(workspace: VendorRequirementsWorkspace, records: CreatedDocument[]) {
  // Only the owned current reference satisfies a requirement; unrelated/history files do not.
  const current = workspace.requirements.map((requirement) => ({requirement, document: records.find((item) => item.id === requirement.uploadedDocumentId && !item.supersededById && item.reviewOutcome !== 'rejected' && (item.companyId ?? vendorFixtureCompanyId) === requirement.companyId && item.vendorId === requirement.vendorId)}));
  const noncompliant = current.some(({requirement, document}) => requirement.required && (requirement.status === 'missing' || !document || document.complianceStatus === 'expired'));
  const attention = current.some(({requirement, document}) => requirement.status === 'in_review' || document?.complianceStatus === 'needs_review' || document?.complianceStatus === 'expiring_soon');
  const validCount = current.filter(({requirement, document}) => requirement.status === 'uploaded' && ['valid', 'expiring_soon'].includes(document?.complianceStatus ?? '')).length;
  // With no configured requirements there is no unsatisfied obligation or warning.
  return {status: noncompliant ? 'noncompliant' as const : attention ? 'attention' as const : 'compliant' as const, validCount, total: workspace.requirements.length};
}
