import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {VendorsListPage} from '@/features/vendors/VendorsListPage';
import {vendorsListFixture} from '@/features/vendors/fixtures';

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/vendors',
  useRouter: () => ({push: vi.fn()}),
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
    expect(screen.getByRole('button', {name: 'Adaugă furnizor'})).toBeEnabled();
    const summary = screen.getByRole('region', {name: 'Rezumat furnizori'});
    expect(within(summary).getAllByText('24')).toHaveLength(2);
    expect(within(summary).getAllByText('0')).toHaveLength(2);

    const table = screen.getByRole('table');
    expect(within(table).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(table).getByRole('link', {name: 'Detalii pentru Global Clean Services'})).toHaveAttribute('href', '/vendors/global-clean');
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    for (const heading of ['FURNIZOR', 'CATEGORIE', 'STATUS GENERAL', 'DOCUMENTE', 'URMĂTOAREA EXPIRARE', 'ACȚIUNI']) {
      expect(within(table).getByRole('columnheader', {name: heading})).toBeVisible();
    }
    expect(within(table).getByText('Construct Pro SRL')).toBeVisible();
    expect(within(table).getByText('Medical Supplies')).toBeVisible();
    expect(within(table).queryByText('În regulă')).not.toBeInTheDocument();
    expect(within(table).getAllByText('Necesită atenție')).toHaveLength(8);
    expect(within(table).queryByText('Neconform')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', {name: 'Filter'}));
    fireEvent.change(screen.getByRole('combobox', {name: 'Compliance status'}), {target: {value: 'compliant'}});
    expect(screen.getByText('No suppliers match the filters.')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', {name: 'Compliance status'}), {target: {value: 'all'}});
    fireEvent.change(screen.getByRole('searchbox', {name: 'Search suppliers by name, registration number or contact person'}), {target: {value: 'Radu Popa'}});
    expect(screen.getByText('Tech Solutions SRL')).toBeVisible();
  });

  it('offers exactly the approved contextual actions and reactivates without changing compliance', () => {
    renderVendors('ro');
    const trigger = screen.getByRole('button', {name: 'Acțiuni pentru Construct Pro SRL'});
    fireEvent.click(trigger);
    let menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
    expect(within(menu).getByRole('menuitem', {name: 'Deschide furnizorul'})).toHaveAttribute('href', '/vendors/construct-pro');
    fireEvent.click(within(menu).getByRole('menuitem', {name: 'Marchează ca inactiv'}));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    const row = trigger.closest('tr')!;
    expect(row).toHaveAttribute('data-lifecycle', 'inactive');
    expect(within(row).getByText('Inactiv')).toBeVisible();
    expect(within(row).getByText('Necesită atenție')).toBeVisible();
    const summary = screen.getByRole('region', {name: 'Rezumat furnizori'});
    expect(within(summary).getByText('24')).toBeVisible();
    expect(within(summary).getByText('23')).toBeVisible();
    fireEvent.click(trigger);
    menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);
    fireEvent.click(within(menu).getByRole('menuitem', {name: 'Marchează ca activ'}));
    expect(row).toHaveAttribute('data-lifecycle', 'active');
    expect(within(row).queryByText('Inactiv')).not.toBeInTheDocument();
    expect(within(summary).getAllByText('24')).toHaveLength(2);
  });

  it('uses accessible headers, resets pagination and sorts before slicing filtered results', () => {
    renderVendors('ro');
    const table = screen.getByRole('table');
    const firstName = () => within(table).getAllByRole('link')[0].textContent;
    const nameHeader = within(table).getByRole('columnheader', {name: 'FURNIZOR'});
    expect(within(table).getAllByRole('button', {name: /^(FURNIZOR|CATEGORIE|STATUS GENERAL|DOCUMENTE|URMĂTOAREA EXPIRARE)$/})).toHaveLength(5);
    expect(within(within(table).getByRole('columnheader', {name: 'ACȚIUNI'})).queryByRole('button')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: '3'}));
    fireEvent.click(within(nameHeader).getByRole('button'));
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('button', {name: '1'})).toHaveAttribute('aria-current', 'page');
    expect(firstName()).toBe('Alpha Construction SRL');
    fireEvent.click(within(nameHeader).getByRole('button'));
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    expect(firstName()).toBe('Urban Logistics SRL');
    fireEvent.click(screen.getByRole('button', {name: 'Filtrează'}));
    fireEvent.change(screen.getByRole('combobox', {name: 'Categorie'}), {target: {value: 'construction'}});
    expect(within(table).getAllByRole('link').map((link) => link.textContent)).toEqual(['Delta Construct SRL', 'Construct Pro SRL', 'Alpha Construction SRL']);
    fireEvent.change(screen.getByRole('searchbox', {name: 'Caută furnizori după nume, CUI sau persoană de contact'}), {target: {value: 'Construct Pro'}});
    expect(firstName()).toBe('Construct Pro SRL');
    fireEvent.change(screen.getByRole('combobox', {name: 'Status conformitate'}), {target: {value: 'compliant'}});
    expect(within(table).getByText('Niciun furnizor nu corespunde filtrelor.')).toBeVisible();
    const documentsHeader = within(table).getByRole('columnheader', {name: 'DOCUMENTE'});
    fireEvent.click(within(documentsHeader).getByRole('button'));
    expect(documentsHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(nameHeader).not.toHaveAttribute('aria-sort');
    expect(table.querySelectorAll('[aria-sort]')).toHaveLength(1);
  });
});
