/** Presentation data for the fixture-backed dashboard; not a persistence model. */
export type LocalizedSample = {ro: string; en: string};

export type DashboardDocumentStatus = 'expired' | 'expiring' | 'missing';
export type DashboardActivityKind = 'uploaded' | 'expiring' | 'expired' | 'added';

export type DashboardViewModel = {
  user: {
    firstName: string;
    fullName: string;
    initials: string;
  };
  organization: {
    name: string;
  };
  notificationCount: number;
  suppliers: {
    total: number;
    compliant: number;
    attention: number;
    noncompliant: number;
    missingDocuments: number;
    monthlyIncrease: number;
    percentages: {
      compliant: number;
      attention: number;
      noncompliant: number;
      missingDocuments: number;
    };
  };
  documentsRequiringAttention: Array<{
    id: string;
    supplier: string;
    document: LocalizedSample;
    status: DashboardDocumentStatus;
    expiry: LocalizedSample;
  }>;
  recentActivity: Array<{
    id: string;
    kind: DashboardActivityKind;
    supplier: string;
    document?: LocalizedSample;
    time: LocalizedSample;
  }>;
};
