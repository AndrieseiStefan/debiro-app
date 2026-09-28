import type {CompanySettingsViewModel} from './types';

export const companySettingsFixture: CompanySettingsViewModel = {
  company: {
    id: 'demo-company',
    name: 'Demo Company SRL',
    taxId: 'RO12345678',
    industry: {ro: 'Servicii profesionale', en: 'Professional services'},
    subscription: {plan: 'Professional', seatLimit: 5, trialDaysRemaining: 12}
  },
  currentUser: {fullName: 'Andrei Popescu', initials: 'AP', accessibleCompanyCount: 2},
  members: [
    {id: 'membership-andrei', companyId: 'demo-company', userId: 'andrei-popescu', fullName: 'Andrei Popescu', email: 'andrei.popescu@demo.ro', role: 'administrator', status: 'active', isCurrentUser: true},
    {id: 'membership-ioana', companyId: 'demo-company', userId: 'ioana-radu', fullName: 'Ioana Radu', email: 'ioana.radu@demo.ro', role: 'reviewer', status: 'active'},
    {id: 'invitation-mihai', companyId: 'demo-company', fullName: 'Mihai Ene', email: 'mihai.ene@demo.ro', role: 'viewer', status: 'invited'}
  ]
};
