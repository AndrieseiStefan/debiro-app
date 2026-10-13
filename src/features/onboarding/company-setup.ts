import {initializeStarterTemplate} from '@/features/requirements/requirements-state';
import type {RequirementDocumentInput} from '@/features/requirements/types';
import {retainVendorSetupDrafts} from '@/features/vendors/created-vendors';

const documentIds = {registration: 'registration', tax: 'tax', insurance: 'liability', fireSafety: 'fire', iso: 'iso'} as const;
export type SetupDocumentId = keyof typeof documentIds;

/** Only deliberate setup; Configure later has an empty selection and creates no records. */
export function initializeCompanySetup(companyId: string, setup: {template: 'construction' | 'general' | null; documents: SetupDocumentId[]; suppliers: {name: string; email: string}[]}, language: 'ro' | 'en' = 'ro') {
  if (setup.documents.length) {
    const rules: RequirementDocumentInput[] = [...new Set(setup.documents)].map((id) => ({catalogDocumentTypeId: documentIds[id],
      required: ['registration', 'tax', 'insurance'].includes(id), expiryWarningDays: id === 'iso' ? 60 : 30, validityMonths: id === 'iso' ? 36 : 12}));
    initializeStarterTemplate(companyId, setup.template === 'construction' ? 'starter-construction' : 'starter-general', rules, language);
  }
  if (setup.suppliers.length) retainVendorSetupDrafts(companyId, setup.suppliers);
}
