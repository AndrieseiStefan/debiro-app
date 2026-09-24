export type LocalizedText = {ro: string; en: string};

export type SupplierDocument = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  status: 'uploaded' | 'pending' | 'missing';
  uploadedFile?: string;
  uploadedAt?: LocalizedText;
};

/** E1 presentation data, not an invitation or upload authorization contract. */
export type SupplierPortalViewModel = {
  token: string;
  requester: {name: string; tagline: LocalizedText};
  supplier: {name: string; registrationNumber: string};
  documents: SupplierDocument[];
  help: {email: string; phone: string};
  footerYear: number;
};
