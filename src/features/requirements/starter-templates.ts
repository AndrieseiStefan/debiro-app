import {requirementsFixture} from './fixtures';
import type {VendorCategory} from '@/features/vendors/types';
import type {LocalizedText} from './types';
import {starterAppearance, type Appearance} from './appearance';

/** Global read-only starter sources; never company-owned editable records. */
export type StarterRequirementTemplate = Readonly<Appearance & {
  id: string; version: number; title: LocalizedText; subtitle: LocalizedText; categoryId?: VendorCategory;
}>;
export const starterRequirementTemplates: readonly StarterRequirementTemplate[] = Object.freeze([
  ...requirementsFixture.templates.map((template) => Object.freeze({id: `starter-${template.id}`, version: 1,
    title: Object.freeze({...template.title}), subtitle: Object.freeze({...template.subtitle}), categoryId: template.categoryId, ...starterAppearance(template.icon)})),
  Object.freeze({id: 'starter-general', version: 1, title: Object.freeze({ro: 'Șablon general', en: 'General template'}),
    subtitle: Object.freeze({ro: 'Un set standard de documente pentru majoritatea industriilor.', en: 'A standard set of documents for most industries.'}), iconKey: 'file', iconColorKey: 'blue'})
]);
