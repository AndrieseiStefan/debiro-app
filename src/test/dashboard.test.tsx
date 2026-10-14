import {render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {DashboardPage, DocumentsAttentionPanel} from '@/features/dashboard/DashboardPage';
import {dashboardFixture} from '@/features/dashboard/fixtures';
import {projectDashboard} from '@/features/dashboard/projections';
import {readDocumentRecords} from '@/features/documents/created-documents';

vi.mock('@/i18n/navigation', () => ({useRouter: () => ({push: vi.fn()}),
  usePathname: () => '/dashboard',
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
    expect(within(pageHeader).queryByRole('button', {name: 'Adaugă furnizor'})).not.toBeInTheDocument();
    const navigation = screen.getByRole('navigation', {name: 'Navigare în aplicație'});
    expect(within(navigation).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', {name: 'Furnizori'})).toHaveAttribute('href', '/vendors');
    expect(screen.getByRole('searchbox', {name: 'Caută furnizori, documente sau cerințe'})).toBeVisible();
    expect(screen.queryByRole('button', {name: 'Adaugă furnizor'})).not.toBeInTheDocument();

    const summary = screen.getByRole('region', {name: 'Status furnizori'});
    for (const count of ['24', '23', '1']) expect(within(summary).getByText(count)).toBeVisible();
    expect(within(summary).getByText('0')).toBeVisible();

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(within(table).getAllByText('Construct Pro SRL').length).toBeGreaterThan(0);
    expect(within(table).queryByText('Certificare ISO 9001')).not.toBeInTheDocument();
    expect(within(table).getAllByText('Necesită revizuire')).toHaveLength(4);
    expect(within(table).getAllByText('Expiră curând')).toHaveLength(1);
    expect(screen.getByRole('heading', {name: 'Status furnizori'})).toBeVisible();
    expect(screen.getByRole('img', {name: 'Status furnizori: 24 furnizori'})).toBeVisible();
    expect(screen.getByText('Lipsesc documente')).toBeVisible();
    expect(screen.queryByText('Lipsește documente')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Activitate recentă'})).toBeVisible();
    expect(screen.getAllByText('Document încărcat').length).toBeGreaterThan(0);
  });

  it('renders equivalent English text and locale links', () => {
    renderDashboard('en');

    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Welcome, Andrei!');
    expect(screen.getByRole('heading', {name: 'Documents needing attention'})).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Supplier status'})).toBeVisible();
    expect(screen.getByRole('heading', {name: 'Recent activity'})).toBeVisible();
    expect(screen.queryByRole('button', {name: 'Add supplier'})).not.toBeInTheDocument();
    for (const localeLink of screen.getAllByRole('link', {name: 'RO'})) {
      expect(localeLink).toHaveAttribute('href', '/dashboard');
    }
    expect(screen.getAllByRole('button', {name: 'User profile: Andrei Popescu'})).toHaveLength(2);
    expect(screen.getByRole('button', {name: 'Demo Company SRL'})).toBeVisible();
    expect(screen.getAllByText('Tax certificate', {selector: 'td'}).length).toBeGreaterThan(0);
  });
});

describe.each(['ro', 'en'] as const)('%s Dashboard attention preview', (locale) => {
  it.each([0, 4, 7, 8, 12])('renders at most seven of %i documents while retaining the full total', (count) => {
    const messages = locale === 'ro' ? ro : en;
    const base = readDocumentRecords().find((document) => document.complianceStatus === 'needs_review')!;
    const records = Array.from({length: count}, (_, index) => ({...base, id: `preview-${index}`}));
    const view = projectDashboard(dashboardFixture, 'demo-company', [], {}, records, []);
    render(<NextIntlClientProvider locale={locale} messages={messages}><DocumentsAttentionPanel view={view} locale={locale}/></NextIntlClientProvider>);

    expect(view.documentsRequiringAttention).toHaveLength(count);
    expect(screen.getByRole('link', {name: messages.Dashboard.viewAll})).toBeVisible();
    if (count === 0) {
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText(messages.CompanyWorkspace.noAttention)).toBeVisible();
    } else {
      const table = screen.getByRole('table');
      expect(within(table).getAllByRole('row')).toHaveLength(Math.min(count, 7) + 1);
      expect(Array.from(table.querySelectorAll('[data-attention-document-id]'), (row) => row.getAttribute('data-attention-document-id')))
        .toEqual(view.documentsRequiringAttention.slice(0, 7).map((document) => document.id));
      const notice = messages.Dashboard.urgentDocuments.replace('{count}', String(count));
      const suffix = messages.Dashboard.attentionPreviewNote.replace('{count}', '7');
      expect(screen.getByText(notice + (count > 7 ? ` ${suffix}` : ''))).toBeVisible();
    }
    if (count <= 7) expect(screen.queryByText(/Se afișează primele|Showing the first/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /Next|Următoarea/})).not.toBeInTheDocument();
  });
});
