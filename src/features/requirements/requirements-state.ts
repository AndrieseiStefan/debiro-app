'use client';

import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {useSyncExternalStore} from 'react';
import {browserSession} from '@/lib/browser-session';
import {vendorCategories, type VendorCategory} from '@/features/vendors/types';
import {defaultAppearance, starterAppearance, validColorKey, validIconKey, type Appearance} from './appearance';
import {catalogDocument, normalizeDocumentName} from './catalog';
import {requirementsFixture} from './fixtures';
import {resolveCompanyDocumentTypes, type CompanyDocumentType} from './document-types';
import type {CatalogCandidate, RequirementDocumentInput, RequirementTemplate, RequirementTemplateDocument, RequirementTemplateScope, TemplateDraft, TemplateEditDraft} from './types';
import {isRequirementTemplateScope, requirementTemplateScope} from './template-scope';
import {generalRequirementsDraftSource, starterRequirementTemplates} from './starter-templates';
import {getActiveCompany, getCurrentMembership, readCompanyState} from '@/features/companies/company-state';

type RuleChange = Partial<Pick<RequirementTemplateDocument, 'required' | 'expiryWarningDays' | 'validityMonths'>>;
type CustomChange = {customName?: string; customDescription?: string; issuer?: string} & Partial<Appearance>;
type EditChange = Partial<Pick<TemplateEditDraft, 'name' | 'description' | 'categoryId' | 'iconKey' | 'iconColorKey' | 'documents'>>;
type ValidationError = 'missing' | 'scope' | 'name' | 'duplicateName' | 'category' | 'documents' | 'invalidDocument' | 'duplicateDocument';
export type RequirementsWorkspace = {templates: RequirementTemplate[]; selectedScope: RequirementTemplateScope; selectedId: string | null; draft: TemplateDraft | null; editDraft: TemplateEditDraft | null};
type RequirementsState = {byCompany: Record<string, RequirementsWorkspace>; candidates: CatalogCandidate[]; companyDocumentTypes: CompanyDocumentType[]};
type NewDocument = RequirementDocumentInput;

