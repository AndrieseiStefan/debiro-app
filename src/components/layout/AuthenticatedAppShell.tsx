'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {companySettingsFixture} from '@/features/company-settings/fixtures';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {useNotificationItems} from '@/features/notifications/local-state';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {EmptyState} from '@/components/ui/EmptyState';
import {AppShell} from './AppShell';
import {AppSidebar} from './AppSidebar';
import {AppTopBar} from './AppTopBar';

export function AuthenticatedAppShell({locale, currentPath, notificationItems, notificationReferenceTime, scope = 'demo-fixture', children}: {
  locale: string;
  currentPath: string;
  organizationName: string;
  userName: string;
  userInitials: string;
  notificationCount?: number;
  notificationItems?: NotificationActivityItem[];
  notificationReferenceTime?: string;
  scope?: 'demo-fixture' | 'company-aware' | 'global';
  children: ReactNode;
}) {
  const t = useTranslations('AppShell');
  const companies = useCompanyState();
  const active = getActiveCompany(companies);
  const notifications = useNotificationItems(notificationItems ?? notificationsFixture.notifications);
  const visibleNotifications = active?.company.id === companySettingsFixture.company.id ? notifications : [];
  const unreadCount = visibleNotifications.filter((item) => item.isUnread).length;
  const referenceTime = notificationReferenceTime ?? notificationsFixture.referenceTime;
  const showFixture = scope !== 'demo-fixture' || active?.company.id === companySettingsFixture.company.id;

  return (
    <AppShell
      sidebarLabel={t('sidebarLabel')}
      sidebar={<AppSidebar locale={locale} currentPath={currentPath} notificationCount={unreadCount} notifications={visibleNotifications} notificationReferenceTime={referenceTime} />}
      header={<AppTopBar locale={locale} currentPath={currentPath} notifications={visibleNotifications} notificationReferenceTime={referenceTime} />}
    >
      {showFixture ? children : <EmptyState title={t('workspaceEmptyTitle')} description={t('workspaceEmptyDescription', {company: active?.company.name ?? t('workspaceUnknown')})}/>}
    </AppShell>
  );
}
