import {render, screen} from '@testing-library/react';
import {createTranslator, NextIntlClientProvider, useTranslations} from 'next-intl';
import {describe, expect, it} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';

function Message() {
  const t = useTranslations('Foundation');
  return <span>{t('previewTitle')}</span>;
}

function keys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? keys(child as Record<string, unknown>, path) : [path];
  });
}

describe('foundation localization', () => {
  it('renders Romanian and English through next-intl', () => {
    const {rerender} = render(
      <NextIntlClientProvider locale="ro" messages={ro}><Message /></NextIntlClientProvider>
    );
    expect(screen.getByText(ro.Foundation.previewTitle)).toBeVisible();
    rerender(<NextIntlClientProvider locale="en" messages={en}><Message /></NextIntlClientProvider>);
    expect(screen.getByText(en.Foundation.previewTitle)).toBeVisible();
  });

  it('keeps the committed foundation catalog keys aligned', () => {
    expect(keys(ro).sort()).toEqual(keys(en).sort());
  });

  it('names the template-management destination consistently without renaming vendor obligations', () => {
    for (const [locale, messages, section, title, description, action, placeholder] of [
      ['ro', ro, 'Șabloane', 'Șabloane de cerințe', 'Creează și gestionează seturi de documente necesare pentru fiecare categorie de furnizori.', 'Șablon nou', 'Caută furnizori, documente sau șabloane...'],
      ['en', en, 'Templates', 'Requirement Templates', 'Create and manage sets of required documents for each vendor category.', 'New Template', 'Search vendors, documents or templates...']
    ] as const) {
      expect(messages.AppShell.navigation.requirements).toBe(section);
      expect(messages.Landing.dashboard.nav.requirements).toBe(section);
      expect(messages.Requirements.title).toBe(title);
      expect(messages.Requirements.templatesTitle).toBe(title);
      expect(messages.Requirements.description).toBe(description);
      expect(messages.Requirements.newTemplate).toBe(action);
      expect(messages.AppShell.searchPlaceholder).toBe(placeholder);
      expect(messages.AppShell.searchLabel).toBe(placeholder.slice(0, -3));
      expect(messages.Landing.dashboard.search).toBe(placeholder);
      expect(messages.GlobalSearch.groups.requirements).toBe(section);
      const t = createTranslator({locale, messages});
      for (const count of [1, 2, 21]) expect(t('GlobalSearch.counts.requirements', {count})).toBe(locale === 'ro' ? count === 1 ? '1 șablon' : count === 2 ? '2 șabloane' : '21 de șabloane' : `${count} template${count === 1 ? '' : 's'}`);
      expect(messages.GlobalSearch.emptyDescription).toBe(locale === 'ro' ? 'Nu există furnizori, documente sau șabloane care să corespundă căutării.' : 'No vendors, documents or templates match your search.');
      expect(messages.VendorTemplates.openRequirements).toBe(locale === 'ro' ? 'Vezi șabloanele' : 'View templates');
      expect(messages.VendorDetails.viewRequirements).toBe(locale === 'ro' ? 'Vezi cerințele aplicabile' : 'View applicable requirements');
      expect(messages.VendorTemplates.removeEmptyTitle).toBe(locale === 'ro' ? 'Elimini această cerință?' : 'Remove this requirement?');
      expect(messages.Requirements.requiredDocuments).toBe(locale === 'ro' ? 'Documente necesare ({count})' : 'Required documents ({count})');
    }
  });
});
