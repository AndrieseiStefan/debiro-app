'use client';

import {documentAccess} from '@/features/documents/document-access';
import {approvedCompliance, canManuallyExpire} from '@/features/documents/compliance';
import {reviewDateToIso} from '@/features/documents/created-documents';
import {uploadFileError} from '@/features/documents/upload-file';
import {downloadFile} from '@/features/documents/download-file';
import {getRequirementTemplate, getCompanyDocumentTypes, readRequirementsState} from '@/features/requirements/requirements-state';
import {templateAppliesToTarget} from '@/features/requirements/template-scope';
import {templateDocumentType} from '@/features/requirements/document-types';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {availableCompanyFile, commitCompanyDocuments, readCompanyDocumentsState} from './company-documents-state';
import {companyDocumentTypes, projectCompanyDocuments} from './projections';
import type {CompanyDocumentRecord, CompanyDocumentRequirement, CompanyDocumentWorkspace} from './types';
import type {DocumentType} from '@/features/documents/types';

type Failure = {ok: false; reason: 'access' | 'unavailable' | 'invalid' | 'conflict' | 'file' | 'type' | 'size' | 'empty' | 'date' | 'name' | 'rejectionReason'};
const fail = (reason: Failure['reason']): Failure => ({ok: false, reason});
const empty: CompanyDocumentWorkspace = {requirements: [], documents: []};
function workspace(companyId: string) {
  const snapshot = readCompanyDocumentsState();
  if (!documentAccess(companyId).visible || projectCompanyDocuments(snapshot, companyId, 'ro').error) return null;
  return snapshot.byCompany[companyId] ?? empty;
}
export function listCompanyRequirements(companyId: string) {return workspace(companyId)?.requirements ?? [];}

/** Read-compatible chain discovery for E1C-002 records; never rewrites old tab-memory metadata. */
export function companyDocumentHistory(companyId: string, requirementId: string) {
  const owned = workspace(companyId), requirement = owned?.requirements.find((item) => item.id === requirementId);
  if (!owned || !requirement) return [];
  const ids = new Set(owned.documents.filter((item) => item.requirementId === requirementId || item.id === requirement.currentDocumentId).map((item) => item.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of owned.documents) {
      if (item.requirementId && item.requirementId !== requirementId) continue;
      if (ids.has(item.id) || item.supersededById && ids.has(item.supersededById) || item.previousDocumentId && ids.has(item.previousDocumentId)) {
        for (const id of [item.id, item.previousDocumentId, item.supersededById]) if (id && !ids.has(id)) {ids.add(id); changed = true;}
      }
    }
  }
  const records = owned.documents.filter((item) => ids.has(item.id));
  function depth(item: CompanyDocumentRecord, visited = new Set<string>()): number {
    if (visited.has(item.id)) return 0;
    visited.add(item.id);
    const previous = records.find((candidate) => candidate.id === item.previousDocumentId || candidate.supersededById === item.id);
    return previous ? depth(previous, visited) + 1 : 1;
  }
  return records.map((item) => ({...item, requirementId, version: item.version ?? depth(item)}))
    .toSorted((a, b) => b.version - a.version || b.id.localeCompare(a.id));
}
export function getCompanyDocumentDetails(companyId: string, requirementId: string) {
  const owned = workspace(companyId), requirement = owned?.requirements.find((item) => item.id === requirementId);
  if (!owned || !requirement) return null;
  const history = companyDocumentHistory(companyId, requirementId);
  const current = history.find((item) => item.id === requirement.currentDocumentId && !item.supersededById && item.reviewOutcome !== 'rejected') ?? null;
  return {requirement, current, history, status: current ? current.reviewOutcome === 'pending' ? 'needs_review' as const : approvedCompliance(current.expiresAt, requirement.expiryWarningDays, fixtureReferenceTime, current.manuallyExpiredAt) : 'missing' as const};
}

