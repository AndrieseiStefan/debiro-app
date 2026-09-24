import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {VendorsListPage} from '@/features/vendors/VendorsListPage';
import {vendorsListFixture} from '@/features/vendors/fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

function renderVendors(locale: 'ro' | 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>
      <VendorsListPage locale={locale} view={vendorsListFixture} />
    </NextIntlClientProvider>
  );
}

describe('vendors list', () => {
  it('renders the canonical Romanian list with typed fixture values and active navigation', () => {
    renderVendors('ro');
    expect(screen.getByRole('heading', {level: 1, name: 'Furnizori'})).toBeVisible();
    const pageHeader = screen.getByRole('region', {name: 'Furnizori'});
    const breadcrumbs = within(pageHeader).getByRole('navigation', {name: 'Navigare pe pagină'});
    expect(within(breadcrumbs).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('href', '/dashboard');
    expect(within(breadcrumbs).getByText('Furnizori')).toHaveAttribute('aria-current', 'page');
    expect(within(pageHeader).getByText('Gestionează toți furnizorii, monitorizează conformitatea și menține parteneriate sigure.')).toBeVisible();
    expect(within(pageHeader).getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('data-page-primary-action');
    const navigation = screen.getByRole('navigation', {name: 'Navigare în aplicație'});
    expect(within(navigation).getByRole('link', {name: 'Furnizori'})).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', {name: 'Dashboard'})).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('aria-disabled', 'true');
    const summary = screen.getByRole('region', {name: 'Rezumat furnizori'});
    for (const count of ['24', '16', '5', '3']) expect(within(summary).getByText(count)).toBeVisible();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    for (const heading of ['FURNIZOR', 'CATEGORIE', 'STATUS GENERAL', 'DOCUMENTE', 'URMĂTOAREA EXPIRARE', 'ACȚIUNI']) {
      expect(within(table).getByRole('columnheader', {name: heading})).toBeVisible();
    }
    expect(within(table).getByText('Construct Pro SRL')).toBeVisible();
    expect(within(table).getByText('Medical Supplies')).toBeVisible();
    expect(within(table).getAllByText('În regulă')).toHaveLength(4);
    expect(within(table).getAllByText('Necesită atenție')).toHaveLength(2);
    expect(within(table).getAllByText('Neconform')).toHaveLength(2);
    expect(screen.getByText('Afișez 1 – 8 din 24 furnizori')).toBeVisible();
  });

  it('renders English labels and locally filters and paginates fixture rows', () => {
    renderVendors('en');
    expect(screen.getByRole('heading', {level: 1, name: 'Suppliers'})).toBeVisible();
    expect(screen.getByRole('columnheader', {name: 'NEXT EXPIRY'})).toBeVisible();
    expect(screen.getByText('Showing 1–8 of 24 suppliers')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: '2'}));
    expect(screen.getByText('Alpha Construction SRL')).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', {name: 'Search suppliers by name, registration number or contact person'}), {target: {value: 'Tech Solutions'}});
    expect(screen.getByText('Tech Solutions SRL')).toBeVisible();
    expect(screen.getByText('Showing 1–1 of 1 suppliers')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', {name: 'Status'}), {target: {value: 'attention'}});
    expect(screen.getByText('No suppliers match the filters.')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', {name: 'Status'}), {target: {value: 'all'}});
    fireEvent.change(screen.getByRole('searchbox', {name: 'Search suppliers by name, registration number or contact person'}), {target: {value: 'Radu Popa'}});
    expect(screen.getByText('Tech Solutions SRL')).toBeVisible();
  });
});
