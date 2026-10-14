'use client';

import {useSyncExternalStore} from 'react';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {companyRoles, type CompanyMembership, type CompanyRole, type CompanySettingsViewModel} from '@/features/company-settings/types';
import {recordLocalAuditEvent} from '@/features/notifications/local-audit';
import {browserSession} from '@/lib/browser-session';
import {companyCountries, companyIndustries, companySizes, normalizeCompanyTaxId, type CompanyIndustry, type CompanySize} from './company-options';
import {normalizeCompanyProfile, validateCompanyProfile, type CompanyProfileValues} from '@/features/company-settings/company-profile';
import {currentUser, currentMemberIdentity, readUserProfile} from '@/features/profile/user-profile-state';
import {companyPlan, planSubscriptionFields} from '@/features/company-settings/plan-catalog';
import {normalizedBillingDetails, validDemoPayment, validateBillingDetails, type BillingDetailsValues, type DemoPaymentValues} from '@/features/company-settings/billing-details';
export {currentUser} from '@/features/profile/user-profile-state';
export type {CompanyIndustry} from './company-options';
export {normalizeCompanyTaxId} from './company-options';

export type AccessibleCompany = {
  company: CompanySettingsViewModel['company'];
  members: CompanyMembership[];
};

type CompanyState = {companies: AccessibleCompany[]; activeCompanyId: string | null};

const initialState: CompanyState = {
  companies: [
    {company: companySettingsFixture.company, members: companySettingsFixture.members.filter((member) => member.status === 'active')},
    {
      company: {
        id: 'global-clean-services', name: 'Global Clean Services', taxId: 'RO87654321', country: 'RO',
        industry: 'cleaning',
        subscription: {
          ...planSubscriptionFields('Business'), status: 'active', trialDaysRemaining: 0,
          billingProfile: {email: ''}, invoices: []
        }
      },
      members: [{id: 'membership-andrei-global-clean', companyId: 'global-clean-services', userId: 'andrei-popescu', fullName: currentUser.fullName, email: currentUser.email, role: 'reviewer', status: 'active', isCurrentUser: true}]
    }
  ],
  activeCompanyId: companySettingsFixture.company.id
};

const session = browserSession(Symbol.for('debiro.company-session'), () => ({state: initialState, listeners: new Set<() => void>()}));
export function subscribeCompanyState(listener: () => void) {
  session.listeners.add(listener);
  return () => {session.listeners.delete(listener);};
}
function publish(next: CompanyState) {
  session.state = next;
  session.listeners.forEach((listener) => listener());
}

export function useCompanyState() {
  return useSyncExternalStore(subscribeCompanyState, () => session.state, () => initialState);
}
export function readCompanyState() {return session.state;}

export function getActiveCompany(snapshot: CompanyState) {
  return snapshot.companies.find(({company}) => company.id === snapshot.activeCompanyId) ?? null;
}

export function getCurrentMembership(record: AccessibleCompany) {
  const member = record.members.find((member) => member.companyId === record.company.id && member.isCurrentUser && member.userId === readUserProfile().userId && member.status === 'active');
  return member ? currentMemberIdentity(member) : null;
}

export type MemberManagementResult = {ok: true} | {ok: false; reason: 'accessDenied' | 'notFound' | 'notPending' | 'lastAdministrator' | 'invalidRole' | 'self'};
export function managedCompany(companyId: string) {
  const active = getActiveCompany(session.state);
  return active?.company.id === companyId && getCurrentMembership(active)?.role === 'administrator' ? active : null;
}

/** Revalidate ownership, permission and the last-admin invariant at mutation time. */
export function manageCompanyMember(companyId: string, memberId: string, action: 'role' | 'remove', role?: CompanyRole): MemberManagementResult {
  const company = managedCompany(companyId);
  if (!company) return {ok: false, reason: 'accessDenied'};
  const member = company.members.find((item) => item.id === memberId && item.companyId === companyId && item.status === 'active');
  if (!member) return {ok: false, reason: 'notFound'};
  if (action === 'role' && !companyRoles.includes(role as CompanyRole)) return {ok: false, reason: 'invalidRole'};
  if (member.role === 'administrator' && (action === 'remove' || role !== 'administrator') && company.members.filter((item) => item.status === 'active' && item.role === 'administrator').length <= 1) return {ok: false, reason: 'lastAdministrator'};
  if (member.userId === readUserProfile().userId || member.email.toLowerCase() === readUserProfile().email.toLowerCase()) return {ok: false, reason: 'self'};
  if (action === 'role' && role === member.role) return {ok: true};
  const members = action === 'remove' ? company.members.filter((item) => item !== member) : company.members.map((item) => item === member ? {...item, role: role!} : item);
  publish({...session.state, companies: session.state.companies.map((item) => item === company ? {...item, members} : item)});
  recordLocalAuditEvent(companyId, {eventType: 'other', action: {ro: action === 'remove' ? 'Membru eliminat' : 'Rol membru schimbat', en: action === 'remove' ? 'Member removed' : 'Member role changed'}, description: {ro: action === 'remove' ? `${member.fullName} (${member.email}) nu mai are acces la ${company.company.name}.` : `${member.fullName} (${member.email}): ${member.role} → ${role}.`, en: action === 'remove' ? `${member.fullName} (${member.email}) no longer has access to ${company.company.name}.` : `${member.fullName} (${member.email}): ${member.role} → ${role}.`}});
  return {ok: true};
}