export function applyCompanyTemplate(companyId: string, templateId: string) {
  if (!documentAccess(companyId).replace) return fail('access');
  const owned = workspace(companyId), templates = readRequirementsState(), template = getRequirementTemplate(templates, companyId, templateId);
  if (!owned || !template || !templateAppliesToTarget(template, 'company')) return fail('unavailable');
  const custom = getCompanyDocumentTypes(templates, companyId);
  const types = template.documents.map(templateDocumentType);
  if (types.some((type) => !type || type.documentTypeSource === 'company' && !custom.some((item) => item.id === type.companyDocumentTypeId))) return fail('invalid');
  const requirements = [...owned.requirements];
  let added = 0;
  template.documents.forEach((rule, index) => {
    if (requirements.some((item) => item.templateId === template.id && item.templateRequirementId === rule.id)) return;
    const type = types[index]!;
    const category = type.documentTypeSource === 'catalog' ? type.catalogDocumentTypeId === 'liability' ? 'insurance' : type.catalogDocumentTypeId : 'custom';
    requirements.push({id: `company-requirement:${crypto.randomUUID()}`, companyId, templateId, templateRequirementId: rule.id,
      name: {...type.name}, documentType: companyDocumentTypes.includes(category as DocumentType) ? category as DocumentType : 'custom', issuer: type.issuer ?? null,
      required: rule.required, expiryWarningDays: rule.expiryWarningDays, currentDocumentId: null, createdAt: fixtureReferenceTime});
    added++;
  });
  if (added && !commitCompanyDocuments(companyId, {...owned, requirements})) return fail('unavailable');
  return {ok: true, added} as const;
}

