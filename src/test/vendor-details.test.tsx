import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {VendorDetailsPage} from '@/features/vendors/VendorDetailsPage';
import {getVendorDetailsFixture} from '@/features/vendors/detail-fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

function renderDetails(locale: 'ro' | 'en') {
  const view = getVendorDetailsFixture('construct-pro');
  if (!view) throw new Error('Missing canonical fixture');
  return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><VendorDetailsPage locale={locale} view={view}/></NextIntlClientProvider>);
}

describe('vendor details', () => {
  it('renders the Romanian mockup sections with the shared shell and active Vendors navigation', () => {
    renderDetails('ro');
    expect(screen.getByRole('heading', {level: 1, name: 'Construct Pro SRL'})).toBeVisible();
    const breadcrumb = screen.getByRole('navigation', {name: 'Navigare pe pagină'});
    expect(within(breadcrumb).getByRole('link', {name: 'Furnizori'})).toHaveAttribute('href', '/vendors');
    expect(within(breadcrumb).getByText('Construct Pro SRL')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', {name: 'Navigare în aplicație'}).querySelector('[aria-current="page"]')).toHaveTextContent('Furnizori');
    expect(screen.getByText('4 din 5 documente valide')).toBeVisible();
    expect(screen.getByRole('button', {name: 'Invită furnizor'})).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', {name: 'Adaugă document'})).toHaveAttribute('data-page-primary-action');
    expect(screen.getByText('ion.popescu@scconstruct.ro')).toBeVisible();
    expect(screen.getByRole('tab', {name: 'Documente'})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', {name: 'Contacte'})).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('table').getElementsByTagName('tbody')[0].rows).toHaveLength(5);
    for (const status of ['Valid', 'Expiră curând', 'Expirat', 'Lipsește']) expect(screen.getAllByText(status).length).toBeGreaterThan(0);
    expect(screen.getByText('Parteneriate solide construiesc afaceri durabile.')).toBeVisible();
  });

  it('renders English and filters visible documents locally', () => {
    renderDetails('en');
    expect(screen.getByText('4 of 5 valid documents')).toBeVisible();
    expect(screen.getByRole('button', {name: 'Add document'})).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', {name: 'Search documents'}), {target: {value: 'ISO'}});
    expect(screen.getByRole('table').getElementsByTagName('tbody')[0].rows).toHaveLength(1);
    expect(screen.getByText('Certificat ISO 9001')).toBeVisible();
  });

  it('returns no fixture for unknown IDs', () => {
    expect(getVendorDetailsFixture('unknown')).toBeUndefined();
    expect(getVendorDetailsFixture('__proto__')).toBeUndefined();
  });
});
