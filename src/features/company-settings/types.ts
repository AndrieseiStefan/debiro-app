import type {CompanyIndustry, CompanySize} from '@/features/companies/company-options';

export type CompanyRole = 'administrator' | 'reviewer' | 'viewer';
export const companyRoles = ['administrator', 'reviewer', 'viewer'] as const satisfies readonly CompanyRole[];
export type MembershipStatus = 'active' | 'invited';

export type CompanySubscription = {
  plan: string;
  seatLimit: number;
  trialDaysRemaining: number;
  monthlyPriceEur: number;
  nextPaymentDate?: string;
  billingProfile: {legalName: string; taxId: string; email: string; address: string; contactName: string};
  paymentMethod?: {brand: string; lastFour: string; expiryMonth: number; expiryYear: number};
  capabilities: {unlimitedDocuments: boolean; customRequirements: boolean; notificationsAudit: boolean};
  invoices: {id: string; number: string; date: string; amountEur: number; status: 'paid'}[];
};

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
    country: string;
    industry: CompanyIndustry;
    companySize?: CompanySize;
    registrationNumber?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPersonName?: string;
    contactPersonRole?: string;
    addressLine?: string;
    city?: string;
    countyRegion?: string;
    postalCode?: string;
    subscription: CompanySubscription;
  };
  currentUser: {fullName: string; initials: string; email: string};
  members: CompanyMembership[];
};
