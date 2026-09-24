import type {DashboardViewModel} from './types';

export const dashboardFixture: DashboardViewModel = {
  user: {
    firstName: 'Andrei',
    fullName: 'Andrei Popescu',
    initials: 'AP'
  },
  organization: {name: 'Demo Company SRL'},
  notificationCount: 3,
  suppliers: {
    total: 24,
    compliant: 16,
    attention: 5,
    noncompliant: 3,
    missingDocuments: 0,
    monthlyIncrease: 3,
    percentages: {compliant: 67, attention: 21, noncompliant: 13, missingDocuments: 0}
  },
  documentsRequiringAttention: [
    {id: 'doc-1', supplier: 'Construct Pro SRL', document: {ro: 'Certificat fiscal', en: 'Tax certificate'}, status: 'expired', expiry: {ro: '12 mar. 2024', en: 'Mar 12, 2024'}},
    {id: 'doc-2', supplier: 'Global Clean Services', document: {ro: 'Autorizație ISU', en: 'Fire safety permit'}, status: 'expiring', expiry: {ro: '28 apr. 2025', en: 'Apr 28, 2025'}},
    {id: 'doc-3', supplier: 'Tech Solutions SRL', document: {ro: 'Certificat de înregistrare', en: 'Registration certificate'}, status: 'expiring', expiry: {ro: '03 mai 2025', en: 'May 3, 2025'}},
    {id: 'doc-4', supplier: 'Build & More SRL', document: {ro: 'Adeverință D112', en: 'D112 statement'}, status: 'missing', expiry: {ro: '—', en: '—'}},
    {id: 'doc-5', supplier: 'Logistics Expert', document: {ro: 'Asigurare Răspundere Civilă', en: 'Liability insurance'}, status: 'expired', expiry: {ro: '10 feb. 2024', en: 'Feb 10, 2024'}}
  ],
  recentActivity: [
    {id: 'act-1', kind: 'uploaded', supplier: 'Global Clean Services', document: {ro: 'Certificat fiscal', en: 'Tax certificate'}, time: {ro: 'acum 2 ore', en: '2 hours ago'}},
    {id: 'act-2', kind: 'expiring', supplier: 'Tech Solutions SRL', document: {ro: 'Autorizație ISU', en: 'Fire safety permit'}, time: {ro: 'acum 5 ore', en: '5 hours ago'}},
    {id: 'act-3', kind: 'expired', supplier: 'Construct Pro SRL', document: {ro: 'Certificat fiscal', en: 'Tax certificate'}, time: {ro: 'ieri, 14:32', en: 'yesterday, 14:32'}},
    {id: 'act-4', kind: 'added', supplier: 'Green Energy SRL', time: {ro: 'ieri, 10:11', en: 'yesterday, 10:11'}}
  ]
};
