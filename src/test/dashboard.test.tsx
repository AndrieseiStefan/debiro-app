import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import en from '../../messages/en.json';
import ro from '../../messages/ro.json';
import {DashboardPage} from '@/features/dashboard/DashboardPage';
import {dashboardFixture} from '@/features/dashboard/fixtures';

vi.mock('@/i18n/navigation', () => ({useRouter: () => ({push: vi.fn(), replace: vi.fn()}), usePathname: () => '/dashboard', Link: ({locale, href, ...props}: {locale?: string; href: string; children: React.ReactNode}) => <a href={locale === 'en' ? `/en${href}` : href} {...props}/> }));

describe.each(['ro', 'en'] as const)('%s company-wide Dashboard', (locale) => {
  it('composes three linked domain KPIs and five accessible previews using the existing shell', () => {
    const copy = locale === 'ro' ? ro : en;
    render(<NextIntlClientProvider locale={locale} messages={copy}><DashboardPage locale={locale} view={dashboardFixture}/></NextIntlClientProvider>);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(copy.Dashboard.overview.title);
    expect(screen.getByText(copy.Dashboard.overview.description)).toBeVisible();
    expect(screen.queryByRole('navigation', {name: copy.CompanyDocuments.breadcrumbLabel})).toBeNull();
    const summary = screen.getByRole('region', {name: copy.Dashboard.overview.summary});
    expect(within(summary).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/vendors', '/company/documents', '/company/employees']);
    expect(summary.querySelectorAll('strong')).toHaveLength(3);
    const panels = document.querySelectorAll('[data-dashboard-panel]'); expect(panels).toHaveLength(5);
    for (const attribute of ['vendor', 'company-document', 'employee', 'event', 'expiration']) expect(document.querySelectorAll(`[data-dashboard-${attribute}]`).length).toBeLessThanOrEqual(5);
    expect(screen.getByRole('img', {name: `${copy.Dashboard.supplierStatusTitle}: 24 ${copy.Dashboard.suppliersLower}`})).toBeVisible();
    const employeePanel = document.querySelector('[data-dashboard-panel="employees"]') as HTMLElement;
    expect(within(employeePanel).getByRole('img')).toHaveAccessibleName(`${copy.EmployeeDocuments.trackingLabel}: 7 ${copy.Dashboard.overview.activeEmployees}`);
    expect(within(employeePanel).getByText(copy.EmployeeDocuments.tracking.not_configured)).toBeVisible();
    expect(within(employeePanel).getByText(copy.Dashboard.overview.noEmployeeAttention)).toBeVisible();
    expect(employeePanel.querySelectorAll('[data-dashboard-employee]')).toHaveLength(0);
    expect(employeePanel.querySelectorAll('[data-chart-segment] strong')).toHaveLength(3);
    const employeeKpi = within(summary).getAllByRole('link')[2];
    expect(within(employeeKpi).getByRole('heading')).toHaveTextContent(copy.Dashboard.overview.totalEmployees);
    expect(employeeKpi.querySelector('strong')).toHaveTextContent('8');
    expect(within(employeeKpi).getByText(locale === 'ro' ? '7 activi · 1 inactiv' : '7 Active · 1 Inactive')).toBeVisible();
    expect(within(employeeKpi).getByText(`0 ${copy.Dashboard.overview.employeeComplete}`)).toBeVisible();
    expect(within(employeeKpi).getByText(`0 ${copy.EmployeeDocuments.tracking.attention}`)).toBeVisible();
    expect(within(employeeKpi).getByText(`7 ${copy.EmployeeDocuments.tracking.not_configured}`)).toBeVisible();
    expect(employeeKpi).not.toHaveTextContent(copy.Employees.expiring);
    expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByRole('button', {name: copy.Dashboard.addSupplier})).toBeNull();
    expect(screen.getByRole('link', {name: copy.Dashboard.overview.viewAllActivity})).toHaveAttribute('href', '/notifications#audit-title');
    const company = document.querySelector('[data-dashboard-panel="company-documents"]') as HTMLElement;
    expect(within(company).getByText('Demo Company SRL')).toBeVisible();
    fireEvent.click(within(company).getByRole('button', {name: /Cazier fiscal|Tax clearance record/}));
    const dialog = screen.getByRole('dialog'); expect(within(dialog).getByText(/Cazier fiscal|Tax clearance record/, {selector: 'dd'})).toBeVisible();
    expect(within(dialog).getByRole('button', {name: copy.CompanyDocumentManagement.addTitle})).toBeEnabled();
  });
});
