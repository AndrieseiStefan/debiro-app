/** Presentation data for the fixture-backed vendors list; not a persistence model. */
export type VendorStatus = 'compliant' | 'attention' | 'noncompliant';
export type VendorLifecycleStatus = 'active' | 'inactive';

export type VendorCategory =
  | 'construction'
  | 'cleaning'
  | 'software'
  | 'materials'
  | 'logistics'
  | 'energy'
  | 'food'
  | 'medical';

export const vendorCategories: VendorCategory[] = ['construction', 'cleaning', 'software', 'materials', 'logistics', 'energy', 'food', 'medical'];

/** Browser-memory contracts, scoped to the vendor inside its owning company. */
export type VendorContact = {
  id: string; companyId: string; vendorId: string; name?: string; role?: string;
  email: string; phone?: string; isPrimary: boolean; createdAt: string; updatedAt: string;
};
export type VendorNoteThread = {
  id: string; companyId: string; vendorId: string; title: string; content: string; createdAt: string; updatedAt: string;
};

export type VendorListItem = {
  id: string;
  name: string;
  registrationNumber: string;
  contactName?: string;
  category: VendorCategory;
  status: VendorStatus;
  lifecycleStatus: VendorLifecycleStatus;
  documentCount: number;
  documentTarget: number;
  nextExpiry: {date: string | null; ro: string; en: string; tone: 'danger' | 'warning' | 'neutral'};
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
  subtitle?: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing' | 'review';
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
  registrationCode?: string;
  categoryDetail?: {ro: string; en: string};
  validDocumentCount?: number;
  invitationPreview?: {
    /** Deterministic display-only URL; not a generated access token. */
    demoUploadUrl: string;
    /** Local route used only to preview the matching E1 supplier portal fixture. */
    demoUploadPath: string;
    /** Fixed mockup reference date for calculating the local validity helper. */
    referenceDate: string;
  };
  contact: {
    name?: string;
    role?: {ro: string; en: string};
    email?: string;
    phone?: string;
    address?: {ro: string; en: string};
    website?: string;
  };
  industry?: string;
  notes?: string;
  documents: VendorDocumentRow[];
};
