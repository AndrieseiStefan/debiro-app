import {render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {MyProfilePage} from '@/features/profile/MyProfilePage';
import {MyInvitationsPage} from '@/features/profile/MyInvitationsPage';
import {MyCompaniesPage} from '@/features/companies/MyCompaniesPage';

const router = {push: vi.fn(), replace: vi.fn()};
vi.mock('@/i18n/navigation', () => ({useRouter: () => router, Link: ({href, children, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}>{children}</a>}));
vi.mock('next/navigation', () => ({useRouter: () => router}));
vi.mock('@/components/layout/AuthenticatedAppShell', () => ({AuthenticatedAppShell: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));

for (const locale of ['ro', 'en'] as const) {
  const messages = locale === 'ro' ? ro : en;
  const root = locale === 'ro' ? 'Profil' : 'Profile';
  describe(`${locale} shared breadcrumb roots`, () => {
    it('renders My Profile as the global root without Dashboard or a redundant child', () => {
      render(<NextIntlClientProvider locale={locale} messages={messages}><MyProfilePage locale={locale}/></NextIntlClientProvider>);
      const breadcrumb = screen.getByRole('navigation');
      expect(breadcrumb.textContent).toBe(root);
      expect(within(breadcrumb).queryByRole('link')).toBeNull();
      expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent(root);
    });
    it.each([['companies', MyCompaniesPage, locale === 'ro' ? 'Companiile mele' : 'My Companies'], ['invitations', MyInvitationsPage, locale === 'ro' ? 'Invitațiile mele' : 'My Invitations']] as const)('uses a linked Profile parent for %s', (_route, Page, child) => {
      render(<NextIntlClientProvider locale={locale} messages={messages}><Page locale={locale}/></NextIntlClientProvider>);
      const breadcrumb = screen.getByRole('navigation');
      expect(breadcrumb.textContent).toBe(root + child);
      expect(within(breadcrumb).getByRole('link', {name: root})).toHaveAttribute('href', '/profile');
      expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent(child);
      expect(breadcrumb).not.toHaveTextContent('Dashboard');
    });
    it('preserves the default Dashboard root for company-owned pages', () => {
      render(<NextIntlClientProvider locale={locale} messages={messages}><AuthenticatedBreadcrumbs label="Breadcrumb" items={[{label: 'Section'}]}/></NextIntlClientProvider>);
      expect(screen.getByRole('link', {name: 'Dashboard'})).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('navigation')).not.toHaveAttribute('data-wrap');
    });
    it('opts into shared wrapping without changing parent/current semantics', () => {
      render(<NextIntlClientProvider locale={locale} messages={messages}><AuthenticatedBreadcrumbs wrap label="Breadcrumb" items={[{label: 'Company'}, {label: 'Employees', href: '/company/employees'}, {label: 'Employee'}]}/></NextIntlClientProvider>);
      const breadcrumb = screen.getByRole('navigation'); expect(breadcrumb).toHaveAttribute('data-wrap', 'true');
      expect(within(breadcrumb).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/dashboard', '/company/employees']);
      expect(within(breadcrumb).queryByRole('link', {name: 'Company'})).toBeNull(); expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent('Employee');
    });
  });
}
