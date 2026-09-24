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
    const navigation = screen.getByRole('navigation', {name: 'Navigare în aplicație'});
    expect(within(navigation).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('button', {name: 'Furnizori'})).toHaveAttribute('aria-disabled', 'true');
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
    expect(screen.getByRole('link', {name: 'RO'})).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Tax certificate', {selector: 'td'})).toBeVisible();
  });
});
