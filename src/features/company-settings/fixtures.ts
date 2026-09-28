import type {CompanySettingsViewModel} from './types';

export const companySettingsFixture: CompanySettingsViewModel = {
  company: {
    id: 'demo-company',
    name: 'Demo Company SRL',
    taxId: 'RO12345678',
    industry: {ro: 'Servicii profesionale', en: 'Professional services'},
    subscription: {
      plan: 'Professional',
      seatLimit: 5,
      trialDaysRemaining: 12,
      monthlyPriceEur: 29,
      nextPaymentDate: '2026-10-12',
      billingProfile: {
        legalName: 'Demo Company SRL',
        taxId: 'RO12345678',
        email: 'billing@demo.ro',
        address: 'Str. Constructorilor nr. 12, București',
        contactName: 'Andrei Popescu'
      },
      paymentMethod: {brand: 'Visa', lastFour: '4242', expiryMonth: 8, expiryYear: 2028},
      capabilities: {unlimitedDocuments: true, customRequirements: true, notificationsAudit: true},
      invoices: [
        {id: 'invoice-september-2026', number: 'INV-2026-009', date: '2026-09-12', amountEur: 29, status: 'paid'},
        {id: 'invoice-august-2026', number: 'INV-2026-008', date: '2026-08-12', amountEur: 29, status: 'paid'}
      ]
    }
  },
  currentUser: {fullName: 'Andrei Popescu', initials: 'AP', email: 'andrei.popescu@demo.ro', accessibleCompanyCount: 2},
  members: [
    {id: 'membership-andrei', companyId: 'demo-company', userId: 'andrei-popescu', fullName: 'Andrei Popescu', email: 'andrei.popescu@demo.ro', role: 'administrator', status: 'active', isCurrentUser: true},
    {id: 'membership-ioana', companyId: 'demo-company', userId: 'ioana-radu', fullName: 'Ioana Radu', email: 'ioana.radu@demo.ro', role: 'reviewer', status: 'active'},
    {id: 'invitation-mihai', companyId: 'demo-company', fullName: 'Mihai Ene', email: 'mihai.ene@demo.ro', role: 'viewer', status: 'invited'}
  ]
};
