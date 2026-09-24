import {render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {DashboardPage} from '@/features/dashboard/DashboardPage';
import {dashboardFixture} from '@/features/dashboard/fixtures';

vi.mock('@/i18n/navigation', () => ({
  Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) =>
    <a href={locale === 'en' ? `/en${href}` : href} {...props} />
}));

function renderDashboard(locale: 'ro' | 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}>
      <DashboardPage locale={locale} view={dashboardFixture} />
    </NextIntlClientProvider>
  );
}

describe('dashboard overview', () => {
  it('renders the Romanian fixture in the authenticated shell', () => {
    renderDashboard('ro');

    expect(screen.getByText('DEBIRO')).toBeVisible();
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Bun venit, Andrei!');
    const pageHeader = screen.getByRole('region', {name: 'Bun venit, Andrei!'});
    expect(within(pageHeader).getByText('BINE AI REVENIT ÎN DEBIRO')).toBeVisible();
    expect(within(pageHeader).getByText('Ai 24 de furnizori înregistrați. Iată o privire de ansamblu asupra stării lor de conformitate.')).toBeVisible();
    expect(within(pageHeader).getByText(/Parteneri conformi\./)).toBeVisible();
    expect(within(pageHeader).getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('data-page-primary-action');
    const navigation = screen.getByRole('navigation', {name: 'Navigare în aplicație'});
    expect(within(navigation).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', {name: 'Furnizori'})).toHaveAttribute('href', '/vendors');
    expect(screen.getByRole('searchbox', {name: 'Caută furnizori, documente sau cerințe'})).toBeVisible();
    expect(screen.getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('aria-disabled', 'true');

    const summary = screen.getByRole('region', {name: 'Status furnizori'});
    expect(within(summary).getByText('24')).toBeVisible();
    expect(within(summary).getByText('16')).toBeVisible();
    expect(within(summary).getByText('5')).toBeVisible();
    expect(within(summary).getByText('3')).toBeVisible();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(within(table).getByText('Construct Pro SRL')).toBeVisible();
    expect(within(table).getByText('Asigurare Răspundere Civilă')).toBeVisible();
    expect(within(table).getAllByText('Expiră curând')).toHaveLength(2);
    expect(screen.getByRole('heading', {name: 'Status furnizori'})).toBeVisible();
    expect(screen.getByRole('img', {name: 'Status furnizori: 24 furnizori'})).toBeVisible();
    expect(screen.getByText('Lipsesc documente')).toBeVisible();
    expect(screen.queryByText('Lipsește documente')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Activitate recentă'})).toBeVisible();
    expect(screen.getByText('Furnizor nou adăugat')).toBeVisible();
  });

  it('renders equivalent English text and locale links', () => {
    renderDashboard('en');

    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Welcome, Andrei!');
    expect(screen.getByRole('heading', {name: 'Documents needing attention'})).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Supplier status'})).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Recent activity'})).toBeVisible();
    expect(screen.getByRole('button', {name: 'Add supplier'})).toBeVisible();
    for (const localeLink of screen.getAllByRole('link', {name: 'RO'})) {
      expect(localeLink).toHaveAttribute('href', '/dashboard');
    }
    expect(screen.getAllByRole('button', {name: 'User profile: Andrei Popescu'})).toHaveLength(2);
    expect(screen.getByRole('button', {name: 'Demo Company SRL'})).toBeVisible();
    expect(screen.getByText('Tax certificate', {selector: 'td'})).toBeVisible();
  });
});
