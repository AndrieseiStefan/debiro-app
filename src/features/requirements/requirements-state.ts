'use client';

import {useSyncExternalStore} from 'react';
import type {VendorCategory} from '@/features/vendors/types';
import {catalogDocument, normalizeDocumentName} from './catalog';
import {requirementsFixture} from './fixtures';
import type {CatalogCandidate, RequirementTemplate, RequirementTemplateDocument, TemplateDraft} from './types';

type RuleChange = Partial<Pick<RequirementTemplateDocument, 'required' | 'expiryWarningDays' | 'validityMonths'>>;
export type RequirementsWorkspace = {templates: RequirementTemplate[]; selectedId: string | null; draft: TemplateDraft | null; ruleEdits: Record<string, RuleChange>};
type RequirementsState = {byCompany: Record<string, RequirementsWorkspace>; candidates: CatalogCandidate[]};
type NewDocument = Omit<RequirementTemplateDocument, 'id' | 'templateId'>;

const seededTemplates: RequirementTemplate[] = requirementsFixture.templates.map((template) => ({
  id: template.id, title: template.title, subtitle: template.subtitle, icon: template.icon, categoryId: template.categoryId,
  documents: template.rules.map((rule) => ({
    id: `${template.id}:${rule.id}`, templateId: template.id, catalogDocumentTypeId: rule.id,
    required: rule.mandatory, expiryWarningDays: rule.alertDays, validityMonths: rule.validityMonths
  }))
}));
const emptyWorkspace: RequirementsWorkspace = {templates: [], selectedId: null, draft: null, ruleEdits: {}};
const initialState: RequirementsState = {
  byCompany: {'demo-company': {templates: seededTemplates, selectedId: seededTemplates[0]?.id ?? null, draft: null, ruleEdits: {}}},
  candidates: []
};
let state = initialState;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};}
function publish(next: RequirementsState) {state = next; listeners.forEach((listener) => listener());}
export function useRequirementsState() {return useSyncExternalStore(subscribe, () => state, () => initialState);}
export function readRequirementsState() {return state;}
export function getRequirementsWorkspace(snapshot: RequirementsState, companyId: string) {return snapshot.byCompany[companyId] ?? emptyWorkspace;}
export function getCatalogCandidates(snapshot: RequirementsState) {return snapshot.candidates;}

function updateWorkspace(companyId: string, update: (workspace: RequirementsWorkspace) => RequirementsWorkspace) {
  const workspace = getRequirementsWorkspace(state, companyId);
  publish({...state, byCompany: {...state.byCompany, [companyId]: update(workspace)}});
}

export function selectRequirementTemplate(companyId: string, selectedId: string) {
  updateWorkspace(companyId, (workspace) => workspace.templates.some((item) => item.id === selectedId) ? {...workspace, selectedId} : workspace);
}

export function startRequirementDraft(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, draft: {id: `draft-${crypto.randomUUID()}`, name: '', description: '', categoryId: '', documents: [], isNew: true, isDirty: false}}));
}

export function updateRequirementDraft(companyId: string, change: Partial<Pick<TemplateDraft, 'name' | 'description' | 'categoryId'>>) {
  updateWorkspace(companyId, (workspace) => workspace.draft ? {...workspace, draft: {...workspace.draft, ...change, isDirty: true}} : workspace);
}

export function discardRequirementDraft(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, draft: null}));
}

function documentName(document: RequirementTemplateDocument) {
  return document.customName ?? catalogDocument(document.catalogDocumentTypeId ?? '')?.canonicalName.ro ?? '';
}

export function isDuplicateDocument(documents: RequirementTemplateDocument[], input: NewDocument) {
  return documents.some((document) => {
    if (input.catalogDocumentTypeId && document.catalogDocumentTypeId === input.catalogDocumentTypeId) return true;
    const inputNames = input.catalogDocumentTypeId ? Object.values(catalogDocument(input.catalogDocumentTypeId)?.canonicalName ?? {}) : [input.customName ?? ''];
    const names = document.catalogDocumentTypeId ? Object.values(catalogDocument(document.catalogDocumentTypeId)?.canonicalName ?? {}) : [documentName(document)];
    return inputNames.some((inputName) => Boolean(inputName) && names.some((name) => normalizeDocumentName(name) === normalizeDocumentName(inputName)));
  });
}

