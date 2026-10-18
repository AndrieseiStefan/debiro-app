'use client';

import {approvedCompliance, canManuallyExpire} from '@/features/documents/compliance';
import {reviewDateToIso} from '@/features/documents/created-documents';
import {uploadFileError} from '@/features/documents/upload-file';
import {downloadFile} from '@/features/documents/download-file';
import {getRequirementTemplate, getCompanyDocumentTypes, readRequirementsState} from '@/features/requirements/requirements-state';
import {templateAppliesToTarget} from '@/features/requirements/template-scope';
import {templateDocumentType} from '@/features/requirements/document-types';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {companyDocumentTypes} from '@/features/company-documents/projections';
import type {CompanyDocumentRecord, CompanyDocumentRequirement, CompanyDocumentWorkspace} from '@/features/company-documents/types';
import type {DocumentType} from '@/features/documents/types';

export type Failure = {ok: false; reason: 'access' | 'unavailable' | 'invalid' | 'conflict' | 'file' | 'type' | 'size' | 'empty' | 'date' | 'name' | 'rejectionReason'};
const fail = (reason: Failure['reason']): Failure => ({ok: false, reason});
export type DocumentMutation = {type: 'template_applied' | 'document_upload' | 'document_replaced' | 'document_confirmed' | 'document_rejected' | 'metadata_updated' | 'document_marked_expired'; requirementId?: string; documentId?: string; templateId?: string};
export type DocumentOwnerContext = {
  scope: 'company' | 'employee';
  access: () => {visible: boolean; replace: boolean; review: boolean; member: {fullName: string} | null};
  read: (companyId: string) => CompanyDocumentWorkspace | null;
  commit: (companyId: string, workspace: CompanyDocumentWorkspace, file?: {id: string; bytes: File}, permission?: 'replace' | 'review', event?: DocumentMutation) => boolean;
  file: (companyId: string, documentId: string) => Blob | null;
  now: () => string;
  requirement?: (requirement: CompanyDocumentRequirement, type?: import('@/features/requirements/document-types').DocumentTypeSnapshot) => CompanyDocumentRequirement;
  record?: (record: CompanyDocumentRecord) => CompanyDocumentRecord;
  findTemplateRequirement?: (requirements: CompanyDocumentRequirement[], type: import('@/features/requirements/document-types').DocumentTypeSnapshot, templateId: string, ruleId: string) => CompanyDocumentRequirement | undefined;
  associateTemplate?: (requirement: CompanyDocumentRequirement, template: import('@/features/requirements/types').RequirementTemplate) => CompanyDocumentRequirement;
};

/** Existing Company lifecycle, parameterized only at ownership/storage/authorization boundaries. */
export type CompanyDocumentInput = {requirementId?: string; name: string; documentType: DocumentType; issuer: string; expiresAt: string; file: File; required?: boolean};

