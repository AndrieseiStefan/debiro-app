/** Fixture-backed presentation data, not a persistence or authorization model. */
export type DocumentStatus = 'uploaded' | 'review' | 'valid' | 'expiring' | 'expired';
export type DocumentType = 'tax' | 'registration' | 'fire' | 'insurance' | 'inspector' | 'financial' | 'environment' | 'safety' | 'iso' | 'permit' | 'custom';

export type DocumentSummary = {
  id: string;
  vendorId: string;
  vendorName: string;
  documentName: {ro: string; en: string};
  filename: string;
  documentType: DocumentType;
  status: DocumentStatus;
  uploadedAt: string;
  expiresAt: string | null;
  /** Only a document with an implemented review view may expose a destination. */
  reviewRoute: string | null;
};

export type DocumentsViewModel = {
  user: {fullName: string; initials: string};
  organization: {name: string};
  notificationCount: number;
  previousMonthCount: number;
  documents: DocumentSummary[];
};
