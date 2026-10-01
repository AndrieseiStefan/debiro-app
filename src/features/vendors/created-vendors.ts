'use client';

import {useSyncExternalStore} from 'react';
import {vendorsListFixture} from './fixtures';
import type {VendorCategory, VendorDetailsViewModel, VendorLifecycleStatus, VendorListItem, VendorsListViewModel} from './types';

export type CreatedVendor = {
  id: string;
  name: string;
  cui: string;
  category: VendorCategory;
  email: string;
  registrationCode?: string;
  contactName?: string;
  phone?: string;
  industry?: string;
  address?: string;
  website?: string;
  notes?: string;
  lifecycleStatus: VendorLifecycleStatus;
};

export type NewVendorInput = Omit<CreatedVendor, 'id' | 'lifecycleStatus'>;

const initialState = {createdVendors: [] as CreatedVendor[], fixtureVendors: vendorsListFixture.vendors};
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
  return [...snapshot.createdVendors.map(toVendorListItem), ...fixtures.map((vendor) => ({...vendor,
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

export function createLocalVendor(input: NewVendorInput): CreatedVendor {
  const vendor: CreatedVendor = {...input, id: `local-${crypto.randomUUID()}`, lifecycleStatus: 'active'};
  state = {...state, createdVendors: [vendor, ...state.createdVendors]};
  listeners.forEach((listener) => listener());
  return vendor;
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
    ...context,
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