const seededTemplates: RequirementTemplate[] = requirementsFixture.templates.map((template) => ({
  id: template.id, companyId: 'demo-company', scope: 'vendor', title: template.title, subtitle: template.subtitle,
  ...starterAppearance(template.icon), categoryId: template.categoryId,
  starterTemplateId: `starter-${template.id}`, starterTemplateVersion: 1,
  createdAt: fixtureReferenceTime, updatedAt: fixtureReferenceTime,
  documents: template.rules.map((rule) => ({
    id: `${template.id}:${rule.id}`, templateId: template.id, catalogDocumentTypeId: rule.id,
    required: rule.mandatory, expiryWarningDays: rule.alertDays, validityMonths: rule.validityMonths
  }))
}));
const emptyWorkspace: RequirementsWorkspace = {templates: [], selectedScope: 'vendor', selectedId: null, draft: null, editDraft: null};
const initialState: RequirementsState = {
  byCompany: {'demo-company': {templates: seededTemplates, selectedScope: 'vendor', selectedId: seededTemplates[0]?.id ?? null, draft: null, editDraft: null}},
  candidates: [], companyDocumentTypes: []
};
const session = browserSession(Symbol.for('debiro.requirements-session'), () => ({state: initialState, listeners: new Set<() => void>()}));
function subscribe(listener: () => void) {session.listeners.add(listener); return () => {session.listeners.delete(listener);};}
function publish(next: RequirementsState) {session.state = next; session.listeners.forEach((listener) => listener());}
export function useRequirementsState() {return useSyncExternalStore(subscribe, () => session.state, () => initialState);}
export function readRequirementsState() {return session.state;}
function readableDocuments(value: unknown): value is RequirementTemplateDocument[] {
  return Array.isArray(value) && value.every((document) => document && typeof document.id === 'string' && typeof document.templateId === 'string' &&
    typeof document.required === 'boolean' && [7, 15, 30, 60, 90].includes(document.expiryWarningDays) && [1, 3, 6, 12, 24, 36].includes(document.validityMonths) &&
    (document.catalogDocumentTypeId === undefined || typeof document.catalogDocumentTypeId === 'string') &&
    (document.customName === undefined || typeof document.customName === 'string') && (document.customDescription === undefined || typeof document.customDescription === 'string'));
}
function readableTemplate(template: RequirementTemplate | null | undefined, companyId: string): template is RequirementTemplate {
  return Boolean(template && template.companyId === companyId && typeof template.id === 'string' &&
    typeof template.title?.ro === 'string' && typeof template.title?.en === 'string' &&
    typeof template.subtitle?.ro === 'string' && typeof template.subtitle?.en === 'string' && readableDocuments(template.documents) && requirementTemplateScope(template) !== null);
}
/** Read-compatible projection only: old browser-session records are not rewritten or reset. */
export function getRequirementsWorkspace(snapshot: RequirementsState, companyId: string): RequirementsWorkspace {
  const workspace = snapshot?.byCompany?.[companyId];
  if (!workspace || typeof workspace !== 'object') return emptyWorkspace;
  const templates = Array.isArray(workspace.templates) ? workspace.templates.filter((template) => readableTemplate(template, companyId))
    .map((template) => template.scope === undefined ? {...template, scope: 'vendor' as const} : template) : [];
  const normalizeDraft = <T extends TemplateDraft | TemplateEditDraft>(draft: T | null): T | null => {
    if (!draft || typeof draft.name !== 'string' || typeof draft.description !== 'string' || !readableDocuments(draft.documents) || requirementTemplateScope(draft) === null) return null;
    return draft.scope === undefined ? {...draft, scope: 'vendor'} : draft;
  };
  const draft = normalizeDraft(workspace.draft), editDraft = normalizeDraft(workspace.editDraft);
  return {...workspace, templates, selectedScope: isRequirementTemplateScope(workspace.selectedScope) ? workspace.selectedScope : 'vendor',
    selectedId: typeof workspace.selectedId === 'string' ? workspace.selectedId : null, draft, editDraft};
}
export function listRequirementTemplates(snapshot: RequirementsState, companyId: string, scope: RequirementTemplateScope) {
  return isRequirementTemplateScope(scope) ? getRequirementsWorkspace(snapshot, companyId).templates.filter((template) => template.scope === scope) : [];
}
export function getRequirementTemplate(snapshot: RequirementsState, companyId: string, id: string) {
  return getRequirementsWorkspace(snapshot, companyId).templates.find((template) => template.id === id) ?? null;
}
export function getCatalogCandidates(snapshot: RequirementsState) {return snapshot.candidates;}
export function getCompanyDocumentTypes(snapshot: RequirementsState, companyId: string) {return snapshot.companyDocumentTypes.filter((type) => type.companyId === companyId);}

// Compatibility filtering must never turn an unrelated edit into a destructive session migration.
function storedWorkspace(companyId: string, before: RequirementsWorkspace, after: RequirementsWorkspace): RequirementsWorkspace {
  const stored = session.state.byCompany[companyId]?.templates;
  if (!Array.isArray(stored)) return after;
  const previous = new Map(before.templates.map((template) => [template.id, template]));
  const remaining = new Map(after.templates.map((template) => [template.id, template]));
  const templates = stored.flatMap((template) => {
    if (!readableTemplate(template, companyId)) return [template];
    const next = remaining.get(template.id);
    remaining.delete(template.id);
    return next ? [next === previous.get(template.id) ? template : next] : [];
  });
  return {...after, templates: [...templates, ...remaining.values()]};
}
function updateWorkspace(companyId: string, update: (workspace: RequirementsWorkspace) => RequirementsWorkspace) {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  publish({...session.state, byCompany: {...session.state.byCompany, [companyId]: storedWorkspace(companyId, workspace, update(workspace))}});
}

export function selectRequirementTemplate(companyId: string, selectedId: string) {
  updateWorkspace(companyId, (workspace) => {
    const template = workspace.templates.find((item) => item.id === selectedId);
    return template ? {...workspace, selectedScope: template.scope, selectedId, draft: null, editDraft: null} : workspace;
  });
}

