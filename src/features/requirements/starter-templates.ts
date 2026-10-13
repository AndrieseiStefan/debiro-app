import type {VendorCategory} from '@/features/vendors/types';
import type {ExpiryWarningDays, LocalizedText, ValidityMonths} from './types';
import type {Appearance} from './appearance';
import {normalizeDocumentName} from './catalog';

export type StarterRequirementDocument = Readonly<{
  catalogDocumentTypeId: string; required: boolean; expiryWarningDays: ExpiryWarningDays; validityMonths: ValidityMonths;
}>;
/** Platform-owned snapshots, independent of Demo/company fixtures and custom types. */
export type StarterRequirementTemplate = Readonly<Appearance & {
  id: string; version: number; active: boolean; title: Readonly<LocalizedText>; subtitle: Readonly<LocalizedText>;
  categoryId: VendorCategory; documents: readonly StarterRequirementDocument[];
}>;

function rules(...ids: string[]): readonly StarterRequirementDocument[] {
  return Object.freeze(ids.map((catalogDocumentTypeId) => Object.freeze({catalogDocumentTypeId, required: catalogDocumentTypeId !== 'iso',
    expiryWarningDays: catalogDocumentTypeId === 'iso' ? 60 : 30, validityMonths: catalogDocumentTypeId === 'iso' ? 36 : 12} as StarterRequirementDocument)));
}
function starter(source: StarterRequirementTemplate): StarterRequirementTemplate {
  return Object.freeze({...source, title: Object.freeze({...source.title}), subtitle: Object.freeze({...source.subtitle})});
}

export const starterRequirementTemplates: readonly StarterRequirementTemplate[] = Object.freeze([
  starter({id: 'starter-construction', version: 1, active: true, categoryId: 'construction', iconKey: 'construction', iconColorKey: 'blue',
    title: {ro: 'Subcontractor construcții', en: 'Construction subcontractor'}, subtitle: {ro: 'Lucrări de construcții și instalații în șantiere', en: 'Construction and installation work on site'}, documents: rules('registration', 'liability', 'iso', 'permit', 'safety')}),
  starter({id: 'starter-materials', version: 2, active: true, categoryId: 'materials', iconKey: 'box', iconColorKey: 'blue',
    title: {ro: 'Furnizor materiale', en: 'Materials supplier'}, subtitle: {ro: 'Materiale de construcții, echipamente', en: 'Construction materials and equipment'}, documents: rules('registration', 'tax', 'liability', 'iso')}),
  starter({id: 'starter-maintenance', version: 1, active: true, categoryId: 'construction', iconKey: 'tools', iconColorKey: 'green',
    title: {ro: 'Servicii de mentenanță', en: 'Maintenance services'}, subtitle: {ro: 'Întreținere și service echipamente', en: 'Equipment upkeep and servicing'}, documents: rules('registration', 'liability', 'iso', 'permit', 'safety')}),
  starter({id: 'starter-software', version: 2, active: true, categoryId: 'software', iconKey: 'computer', iconColorKey: 'blue',
    title: {ro: 'Servicii IT', en: 'IT services'}, subtitle: {ro: 'Servicii software și hardware', en: 'Software and hardware services'}, documents: rules('registration', 'tax', 'liability', 'iso')}),
  starter({id: 'starter-consulting', version: 2, active: true, categoryId: 'construction', iconKey: 'users', iconColorKey: 'blue',
    title: {ro: 'Consultanță și proiectare', en: 'Consulting and design'}, subtitle: {ro: 'Proiectare, consultanță tehnică', en: 'Design and technical consulting'}, documents: rules('registration', 'tax', 'liability', 'iso')}),
  starter({id: 'starter-logistics', version: 2, active: true, categoryId: 'logistics', iconKey: 'truck', iconColorKey: 'blue',
    title: {ro: 'Transport și logistică', en: 'Transport and logistics'}, subtitle: {ro: 'Transport marfă și servicii logistice', en: 'Freight transport and logistics services'}, documents: rules('registration', 'tax', 'liability', 'iso')})
]);

/** An incomplete onboarding source, not a finalized/category-eligible starter. */
export const generalRequirementsDraftSource = Object.freeze({
  title: Object.freeze({ro: 'Șablon general', en: 'General template'}),
  subtitle: Object.freeze({ro: 'Un set standard de documente pentru majoritatea industriilor.', en: 'A standard set of documents for most industries.'}),
  iconKey: 'file' as const, iconColorKey: 'blue' as const
});

export function searchStarterTemplates(query: string, language: 'ro' | 'en', categoryLabel: (category: VendorCategory) => string) {
  const normalized = normalizeDocumentName(query);
  return starterRequirementTemplates.filter((source) => source.active && [source.title[language], source.subtitle[language], categoryLabel(source.categoryId)]
    .some((value) => normalizeDocumentName(value).includes(normalized)));
}
