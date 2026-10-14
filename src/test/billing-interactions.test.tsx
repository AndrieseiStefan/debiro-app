import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {createCompany, getActiveCompany, readCompanyState, replaceCompanyDemoPayment, switchActiveCompany, updateCompanyBillingDetails, upgradeCompanyPlan} from '@/features/companies/company-state';
import {billingDetailsValues, invoicePreview, validateBillingDetails, type DemoPaymentValues} from '@/features/company-settings/billing-details';
import {companyPlan, nextCompanyPlan, planCatalog} from '@/features/company-settings/plan-catalog';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {CompanyBillingPage} from '@/features/company-settings/CompanyBillingPage';

const router = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('next/navigation', () => ({useRouter: () => router}));
vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
vi.mock('@/components/layout/AuthenticatedAppShell', () => ({AuthenticatedAppShell: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
const active = () => getActiveCompany(readCompanyState())!;
beforeEach(() => {createCompany({name: 'Billing Company', taxId: `RO-${crypto.randomUUID()}`, country: 'RO', industry: 'professional'});});
const safe: DemoPaymentValues = {brand: 'Visa', lastFour: '4242', expiryMonth: 8, expiryYear: 2029, cardholderName: 'Demo User'};

describe('company-owned billing transactions', () => {
  it('uses canonical Company identity/address/contact fields and keeps only billing email separate', () => {
    const record = active(), before = readCompanyState(), subscription = record.company.subscription;
    const values = {...billingDetailsValues(record.company), name: ' Updated Billing SRL ', taxId: ' ro-billing-unique ', registrationNumber: 'J40/12/2026', addressLine: 'Demo street', city: 'Iași', contactPersonName: 'Demo Contact', billingEmail: ' billing@example.ro '};
    expect(updateCompanyBillingDetails(record.company.id, values)).toEqual({ok: true});
    expect(active().company).toMatchObject({name: 'Updated Billing SRL', taxId: 'RO-BILLING-UNIQUE', registrationNumber: 'J40/12/2026', addressLine: 'Demo street', city: 'Iași', contactPersonName: 'Demo Contact'});
    expect(active().company.contactEmail).toBeUndefined();
    expect(active().company.subscription.billingProfile).toEqual({email: 'billing@example.ro'});
    expect(active().company.subscription.invoices).toBe(subscription.invoices);
    expect(active().members).toBe(record.members);
    for (const other of before.companies.filter((item) => item !== record)) expect(readCompanyState().companies.find((item) => item.company.id === other.company.id)).toBe(other);
  });
  it('rejects invalid/duplicate billing data atomically', () => {
    const company = active().company, before = readCompanyState(), values = billingDetailsValues(company);
    for (const patch of [{name: ''}, {taxId: 'RO87654321'}, {billingEmail: 'invalid'}, {country: 'XX'}]) expect(updateCompanyBillingDetails(company.id, {...values, ...patch})).toMatchObject({ok: false, reason: 'validation'});
    expect(validateBillingDetails(company, {...values, billingEmail: ''}, false)).toEqual({});
    expect(readCompanyState()).toBe(before);
  });
  it('whitelists safe payment metadata, never PAN/CVV/secrets or arbitrary fields', () => {
    const companyId = active().company.id;
    const values = {...safe, pan: '4111111111111111', cvv: '123', paymentSecret: 'must-not-store'};
    expect(replaceCompanyDemoPayment(companyId, values)).toEqual({ok: true});
    const payment = active().company.subscription.paymentMethod!;
    expect(payment).toMatchObject({...safe, companyId, isDefault: true});
    expect(Object.keys(payment).sort()).toEqual(['id', 'companyId', 'brand', 'lastFour', 'expiryMonth', 'expiryYear', 'cardholderName', 'isDefault'].sort());
    expect(JSON.stringify(readCompanyState())).not.toMatch(/4111111111111111|must-not-store|"cvv"/);
  });
  it('rejects invalid brands, full numbers, invalid expiry and empty cardholder data', () => {
    const id = active().company.id, before = readCompanyState();
    for (const patch of [{brand: 'Unknown'}, {lastFour: '4111111111111111'}, {lastFour: 'abc1'}, {expiryMonth: 0}, {expiryMonth: 13}, {expiryYear: 2025}, {expiryYear: NaN}, {cardholderName: ' '}]) {
      expect(replaceCompanyDemoPayment(id, {...safe, ...patch} as DemoPaymentValues)).toEqual({ok: false, reason: 'validation'});
    }
    expect(readCompanyState()).toBe(before);
  });
  it('revalidates active company and administrator permissions for every mutation', () => {
    const company = active().company, values = billingDetailsValues(company);
    switchActiveCompany('global-clean-services');
    expect(updateCompanyBillingDetails(company.id, values)).toEqual({ok: false, reason: 'accessDenied'});
    expect(replaceCompanyDemoPayment(company.id, safe)).toEqual({ok: false, reason: 'accessDenied'});
    expect(upgradeCompanyPlan(company.id, 'Starter', 'Professional')).toEqual({ok: false, reason: 'accessDenied'});
    switchActiveCompany(company.id);
    for (const role of ['reviewer', 'viewer'] as const) {
      active().members[0].role = role;
      expect(updateCompanyBillingDetails(company.id, values).ok).toBe(false);
      expect(replaceCompanyDemoPayment(company.id, safe).ok).toBe(false);
      expect(upgradeCompanyPlan(company.id, 'Starter', 'Business').ok).toBe(false);
    }
    active().members[0].role = 'administrator';
  });
  it('rejects missing company context without changing any company', () => {
    const before = readCompanyState();
    expect(updateCompanyBillingDetails('unknown-company', billingDetailsValues(active().company))).toEqual({ok: false, reason: 'accessDenied'});
    expect(replaceCompanyDemoPayment('unknown-company', safe)).toEqual({ok: false, reason: 'accessDenied'});
    expect(upgradeCompanyPlan('unknown-company', 'Starter', 'Business')).toEqual({ok: false, reason: 'accessDenied'});
    expect(readCompanyState()).toBe(before);
  });
});

describe('demo plan/subscription lifecycle', () => {
  it('centralizes only existing tiers/capabilities, with no Trial identity or unsupported claims', () => {
    expect(planCatalog.map((plan) => plan.id)).toEqual(['Starter', 'Professional', 'Business']);
    expect(nextCompanyPlan('Starter')?.id).toBe('Professional'); expect(nextCompanyPlan('Professional')?.id).toBe('Business'); expect(nextCompanyPlan('Business')).toBeUndefined();
    expect(companyPlan('Trial')).toBeUndefined();
    expect(JSON.stringify(planCatalog)).not.toMatch(/SSO|24\/7|Enterprise|account manager|vendorLimit|API/);
  });
  it('upgrades only the active company while preserving trial state, days, invoices and payment', () => {
    const record = active(), subscription = record.company.subscription, other = readCompanyState().companies[0];
    expect(upgradeCompanyPlan(record.company.id, 'Starter', 'Professional')).toEqual({ok: true});
    expect(active().company.subscription).toMatchObject({plan: 'Professional', status: 'trialing', trialDaysRemaining: 14, monthlyPriceEur: 29, seatLimit: 5});
    expect(upgradeCompanyPlan(record.company.id, 'Professional', 'Business')).toEqual({ok: true});
    expect(active().company.subscription).toMatchObject({plan: 'Business', status: 'trialing', trialDaysRemaining: 14, monthlyPriceEur: 49, seatLimit: 10});
    expect(active().company.subscription.invoices).toBe(subscription.invoices);
    expect(active().company.subscription.paymentMethod).toBeUndefined();
    expect(readCompanyState().companies[0]).toBe(other);
  });
  it('rejects stale, self, downgrade and unavailable target plans', () => {
    const id = active().company.id;
    expect(upgradeCompanyPlan(id, 'Professional', 'Business')).toEqual({ok: false, reason: 'stalePlan'});
    expect(upgradeCompanyPlan(id, 'Starter', 'Trial')).toEqual({ok: false, reason: 'unavailablePlan'});
    expect(upgradeCompanyPlan(id, 'Starter', 'Starter')).toEqual({ok: false, reason: 'invalidTarget'});
    upgradeCompanyPlan(id, 'Starter', 'Business');
    expect(upgradeCompanyPlan(id, 'Business', 'Professional')).toEqual({ok: false, reason: 'invalidTarget'});
  });
  it('preserves active status with zero trial days rather than starting a trial on upgrade', () => {
    active().company.subscription.status = 'active';
    active().company.subscription.trialDaysRemaining = 0;
    expect(upgradeCompanyPlan(active().company.id, 'Starter', 'Professional')).toEqual({ok: true});
    expect(active().company.subscription).toMatchObject({status: 'active', trialDaysRemaining: 0});
  });
});

describe.each(['ro', 'en'] as const)('%s invoice preview and billing UI', (locale) => {
  it.each([0, 2, 3, 4])('shows newest three of %i invoices and expands only when necessary', (count) => {
    const copy = locale === 'ro' ? ro : en;
    const invoices = companySettingsFixture.company.subscription.invoices.slice(0, count);
    const before = [...invoices];
    expect(invoicePreview(invoices, false)).toHaveLength(Math.min(count, 3));
    expect(invoicePreview(invoices, true)).toHaveLength(count);
    expect(invoices).toEqual(before);
    active().company.subscription.invoices = invoices;
    render(<NextIntlClientProvider locale={locale} messages={copy}><CompanyBillingPage locale={locale} view={companySettingsFixture}/></NextIntlClientProvider>);
    const table = screen.getByRole('table');
    if (count) expect(within(table).getAllByRole('row')).toHaveLength(Math.min(count, 3) + 1);
    else expect(within(table).getByText(copy.CompanyBilling.invoices.empty)).toBeVisible();
    const more = screen.queryByRole('button', {name: copy.SectionActions.viewAll});
    if (count > 3) {
      expect(more).toHaveAttribute('aria-expanded', 'false'); fireEvent.click(more!);
      expect(within(table).getAllByRole('row')).toHaveLength(count + 1);
      expect(Array.from(table.querySelectorAll('tbody tr td:first-child'), (cell) => cell.textContent)).toEqual(['INV-2026-009', 'INV-2026-008', 'INV-2026-007', 'INV-2026-006']);
      fireEvent.click(screen.getByRole('button', {name: copy.SectionActions.showLess}));
      expect(within(table).getAllByRole('row')).toHaveLength(4);
    } else expect(more).toBeNull();
    expect(screen.queryByRole('button', {name: copy.CompanyBilling.viewAllInvoices})).toBeNull();
  });
});
