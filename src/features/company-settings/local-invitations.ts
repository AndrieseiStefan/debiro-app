'use client';

import {useSyncExternalStore} from 'react';
import type {CompanyMembership, CompanyRole} from './types';

type NewInvitation = Pick<CompanyMembership, 'companyId' | 'fullName' | 'email'> & {role: CompanyRole};
const emptyInvitations: CompanyMembership[] = [];
let invitations: CompanyMembership[] = emptyInvitations;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocalInvitations(companyId: string) {
  const all = useSyncExternalStore(subscribe, () => invitations, () => emptyInvitations);
  return all.filter((item) => item.companyId === companyId);
}

export function createLocalInvitation(input: NewInvitation, existingMembers: CompanyMembership[]) {
  const email = input.email.trim().toLowerCase();
  if (existingMembers.some((member) => member.companyId === input.companyId && member.email.trim().toLowerCase() === email) ||
      invitations.some((member) => member.companyId === input.companyId && member.email.trim().toLowerCase() === email)) return null;
  const invitation: CompanyMembership = {
    id: `local-member-invitation-${crypto.randomUUID()}`,
    companyId: input.companyId,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    role: input.role,
    status: 'invited'
  };
  invitations = [...invitations, invitation];
  listeners.forEach((listener) => listener());
  return invitation;
}
