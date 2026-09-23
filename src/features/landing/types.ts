/** Static, presentational data for the dashboard miniature in the landing hero. */
export type LandingPreview = {
  supplierCount: number;
  compliantCount: number;
  attentionCount: number;
  noncompliantCount: number;
  documents: Array<{
    supplier: string;
    name: string;
    nameEn: string;
    status: 'expired' | 'expiring' | 'missing';
    date: string;
    dateEn: string;
  }>;
  activities: Array<{
    kind: 'uploaded' | 'expiring' | 'expired' | 'added';
    supplier: string;
    detail?: string;
    detailEn?: string;
    time: string;
    timeEn: string;
  }>;
  partners: string[];
};
