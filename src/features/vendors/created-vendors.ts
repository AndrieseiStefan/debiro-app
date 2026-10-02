'use client';

import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {useSyncExternalStore} from 'react';
import {vendorsListFixture} from './fixtures';
import {getVendorDetailsFixture} from './detail-fixtures';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {recordLocalAuditEvent} from '@/features/notifications/local-audit';
import {normalizeCui, normalizeVendorValues, validateVendorValues, vendorFormValues, type VendorMetadata} from './vendor-form';
import type {VendorContact, VendorNoteThread, VendorDetailsViewModel, VendorLifecycleStatus, VendorListItem, VendorsListViewModel} from './types';

export type CreatedVendor = VendorMetadata & {
  id: string;
  companyId?: string;
  lifecycleStatus: VendorLifecycleStatus;
};

export type NewVendorInput = VendorMetadata;

export const vendorFixtureCompanyId = companySettingsFixture.company.id;
const fixtureDate = fixtureReferenceTime;
const initialContacts = Object.fromEntries(vendorsListFixture.vendors.map((vendor) => {
  const contact = getVendorDetailsFixture(vendor.id)!.contact;
  return [`${vendorFixtureCompanyId}:${vendor.id}`, contact.name || contact.email || contact.phone ? [{id: `contact:${vendor.id}:primary`, companyId: vendorFixtureCompanyId, vendorId: vendor.id,
    name: contact.name, email: contact.email ?? '', phone: contact.phone, role: contact.role?.ro, isPrimary: true, createdAt: fixtureDate, updatedAt: fixtureDate}] : []];
})) as Record<string, VendorContact[]>;
const initialState = {createdVendors: [] as CreatedVendor[], fixtureVendors: vendorsListFixture.vendors, fixtureMetadata: {} as Record<string, VendorMetadata>,
  contacts: initialContacts, threads: {} as Record<string, VendorNoteThread[]>};
let state = initialState;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCreatedVendors() {
  return useSyncExternalStore(subscribe, () => state.createdVendors, () => initialState.createdVendors);
}

export function getVendorState() {return state;}

export function useVendorState() {
  return useSyncExternalStore(subscribe, getVendorState, () => initialState);
}

export function vendorListItems(snapshot: typeof initialState, fixtures: VendorListItem[]): VendorListItem[] {
  return [...snapshot.createdVendors.map(toVendorListItem), ...fixtures.map((vendor) => ({...vendor, ...metadataListPatch(snapshot.fixtureMetadata[vendor.id]),
    lifecycleStatus: snapshot.fixtureVendors.find((item) => item.id === vendor.id)?.lifecycleStatus ?? vendor.lifecycleStatus}))];
}

export function vendorSummary(vendors: VendorListItem[]) {
  const active = vendors.filter((vendor) => vendor.lifecycleStatus === 'active');
  return {all: vendors.length, compliant: active.filter((vendor) => vendor.status === 'compliant').length,
    attention: active.filter((vendor) => vendor.status === 'attention').length, noncompliant: active.filter((vendor) => vendor.status === 'noncompliant').length};
}

export function setVendorLifecycle(vendorId: string, lifecycleStatus: VendorLifecycleStatus) {
  const vendor = state.createdVendors.find((item) => item.id === vendorId) ?? state.fixtureVendors.find((item) => item.id === vendorId);
  if (!vendor || vendor.lifecycleStatus === lifecycleStatus) return;
  state = {...state, createdVendors: state.createdVendors.map((item) => item.id === vendorId ? {...item, lifecycleStatus} : item),
    fixtureVendors: state.fixtureVendors.map((item) => item.id === vendorId ? {...item, lifecycleStatus} : item)};
  listeners.forEach((listener) => listener());
  recordLocalAuditEvent('companyId' in vendor ? vendor.companyId ?? vendorFixtureCompanyId : vendorFixtureCompanyId, {vendorId, eventType: lifecycleStatus === 'active' ? 'vendor_active' : 'vendor_inactive',
    action: {ro: lifecycleStatus === 'active' ? 'Furnizor activat' : 'Furnizor dezactivat', en: lifecycleStatus === 'active' ? 'Vendor marked active' : 'Vendor marked inactive'}, description: {ro: vendor.name, en: vendor.name}});
}

