import {companyCountries, companyIndustries, companySizes, normalizeCompanyTaxId, type CompanyIndustry, type CompanySize} from '@/features/companies/company-options';
import {validEmail, validWebsite} from '@/lib/field-validation';
import type {CompanySettingsViewModel} from './types';

export const profileFields = ['name', 'taxId', 'registrationNumber', 'website', 'industry', 'companySize', 'contactEmail', 'contactPhone', 'contactPersonName', 'contactPersonRole', 'addressLine', 'city', 'countyRegion', 'postalCode', 'country'] as const;
export type CompanyProfileValues = Record<typeof profileFields[number], string>;
export type CompanyProfileErrors = Partial<Record<keyof CompanyProfileValues, 'nameRequired' | 'taxIdRequired' | 'duplicate' | 'industryRequired' | 'countryRequired' | 'invalidOption' | 'invalidEmail' | 'invalidUrl'>>;
export function companyProfileValues(company: CompanySettingsViewModel['company']): CompanyProfileValues {
  return Object.fromEntries(profileFields.map((field) => [field, company[field] ?? ''])) as CompanyProfileValues;
}
export function normalizeCompanyProfile(values: CompanyProfileValues) {
  const trimmed = Object.fromEntries(profileFields.map((field) => [field, values[field].trim()])) as CompanyProfileValues;
  return {...trimmed, taxId: normalizeCompanyTaxId(trimmed.taxId), industry: trimmed.industry as CompanyIndustry, companySize: (trimmed.companySize || undefined) as CompanySize | undefined};
}
export function validateCompanyProfile(values: CompanyProfileValues, duplicate = false): CompanyProfileErrors {
  const errors: CompanyProfileErrors = {};
  if (!values.name.trim()) errors.name = 'nameRequired';
  if (!values.taxId.trim()) errors.taxId = 'taxIdRequired';
  else if (duplicate) errors.taxId = 'duplicate';
  if (!Object.hasOwn(companyIndustries, values.industry)) errors.industry = 'industryRequired';
  if (!Object.hasOwn(companyCountries, values.country)) errors.country = 'countryRequired';
  if (values.companySize && !Object.hasOwn(companySizes, values.companySize)) errors.companySize = 'invalidOption';
  if (values.contactEmail.trim() && !validEmail(values.contactEmail)) errors.contactEmail = 'invalidEmail';
  if (values.website.trim() && !validWebsite(values.website)) errors.website = 'invalidUrl';
  return errors;
}
export function companyProfileDirty(draft: CompanyProfileValues, saved: CompanyProfileValues) {
  return JSON.stringify(normalizeCompanyProfile(draft)) !== JSON.stringify(normalizeCompanyProfile(saved));
}
