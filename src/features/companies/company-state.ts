'use client';

import {useSyncExternalStore} from 'react';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import type {CompanyMembership, CompanySettingsViewModel} from '@/features/company-settings/types';
import {browserSession} from '@/lib/browser-session';
import {companyCountries, companyIndustries, companySizes, normalizeCompanyTaxId, type CompanyIndustry, type CompanySize} from './company-options';
import {normalizeCompanyProfile, validateCompanyProfile, type CompanyProfileValues} from '@/features/company-settings/company-profile';
export type {CompanyIndustry} from './company-options';
export {normalizeCompanyTaxId} from './company-options';

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
        industry: 'cleaning',
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

const session = browserSession(Symbol.for('debiro.company-session'), () => ({state: initialState, listeners: new Set<() => void>()}));
function subscribe(listener: () => void) {
  session.listeners.add(listener);
  return () => {session.listeners.delete(listener);};
}
function publish(next: CompanyState) {
  session.state = next;
  session.listeners.forEach((listener) => listener());
}

export function useCompanyState() {
  return useSyncExternalStore(subscribe, () => session.state, () => initialState);
}
export function readCompanyState() {return session.state;}

export function getActiveCompany(snapshot: CompanyState) {
  return snapshot.companies.find(({company}) => company.id === snapshot.activeCompanyId) ?? null;
}

export function getCurrentMembership(record: AccessibleCompany) {
  return record.members.find((member) => member.companyId === record.company.id && member.isCurrentUser && member.status === 'active') ?? null;
}

export function switchActiveCompany(id: string) {
  const state = session.state;
  if (!state.companies.some(({company}) => company.id === id)) return false;
  if (state.activeCompanyId !== id) publish({...state, activeCompanyId: id});
  return true;
}

export function duplicateCompanyTaxId(value: string, excludeId?: string) {
  return session.state.companies.some(({company}) => company.id !== excludeId && normalizeCompanyTaxId(company.taxId) === normalizeCompanyTaxId(value));
}
export type NewCompanyInput = {name: string; industry: CompanyIndustry; taxId: string; country: string; companySize?: CompanySize};
export type CreateCompanyResult = {ok: true; id: string} | {ok: false; reason: 'required' | 'duplicate'};

export function createCompany(input: NewCompanyInput): CreateCompanyResult {
  const state = session.state;
  const name = input.name.trim();
  const taxId = normalizeCompanyTaxId(input.taxId);
  const country = input.country.trim();
  if (!name || !taxId || !Object.hasOwn(companyCountries, country) || !Object.hasOwn(companyIndustries, input.industry) || input.companySize && !Object.hasOwn(companySizes, input.companySize)) return {ok: false, reason: 'required'};
  if (duplicateCompanyTaxId(taxId)) return {ok: false, reason: 'duplicate'};
  const id = `local-company-${crypto.randomUUID()}`;
  const created: AccessibleCompany = {
    company: {
      id, name, taxId, country, industry: input.industry, companySize: input.companySize,
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

export function updateCompanyProfile(companyId: string, values: CompanyProfileValues) {
  const state = session.state;
  const active = getActiveCompany(state);
  if (active?.company.id !== companyId || getCurrentMembership(active)?.role !== 'administrator') return {ok: false, reason: 'accessDenied'} as const;
  const errors = validateCompanyProfile(values, duplicateCompanyTaxId(values.taxId, companyId));
  if (Object.keys(errors).length) return {ok: false, reason: 'validation', errors} as const;
  const company = {...active.company, ...normalizeCompanyProfile(values)};
  publish({...state, companies: state.companies.map((record) => record.company.id === companyId ? {...record, company} : record)});
  return {ok: true} as const;
}

/** Bind only company-owned onboarding values. No user/password/step configuration is stored. */
export function initializeOnboardingCompany(input: NewCompanyInput): CreateCompanyResult {
  if (!input.name.trim() || !input.taxId.trim() || !Object.hasOwn(companyIndustries, input.industry) || !Object.hasOwn(companyCountries, input.country) || !input.companySize || !Object.hasOwn(companySizes, input.companySize)) return {ok: false, reason: 'required'};
  const state = session.state;
  // The public demo starts with this already-owned sample, not a second Demo Company.
  const demo = state.companies.find(({company}) => company.id === companySettingsFixture.company.id && normalizeCompanyTaxId(company.taxId) === normalizeCompanyTaxId(input.taxId));
  if (!demo || getCurrentMembership(demo)?.role !== 'administrator') return createCompany(input);
  const company = {...demo.company, name: input.name.trim(), taxId: normalizeCompanyTaxId(input.taxId), industry: input.industry, companySize: input.companySize, country: input.country};
  publish({...state, companies: state.companies.map((record) => record === demo ? {...record, company} : record), activeCompanyId: company.id});
  return {ok: true, id: company.id};
}