export function createLocalVendor(input: NewVendorInput, companyId = vendorFixtureCompanyId): CreatedVendor {
  const vendor: CreatedVendor = {...input, companyId, id: `local-${crypto.randomUUID()}`, lifecycleStatus: 'active'};
  state = {...state, createdVendors: [vendor, ...state.createdVendors]};
  const now = fixtureReferenceTime;
  state = {...state, contacts: {...state.contacts, [`${companyId}:${vendor.id}`]: [{id: `contact:${vendor.id}:primary`, companyId, vendorId: vendor.id,
    name: input.contactName, email: input.email.trim(), phone: input.phone, isPrimary: true, createdAt: now, updatedAt: now}]}};
  syncLegacyNote(companyId, vendor.id, input.notes);
  listeners.forEach((listener) => listener());
  recordLocalAuditEvent(companyId, {vendorId: vendor.id, eventType: 'vendor_added', action: {ro: 'Furnizor adăugat', en: 'Vendor added'}, description: {ro: vendor.name, en: vendor.name}});
  return vendor;
}

function metadataListPatch(metadata?: VendorMetadata) {
  return metadata ? {name: metadata.name, registrationNumber: metadata.cui, category: metadata.category, contactName: metadata.contactName} : {};
}

export function getVendorMetadata(snapshot: typeof initialState, vendorId: string): VendorMetadata | undefined {
  const created = snapshot.createdVendors.find((item) => item.id === vendorId);
  if (created) return normalizeVendorValues(vendorFormValues(created));
  if (Object.hasOwn(snapshot.fixtureMetadata, vendorId)) return snapshot.fixtureMetadata[vendorId];
  const view = getVendorDetailsFixture(vendorId);
  if (!view) return undefined;
  return {name: view.vendor.name, cui: view.vendor.registrationNumber, category: view.vendor.category, email: view.contact.email ?? '', registrationCode: view.registrationCode,
    contactName: view.contact.name, phone: view.contact.phone, address: view.contact.address?.ro, website: view.contact.website, industry: view.industry, notes: view.notes};
}

export function hasDuplicateVendorCui(snapshot: typeof initialState, companyId: string, cui: string, excludeId?: string) {
  const normalized = normalizeCui(cui);
  return snapshot.createdVendors.some((vendor) => (vendor.companyId ?? vendorFixtureCompanyId) === companyId && vendor.id !== excludeId && normalizeCui(vendor.cui) === normalized)
    || (companyId === vendorFixtureCompanyId && snapshot.fixtureVendors.some((vendor) => vendor.id !== excludeId && normalizeCui(vendor.registrationNumber) === normalized));
}

export function updateVendorMetadata(companyId: string, vendorId: string, input: VendorMetadata): 'saved' | 'invalid' | 'duplicate' | 'missing' {
  const created = state.createdVendors.find((vendor) => vendor.id === vendorId);
  const fixture = state.fixtureVendors.find((vendor) => vendor.id === vendorId);
  if (created ? (created.companyId ?? vendorFixtureCompanyId) !== companyId : !fixture || companyId !== vendorFixtureCompanyId) return 'missing';
  const values = vendorFormValues(input);
  if (Object.keys(validateVendorValues(values)).length > 0) return 'invalid';
  if (hasDuplicateVendorCui(state, companyId, input.cui, vendorId)) return 'duplicate';
  const metadata = normalizeVendorValues(values);
  const contacts = getVendorContacts(state, companyId, vendorId);
  const primary = contacts.find((contact) => contact.isPrimary);
  if (contacts.some((contact) => contact.id !== primary?.id && contact.email.toLowerCase() === metadata.email.toLowerCase())) return 'duplicate';
  state = created ? {...state, createdVendors: state.createdVendors.map((vendor) => vendor.id === vendorId ? {...vendor, ...metadata} : vendor)}
    : {...state, fixtureVendors: state.fixtureVendors.map((vendor) => vendor.id === vendorId ? {...vendor, ...metadataListPatch(metadata)} : vendor), fixtureMetadata: {...state.fixtureMetadata, [vendorId]: metadata}};
  const now = fixtureReferenceTime;
  const updatedPrimary: VendorContact = {...primary, id: primary?.id ?? `contact:${vendorId}:primary`, companyId, vendorId, name: metadata.contactName, email: metadata.email, phone: metadata.phone,
    isPrimary: true, createdAt: primary?.createdAt ?? now, updatedAt: now};
  state = {...state, contacts: {...state.contacts, [`${companyId}:${vendorId}`]: primary ? contacts.map((contact) => contact.id === primary.id ? updatedPrimary : contact) : [updatedPrimary, ...contacts]}};
  syncLegacyNote(companyId, vendorId, metadata.notes);
  listeners.forEach((listener) => listener());
  recordLocalAuditEvent(companyId, {vendorId, eventType: 'vendor_edited', action: {ro: 'Furnizor editat', en: 'Vendor edited'}, description: {ro: 'S-au modificat datele furnizorului', en: 'Vendor details updated'}});
  return 'saved';
}

