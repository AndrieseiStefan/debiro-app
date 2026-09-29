'use client';

import {useSyncExternalStore} from 'react';
import {vendorCategories, type VendorCategory} from '@/features/vendors/types';
import {catalogDocument, normalizeDocumentName} from './catalog';
import {requirementsFixture} from './fixtures';
import type {CatalogCandidate, RequirementTemplate, RequirementTemplateDocument, TemplateDraft, TemplateEditDraft} from './types';

type RuleChange = Partial<Pick<RequirementTemplateDocument, 'required' | 'expiryWarningDays' | 'validityMonths'>>;
type CustomChange = {customName?: string; customDescription?: string; issuer?: string};
type EditChange = Partial<Pick<TemplateEditDraft, 'name' | 'description' | 'categoryId' | 'documents'>>;
type ValidationError = 'missing' | 'name' | 'duplicateName' | 'category' | 'documents' | 'invalidDocument' | 'duplicateDocument';
export type RequirementsWorkspace = {templates: RequirementTemplate[]; selectedId: string | null; draft: TemplateDraft | null; editDraft: TemplateEditDraft | null};
type RequirementsState = {byCompany: Record<string, RequirementsWorkspace>; candidates: CatalogCandidate[]};
type NewDocument = Omit<RequirementTemplateDocument, 'id' | 'templateId'>;

const seededTemplates: RequirementTemplate[] = requirementsFixture.templates.map((template) => ({
  id: template.id, title: template.title, subtitle: template.subtitle, icon: template.icon, categoryId: template.categoryId,
  documents: template.rules.map((rule) => ({
    id: `${template.id}:${rule.id}`, templateId: template.id, catalogDocumentTypeId: rule.id,
    required: rule.mandatory, expiryWarningDays: rule.alertDays, validityMonths: rule.validityMonths
  }))
}));
const emptyWorkspace: RequirementsWorkspace = {templates: [], selectedId: null, draft: null, editDraft: null};
const initialState: RequirementsState = {
  byCompany: {'demo-company': {templates: seededTemplates, selectedId: seededTemplates[0]?.id ?? null, draft: null, editDraft: null}},
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
  updateWorkspace(companyId, (workspace) => workspace.templates.some((item) => item.id === selectedId) ? {...workspace, selectedId, draft: null, editDraft: null} : workspace);
}

export function startRequirementDraft(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, editDraft: null, draft: {id: `draft-${crypto.randomUUID()}`, name: '', description: '', categoryId: '', documents: [], isNew: true, isDirty: false}}));
}

export function updateRequirementDraft(companyId: string, change: Partial<Pick<TemplateDraft, 'name' | 'description' | 'categoryId'>>) {
  updateWorkspace(companyId, (workspace) => workspace.draft ? {...workspace, draft: {...workspace.draft, ...change, isDirty: true}} : workspace);
}

export function discardRequirementDraft(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, draft: null}));
}

function selectedTemplate(workspace: RequirementsWorkspace) {
  return workspace.templates.find((template) => template.id === workspace.selectedId) ?? null;
}

function beginExistingEdit(template: RequirementTemplate, language: 'ro' | 'en'): TemplateEditDraft {
  return {templateId: template.id, language, name: template.title[language], description: template.subtitle[language], categoryId: template.categoryId, documents: template.documents.map((document) => ({...document})), isDirty: false};
}

function editIsDirty(template: RequirementTemplate, edit: TemplateEditDraft) {
  return edit.name !== template.title[edit.language] || edit.description !== template.subtitle[edit.language] ||
    edit.categoryId !== template.categoryId || JSON.stringify(edit.documents) !== JSON.stringify(template.documents);
}

function stageExisting(companyId: string, language: 'ro' | 'en', change: (edit: TemplateEditDraft) => EditChange) {
  updateWorkspace(companyId, (workspace) => {
    const template = selectedTemplate(workspace);
    if (!template || workspace.draft) return workspace;
    const edit = workspace.editDraft?.templateId === template.id ? workspace.editDraft : beginExistingEdit(template, language);
    const next = {...edit, ...change(edit)};
    return {...workspace, editDraft: {...next, isDirty: editIsDirty(template, next)}};
  });
}

export function updateExistingRequirementTemplate(companyId: string, language: 'ro' | 'en', change: Partial<Pick<TemplateEditDraft, 'name' | 'description' | 'categoryId'>>) {
  stageExisting(companyId, language, () => change);
}

export function discardExistingRequirementEdit(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, editDraft: null}));
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