export function selectRequirementTemplateScope(companyId: string, scope: RequirementTemplateScope) {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  if (!isRequirementTemplateScope(scope) || workspace.draft?.isDirty || workspace.editDraft?.isDirty) return false;
  updateWorkspace(companyId, (current) => ({...current, selectedScope: scope, selectedId: current.templates.find((template) => template.scope === scope)?.id ?? null, draft: null, editDraft: null}));
  return true;
}

export function startRequirementDraft(companyId: string, scope: RequirementTemplateScope = getRequirementsWorkspace(session.state, companyId).selectedScope) {
  if (!isRequirementTemplateScope(scope)) return false;
  updateWorkspace(companyId, (workspace) => ({...workspace, selectedScope: scope, editDraft: null, draft: {id: `draft-${crypto.randomUUID()}`, scope, name: '', description: '', categoryId: '', ...defaultAppearance, documents: [], isNew: true, isDirty: false}}));
  return true;
}

type MetadataChange = Partial<Pick<TemplateDraft, 'name' | 'description' | 'categoryId' | 'iconKey' | 'iconColorKey'>>;
function metadataChange(change: MetadataChange): MetadataChange {
  // Runtime callers cannot smuggle ownership or scope through a metadata patch.
  return Object.fromEntries(['name', 'description', 'categoryId', 'iconKey', 'iconColorKey'].filter((key) => Object.hasOwn(change, key)).map((key) => [key, change[key as keyof MetadataChange]]));
}
export function updateRequirementDraft(companyId: string, change: Partial<Pick<TemplateDraft, 'name' | 'description' | 'categoryId' | 'iconKey' | 'iconColorKey'>>) {
  if (Object.hasOwn(change, 'scope') || Object.hasOwn(change, 'companyId')) return false;
  updateWorkspace(companyId, (workspace) => workspace.draft ? {...workspace, draft: {...workspace.draft, ...metadataChange(change), isDirty: true}} : workspace);
  return true;
}

export function discardRequirementDraft(companyId: string) {
  updateWorkspace(companyId, (workspace) => ({...workspace, draft: null}));
}

function selectedTemplate(workspace: RequirementsWorkspace) {
  return workspace.templates.find((template) => template.id === workspace.selectedId) ?? null;
}

function beginExistingEdit(template: RequirementTemplate, language: 'ro' | 'en'): TemplateEditDraft {
  return {templateId: template.id, scope: template.scope, language, name: template.title[language], description: template.subtitle[language], categoryId: template.categoryId ?? '',
    iconKey: template.iconKey, iconColorKey: template.iconColorKey, documents: template.documents.map((document) => ({...document})), isDirty: false};
}

