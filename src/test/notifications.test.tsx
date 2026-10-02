import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {NotificationsPage} from '@/features/notifications/NotificationsPage';
import {auditEventsToCsv, filterAuditEvents, filterNotifications} from '@/features/notifications/selectors';

vi.mock('@/i18n/navigation', () => ({usePathname: () => '/notifications', Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props} />}));

function renderPage(view = notificationsFixture) {
  return render(<NextIntlClientProvider locale="ro" messages={ro}><NotificationsPage locale="ro" view={view} /></NextIntlClientProvider>);
}

describe('notifications and audit activity', () => {
  it('filters operational notifications independently from audit history', () => {
    const {notifications, auditEvents, referenceTime} = notificationsFixture;
    expect(filterNotifications(notifications, 'all', 'last30', referenceTime)).toHaveLength(8);
    expect(filterNotifications(notifications, 'unread', 'last30', referenceTime)).toHaveLength(3);
    expect(filterNotifications(notifications, 'reminders', 'last30', referenceTime)).toHaveLength(2);
    expect(filterNotifications(notifications, 'uploads', 'last30', referenceTime)).toHaveLength(1);
    expect(filterNotifications(notifications, 'status', 'last30', referenceTime)).toHaveLength(1);
    expect(filterNotifications(notifications, 'all', 'last7', referenceTime)).toHaveLength(4);
    expect(filterNotifications(notifications, 'all', 'all', referenceTime)).toHaveLength(10);
    expect(filterAuditEvents(auditEvents, 'last30', referenceTime).map((event) => event.occurredAt)).toEqual(filterAuditEvents(auditEvents, 'last30', referenceTime).map((event) => event.occurredAt).sort().reverse());
  });

  it('renders distinct empty and filtered-empty states', () => {
    const empty = {...notificationsFixture, notifications: [], auditEvents: [], expiringDocuments: [], missingDocuments: []};
    const {unmount} = renderPage(empty);
    expect(screen.getByText('Nu există notificări sau activități.')).toBeVisible();
    expect(screen.getByText('Nu există evenimente de audit în perioada selectată.')).toBeVisible();
    // Empty operational notices do not erase the shared current document data.
    expect(screen.getAllByRole('region', {name: 'Expiră curând'})[0].querySelector('tbody tr')).not.toBeNull();
    unmount();
    renderPage({...notificationsFixture, notifications: notificationsFixture.notifications.filter((item) => item.type === 'reminder')});
    fireEvent.click(within(screen.getByRole('navigation', {name: 'Filtre activitate'})).getByRole('button', {name: /Încărcări/}));
    expect(screen.getByText('Nicio activitate nu corespunde filtrului ales.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Resetează filtrele'}));
    expect(screen.queryByText('Nicio activitate nu corespunde filtrului ales.')).not.toBeInTheDocument();
  });

  it('exports a stable audit-only CSV and escapes spreadsheet formulas', () => {
    const csv = auditEventsToCsv(filterAuditEvents(notificationsFixture.auditEvents, 'last30', notificationsFixture.referenceTime), 'ro');
    expect(csv).toContain('audit-reminder-1');
    expect(csv).not.toContain('notice-reminder-1');
    expect(csv.split('\r\n')).toHaveLength(filterAuditEvents(notificationsFixture.auditEvents, 'last30', notificationsFixture.referenceTime).length + 2);
    expect(auditEventsToCsv([{...notificationsFixture.auditEvents[0], description: {ro: '=1+1', en: '=1+1'}}], 'ro')).toContain('"\'=1+1"');
  });
});
