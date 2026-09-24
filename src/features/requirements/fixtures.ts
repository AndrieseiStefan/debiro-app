import type {RequirementRuleView, RequirementsViewModel} from './types';

const constructionRules: RequirementRuleView[] = [
  {id: 'registration', name: {ro: 'Certificat de înregistrare', en: 'Registration certificate'}, detail: {ro: 'Certificat ONRC', en: 'Trade Register certificate'}, tone: 'blue', mandatory: true, alertDays: 30, validityMonths: 12},
  {id: 'liability', name: {ro: 'Asigurare Răspundere Civilă', en: 'Liability insurance'}, detail: {ro: 'Poliță RCA profesională', en: 'Professional liability policy'}, tone: 'green', mandatory: true, alertDays: 30, validityMonths: 12},
  {id: 'iso', name: {ro: 'Certificare ISO 9001', en: 'ISO 9001 certification'}, detail: {ro: 'Sistem de management al calității', en: 'Quality management system'}, tone: 'amber', mandatory: false, alertDays: 60, validityMonths: 36},
  {id: 'permit', name: {ro: 'Autorizație de lucru', en: 'Work permit'}, detail: {ro: 'Autorizație ISC / avize specifice', en: 'ISC permit / specific approvals'}, tone: 'red', mandatory: true, alertDays: 30, validityMonths: 12},
  {id: 'safety', name: {ro: 'Declarație SSM', en: 'Occupational safety declaration'}, detail: {ro: 'Declarație privind securitatea muncii', en: 'Workplace safety declaration'}, tone: 'purple', mandatory: true, alertDays: 30, validityMonths: 12}
];

const commonRules = constructionRules.slice(0, 4);

export const requirementsFixture: RequirementsViewModel = {
  user: {fullName: 'Andrei Popescu', initials: 'AP'},
  organization: {name: 'Demo Company SRL'},
  notificationCount: 3,
  templates: [
    {id: 'construction', title: {ro: 'Subcontractor construcții', en: 'Construction subcontractor'}, subtitle: {ro: 'Lucrări de construcții și instalații în șantiere', en: 'Construction and installation work on site'}, icon: 'construction', rules: constructionRules},
    {id: 'materials', title: {ro: 'Furnizor materiale', en: 'Materials supplier'}, subtitle: {ro: 'Materiale de construcții, echipamente', en: 'Construction materials and equipment'}, icon: 'materials', rules: commonRules},
    {id: 'maintenance', title: {ro: 'Servicii de mentenanță', en: 'Maintenance services'}, subtitle: {ro: 'Întreținere și service echipamente', en: 'Equipment upkeep and servicing'}, icon: 'maintenance', rules: constructionRules},
    {id: 'software', title: {ro: 'Servicii IT', en: 'IT services'}, subtitle: {ro: 'Servicii software și hardware', en: 'Software and hardware services'}, icon: 'software', rules: commonRules},
    {id: 'consulting', title: {ro: 'Consultanță și proiectare', en: 'Consulting and design'}, subtitle: {ro: 'Proiectare, consultanță tehnică', en: 'Design and technical consulting'}, icon: 'consulting', rules: commonRules},
    {id: 'logistics', title: {ro: 'Transport și logistică', en: 'Transport and logistics'}, subtitle: {ro: 'Transport marfă și servicii logistice', en: 'Freight transport and logistics services'}, icon: 'logistics', rules: commonRules}
  ]
};