export function projectVendorDetails(view: VendorDetailsViewModel, snapshot: typeof initialState): VendorDetailsViewModel {
  const created = snapshot.createdVendors.find((vendor) => vendor.id === view.vendor.id);
  if (created) return toVendorDetailsView(created, view);
  const metadata = snapshot.fixtureMetadata[view.vendor.id];
  const lifecycleStatus = snapshot.fixtureVendors.find((vendor) => vendor.id === view.vendor.id)?.lifecycleStatus ?? view.vendor.lifecycleStatus;
  const primary = snapshot.contacts[`${vendorFixtureCompanyId}:${view.vendor.id}`]?.find((contact) => contact.isPrimary);
  const primaryPatch = primary ? {name: primary.name, email: primary.email || undefined, phone: primary.phone,
    role: primary.role === view.contact.role?.ro ? view.contact.role : primary.role ? {ro: primary.role, en: primary.role} : undefined} : {};
  if (!metadata) return {...view, vendor: {...view.vendor, lifecycleStatus, contactName: primary?.name}, contact: {...view.contact, ...primaryPatch}};
  return {...view, vendor: {...view.vendor, ...metadataListPatch(metadata), lifecycleStatus}, registrationCode: metadata.registrationCode,
    categoryDetail: metadata.category === view.vendor.category ? view.categoryDetail : undefined, industry: metadata.industry, notes: metadata.notes,
    contact: {...view.contact, ...primaryPatch, website: metadata.website,
      address: metadata.address === view.contact.address?.ro ? view.contact.address : metadata.address ? {ro: metadata.address, en: metadata.address} : undefined}};
}

export function toVendorListItem(vendor: CreatedVendor): VendorListItem {
  return {
    id: vendor.id,
    name: vendor.name,
    registrationNumber: vendor.cui,
    contactName: vendor.contactName,
    category: vendor.category,
    status: 'attention',
    lifecycleStatus: vendor.lifecycleStatus,
    documentCount: 0,
    documentTarget: 0,
    nextExpiry: {date: null, ro: '—', en: '—', tone: 'neutral'}
  };
}

