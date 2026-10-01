import {vendorCategories, type VendorCategory} from './types';

export type VendorMetadata = {
  name: string; cui: string; category: VendorCategory; email: string;
  registrationCode?: string; phone?: string; contactName?: string; industry?: string; address?: string; website?: string; notes?: string;
};
export type VendorFormValues = Record<Exclude<keyof VendorMetadata, 'category'>, string> & {category: VendorCategory | ''};
export type VendorFormErrors = Partial<Record<'name' | 'cui' | 'email' | 'category' | 'website', 'nameRequired' | 'cuiRequired' | 'cuiDuplicate' | 'emailRequired' | 'emailInvalid' | 'categoryRequired' | 'websiteInvalid'>>;

export const emptyVendorValues: VendorFormValues = {name: '', cui: '', registrationCode: '', email: '', phone: '', contactName: '', category: '', industry: '', address: '', website: '', notes: ''};
export const normalizeCui = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toUpperCase();
const optional = (value: string) => value.trim() || undefined;

export function vendorFormValues(metadata?: VendorMetadata): VendorFormValues {
  return {...emptyVendorValues, ...metadata, registrationCode: metadata?.registrationCode ?? '', phone: metadata?.phone ?? '', contactName: metadata?.contactName ?? '', industry: metadata?.industry ?? '', address: metadata?.address ?? '', website: metadata?.website ?? '', notes: metadata?.notes ?? ''};
}

export function normalizeVendorValues(values: VendorFormValues): VendorMetadata {
  return {name: values.name.trim(), cui: values.cui.trim(), email: values.email.trim(), category: values.category as VendorCategory,
    registrationCode: optional(values.registrationCode), phone: optional(values.phone), contactName: optional(values.contactName), industry: optional(values.industry), address: optional(values.address), website: optional(values.website), notes: optional(values.notes)};
}

export function validateVendorValues(values: VendorFormValues, duplicateCui = false): VendorFormErrors {
  const errors: VendorFormErrors = {};
  if (!values.name.trim()) errors.name = 'nameRequired';
  if (!values.cui.trim()) errors.cui = 'cuiRequired';
  else if (duplicateCui) errors.cui = 'cuiDuplicate';
  if (!values.email.trim()) errors.email = 'emailRequired';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'emailInvalid';
  if (!vendorCategories.includes(values.category as VendorCategory)) errors.category = 'categoryRequired';
  if (values.website.trim()) {
    try {
      const value = values.website.trim();
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) errors.website = 'websiteInvalid';
    } catch {errors.website = 'websiteInvalid';}
  }
  return errors;
}

export function vendorDraftDirty(values: VendorFormValues, initial: VendorFormValues) {
  return JSON.stringify(normalizeVendorValues(values)) !== JSON.stringify(normalizeVendorValues(initial));
}