export type CompanyDocumentInput = {requirementId?: string; name: string; documentType: DocumentType; issuer: string; expiresAt: string; file: File; required?: boolean};
function validate(input: CompanyDocumentInput): Failure | null {
  if (!(input.file instanceof File)) return fail('file');
  const error = uploadFileError(input.file);
  if (error) return fail(error);
  if (!input.file.size) return fail('empty');
  if (!input.name.trim()) return fail('name');
  if (!companyDocumentTypes.includes(input.documentType)) return fail('invalid');
  if (input.expiresAt.trim() && !reviewDateToIso(input.expiresAt)) return fail('date');
  return null;
}
function writeUpload(companyId: string, input: CompanyDocumentInput, previousId?: string) {
  const access = documentAccess(companyId);
  if (!access.replace) return fail('access');
  const owned = workspace(companyId);
  if (!owned) return fail('unavailable');
  const requirement = input.requirementId ? owned.requirements.find((item) => item.id === input.requirementId) : undefined;
  if (input.requirementId && !requirement) return fail('unavailable');
  const details = requirement && getCompanyDocumentDetails(companyId, requirement.id);
  if (previousId ? details?.current?.id !== previousId : Boolean(details?.current)) return fail('conflict');
  const normalized = requirement ? {...input, name: requirement.name.ro, documentType: requirement.documentType} : input;
  const error = validate(normalized);
  if (error) return error;
  const now = fixtureReferenceTime;
  const target: CompanyDocumentRequirement = requirement ?? {id: `company-requirement:${crypto.randomUUID()}`, companyId, templateId: null, templateRequirementId: null,
    name: {ro: input.name.trim(), en: input.name.trim()}, documentType: input.documentType, issuer: input.issuer.trim() || null,
    required: input.required === true, expiryWarningDays: 30, currentDocumentId: null, createdAt: now};
  const history = requirement ? companyDocumentHistory(companyId, target.id) : [];
  const version = Math.max(0, ...history.map((item) => item.version)) + 1;
  const previous = details?.current ?? history[0];
  const record: CompanyDocumentRecord = {id: `company-document:${crypto.randomUUID()}`, companyId, requirementId: target.id,
    version, versionGroupId: previous?.versionGroupId ?? previous?.id, previousDocumentId: previous?.id,
    documentName: {...(details?.current?.documentName ?? target.name)}, documentType: target.documentType, filename: input.file.name,
    fileType: input.file.type || ({pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png'} as Record<string, string>)[input.file.name.split('.').pop()!.toLowerCase()], fileSize: input.file.size,
    uploadedAt: now, createdAt: now, uploadedBy: access.member!.fullName, issuer: input.issuer.trim() || null,
    expiresAt: input.expiresAt.trim() ? reviewDateToIso(input.expiresAt)! : null,
    reviewOutcome: 'pending', reviewedAt: null, reviewedBy: null, rejectionReason: null, updatedAt: now, updatedByDisplayName: access.member!.fullName};
  const next = {...owned, requirements: requirement ? owned.requirements.map((item) => item.id === target.id ? {...item, currentDocumentId: record.id} : item) : [...owned.requirements, {...target, currentDocumentId: record.id}],
    documents: [record, ...owned.documents.map((item) => item.id === previousId ? {...item, supersededById: record.id} : item)]};
  if (!commitCompanyDocuments(companyId, next, {id: record.id, bytes: input.file})) return fail('unavailable');
  return {ok: true, document: record, requirementId: target.id} as const;
}
export function addCompanyDocument(companyId: string, input: CompanyDocumentInput) {return writeUpload(companyId, input);}
export function replaceCompanyDocument(companyId: string, requirementId: string, documentId: string, input: Omit<CompanyDocumentInput, 'requirementId'>) {
  return writeUpload(companyId, {...input, requirementId}, documentId);
}

export function reviewCompanyDocument(companyId: string, requirementId: string, documentId: string, decision: 'approved' | 'rejected', reason = '') {
  if (!documentAccess(companyId).review) return fail('access');
  const owned = workspace(companyId), details = getCompanyDocumentDetails(companyId, requirementId);
  if (!owned || !details?.current || details.current.id !== documentId) return fail('unavailable');
  if (details.current.reviewOutcome !== 'pending') return fail('conflict');
  if (!['approved', 'rejected'].includes(decision)) return fail('invalid');
  if (decision === 'rejected' && !reason.trim()) return fail('rejectionReason');
  const access = documentAccess(companyId), now = fixtureReferenceTime;
  const saved = commitCompanyDocuments(companyId, {...owned,
    requirements: owned.requirements.map((item) => item.id === requirementId && decision === 'rejected' ? {...item, currentDocumentId: null} : item),
    documents: owned.documents.map((item) => item.id === documentId ? {...item, reviewOutcome: decision, reviewedAt: now, reviewedBy: access.member!.fullName,
      rejectionReason: decision === 'rejected' ? reason.trim() : null, updatedAt: now, updatedByDisplayName: access.member!.fullName} : item)}, undefined, 'review');
  if (!saved) return fail('unavailable');
  return {ok: true} as const;
}

export function updateCompanyDocumentMetadata(companyId: string, requirementId: string, documentId: string, input: {name: string; issuer: string; expiresAt: string; language?: 'ro' | 'en'}) {
  const access = documentAccess(companyId);
  if (!access.replace) return fail('access');
  const owned = workspace(companyId), details = getCompanyDocumentDetails(companyId, requirementId);
  if (!owned || !details?.current || details.current.id !== documentId) return fail('unavailable');
  if (!input.name.trim()) return fail('name');
  if (input.expiresAt.trim() && !reviewDateToIso(input.expiresAt)) return fail('date');
  const name = input.name.trim(), issuer = input.issuer.trim() || null, expiresAt = input.expiresAt.trim() ? reviewDateToIso(input.expiresAt)! : null;
  const current = details.current;
  const sameName = current.documentName[input.language ?? 'ro'] === name;
  if (sameName && current.issuer === issuer && current.expiresAt === expiresAt) return {ok: true} as const;
  const saved = commitCompanyDocuments(companyId, {...owned, documents: owned.documents.map((item) => item.id === documentId ? {...item,
    documentName: sameName ? item.documentName : {ro: name, en: name}, issuer, expiresAt, reviewOutcome: 'pending', reviewedAt: null, reviewedBy: null, rejectionReason: null,
    updatedAt: fixtureReferenceTime, updatedByDisplayName: access.member!.fullName} : item)});
  if (!saved) return fail('unavailable');
  return {ok: true} as const;
}
export function markCompanyDocumentExpired(companyId: string, requirementId: string, documentId: string) {
  if (!documentAccess(companyId).replace) return fail('access');
  const owned = workspace(companyId), details = getCompanyDocumentDetails(companyId, requirementId);
  if (!owned || !details?.current || details.current.id !== documentId || details.status === 'missing' || !canManuallyExpire({...details.current, complianceStatus: details.status})) return fail('conflict');
  const saved = commitCompanyDocuments(companyId, {...owned, documents: owned.documents.map((item) => item.id === documentId ? {...item, manuallyExpiredAt: fixtureReferenceTime,
    updatedAt: fixtureReferenceTime, updatedByDisplayName: documentAccess(companyId).member!.fullName} : item)});
  if (!saved) return fail('unavailable');
  return {ok: true} as const;
}
export function companyDocumentFile(companyId: string, requirementId: string, documentId: string) {
  return companyDocumentHistory(companyId, requirementId).some((item) => item.id === documentId) ? availableCompanyFile(companyId, documentId) : null;
}
export function downloadCompanyDocument(companyId: string, requirementId: string, documentId: string) {
  const record = companyDocumentHistory(companyId, requirementId).find((item) => item.id === documentId), bytes = companyDocumentFile(companyId, requirementId, documentId);
  return Boolean(record && bytes && downloadFile(bytes, record.filename));
}
