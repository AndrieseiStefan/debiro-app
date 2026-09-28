import {fireEvent, render, screen, within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import {NotificationBell} from '@/features/notifications/NotificationBell';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {useNotificationItems} from '@/features/notifications/local-state';
import type {NotificationActivityItem} from '@/features/notifications/types';

vi.mock('@/i18n/navigation', () => ({Link: ({href, ...props}: {href: string; children: React.ReactNode}) => <a href={href} {...props} />}));

function BellFixture({items}: {items: NotificationActivityItem[]}) {
  const notifications = useNotificationItems(items);
  return <NextIntlClientProvider locale="ro" messages={ro}><NotificationBell locale="ro" items={notifications} referenceTime={notificationsFixture.referenceTime} /></NextIntlClientProvider>;
}

describe('notification bell preview', () => {
  it('shows a truthful empty state without inventing activity', () => {
    render(<BellFixture items={[]} />);
    fireEvent.click(screen.getByRole('button', {name: 'Notificări'}));
    const panel = screen.getByRole('dialog', {name: 'Notificări'});
    expect(within(panel).getByText('Nu există notificări recente.')).toBeVisible();
    expect(within(panel).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(panel).getByRole('link', {name: 'Vezi toate notificările'})).toHaveAttribute('href', '/notifications');
    expect(within(panel).getByRole('button', {name: 'Marchează toate ca citite'})).toHaveAttribute('aria-disabled', 'true');
  });

  it('derives badge and unread indicators from the same local activity state', () => {
    const items = notificationsFixture.notifications.slice(0, 2).map((item) => ({...item, id: `bell-test-${item.id}`, isUnread: true}));
    render(<BellFixture items={items} />);
    const bell = screen.getByRole('button', {name: 'Notificări'});
    expect(bell).toHaveTextContent('2');
    fireEvent.click(bell);
    const panel = screen.getByRole('dialog', {name: 'Notificări'});
    expect(panel.querySelectorAll('[data-unread="true"]')).toHaveLength(2);
    fireEvent.click(within(panel).getByRole('button', {name: 'Marchează toate ca citite'}));
    expect(bell).not.toHaveTextContent('2');
    expect(panel.querySelectorAll('[data-unread="true"]')).toHaveLength(0);
  });
});
