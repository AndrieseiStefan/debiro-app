/** Presentation data for the fixture-backed vendors list; not a persistence model. */
export type VendorStatus = 'compliant' | 'attention' | 'noncompliant';

export type VendorCategory =
  | 'construction'
  | 'cleaning'
  | 'software'
  | 'materials'
  | 'logistics'
  | 'energy'
  | 'food'
  | 'medical';

export type VendorListItem = {
  id: string;
  name: string;
  registrationNumber: string;
  contactName?: string;
  category: VendorCategory;
  status: VendorStatus;
  documentCount: number;
  documentTarget: number;
  nextExpiry: {ro: string; en: string; tone: 'danger' | 'warning' | 'neutral'};
};

export type VendorsListViewModel = {
  user: {fullName: string; initials: string};
  organization: {name: string};
  notificationCount: number;
  vendors: VendorListItem[];
};

/** Mockup-derived presentation data, not a vendor persistence/API contract. */
export type VendorDocumentRow = {
  id: string;
  name: string;
  issuer: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
  issued: {ro: string; en: string} | null;
  expires: {ro: string; en: string} | null;
  countdown?: {ro: string; en: string};
  uploadedBy?: string;
  uploadedOn?: {ro: string; en: string};
};

export type VendorDetailsViewModel = {
  user: VendorsListViewModel['user'];
  organization: VendorsListViewModel['organization'];
  notificationCount: number;
  vendor: VendorListItem;
  registrationCode: string;
  categoryDetail: {ro: string; en: string};
  validDocumentCount: number;
  contact: {
    name: string;
    role: {ro: string; en: string};
    email: string;
    phone: string;
    address: {ro: string; en: string};
    website: string;
  };
  documents: VendorDocumentRow[];
};
