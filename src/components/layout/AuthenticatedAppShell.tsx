'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {useNotificationItems} from '@/features/notifications/local-state';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {AppShell} from './AppShell';
import {AppSidebar} from './AppSidebar';
import {AppTopBar} from './AppTopBar';

export function AuthenticatedAppShell({locale, currentPath, organizationName, userName, notificationItems, notificationReferenceTime, children}: {
  locale: string;
  currentPath: string;
  organizationName: string;
  userName: string;
  userInitials: string;
  notificationCount?: number;
  notificationItems?: NotificationActivityItem[];
  notificationReferenceTime?: string;
  children: ReactNode;
}) {
  const t = useTranslations('AppShell');
  const notifications = useNotificationItems(notificationItems ?? notificationsFixture.notifications);
  const unreadCount = notifications.filter((item) => item.isUnread).length;
  const referenceTime = notificationReferenceTime ?? notificationsFixture.referenceTime;

  return (
    <AppShell
      sidebarLabel={t('sidebarLabel')}
      sidebar={<AppSidebar locale={locale} currentPath={currentPath} organizationName={organizationName} userName={userName} notificationCount={unreadCount} notifications={notifications} notificationReferenceTime={referenceTime} profile={companySettingsFixture} />}
      header={<AppTopBar locale={locale} currentPath={currentPath} notifications={notifications} notificationReferenceTime={referenceTime} profile={companySettingsFixture} />}
    >
      {children}
    </AppShell>
  );
}
