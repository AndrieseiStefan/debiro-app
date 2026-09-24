import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
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
    expect(screen.getByRole('button', {name: 'Invită furnizor'})).toBeEnabled();
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

  it('opens the local invitation drawer from the current vendor and validates without sending', async () => {
    renderDetails('ro');
    fireEvent.click(screen.getByRole('button', {name: 'Invită furnizor'}));
    const dialog = screen.getByRole('dialog', {name: 'Invită furnizorul să încarce documentele'});
    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole('textbox', {name: /Numele furnizorului/})).toHaveValue('Construct Pro SRL');
    expect(within(dialog).getByRole('textbox', {name: /Email de contact/})).toHaveValue('ion.popescu@scconstruct.ro');
    expect(within(dialog).getByRole('textbox', {name: /Link de încărcare securizat/})).toHaveValue('https://debiro.ro/u/demo-construct-pro');
    expect(within(dialog).getByText('140/500')).toBeVisible();
    expect(within(dialog).getByText('Linkul va expira la 14 mar. 2025.')).toBeVisible();
    fireEvent.change(within(dialog).getByRole('textbox', {name: /Numele furnizorului/}), {target: {value: ''}});
    fireEvent.change(within(dialog).getByRole('textbox', {name: /Email de contact/}), {target: {value: 'invalid'}});
    fireEvent.click(within(dialog).getByRole('button', {name: 'Trimite invitația'}));
    expect(within(dialog).getByText('Introdu numele furnizorului.')).toBeVisible();
    expect(within(dialog).getByText('Introdu o adresă de email validă.')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', {name: 'Anulează'}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', {name: 'Invită furnizor'})).toHaveFocus();
  });
});
