'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {getCurrentMembership} from '@/features/companies/company-state';
import {companyNotifications} from '@/features/notifications/company-projections';
import {useLocalAuditEvents} from '@/features/notifications/local-audit';
import {useVendorState, vendorListItems} from '@/features/vendors/created-vendors';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {useNotificationItems} from '@/features/notifications/local-state';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {EmptyState} from '@/components/ui/EmptyState';
import {AppShell} from './AppShell';
import {AppSidebar} from './AppSidebar';
import {AppTopBar} from './AppTopBar';

export function AuthenticatedAppShell({locale, currentPath, notificationItems, notificationReferenceTime, scope = 'company-aware', children}: {
  locale: string;
  currentPath: string;
  organizationName: string;
  userName: string;
  userInitials: string;
  notificationCount?: number;
  notificationItems?: NotificationActivityItem[];
  notificationReferenceTime?: string;
  scope?: 'company-aware' | 'global';
  children: ReactNode;
}) {
  const t = useTranslations('AppShell');
  const companies = useCompanyState();
  const active = getActiveCompany(companies);
  const companyId = active?.company.id ?? '';
  const notifications = companyNotifications(companyId, useLocalAuditEvents(), vendorListItems(useVendorState(), companyId), notificationItems ?? notificationsFixture.notifications);
  const visibleNotifications = useNotificationItems(notifications);
  const unreadCount = visibleNotifications.filter((item) => item.isUnread).length;
  const referenceTime = notificationReferenceTime ?? notificationsFixture.referenceTime;
  const accessible = scope === 'global' || Boolean(active && getCurrentMembership(active));

  return (
    <AppShell
      sidebarLabel={t('sidebarLabel')}
      sidebar={<AppSidebar locale={locale} currentPath={currentPath} notificationCount={unreadCount} notifications={visibleNotifications} notificationReferenceTime={referenceTime} />}
      header={<AppTopBar locale={locale} currentPath={currentPath} notifications={visibleNotifications} notificationReferenceTime={referenceTime} />}
    >
      {accessible ? children : <EmptyState title={t('workspaceEmptyTitle')} description={t('workspaceEmptyDescription', {company: active?.company.name ?? t('workspaceUnknown')})}/>}
    </AppShell>
  );
}
