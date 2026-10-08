/** Stable company selections shared by onboarding, creation and profile editing. */
export const companyIndustries = {
  professional: {ro: 'Servicii profesionale', en: 'Professional services'},
  construction: {ro: 'Construcții și instalații', en: 'Construction and installations'},
  cleaning: {ro: 'Servicii de curățenie', en: 'Cleaning services'},
  other: {ro: 'Altă industrie', en: 'Other industry'}
} as const;
export type CompanyIndustry = keyof typeof companyIndustries;
export const companyCountries = {
  RO: {ro: 'România', en: 'Romania'},
  DE: {ro: 'Germania', en: 'Germany'},
  FR: {ro: 'Franța', en: 'France'}
} as const;
// Onboarding currently offers this one approved size, not an invented size taxonomy.
export const companySizes = {'11-50': {ro: '11 - 50 angajați', en: '11 - 50 employees'}} as const;
export type CompanySize = keyof typeof companySizes;
export const normalizeCompanyTaxId = (value: string) => value.trim().toUpperCase();
