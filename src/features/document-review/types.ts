export type ReviewValues = {
  documentType: string;
  companyName: string;
  documentNumber: string;
  issuedAt: string;
  expiresAt: string;
  issuer: string;
};

/** Presentation fixture only; it is not a persisted document or verification record. */
export type DocumentReviewViewModel = {
  id: string;
  vendor: {id: string; name: string; registrationNumber: string; registrationCode: string};
  organization: {name: string};
  user: {fullName: string; initials: string};
  notificationCount: number;
  file: {name: string; sizeLabel: string; pageCount: number; uploadedAt: string; sourcePage: {width: number; height: number}};
  extraction: {confidencePercent: number; values: ReviewValues};
};