export function addRequirementDocument(companyId: string, input: NewDocument, language: 'ro' | 'en' = 'ro'): 'added' | 'duplicate' | 'invalid' {
  const workspace = getRequirementsWorkspace(state, companyId);
  const selected = selectedTemplate(workspace);
  const target = workspace.draft ?? workspace.editDraft ?? selected;
  if (!target || Boolean(input.catalogDocumentTypeId) === Boolean(input.customName?.trim()) || (input.catalogDocumentTypeId && !catalogDocument(input.catalogDocumentTypeId)) || (input.customDescription?.length ?? 0) > 200) return 'invalid';
  if (isDuplicateDocument(target.documents, input)) return 'duplicate';
  const document = {...input, id: `rule-${crypto.randomUUID()}`, templateId: workspace.draft?.id ?? selected!.id} as RequirementTemplateDocument;
  if (workspace.draft) updateWorkspace(companyId, (current) => ({...current, draft: {...current.draft!, documents: [...current.draft!.documents, document], isDirty: true}}));
  else stageExisting(companyId, language, (edit) => ({documents: [...edit.documents, {...document, templateId: edit.templateId}]}));
  return 'added';
}

export function updateRequirementDocument(companyId: string, documentId: string, change: RuleChange, language: 'ro' | 'en' = 'ro') {
  const workspace = getRequirementsWorkspace(state, companyId);
  if (workspace.draft) updateWorkspace(companyId, (current) => ({...current, draft: {...current.draft!, documents: current.draft!.documents.map((item) => item.id === documentId ? {...item, ...change} : item), isDirty: true}}));
  else stageExisting(companyId, language, (edit) => ({documents: edit.documents.map((item) => item.id === documentId ? {...item, ...change} : item)}));
}

export function removeRequirementDocument(companyId: string, documentId: string, language: 'ro' | 'en' = 'ro') {
  stageExisting(companyId, language, (edit) => ({documents: edit.documents.filter((item) => item.id !== documentId)}));
}

export function updateCustomRequirementDocument(companyId: string, documentId: string, change: CustomChange, language: 'ro' | 'en' = 'ro') {
  stageExisting(companyId, language, (edit) => ({documents: edit.documents.map((item) => item.id === documentId && item.customName !== undefined ? {...item, ...change} : item)}));
}

function validateTemplateFields(workspace: RequirementsWorkspace, draft: Pick<TemplateDraft, 'name' | 'categoryId' | 'documents'>, ownId?: string): ValidationError | null {
  if (!draft.name.trim()) return 'name';
  if (workspace.templates.some((template) => template.id !== ownId && Object.values(template.title).some((name) => normalizeDocumentName(name) === normalizeDocumentName(draft.name)))) return 'duplicateName';
  if (!draft.categoryId || !vendorCategories.includes(draft.categoryId)) return 'category';
  if (draft.documents.length === 0) return 'documents';
  if (draft.documents.some((document) => Boolean(document.catalogDocumentTypeId) === Boolean(document.customName?.trim()) || (document.catalogDocumentTypeId && !catalogDocument(document.catalogDocumentTypeId)) || (document.customDescription?.length ?? 0) > 200)) return 'invalidDocument';
  if (draft.documents.some((document, index) => isDuplicateDocument(draft.documents.slice(0, index), document))) return 'duplicateDocument';
  return null;
}

export function validateRequirementDraft(workspace: RequirementsWorkspace) {
  return workspace.draft ? validateTemplateFields(workspace, workspace.draft) : 'missing' as const;
}

export function validateExistingRequirementEdit(workspace: RequirementsWorkspace) {
  return workspace.editDraft ? validateTemplateFields(workspace, workspace.editDraft, workspace.editDraft.templateId) : 'missing' as const;
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
    byCompany: {...state.byCompany, [companyId]: {...workspace, templates: [...workspace.templates, template], selectedId: id, draft: null, editDraft: null}},
    candidates: learnCandidates(state.candidates, template.documents)
  });
  return 'saved';
}

export function saveExistingRequirementEdit(companyId: string): ValidationError | 'saved' {
  const workspace = getRequirementsWorkspace(state, companyId);
  const edit = workspace.editDraft;
  const original = selectedTemplate(workspace);
  if (!edit || !original || edit.templateId !== original.id || !edit.isDirty) return 'missing';
  const error = validateExistingRequirementEdit(workspace);
  if (error) return error;
  const name = edit.name.trim().replace(/\s+/g, ' ');
  const description = edit.description.trim();
  const renamed = name !== original.title[edit.language];
  const reworded = description !== original.subtitle[edit.language];
  const documents = edit.documents.map((document) => document.customName === undefined ? document : {...document,
    customName: document.customName.trim().replace(/\s+/g, ' '), customDescription: document.customDescription?.trim() || undefined, issuer: document.issuer?.trim() || undefined
  });
  const learned = documents.filter((document) => document.customName && !original.documents.some((previous) => previous.id === document.id && normalizeDocumentName(previous.customName ?? '') === normalizeDocumentName(document.customName ?? '')));
  const committed: RequirementTemplate = {...original, title: renamed ? {ro: name, en: name} : original.title,
    subtitle: reworded ? {ro: description, en: description} : original.subtitle,
    categoryId: edit.categoryId as VendorCategory, icon: iconForCategory(edit.categoryId as VendorCategory), documents};
  publish({byCompany: {...state.byCompany, [companyId]: {...workspace, templates: workspace.templates.map((template) => template.id === original.id ? committed : template), editDraft: null}},
    candidates: learnCandidates(state.candidates, learned)});
  return 'saved';
}
