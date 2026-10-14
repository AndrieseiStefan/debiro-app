'use client';

import type {CompanyMembership} from './types';
import {createCompanyInvitation, pendingCompanyInvitations, useInvitations} from '@/features/profile/invitations-state';

export function useLocalInvitations(companyId: string) {
  return pendingCompanyInvitations(useInvitations(), companyId);
}

export function createLocalInvitation(input: Pick<CompanyMembership, 'companyId' | 'fullName' | 'email' | 'role'>, existingMembers: CompanyMembership[]) {
  if (existingMembers.some((member) => member.companyId === input.companyId && member.email.trim().toLowerCase() === input.email.trim().toLowerCase())) return null;
  return createCompanyInvitation(input);
}
