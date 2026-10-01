'use client';

import {useSyncExternalStore} from 'react';
import {vendorsListFixture} from './fixtures';
import {getVendorDetailsFixture} from './detail-fixtures';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {normalizeCui, normalizeVendorValues, validateVendorValues, vendorFormValues, type VendorMetadata} from './vendor-form';
import type {VendorDetailsViewModel, VendorLifecycleStatus, VendorListItem, VendorsListViewModel} from './types';

export type CreatedVendor = VendorMetadata & {
  id: string;
  companyId?: string;
  lifecycleStatus: VendorLifecycleStatus;
};

export type NewVendorInput = VendorMetadata;

export const vendorFixtureCompanyId = companySettingsFixture.company.id;
const initialState = {createdVendors: [] as CreatedVendor[], fixtureVendors: vendorsListFixture.vendors, fixtureMetadata: {} as Record<string, VendorMetadata>};
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
}

export function createLocalVendor(input: NewVendorInput, companyId = vendorFixtureCompanyId): CreatedVendor {
  const vendor: CreatedVendor = {...input, companyId, id: `local-${crypto.randomUUID()}`, lifecycleStatus: 'active'};
  state = {...state, createdVendors: [vendor, ...state.createdVendors]};
  listeners.forEach((listener) => listener());
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
  state = created ? {...state, createdVendors: state.createdVendors.map((vendor) => vendor.id === vendorId ? {...vendor, ...metadata} : vendor)}
    : {...state, fixtureVendors: state.fixtureVendors.map((vendor) => vendor.id === vendorId ? {...vendor, ...metadataListPatch(metadata)} : vendor), fixtureMetadata: {...state.fixtureMetadata, [vendorId]: metadata}};
  listeners.forEach((listener) => listener());
  return 'saved';
}

export function projectVendorDetails(view: VendorDetailsViewModel, snapshot: typeof initialState): VendorDetailsViewModel {
  const created = snapshot.createdVendors.find((vendor) => vendor.id === view.vendor.id);
  if (created) return toVendorDetailsView(created, view);
  const metadata = snapshot.fixtureMetadata[view.vendor.id];
  const lifecycleStatus = snapshot.fixtureVendors.find((vendor) => vendor.id === view.vendor.id)?.lifecycleStatus ?? view.vendor.lifecycleStatus;
  if (!metadata) return {...view, vendor: {...view.vendor, lifecycleStatus}};
  return {...view, vendor: {...view.vendor, ...metadataListPatch(metadata), lifecycleStatus}, registrationCode: metadata.registrationCode,
    categoryDetail: metadata.category === view.vendor.category ? view.categoryDetail : undefined, industry: metadata.industry, notes: metadata.notes,
    contact: {...view.contact, name: metadata.contactName, email: metadata.email, phone: metadata.phone, website: metadata.website,
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

export function toVendorDetailsView(vendor: CreatedVendor, context: Pick<VendorsListViewModel, 'user' | 'organization' | 'notificationCount'>): VendorDetailsViewModel {
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
      address: vendor.address ? {ro: vendor.address, en: vendor.address} : undefined,
      website: vendor.website
    },
    industry: vendor.industry,
    notes: vendor.notes,
    documents: []
  };
}