export function vendorOwnedByCompany(companyId: string, vendorId: string) {
  const local = state.createdVendors.find((vendor) => vendor.id === vendorId);
  return local ? (local.companyId ?? vendorFixtureCompanyId) === companyId : companyId === vendorFixtureCompanyId && state.fixtureVendors.some((vendor) => vendor.id === vendorId);
}
const emptyContacts: VendorContact[] = [];
const emptyThreads: VendorNoteThread[] = [];
export function getVendorContacts(snapshot: typeof initialState, companyId: string, vendorId: string) {
  return vendorOwnedByCompany(companyId, vendorId) ? snapshot.contacts[`${companyId}:${vendorId}`] ?? emptyContacts : emptyContacts;
}
export function getVendorNoteThreads(snapshot: typeof initialState, companyId: string, vendorId: string) {
  return vendorOwnedByCompany(companyId, vendorId) ? snapshot.threads[`${companyId}:${vendorId}`] ?? emptyThreads : emptyThreads;
}
export type ContactInput = {name: string; email: string; role?: string; phone?: string};
export function validateContact(contacts: VendorContact[], input: ContactInput, excludeId?: string) {
  return {name: !input.name.trim() ? 'nameRequired' : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ? 'emailInvalid' : contacts.some((contact) => contact.id !== excludeId && contact.email.toLowerCase() === input.email.trim().toLowerCase()) ? 'emailDuplicate' : undefined};
}
/** Compatibility vendor form/summary fields are projections of the primary contact, never independently edited. */
function syncPrimary(companyId: string, vendorId: string, contacts: VendorContact[]) {
  const primary = contacts.find((contact) => contact.isPrimary)!;
  const metadata = getVendorMetadata(state, vendorId)!;
  const patch = {...metadata, contactName: primary.name, email: primary.email, phone: primary.phone};
  state = {...state, contacts: {...state.contacts, [`${companyId}:${vendorId}`]: contacts},
    createdVendors: state.createdVendors.map((vendor) => vendor.id === vendorId ? {...vendor, ...patch} : vendor),
    fixtureMetadata: companyId === vendorFixtureCompanyId && !state.createdVendors.some((vendor) => vendor.id === vendorId) ? {...state.fixtureMetadata, [vendorId]: patch} : state.fixtureMetadata};
  listeners.forEach((listener) => listener());
}
export function saveVendorContact(companyId: string, vendorId: string, input: ContactInput, id?: string) {
  if (!vendorOwnedByCompany(companyId, vendorId)) return false;
  const contacts = getVendorContacts(state, companyId, vendorId);
  if (Object.values(validateContact(contacts, input, id)).some(Boolean)) return false;
  const previous = contacts.find((contact) => contact.id === id);
  if (id && !previous) return false;
  const now = fixtureReferenceTime;
  const contact: VendorContact = {id: previous?.id ?? `contact-${crypto.randomUUID()}`, companyId, vendorId, name: input.name.trim(), email: input.email.trim(),
    role: input.role?.trim() || undefined, phone: input.phone?.trim() || undefined, isPrimary: previous?.isPrimary ?? contacts.length === 0, createdAt: previous?.createdAt ?? now, updatedAt: now};
  syncPrimary(companyId, vendorId, previous ? contacts.map((item) => item.id === id ? contact : item) : [...contacts, contact]);
  return true;
}
export function makeVendorContactPrimary(companyId: string, vendorId: string, id: string) {
  const contacts = getVendorContacts(state, companyId, vendorId);
  if (!contacts.some((contact) => contact.id === id)) return false;
  syncPrimary(companyId, vendorId, contacts.map((contact) => ({...contact, isPrimary: contact.id === id, updatedAt: fixtureReferenceTime})));
  return true;
}
export function deleteVendorContact(companyId: string, vendorId: string, id: string) {
  const contacts = getVendorContacts(state, companyId, vendorId);
  if (!contacts.some((contact) => contact.id === id && !contact.isPrimary)) return false;
  syncPrimary(companyId, vendorId, contacts.filter((contact) => contact.id !== id));
  return true;
}
function syncLegacyNote(companyId: string, vendorId: string, content?: string) {
  const key = `${companyId}:${vendorId}`;
  const threads = state.threads[key] ?? [];
  const id = `note:${vendorId}:general`;
  const previous = threads.find((thread) => thread.id === id);
  if ((previous?.content ?? '') === (content?.trim() ?? '')) return;
  const now = fixtureReferenceTime;
  // Clearing the legacy text edits its content; only confirmed thread deletion
  // removes the thread identity from the new workspace.
  state = {...state, threads: {...state.threads, [key]: [
    {...previous, id, companyId, vendorId, title: previous?.title ?? 'Discuții generale', content: content?.trim() ?? '', createdAt: previous?.createdAt ?? now, updatedAt: now}, ...threads.filter((thread) => thread.id !== id)
  ]}};
}
export function saveVendorNote(companyId: string, vendorId: string, input: {title: string; content: string}, id?: string) {
  if (!vendorOwnedByCompany(companyId, vendorId) || !input.title.trim()) return null;
  const threads = getVendorNoteThreads(state, companyId, vendorId);
  const previous = threads.find((thread) => thread.id === id);
  if (id && !previous) return null;
  const now = fixtureReferenceTime;
  const thread: VendorNoteThread = {...input, title: input.title.trim(), id: id ?? `note-${crypto.randomUUID()}`, companyId, vendorId, createdAt: previous?.createdAt ?? now, updatedAt: now};
  state = {...state, threads: {...state.threads, [`${companyId}:${vendorId}`]: previous ? threads.map((item) => item.id === id ? thread : item) : [...threads, thread]}};
  if (thread.id === `note:${vendorId}:general`) syncLegacyNoteProjection(vendorId, thread.content);
  listeners.forEach((listener) => listener());
  return thread;
}
function syncLegacyNoteProjection(vendorId: string, notes?: string) {
  state = {...state, createdVendors: state.createdVendors.map((vendor) => vendor.id === vendorId ? {...vendor, notes} : vendor),
    fixtureMetadata: state.fixtureMetadata[vendorId] ? {...state.fixtureMetadata, [vendorId]: {...state.fixtureMetadata[vendorId], notes}} : state.fixtureMetadata};
}
export function deleteVendorNote(companyId: string, vendorId: string, id: string) {
  const threads = getVendorNoteThreads(state, companyId, vendorId);
  if (!threads.some((thread) => thread.id === id)) return false;
  state = {...state, threads: {...state.threads, [`${companyId}:${vendorId}`]: threads.filter((thread) => thread.id !== id)}};
  if (id === `note:${vendorId}:general`) syncLegacyNoteProjection(vendorId);
  listeners.forEach((listener) => listener());
  return true;
}

export function toVendorDetailsView(vendor: CreatedVendor, context: Pick<VendorsListViewModel, 'user' | 'organization' | 'notificationCount'>): VendorDetailsViewModel {
  const primary = state.contacts[`${vendor.companyId ?? vendorFixtureCompanyId}:${vendor.id}`]?.find((contact) => contact.isPrimary);
  return {
    user: context.user,
    organization: context.organization,
    notificationCount: context.notificationCount,
    vendor: toVendorListItem(vendor),
    registrationCode: vendor.registrationCode,
    validDocumentCount: 0,
    contact: {
      name: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      role: primary?.role ? {ro: primary.role, en: primary.role} : undefined,
      address: vendor.address ? {ro: vendor.address, en: vendor.address} : undefined,
      website: vendor.website
    },
    industry: vendor.industry,
    notes: vendor.notes,
    documents: []
  };
}
