import {companyProfileValues, normalizeCompanyProfile, validateCompanyProfile, type CompanyProfileValues} from './company-profile';
import type {CompanySettingsViewModel, CompanyPaymentMethod, CompanySubscription} from './types';
import {validEmail} from '@/lib/field-validation';
import {fixtureReferenceTime} from '@/lib/fixture-clock';

export const billingCompanyFields = ['name', 'taxId', 'registrationNumber', 'contactPersonName', 'addressLine', 'city', 'countyRegion', 'postalCode', 'country'] as const;
export type BillingDetailsValues = Pick<CompanyProfileValues, typeof billingCompanyFields[number]> & {billingEmail: string};
export function billingDetailsValues(company: CompanySettingsViewModel['company']): BillingDetailsValues {
  return {...Object.fromEntries(billingCompanyFields.map((key) => [key, company[key] ?? ''])), billingEmail: company.subscription.billingProfile.email} as BillingDetailsValues;
}
export function normalizedBillingDetails(company: CompanySettingsViewModel['company'], values: BillingDetailsValues) {
  const canonical = normalizeCompanyProfile({...companyProfileValues(company), ...Object.fromEntries(billingCompanyFields.map((key) => [key, values[key]]))});
  return {...Object.fromEntries(billingCompanyFields.map((key) => [key, canonical[key]])), billingEmail: values.billingEmail.trim()} as BillingDetailsValues;
}
export function validateBillingDetails(company: CompanySettingsViewModel['company'], values: BillingDetailsValues, duplicate: boolean) {
  const errors: Partial<Record<keyof BillingDetailsValues, string>> = validateCompanyProfile({...companyProfileValues(company), ...values}, duplicate);
  if (values.billingEmail.trim() && !validEmail(values.billingEmail)) errors.billingEmail = 'invalidEmail';
  return errors;
}
export type DemoPaymentValues = Pick<CompanyPaymentMethod, 'brand' | 'lastFour' | 'expiryMonth' | 'expiryYear' | 'cardholderName'>;
export function validDemoPayment(values: DemoPaymentValues) {
  const reference = new Date(fixtureReferenceTime);
  return ['Visa', 'Mastercard'].includes(values.brand) && /^\d{4}$/.test(values.lastFour) && values.cardholderName.trim().length > 0 && values.cardholderName.trim().length <= 120 &&
    Number.isInteger(values.expiryMonth) && values.expiryMonth >= 1 && values.expiryMonth <= 12 && Number.isInteger(values.expiryYear) && values.expiryYear <= reference.getUTCFullYear() + 20 &&
    (values.expiryYear > reference.getUTCFullYear() || values.expiryYear === reference.getUTCFullYear() && values.expiryMonth >= reference.getUTCMonth() + 1);
}
export function invoicePreview(invoices: CompanySubscription['invoices'], expanded: boolean) {
  const ordered = [...invoices].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  return expanded ? ordered : ordered.slice(0, 3);
}
