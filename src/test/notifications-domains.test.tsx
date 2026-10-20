import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {NotificationsPage} from '@/features/notifications/NotificationsPage';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {readCompanyState} from '@/features/companies/company-state';
import {readEmployeeState} from '@/features/employees/employees-state';
import {employeeDocumentEngine} from '@/features/employees/employee-documents';
import {readCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';

vi.mock('@/i18n/navigation', () => ({useRouter: () => ({push: vi.fn()}), usePathname: () => '/notifications', Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props}/>}));
const companyId = 'demo-company', employeeId = 'employee:andrei-popescu', owner = (key: string) => Reflect.get(window, Symbol.for(key));
const originals = {company: structuredClone(readCompanyState()), employees: structuredClone(readEmployeeState()), documents: structuredClone(readCompanyDocumentsState())};
beforeEach(() => {
  owner('debiro.company-session').state = structuredClone(originals.company); owner('debiro.employees-session').state = structuredClone(originals.employees); owner('debiro.employees-session').files = new Map();
  owner('debiro.company-documents-session').state = structuredClone(originals.documents); owner('debiro.local-audit-session').events = []; owner('debiro.notification-session').readIds = new Set();
});
function page(locale: 'ro' | 'en') {return render(<NextIntlClientProvider locale={locale} messages={locale === 'ro' ? ro : en}><NotificationsPage locale={locale} view={notificationsFixture}/></NextIntlClientProvider>);}

describe.each(['ro', 'en'] as const)('%s unified Notifications UI', (locale) => {
  const c = locale === 'ro' ? ro : en;
  it('shows authorized entity context and real activity without treating current states or demo notices as audit', () => {
    expect(employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {name: 'Private personnel proof', documentType: 'custom', issuer: '', expiresAt: '18.10.2026', required: true, file: new File(['test'], 'private.pdf', {type: 'application/pdf'})}).ok).toBe(true);
    page(locale);
    const expiring = screen.getAllByRole('region', {name: c.Notifications.expiringTitle})[0];
    fireEvent.click(within(expiring).getByRole('button', {name: c.SectionActions.viewAll}));
    expect(within(expiring).getByRole('columnheader', {name: c.Notifications.entity})).toBeVisible(); expect(within(expiring).getByText('Private personnel proof')).toBeVisible();
    expect(within(expiring).getByText(c.Notifications.domains.employee)).toBeVisible();
    const audit = screen.getByRole('region', {name: c.Notifications.auditTitle}); expect(audit.querySelector('[data-activity-id^="employee:"]')).toHaveTextContent(c.EmployeeDocuments.events.document_upload);
    expect(within(audit).queryByText(locale === 'ro' ? 'Reminder trimis' : 'Reminder sent')).toBeNull();
    const filters = screen.getByRole('navigation', {name: c.Notifications.categoriesLabel}); fireEvent.click(within(filters).getByRole('button', {name: new RegExp(`^${c.Notifications.categories.reminders}`)}));
    const recent = screen.getAllByRole('region', {name: c.Notifications.recentTitle})[0]; expect(within(recent).getAllByText(c.Notifications.demoNotification)).toHaveLength(2);
    expect(readLocalAuditEvents()).toHaveLength(0); // Reading recorded Employee activity never mirrors it into another store.
    expect(screen.getAllByRole('region', {name: c.Notifications.summaryLabel})[0].querySelectorAll('strong')[2]).toHaveTextContent(/\d+/);
  });
  it('shares existing mark-read state without making document attention unread', () => {
    page(locale); const bell = screen.getAllByRole('button', {name: c.AppShell.notificationLabel}).at(-1)!; expect(bell).toHaveTextContent('3'); fireEvent.click(bell);
    const center = screen.getByRole('dialog', {name: c.NotificationCenter.title}); expect(within(center).getAllByText(c.Notifications.currentState).length).toBeGreaterThan(0);
    fireEvent.click(within(center).getByRole('button', {name: c.NotificationCenter.markAllRead})); expect(bell).not.toHaveTextContent('3');
    expect(screen.getByRole('navigation', {name: c.Notifications.categoriesLabel})).toHaveTextContent(`${c.Notifications.categories.unread}0`);
    expect(readLocalAuditEvents()).toHaveLength(0);
  });
  it('does not expose restricted personnel text, IDs or activity through any Notifications surface', () => {
    employeeDocumentEngine(companyId, employeeId).addCompanyDocument(companyId, {name: 'Private personnel proof', documentType: 'custom', issuer: '', expiresAt: '18.10.2026', required: true, file: new File(['test'], 'private.pdf', {type: 'application/pdf'})});
    owner('debiro.company-session').state.companies[0].members.find((item: {isCurrentUser: boolean}) => item.isCurrentUser).role = 'viewer';
    const view = page(locale); expect(view.container.innerHTML).not.toContain('Private personnel proof'); expect(view.container.querySelector('[data-activity-id^="employee:"]')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', {name: c.AppShell.notificationLabel}).at(-1)!); expect(screen.getByRole('dialog')).not.toHaveTextContent('Private personnel proof');
  });
});