function editIsDirty(template: RequirementTemplate, edit: TemplateEditDraft) {
  return edit.name !== template.title[edit.language] || edit.description !== template.subtitle[edit.language] ||
    edit.categoryId !== (template.categoryId ?? '') || edit.iconKey !== template.iconKey || edit.iconColorKey !== template.iconColorKey ||
    JSON.stringify(edit.documents) !== JSON.stringify(template.documents);
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

export function updateExistingRequirementTemplate(companyId: string, language: 'ro' | 'en', change: Partial<Pick<TemplateEditDraft, 'name' | 'description' | 'categoryId' | 'iconKey' | 'iconColorKey'>>) {
  if (Object.hasOwn(change, 'scope') || Object.hasOwn(change, 'companyId')) return false;
  stageExisting(companyId, language, () => metadataChange(change));
  return true;
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
  const workspace = getRequirementsWorkspace(session.state, companyId);
  const selected = selectedTemplate(workspace);
  const target = workspace.draft ?? workspace.editDraft ?? selected;
  if (!target || Boolean(input.catalogDocumentTypeId) === Boolean(input.customName?.trim()) || (input.catalogDocumentTypeId && !catalogDocument(input.catalogDocumentTypeId)) || (input.customDescription?.length ?? 0) > 200) return 'invalid';
  if (isDuplicateDocument(target.documents, input)) return 'duplicate';
  const document = {...input, ...(input.customName !== undefined ? {iconKey: validIconKey(input.iconKey), iconColorKey: validColorKey(input.iconColorKey)} : {}),
    id: `rule-${crypto.randomUUID()}`, templateId: workspace.draft?.id ?? selected!.id} as RequirementTemplateDocument;
  if (workspace.draft) updateWorkspace(companyId, (current) => ({...current, draft: {...current.draft!, documents: [...current.draft!.documents, document], isDirty: true}}));
  else stageExisting(companyId, language, (edit) => ({documents: [...edit.documents, {...document, templateId: edit.templateId}]}));
  return 'added';
}

export function updateRequirementDocument(companyId: string, documentId: string, change: RuleChange, language: 'ro' | 'en' = 'ro') {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  if (workspace.draft) updateWorkspace(companyId, (current) => ({...current, draft: {...current.draft!, documents: current.draft!.documents.map((item) => item.id === documentId ? {...item, ...change} : item), isDirty: true}}));
  else stageExisting(companyId, language, (edit) => ({documents: edit.documents.map((item) => item.id === documentId ? {...item, ...change} : item)}));
}

export function removeRequirementDocument(companyId: string, documentId: string, language: 'ro' | 'en' = 'ro') {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  if (workspace.draft) updateWorkspace(companyId, (current) => ({...current, draft: {...current.draft!, documents: current.draft!.documents.filter((item) => item.id !== documentId), isDirty: true}}));
  else stageExisting(companyId, language, (edit) => ({documents: edit.documents.filter((item) => item.id !== documentId)}));
}

export function updateCustomRequirementDocument(companyId: string, documentId: string, change: CustomChange, language: 'ro' | 'en' = 'ro') {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  if (workspace.draft) updateWorkspace(companyId, (current) => ({...current, draft: {...current.draft!, documents: current.draft!.documents.map((item) => item.id === documentId && item.customName !== undefined ? {...item, ...change} : item), isDirty: true}}));
  else stageExisting(companyId, language, (edit) => ({documents: edit.documents.map((item) => item.id === documentId && item.customName !== undefined ? {...item, ...change} : item)}));
}

function validateTemplateFields(workspace: RequirementsWorkspace, draft: Pick<TemplateDraft, 'scope' | 'name' | 'categoryId' | 'documents'>, ownId?: string): ValidationError | null {
  if (!isRequirementTemplateScope(draft.scope)) return 'scope';
  if (!draft.name.trim()) return 'name';
  if (workspace.templates.some((template) => template.id !== ownId && Object.values(template.title).some((name) => normalizeDocumentName(name) === normalizeDocumentName(draft.name)))) return 'duplicateName';
  if (draft.scope === 'vendor' ? !draft.categoryId || !vendorCategories.includes(draft.categoryId) : Boolean(draft.categoryId)) return 'category';
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

export function learnCandidates(existing: CatalogCandidate[], documents: RequirementTemplateDocument[], now = fixtureReferenceTime): CatalogCandidate[] {
  return documents.reduce<CatalogCandidate[]>((candidates, document) => {
    if (!document.customName) return candidates;
    const normalizedName = normalizeDocumentName(document.customName);
    const found = candidates.find((candidate) => candidate.normalizedName === normalizedName);
    if (found) return candidates.map((candidate) => candidate === found ? {...candidate, usageCount: candidate.usageCount + 1, lastSeenAt: now} : candidate);
    return [...candidates, {normalizedName, displayName: document.customName.trim(), description: document.customDescription?.trim() || undefined, usageCount: 1, firstSeenAt: now, lastSeenAt: now, status: 'pending'}];
  }, existing);
}

export function saveRequirementDraft(companyId: string): ReturnType<typeof validateRequirementDraft> | 'saved' {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  const error = validateRequirementDraft(workspace);
  if (error) return error;
  const draft = workspace.draft!;
  const id = `local-template-${crypto.randomUUID()}`;
  const name = draft.name.trim().replace(/\s+/g, ' ');
  const description = draft.description.trim();
  const starter = starterRequirementTemplates.find((source) => source.id === draft.starterTemplateId);
  const now = fixtureReferenceTime;
  const resolved = resolveCompanyDocumentTypes(companyId, draft.documents, session.state.companyDocumentTypes, now);
  const template: RequirementTemplate = {
    id, companyId, scope: draft.scope, title: starter && Object.values(starter.title).includes(name) ? {...starter.title} : {ro: name, en: name},
    subtitle: starter && Object.values(starter.subtitle).includes(description) ? {...starter.subtitle} : {ro: description, en: description},
    iconKey: validIconKey(draft.iconKey), iconColorKey: validColorKey(draft.iconColorKey), categoryId: draft.scope === 'vendor' ? draft.categoryId as VendorCategory : null,
    duplicatedFromTemplateId: draft.duplicatedFromTemplateId, starterTemplateId: draft.starterTemplateId, starterTemplateVersion: draft.starterTemplateVersion, createdAt: now, updatedAt: now,
    documents: resolved.documents.map((document) => ({...document, templateId: id}))
  };
  publish({
    companyDocumentTypes: resolved.types,
    byCompany: {...session.state.byCompany, [companyId]: storedWorkspace(companyId, workspace, {...workspace, templates: [...workspace.templates, template], selectedId: id, draft: null, editDraft: null})},
    candidates: draft.duplicatedFromTemplateId ? session.state.candidates : learnCandidates(session.state.candidates, template.documents)
  });
  return 'saved';
}

export function saveExistingRequirementEdit(companyId: string): ValidationError | 'saved' {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  const edit = workspace.editDraft;
  const original = selectedTemplate(workspace);
  if (!edit || !original || edit.templateId !== original.id || !edit.isDirty) return 'missing';
  if (edit.scope !== original.scope) return 'scope';
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
  const resolved = resolveCompanyDocumentTypes(companyId, documents, session.state.companyDocumentTypes, fixtureReferenceTime);
  const committed: RequirementTemplate = {...original, title: renamed ? {ro: name, en: name} : original.title,
    subtitle: reworded ? {ro: description, en: description} : original.subtitle,
    categoryId: original.scope === 'vendor' ? edit.categoryId as VendorCategory : null, iconKey: validIconKey(edit.iconKey), iconColorKey: validColorKey(edit.iconColorKey),
    documents: resolved.documents, updatedAt: fixtureReferenceTime};
  publish({byCompany: {...session.state.byCompany, [companyId]: storedWorkspace(companyId, workspace, {...workspace, templates: workspace.templates.map((template) => template.id === original.id ? committed : template), editDraft: null})},
    companyDocumentTypes: resolved.types, candidates: learnCandidates(session.state.candidates, learned)});
  return 'saved';
}

export function duplicateRequirementTemplate(companyId: string, language: 'ro' | 'en'): boolean {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  const source = selectedTemplate(workspace);
  if (!source || source.companyId !== companyId) return false;
  const base = `${source.title[language]} — ${language === 'ro' ? 'copie' : 'copy'}`;
  let name = base;
  let number = 2;
  while (workspace.templates.some((template) => Object.values(template.title).some((value) => normalizeDocumentName(value) === normalizeDocumentName(name)))) {
    name = `${base} ${number++}`;
  }
  const id = `draft-${crypto.randomUUID()}`;
  updateWorkspace(companyId, (current) => ({...current, editDraft: null, draft: {
    id, scope: source.scope, name, description: source.subtitle[language], categoryId: source.categoryId ?? '',
    iconKey: source.iconKey, iconColorKey: source.iconColorKey, duplicatedFromTemplateId: source.id,
    documents: source.documents.map((document) => ({...document, id: `rule-${crypto.randomUUID()}`, templateId: id})),
    isNew: true, isDirty: true
  }}));
  return true;
}

export function deleteRequirementTemplate(companyId: string): boolean {
  const workspace = getRequirementsWorkspace(session.state, companyId);
  const selected = selectedTemplate(workspace);
  if (!selected || selected.companyId !== companyId) return false;
  const index = workspace.templates.filter((template) => template.scope === selected.scope).findIndex((template) => template.id === selected.id);
  updateWorkspace(companyId, (current) => {
    const templates = current.templates.filter((template) => template.id !== selected.id);
    const scoped = templates.filter((template) => template.scope === selected.scope);
    return {...current, templates, selectedId: scoped[Math.min(index, scoped.length - 1)]?.id ?? null, draft: null, editDraft: null};
  });
  return true;
}

export type StarterCloneResult = {status: 'cloned' | 'duplicate'; templateId: string} | {status: 'notFound' | 'accessDenied' | 'invalid' | 'dirty'};

/** One atomic snapshot; no mutable starter references or live synchronization. */
export function cloneStarterTemplate(companyId: string, starterId: string, documents?: RequirementDocumentInput[]): StarterCloneResult {
  const company = getActiveCompany(readCompanyState());
  if (company?.company.id !== companyId || getCurrentMembership(company)?.role !== 'administrator') return {status: 'accessDenied'};
  const source = starterRequirementTemplates.find((item) => item.id === starterId && item.active);
  if (!source) return {status: 'notFound'};
  const workspace = getRequirementsWorkspace(session.state, companyId);
  const existing = workspace.templates.find((item) => item.scope === 'vendor' && item.starterTemplateId === source.id);
  if (existing) return {status: 'duplicate', templateId: existing.id};
  if (workspace.draft?.isDirty || workspace.editDraft?.isDirty) return {status: 'dirty'};
  const id = `local-template-${crypto.randomUUID()}`;
  const copied = (documents ?? source.documents).map((document) => ({...document, id: `rule-${crypto.randomUUID()}`, templateId: id}));
  // Starters/onboarding customizations reference the global catalog only.
  if (copied.some((document) => !document.catalogDocumentTypeId || !catalogDocument(document.catalogDocumentTypeId))) return {status: 'invalid'};
  let title = {...source.title}, number = 1;
  while (workspace.templates.some((template) => Object.values(template.title).some((name) => Object.values(title).some((value) => normalizeDocumentName(name) === normalizeDocumentName(value))))) {
    const suffix = number === 1 ? '' : ` ${number}`;
    title = {ro: `${source.title.ro} — copie${suffix}`, en: `${source.title.en} — copy${suffix}`}; number++;
  }
  if (validateTemplateFields(workspace, {scope: 'vendor', name: title.ro, categoryId: source.categoryId, documents: copied})) return {status: 'invalid'};
  const template: RequirementTemplate = {id, companyId, scope: 'vendor', title, subtitle: {...source.subtitle}, categoryId: source.categoryId,
    iconKey: source.iconKey, iconColorKey: source.iconColorKey, documents: copied, starterTemplateId: source.id, starterTemplateVersion: source.version,
    createdAt: fixtureReferenceTime, updatedAt: fixtureReferenceTime};
  updateWorkspace(companyId, (current) => ({...current, templates: [...current.templates, template], selectedScope: 'vendor', selectedId: id, draft: null, editDraft: null}));
  return {status: 'cloned', templateId: id};
}

/** Explicit onboarding customization uses the same clone transaction or ordinary incomplete draft. */
export function initializeStarterTemplate(companyId: string, starterId: string, documents: RequirementDocumentInput[], language: 'ro' | 'en' = 'ro') {
  if (starterId !== 'starter-general') return cloneStarterTemplate(companyId, starterId, documents).status === 'cloned';
  const source = generalRequirementsDraftSource;
  if (!documents.length || documents.some((document) => !document.catalogDocumentTypeId || !catalogDocument(document.catalogDocumentTypeId))) return false;
  const existing = getRequirementsWorkspace(readRequirementsState(), companyId).templates;
  const base = source.title[language];
  let name: string = base, number = 1;
  while (existing.some((template) => Object.values(template.title).some((value) => normalizeDocumentName(value) === normalizeDocumentName(name)))) name = `${base} — ${language === 'ro' ? 'copie' : 'copy'}${number++ === 1 ? '' : ` ${number - 1}`}`;
  startRequirementDraft(companyId, 'vendor');
  updateRequirementDraft(companyId, {name, description: source.subtitle[language], categoryId: '', iconKey: source.iconKey, iconColorKey: source.iconColorKey});
  for (const document of documents) if (addRequirementDocument(companyId, document) !== 'added') {discardRequirementDraft(companyId); return false;}
  // General/custom selections require an explicit category and normal Save later.
  return true;
}