/** Accept access without entering the workspace. Existing active membership wins. */
export function addCompanyAccess(company: AccessibleCompany['company'], role: CompanyMembership['role']) {
  const state = session.state;
  const existing = state.companies.find((record) => record.company.id === company.id);
  if (existing && getCurrentMembership(existing)) return;
  const user = readUserProfile();
  const membership: CompanyMembership = {id: `membership-${company.id}-${user.userId}`, companyId: company.id, userId: user.userId, fullName: user.fullName, email: user.email, role, status: 'active', isCurrentUser: true};
  const record = {company: existing?.company ?? company, members: [...(existing?.members.filter((member) => member.userId !== user.userId && member.email.toLowerCase() !== user.email.toLowerCase()) ?? []), membership]};
  publish({...state, companies: existing ? state.companies.map((item) => item === existing ? record : item) : [...state.companies, record]});
}

export function switchActiveCompany(id: string) {
  const state = session.state;
  const target = state.companies.find(({company}) => company.id === id);
  if (!target || !getCurrentMembership(target)) return false;
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
        ...planSubscriptionFields('Starter'), status: 'trialing', trialDaysRemaining: 14,
        billingProfile: {email: ''}, invoices: []
      }
    },
    members: [{id: `membership-${id}`, companyId: id, userId: readUserProfile().userId, fullName: currentUser.fullName, email: currentUser.email, role: 'administrator', status: 'active', isCurrentUser: true}]
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

export type BillingMutationResult = {ok: true} | {ok: false; reason: 'accessDenied' | 'validation' | 'unavailablePlan' | 'invalidTarget' | 'stalePlan'};
export function updateCompanyBillingDetails(companyId: string, values: BillingDetailsValues): BillingMutationResult {
  const active = managedCompany(companyId);
  if (!active) return {ok: false, reason: 'accessDenied'};
  if (Object.keys(validateBillingDetails(active.company, values, duplicateCompanyTaxId(values.taxId, companyId))).length) return {ok: false, reason: 'validation'};
  const {billingEmail, ...canonical} = normalizedBillingDetails(active.company, values);
  const company = {...active.company, ...canonical, subscription: {...active.company.subscription, billingProfile: {email: billingEmail}}};
  publish({...session.state, companies: session.state.companies.map((record) => record === active ? {...record, company} : record)});
  return {ok: true};
}
export function replaceCompanyDemoPayment(companyId: string, values: DemoPaymentValues): BillingMutationResult {
  const active = managedCompany(companyId);
  if (!active) return {ok: false, reason: 'accessDenied'};
  if (!validDemoPayment(values)) return {ok: false, reason: 'validation'};
  // Whitelist safe display metadata. Never copy arbitrary form/input properties into the store.
  const paymentMethod = {id: `demo-payment-${crypto.randomUUID()}`, companyId, brand: values.brand, lastFour: values.lastFour, expiryMonth: values.expiryMonth, expiryYear: values.expiryYear, cardholderName: values.cardholderName.trim(), isDefault: true};
  const company = {...active.company, subscription: {...active.company.subscription, paymentMethod}};
  publish({...session.state, companies: session.state.companies.map((record) => record === active ? {...record, company} : record)});
  return {ok: true};
}
export function upgradeCompanyPlan(companyId: string, expectedPlan: string, targetId: string): BillingMutationResult {
  const active = managedCompany(companyId);
  if (!active) return {ok: false, reason: 'accessDenied'};
  if (active.company.subscription.plan !== expectedPlan) return {ok: false, reason: 'stalePlan'};
  const current = companyPlan(expectedPlan), target = companyPlan(targetId);
  if (!current || !target || !target.available) return {ok: false, reason: 'unavailablePlan'};
  if (target.rank <= current.rank) return {ok: false, reason: 'invalidTarget'};
  const company = {...active.company, subscription: {...active.company.subscription, ...planSubscriptionFields(target.id)}};
  publish({...session.state, companies: session.state.companies.map((record) => record === active ? {...record, company} : record)});
  return {ok: true};
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
