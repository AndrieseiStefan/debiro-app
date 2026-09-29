import type {VendorCategory} from '@/features/vendors/types';

export type LocalizedText = {ro: string; en: string};

// Presentation-only template rules. These are not uploaded supplier documents.
export type RequirementRuleView = {
  id: string;
  name: LocalizedText;
  detail: LocalizedText;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  mandatory: boolean;
  alertDays: 30 | 60;
  validityMonths: 12 | 36;
};

export type RequirementTemplateView = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  icon: 'construction' | 'materials' | 'maintenance' | 'software' | 'consulting' | 'logistics';
  categoryId: VendorCategory;
  rules: RequirementRuleView[];
};

export type RequirementsViewModel = {
  user: {fullName: string; initials: string};
  organization: {name: string};
  notificationCount: number;
  templates: RequirementTemplateView[];
};

export type ExpiryWarningDays = 7 | 15 | 30 | 60 | 90;
export type ValidityMonths = 1 | 3 | 6 | 12 | 24 | 36;

type DocumentRules = {
  id: string;
  templateId: string;
  required: boolean;
  expiryWarningDays: ExpiryWarningDays;
  validityMonths: ValidityMonths;
  issuer?: string;
};

export type RequirementTemplateDocument = DocumentRules & (
  | {catalogDocumentTypeId: string; customName?: never; customDescription?: never}
  | {catalogDocumentTypeId?: never; customName: string; customDescription?: string}
);

export type RequirementTemplate = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  icon: RequirementTemplateView['icon'];
  categoryId: VendorCategory;
  documents: RequirementTemplateDocument[];
};

export type TemplateDraft = {
  id: string;
  name: string;
  description: string;
  categoryId: VendorCategory | '';
  documents: RequirementTemplateDocument[];
  isNew: true;
  isDirty: boolean;
};

export type TemplateEditDraft = {
  templateId: string;
  language: 'ro' | 'en';
  name: string;
  description: string;
  categoryId: VendorCategory | '';
  documents: RequirementTemplateDocument[];
  isDirty: boolean;
};

export type CatalogCandidate = {
  normalizedName: string;
  displayName: string;
  description?: string;
  usageCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: 'pending' | 'promoted' | 'merged' | 'rejected';
};
