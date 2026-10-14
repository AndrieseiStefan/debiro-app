import type {CompanySettingsViewModel} from './types';
import {planSubscriptionFields} from './plan-catalog';

export const companySettingsFixture: CompanySettingsViewModel = {
  company: {
    id: 'demo-company',
    name: 'Demo Company SRL',
    taxId: 'RO12345678',
    country: 'RO',
    industry: 'professional',
    companySize: '11-50',
    registrationNumber: 'J40/1234/2018',
    website: 'https://demo.ro',
    contactEmail: 'billing@demo.ro',
    contactPhone: '+40 723 123 456',
    contactPersonName: 'Andrei Popescu',
    contactPersonRole: 'Administrator',
    addressLine: 'Str. Constructorilor nr. 12',
    city: 'București',
    countyRegion: 'București',
    subscription: {
      ...planSubscriptionFields('Professional'),
      status: 'trialing',
      trialDaysRemaining: 12,
      nextPaymentDate: '2026-10-12',
      billingProfile: {
        email: 'billing@demo.ro'
      },
      paymentMethod: {id: 'demo-payment', companyId: 'demo-company', brand: 'Visa', lastFour: '4242', expiryMonth: 8, expiryYear: 2028, cardholderName: 'Andrei Popescu', isDefault: true},
      invoices: [
        {id: 'invoice-september-2026', number: 'INV-2026-009', date: '2026-09-12', amountEur: 29, status: 'paid'},
        {id: 'invoice-august-2026', number: 'INV-2026-008', date: '2026-08-12', amountEur: 29, status: 'paid'},
        {id: 'invoice-june-2026', number: 'INV-2026-006', date: '2026-06-12', amountEur: 29, status: 'paid'},
        {id: 'invoice-july-2026', number: 'INV-2026-007', date: '2026-07-12', amountEur: 29, status: 'paid'}
      ]
    }
  },
  currentUser: {fullName: 'Andrei Popescu', initials: 'AP', email: 'andrei.popescu@demo.ro'},
  members: [
    {id: 'membership-andrei', companyId: 'demo-company', userId: 'andrei-popescu', fullName: 'Andrei Popescu', email: 'andrei.popescu@demo.ro', role: 'administrator', status: 'active', isCurrentUser: true},
    {id: 'membership-ioana', companyId: 'demo-company', userId: 'ioana-radu', fullName: 'Ioana Radu', email: 'ioana.radu@demo.ro', role: 'reviewer', status: 'active'},
    {id: 'invitation-mihai', companyId: 'demo-company', fullName: 'Mihai Ene', email: 'mihai.ene@demo.ro', role: 'viewer', status: 'invited'}
  ]
};
