import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {RequirementsPage} from '@/features/requirements/RequirementsPage';
import {requirementsFixture} from '@/features/requirements/fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

function renderRequirements(locale: 'ro' | 'en') {
  return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><RequirementsPage locale={locale} view={requirementsFixture} /></NextIntlClientProvider>);
}

describe('document requirements', () => {
  it('renders canonical Romanian template rules and the active Requirements navigation', () => {
    renderRequirements('ro');
    expect(screen.getByRole('heading', {level: 1, name: 'Cerințe documente'})).toBeVisible();
    expect(within(screen.getByRole('navigation', {name: 'Navigare în aplicație'})).getByRole('link', {name: 'Cerințe'})).toHaveAttribute('aria-current', 'page');
    expect(document.querySelector('[data-page-header-support]')).toHaveTextContent('Un singur set de reguli.');
    expect(screen.getByRole('heading', {name: 'Șabloane de cerințe'})).toBeVisible();
    expect(screen.getByRole('tab', {name: 'Documente necesare (5)'})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', {name: 'Setări și aplicabilitate'})).toHaveAttribute('aria-disabled', 'true');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    for (const name of ['Certificat de înregistrare', 'Asigurare Răspundere Civilă', 'Certificare ISO 9001', 'Autorizație de lucru', 'Declarație SSM']) expect(within(table).getByText(name)).toBeVisible();
    expect(within(table).getAllByText('Obligatoriu')).toHaveLength(4);
    expect(within(table).getByText('Opțional')).toBeVisible();
    expect(screen.getByRole('button', {name: 'Șablon nou'})).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', {name: 'Salvează șablon'})).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders English and filters/selects templates locally without persistence', () => {
    renderRequirements('en');
    expect(screen.getByRole('heading', {level: 1, name: 'Document requirements'})).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', {name: 'Search templates'}), {target: {value: 'materials'}});
    expect(screen.getByRole('button', {name: /Materials supplier/})).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: /Materials supplier/}));
    expect(screen.getByRole('heading', {name: 'Materials supplier'})).toBeVisible();
    expect(screen.getByRole('tab', {name: 'Required documents (4)'})).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', {name: 'Search templates'}), {target: {value: 'not-a-category'}});
    expect(screen.getByText('No templates match your search.')).toBeVisible();
  });
});
