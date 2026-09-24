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
