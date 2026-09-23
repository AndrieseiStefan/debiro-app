import type {LandingPreview} from './types';

export const landingPreview: LandingPreview = {
  supplierCount: 24,
  compliantCount: 16,
  attentionCount: 5,
  noncompliantCount: 3,
  documents: [
    {supplier: 'Construct Pro SRL', name: 'Certificat fiscal', nameEn: 'Tax certificate', status: 'expired', date: '12 mar. 2024', dateEn: 'Mar 12, 2024'},
    {supplier: 'Global Clean Services', name: 'Autorizație ISU', nameEn: 'Fire safety permit', status: 'expiring', date: '28 apr. 2025', dateEn: 'Apr 28, 2025'},
    {supplier: 'Tech Solutions SRL', name: 'Certificat de înregistrare', nameEn: 'Registration certificate', status: 'expiring', date: '03 mai 2025', dateEn: 'May 3, 2025'},
    {supplier: 'Build & More SRL', name: 'Adeverință D112', nameEn: 'D112 statement', status: 'missing', date: '—', dateEn: '—'},
    {supplier: 'Logistics Expert', name: 'Asigurare Răspundere Civilă', nameEn: 'Liability insurance', status: 'expired', date: '10 feb. 2024', dateEn: 'Feb 10, 2024'}
  ],
  activities: [
    {kind: 'uploaded', supplier: 'Global Clean Services', detail: 'Certificat fiscal', detailEn: 'Tax certificate', time: 'acum 2 ore', timeEn: '2 hours ago'},
    {kind: 'expiring', supplier: 'Tech Solutions SRL', detail: 'Autorizație ISU', detailEn: 'Fire safety permit', time: 'acum 5 ore', timeEn: '5 hours ago'},
    {kind: 'expired', supplier: 'Construct Pro SRL', detail: 'Certificat fiscal', detailEn: 'Tax certificate', time: 'ieri, 14:32', timeEn: 'yesterday, 14:32'},
    {kind: 'added', supplier: 'Green Energy SRL', time: 'ieri, 10:11', timeEn: 'yesterday, 10:11'}
  ],
  partners: ['CONSTRUCT PRO', 'Global Clean Services', 'Tech Solutions', 'Build & More', 'Logistics Expert', 'Green Energy']
};
