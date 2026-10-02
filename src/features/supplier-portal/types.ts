import type {SupplierRequirementDocument} from '@/features/supplier-requirements/types';

export type LocalizedText = {ro: string; en: string};

export type SupplierDocument = SupplierRequirementDocument;

/** E1 presentation data, not an invitation or upload authorization contract. */
export type SupplierPortalViewModel = {
  token: string;
  companyId: string;
  vendorId: string;
  requester: {name: string; tagline: LocalizedText};
  supplier: {name: string; registrationNumber: string};
  help: {email: string; phone: string};
  footerYear: number;
};
