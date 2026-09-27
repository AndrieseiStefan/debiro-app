'use client';

import {useSyncExternalStore} from 'react';
import type {VendorCategory, VendorDetailsViewModel, VendorListItem, VendorsListViewModel} from './types';

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
};

const emptyVendors: CreatedVendor[] = [];
let vendors: CreatedVendor[] = emptyVendors;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCreatedVendors() {
  return useSyncExternalStore(subscribe, () => vendors, () => emptyVendors);
}

export function createLocalVendor(input: Omit<CreatedVendor, 'id'>): CreatedVendor {
  const vendor = {id: `local-${crypto.randomUUID()}`, ...input};
  vendors = [vendor, ...vendors];
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
    documentCount: 0,
    documentTarget: 0,
    nextExpiry: {ro: '—', en: '—', tone: 'neutral'}
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
