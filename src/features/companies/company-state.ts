'use client';

import {useSyncExternalStore} from 'react';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {CompanyMembership, CompanySettingsViewModel} from '@/features/company-settings/types';

export type AccessibleCompany = {
  company: CompanySettingsViewModel['company'];
  members: CompanyMembership[];
};

type CompanyState = {companies: AccessibleCompany[]; activeCompanyId: string | null};

export const currentUser = companySettingsFixture.currentUser;
const initialState: CompanyState = {
  companies: [
    {company: companySettingsFixture.company, members: companySettingsFixture.members},
    {
      company: {
        id: 'global-clean-services', name: 'Global Clean Services', taxId: 'RO87654321', country: 'RO',
        industry: {ro: 'Servicii de curățenie', en: 'Cleaning services'},
        subscription: {
          plan: 'Business', seatLimit: 10, trialDaysRemaining: 0, monthlyPriceEur: 49,
          billingProfile: {legalName: 'Global Clean Services', taxId: 'RO87654321', email: '', address: '', contactName: ''},
          capabilities: {unlimitedDocuments: true, customRequirements: true, notificationsAudit: true}, invoices: []
        }
      },
      members: [{id: 'membership-andrei-global-clean', companyId: 'global-clean-services', userId: 'andrei-popescu', fullName: currentUser.fullName, email: currentUser.email, role: 'reviewer', status: 'active', isCurrentUser: true}]
    }
  ],
  activeCompanyId: companySettingsFixture.company.id
};

let state: CompanyState = initialState;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}
function publish(next: CompanyState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function useCompanyState() {
  return useSyncExternalStore(subscribe, () => state, () => initialState);
}
export function readCompanyState() {return state;}

export function getActiveCompany(snapshot: CompanyState) {
  return snapshot.companies.find(({company}) => company.id === snapshot.activeCompanyId) ?? null;
}

export function getCurrentMembership(record: AccessibleCompany) {
  return record.members.find((member) => member.companyId === record.company.id && member.isCurrentUser && member.status === 'active') ?? null;
}

export function switchActiveCompany(id: string) {
  if (!state.companies.some(({company}) => company.id === id)) return false;
  if (state.activeCompanyId !== id) publish({...state, activeCompanyId: id});
  return true;
}

const industries = {
  professional: {ro: 'Servicii profesionale', en: 'Professional services'},
  construction: {ro: 'Construcții și instalații', en: 'Construction and installations'},
  cleaning: {ro: 'Servicii de curățenie', en: 'Cleaning services'},
  other: {ro: 'Altă industrie', en: 'Other industry'}
} as const;
export type CompanyIndustry = keyof typeof industries;

export type NewCompanyInput = {name: string; industry: CompanyIndustry; taxId: string; country: string};
export type CreateCompanyResult = {ok: true; id: string} | {ok: false; reason: 'required' | 'duplicate'};

export function createCompany(input: NewCompanyInput): CreateCompanyResult {
  const name = input.name.trim();
  const taxId = input.taxId.trim().toLocaleUpperCase();
  const country = input.country.trim();
  if (!name || !taxId || !country || !industries[input.industry]) return {ok: false, reason: 'required'};
  if (state.companies.some((item) => item.company.taxId.toLocaleUpperCase() === taxId)) return {ok: false, reason: 'duplicate'};
  const id = `local-company-${crypto.randomUUID()}`;
  const created: AccessibleCompany = {
    company: {
      id, name, taxId, country, industry: industries[input.industry],
      subscription: {
        plan: 'Starter', seatLimit: 5, trialDaysRemaining: 14, monthlyPriceEur: 0,
        billingProfile: {legalName: name, taxId, email: '', address: '', contactName: ''},
        capabilities: {unlimitedDocuments: false, customRequirements: false, notificationsAudit: false}, invoices: []
      }
    },
    members: [{id: `membership-${id}`, companyId: id, userId: 'andrei-popescu', fullName: currentUser.fullName, email: currentUser.email, role: 'administrator', status: 'active', isCurrentUser: true}]
  };
  publish({companies: [...state.companies, created], activeCompanyId: id});
  return {ok: true, id};
}