export function createOwnedDocumentEngine(context: DocumentOwnerContext) {
  const workspace = context.read;
  function listCompanyRequirements(companyId: string) {return workspace(companyId)?.requirements ?? [];}

  /** Read-compatible chain discovery for E1C-002 records; never rewrites old tab-memory metadata. */
  function companyDocumentHistory(companyId: string, requirementId: string) {
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
  function getCompanyDocumentDetails(companyId: string, requirementId: string) {
    const owned = workspace(companyId), requirement = owned?.requirements.find((item) => item.id === requirementId);
    if (!owned || !requirement) return null;
    const history = companyDocumentHistory(companyId, requirementId);
    const current = history.find((item) => item.id === requirement.currentDocumentId && !item.supersededById && item.reviewOutcome !== 'rejected') ?? null;
    return {requirement, current, history, status: current ? current.reviewOutcome === 'pending' ? 'needs_review' as const : approvedCompliance(current.expiresAt, requirement.expiryWarningDays, fixtureReferenceTime, current.manuallyExpiredAt) : 'missing' as const};
  }

  function applyCompanyTemplate(companyId: string, templateId: string) {
    if (!context.access().replace) return fail('access');
    const owned = workspace(companyId), templates = readRequirementsState(), template = getRequirementTemplate(templates, companyId, templateId);
    if (!owned || !template || !templateAppliesToTarget(template, context.scope)) return fail('unavailable');
    const custom = getCompanyDocumentTypes(templates, companyId);
    const types = template.documents.map(templateDocumentType);
    if (types.some((type) => !type || type.documentTypeSource === 'company' && !custom.some((item) => item.id === type.companyDocumentTypeId))) return fail('invalid');
    const requirements = [...owned.requirements];
    let added = 0, changed = false;
    template.documents.forEach((rule, index) => {
      const type = types[index]!;
      const existing = context.findTemplateRequirement ? context.findTemplateRequirement(requirements, type, template.id, rule.id) : requirements.find((item) => item.templateId === template.id && item.templateRequirementId === rule.id);
      if (existing) {
        const associated = context.associateTemplate?.(existing, template) ?? existing;
        if (associated !== existing) {requirements[requirements.indexOf(existing)] = associated; changed = true;}
        return;
      }
      const category = type.documentTypeSource === 'catalog' ? type.catalogDocumentTypeId === 'liability' ? 'insurance' : type.catalogDocumentTypeId : 'custom';
      const requirement: CompanyDocumentRequirement = {id: `${context.scope}-requirement:${crypto.randomUUID()}`, companyId, templateId, templateRequirementId: rule.id,
        name: {...type.name}, documentType: companyDocumentTypes.includes(category as DocumentType) ? category as DocumentType : 'custom', issuer: type.issuer ?? null,
        required: rule.required, expiryWarningDays: rule.expiryWarningDays, currentDocumentId: null, createdAt: context.now()};
      requirements.push(context.requirement?.(requirement, type) ?? requirement);
      added++;
    });
    if ((added || changed) && !context.commit(companyId, {...owned, requirements}, undefined, 'replace', {type: 'template_applied', templateId})) return fail('unavailable');
    return {ok: true, added} as const;
  }


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
    const access = context.access();
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
    const now = context.now();
    const target: CompanyDocumentRequirement = requirement ?? (() => {
      const standalone: CompanyDocumentRequirement = {id: `${context.scope}-requirement:${crypto.randomUUID()}`, companyId, templateId: null, templateRequirementId: null,
      name: {ro: input.name.trim(), en: input.name.trim()}, documentType: input.documentType, issuer: input.issuer.trim() || null,
      required: input.required === true, expiryWarningDays: 30, currentDocumentId: null, createdAt: now};
      return context.requirement?.(standalone) ?? standalone;
    })();
    const history = requirement ? companyDocumentHistory(companyId, target.id) : [];
    const version = Math.max(0, ...history.map((item) => item.version)) + 1;
    const previous = details?.current ?? history[0];
    const record: CompanyDocumentRecord = {id: `${context.scope}-document:${crypto.randomUUID()}`, companyId, requirementId: target.id,
      version, versionGroupId: previous?.versionGroupId ?? previous?.id, previousDocumentId: previous?.id,
      documentName: {...(details?.current?.documentName ?? target.name)}, documentType: target.documentType, filename: input.file.name,
      fileType: input.file.type || ({pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png'} as Record<string, string>)[input.file.name.split('.').pop()!.toLowerCase()], fileSize: input.file.size,
      uploadedAt: now, createdAt: now, uploadedBy: access.member!.fullName, issuer: input.issuer.trim() || null,
      expiresAt: input.expiresAt.trim() ? reviewDateToIso(input.expiresAt)! : null,
      reviewOutcome: 'pending', reviewedAt: null, reviewedBy: null, rejectionReason: null, updatedAt: now, updatedByDisplayName: access.member!.fullName};
    const storedRecord = context.record?.(record) ?? record;
    const next = {...owned, requirements: requirement ? owned.requirements.map((item) => item.id === target.id ? {...item, currentDocumentId: record.id} : item) : [...owned.requirements, {...target, currentDocumentId: record.id}],
      documents: [storedRecord, ...owned.documents.map((item) => item.id === previousId ? {...item, supersededById: record.id} : item)]};
    if (!context.commit(companyId, next, {id: record.id, bytes: input.file}, 'replace', {type: previousId ? 'document_replaced' : 'document_upload', requirementId: target.id, documentId: record.id})) return fail('unavailable');
    return {ok: true, document: storedRecord, requirementId: target.id} as const;
  }
  function addCompanyDocument(companyId: string, input: CompanyDocumentInput) {return writeUpload(companyId, input);}
  function replaceCompanyDocument(companyId: string, requirementId: string, documentId: string, input: Omit<CompanyDocumentInput, 'requirementId'>) {
    return writeUpload(companyId, {...input, requirementId}, documentId);
  }

  function reviewCompanyDocument(companyId: string, requirementId: string, documentId: string, decision: 'approved' | 'rejected', reason = '') {
    if (!context.access().review) return fail('access');
    const owned = workspace(companyId), details = getCompanyDocumentDetails(companyId, requirementId);
    if (!owned || !details?.current || details.current.id !== documentId) return fail('unavailable');
    if (details.current.reviewOutcome !== 'pending') return fail('conflict');
    if (!['approved', 'rejected'].includes(decision)) return fail('invalid');
    if (decision === 'rejected' && !reason.trim()) return fail('rejectionReason');
    const access = context.access(), now = context.now();
    const saved = context.commit(companyId, {...owned,
      requirements: owned.requirements.map((item) => item.id === requirementId && decision === 'rejected' ? {...item, currentDocumentId: null} : item),
      documents: owned.documents.map((item) => item.id === documentId ? {...item, reviewOutcome: decision, reviewedAt: now, reviewedBy: access.member!.fullName,
        rejectionReason: decision === 'rejected' ? reason.trim() : null, updatedAt: now, updatedByDisplayName: access.member!.fullName} : item)}, undefined, 'review', {type: decision === 'approved' ? 'document_confirmed' : 'document_rejected', requirementId, documentId});
    if (!saved) return fail('unavailable');
    return {ok: true} as const;
  }

  function updateCompanyDocumentMetadata(companyId: string, requirementId: string, documentId: string, input: {name: string; issuer: string; expiresAt: string; language?: 'ro' | 'en'}) {
    const access = context.access();
    if (!access.replace) return fail('access');
    const owned = workspace(companyId), details = getCompanyDocumentDetails(companyId, requirementId);
    if (!owned || !details?.current || details.current.id !== documentId) return fail('unavailable');
    if (!input.name.trim()) return fail('name');
    if (input.expiresAt.trim() && !reviewDateToIso(input.expiresAt)) return fail('date');
    const name = input.name.trim(), issuer = input.issuer.trim() || null, expiresAt = input.expiresAt.trim() ? reviewDateToIso(input.expiresAt)! : null;
    const current = details.current;
    const sameName = current.documentName[input.language ?? 'ro'] === name;
    if (sameName && current.issuer === issuer && current.expiresAt === expiresAt) return {ok: true} as const;
    const saved = context.commit(companyId, {...owned, documents: owned.documents.map((item) => item.id === documentId ? {...item,
      documentName: sameName ? item.documentName : {ro: name, en: name}, issuer, expiresAt, reviewOutcome: 'pending', reviewedAt: null, reviewedBy: null, rejectionReason: null,
      updatedAt: context.now(), updatedByDisplayName: access.member!.fullName} : item)}, undefined, 'replace', {type: 'metadata_updated', requirementId, documentId});
    if (!saved) return fail('unavailable');
    return {ok: true} as const;
  }
  function markCompanyDocumentExpired(companyId: string, requirementId: string, documentId: string) {
    if (!context.access().replace) return fail('access');
    const owned = workspace(companyId), details = getCompanyDocumentDetails(companyId, requirementId);
    if (!owned || !details?.current || details.current.id !== documentId || details.status === 'missing' || !canManuallyExpire({...details.current, complianceStatus: details.status})) return fail('conflict');
    const saved = context.commit(companyId, {...owned, documents: owned.documents.map((item) => item.id === documentId ? {...item, manuallyExpiredAt: context.now(),
      updatedAt: context.now(), updatedByDisplayName: context.access().member!.fullName} : item)}, undefined, 'replace', {type: 'document_marked_expired', requirementId, documentId});
    if (!saved) return fail('unavailable');
    return {ok: true} as const;
  }
  function companyDocumentFile(companyId: string, requirementId: string, documentId: string) {
    return companyDocumentHistory(companyId, requirementId).some((item) => item.id === documentId) ? context.file(companyId, documentId) : null;
  }
  function downloadCompanyDocument(companyId: string, requirementId: string, documentId: string) {
    const record = companyDocumentHistory(companyId, requirementId).find((item) => item.id === documentId), bytes = companyDocumentFile(companyId, requirementId, documentId);
    return Boolean(record && bytes && downloadFile(bytes, record.filename));
  }

  function recover<Args extends unknown[], Result>(operation: (...args: Args) => Result) {
    return (...args: Args): Result | Failure => {try {return operation(...args);} catch (error) {if (context.scope === 'company') throw error; return fail('unavailable');}};
  }
  return {listCompanyRequirements, companyDocumentHistory, getCompanyDocumentDetails, applyCompanyTemplate: recover(applyCompanyTemplate), addCompanyDocument: recover(addCompanyDocument), replaceCompanyDocument: recover(replaceCompanyDocument), reviewCompanyDocument: recover(reviewCompanyDocument), updateCompanyDocumentMetadata: recover(updateCompanyDocumentMetadata), markCompanyDocumentExpired: recover(markCompanyDocumentExpired), companyDocumentFile, downloadCompanyDocument};
}
export type OwnedDocumentEngine = ReturnType<typeof createOwnedDocumentEngine>;
