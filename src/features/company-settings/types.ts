export type CompanyRole = 'administrator' | 'reviewer' | 'viewer';
export const companyRoles = ['administrator', 'reviewer', 'viewer'] as const satisfies readonly CompanyRole[];
export type MembershipStatus = 'active' | 'invited';

/** A role and invitation belong to a company membership, never to the global user. */
export type CompanyMembership = {
  id: string;
  companyId: string;
  fullName: string;
  email: string;
  role: CompanyRole;
  status: MembershipStatus;
  userId?: string;
  isCurrentUser?: boolean;
};

export type CompanySettingsViewModel = {
  company: {
    id: string;
    name: string;
    taxId: string;
    industry: {ro: string; en: string};
    subscription: {plan: string; seatLimit: number; trialDaysRemaining: number};
  };
  currentUser: {fullName: string; initials: string; accessibleCompanyCount: number};
  members: CompanyMembership[];
};
