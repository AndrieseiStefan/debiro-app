import type {DocumentReviewViewModel} from './types';

const fixtures: Record<string, DocumentReviewViewModel> = {
  'construct-pro-tax-2024': {
    id: 'construct-pro-tax-2024',
    vendor: {id: 'construct-pro', name: 'Construct Pro SRL', registrationNumber: 'RO12345678', registrationCode: 'J40/1234/2018'},
    organization: {name: 'Demo Company SRL'},
    user: {fullName: 'Andrei Popescu', initials: 'AP'},
    notificationCount: 3,
    file: {name: 'Certificat_fiscal_CP_2024.pdf', sizeLabel: '245 KB', pageCount: 1, uploadedAt: '12.03.2024'},
    extraction: {
      confidencePercent: 94,
      values: {
        documentType: 'tax-certificate',
        companyName: 'Construct Pro SRL',
        documentNumber: '123456',
        issuedAt: '12.03.2024',
        expiresAt: '12.04.2025',
        issuer: 'Agenția Națională de Administrare Fiscală'
      }
    }
  }
};

export function getDocumentReviewFixture(documentId: string): DocumentReviewViewModel | undefined {
  return Object.hasOwn(fixtures, documentId) ? fixtures[documentId] : undefined;
}
