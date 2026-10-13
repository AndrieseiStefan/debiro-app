'use client';

import {useSyncExternalStore} from 'react';
import {addCompanyAccess, type AccessibleCompany} from '@/features/companies/company-state';
import type {CompanyRole} from '@/features/company-settings/types';
import {browserSession} from '@/lib/browser-session';
import {fixtureReferenceTime} from '@/lib/fixture-clock';
import {readUserProfile, type UserProfile} from './user-profile-state';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export type CompanyInvitation = {id: string; companyId: string; invitedEmail: string; role: CompanyRole; invitedByUserId: string; invitedByDisplayName: string; invitedByEmail: string; createdAt: string; expiresAt: string; status: InvitationStatus; resolvedAt?: string};
function company(id: string, name: string, taxId: string, industry: AccessibleCompany['company']['industry']): AccessibleCompany['company'] {
  return {id, name, taxId, country: 'RO', industry, subscription: {plan: 'Starter', seatLimit: 5, trialDaysRemaining: 0, monthlyPriceEur: 0, billingProfile: {legalName: name, taxId, email: '', address: '', contactName: ''}, capabilities: {unlimitedDocuments: false, customRequirements: false, notificationsAudit: false}, invoices: []}};
}
export const invitationCompanies = [company('construct-group', 'Construct Group SRL', 'RO22345678', 'construction'), company('pro-build', 'Pro Build Solutions', 'RO087654321', 'construction'), company('global-clean-services', 'Global Clean Services', 'RO87654321', 'cleaning')];
const email = readUserProfile().email;
const initial: CompanyInvitation[] = [
  {id: 'invitation-construct-group', companyId: 'construct-group', invitedEmail: email, role: 'administrator', invitedByUserId: 'mihai-ionescu', invitedByDisplayName: 'Mihai Ionescu', invitedByEmail: 'mihai.ionescu@construct.ro', createdAt: '2026-10-01', expiresAt: '2026-10-08T23:59:59.999Z', status: 'pending'},
  {id: 'invitation-pro-build', companyId: 'pro-build', invitedEmail: email, role: 'viewer', invitedByUserId: 'maria-popescu', invitedByDisplayName: 'Maria Popescu', invitedByEmail: 'maria.popescu@probuild.ro', createdAt: '2026-09-20', expiresAt: '2026-09-30T23:59:59.999Z', status: 'pending'},
  {id: 'invitation-global-clean', companyId: 'global-clean-services', invitedEmail: email, role: 'reviewer', invitedByUserId: 'alexandru-stan', invitedByDisplayName: 'Alexandru Stan', invitedByEmail: 'alex.stan@globalclean.ro', createdAt: '2026-09-15', expiresAt: '2026-09-22T23:59:59.999Z', status: 'accepted', resolvedAt: '2026-09-16'}
];
const session = browserSession(Symbol.for('debiro.received-invitations-session'), () => ({invitations: initial, listeners: new Set<() => void>()}));
function subscribe(listener: () => void) {session.listeners.add(listener); return () => {session.listeners.delete(listener);};}
export function readInvitations() {return session.invitations;}
export function useInvitations() {return useSyncExternalStore(subscribe, readInvitations, () => initial);}
export function invitationsForUser(invitations: CompanyInvitation[], user: Pick<UserProfile, 'email'> = readUserProfile()) {return invitations.filter((item) => item.invitedEmail.trim().toLowerCase() === user.email.trim().toLowerCase());}
export function invitationStatus(invitation: CompanyInvitation, now = fixtureReferenceTime): InvitationStatus {return invitation.status === 'pending' && Date.parse(now) > Date.parse(invitation.expiresAt) ? 'expired' : invitation.status;}
export function invitationCounts(invitations: CompanyInvitation[], now = fixtureReferenceTime) {
  return {total: invitations.length, pending: invitations.filter((item) => invitationStatus(item, now) === 'pending').length, expired: invitations.filter((item) => invitationStatus(item, now) === 'expired').length, accepted: invitations.filter((item) => invitationStatus(item, now) === 'accepted').length};
}
export type InvitationResult = {ok: true} | {ok: false; reason: 'invalid' | 'identity' | 'expired' | 'inaccessible'};
/** Revalidate synchronously at transaction time; membership and history use one existing access source. */
export function resolveInvitation(id: string, outcome: 'accepted' | 'rejected', now = fixtureReferenceTime): InvitationResult {
  const item = session.invitations.find((invitation) => invitation.id === id);
  if (!item || item.status !== 'pending') return {ok: false, reason: 'invalid'};
  if (!invitationsForUser([item]).length) return {ok: false, reason: 'identity'};
  if (invitationStatus(item, now) === 'expired') return {ok: false, reason: 'expired'};
  const target = invitationCompanies.find((record) => record.id === item.companyId);
  if (!target) return {ok: false, reason: 'inaccessible'};
  if (outcome === 'accepted') addCompanyAccess(target, item.role);
  session.invitations = session.invitations.map((invitation) => invitation === item ? {...invitation, status: outcome, resolvedAt: now} : invitation);
  session.listeners.forEach((listener) => listener());
  return {ok: true};
}
