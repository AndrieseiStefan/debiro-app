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
  rules: RequirementRuleView[];
};

export type RequirementsViewModel = {
  user: {fullName: string; initials: string};
  organization: {name: string};
  notificationCount: number;
  templates: RequirementTemplateView[];
};