export function addRequirementDocument(companyId: string, input: NewDocument): 'added' | 'duplicate' | 'invalid' {
  const workspace = getRequirementsWorkspace(state, companyId);
  const selected = workspace.templates.find((item) => item.id === workspace.selectedId);
  const target = workspace.draft ?? selected;
  if (!target || Boolean(input.catalogDocumentTypeId) === Boolean(input.customName?.trim()) || (input.catalogDocumentTypeId && !catalogDocument(input.catalogDocumentTypeId)) || (input.customDescription?.length ?? 0) > 200) return 'invalid';
  if (isDuplicateDocument(target.documents, input)) return 'duplicate';
  const document = {...input, id: `rule-${crypto.randomUUID()}`, templateId: target.id} as RequirementTemplateDocument;
  updateWorkspace(companyId, (current) => current.draft
    ? {...current, draft: {...current.draft, documents: [...current.draft.documents, document], isDirty: true}}
    : {...current, templates: current.templates.map((item) => item.id === target.id ? {...item, documents: [...item.documents, document]} : item)});
  if (!workspace.draft && document.customName) publish({...state, candidates: learnCandidates(state.candidates, [document])});
  return 'added';
}

export function updateRequirementDocument(companyId: string, documentId: string, change: Partial<Pick<RequirementTemplateDocument, 'required' | 'expiryWarningDays' | 'validityMonths'>>) {
  updateWorkspace(companyId, (workspace) => workspace.draft
    ? {...workspace, draft: {...workspace.draft, documents: workspace.draft.documents.map((item) => item.id === documentId ? {...item, ...change} : item), isDirty: true}}
    : {...workspace, ruleEdits: {...workspace.ruleEdits, [documentId]: {...workspace.ruleEdits[documentId], ...change}}});
}

export function cancelExistingRuleEdits(companyId: string) {updateWorkspace(companyId, (workspace) => ({...workspace, ruleEdits: {}}));}

export function saveExistingRuleEdits(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, ruleEdits: {}, templates: workspace.templates.map((template) => ({...template,
    documents: template.documents.map((document) => ({...document, ...workspace.ruleEdits[document.id]}))
  }))}));
}

export function validateRequirementDraft(workspace: RequirementsWorkspace) {
  const draft = workspace.draft;
  if (!draft) return 'missing' as const;
  if (!draft.name.trim()) return 'name' as const;
  if (workspace.templates.some((template) => Object.values(template.title).some((name) => normalizeDocumentName(name) === normalizeDocumentName(draft.name)))) return 'duplicateName' as const;
  if (!draft.categoryId) return 'category' as const;
  if (draft.documents.length === 0) return 'documents' as const;
  if (draft.documents.some((document) => Boolean(document.catalogDocumentTypeId) === Boolean(document.customName?.trim()))) return 'invalidDocument' as const;
  return null;
}

function iconForCategory(category: VendorCategory): RequirementTemplate['icon'] {
  if (category === 'construction' || category === 'materials' || category === 'software' || category === 'logistics') return category;
  return 'consulting';
}

export function learnCandidates(existing: CatalogCandidate[], documents: RequirementTemplateDocument[], now = new Date().toISOString()): CatalogCandidate[] {
  return documents.reduce<CatalogCandidate[]>((candidates, document) => {
    if (!document.customName) return candidates;
    const normalizedName = normalizeDocumentName(document.customName);
    const found = candidates.find((candidate) => candidate.normalizedName === normalizedName);
    if (found) return candidates.map((candidate) => candidate === found ? {...candidate, usageCount: candidate.usageCount + 1, lastSeenAt: now} : candidate);
    return [...candidates, {normalizedName, displayName: document.customName.trim(), description: document.customDescription?.trim() || undefined, usageCount: 1, firstSeenAt: now, lastSeenAt: now, status: 'pending'}];
  }, existing);
}

export function saveRequirementDraft(companyId: string): ReturnType<typeof validateRequirementDraft> | 'saved' {
  const workspace = getRequirementsWorkspace(state, companyId);
  const error = validateRequirementDraft(workspace);
  if (error) return error;
  const draft = workspace.draft!;
  const id = `local-template-${crypto.randomUUID()}`;
  const name = draft.name.trim().replace(/\s+/g, ' ');
  const description = draft.description.trim();
  const template: RequirementTemplate = {
    id, title: {ro: name, en: name}, subtitle: {ro: description, en: description},
    icon: iconForCategory(draft.categoryId as VendorCategory), categoryId: draft.categoryId as VendorCategory,
    documents: draft.documents.map((document) => ({...document, templateId: id}))
  };
  publish({
    byCompany: {...state.byCompany, [companyId]: {...workspace, templates: [...workspace.templates, template], selectedId: id, draft: null}},
    candidates: learnCandidates(state.candidates, template.documents)
  });
  return 'saved';
}
