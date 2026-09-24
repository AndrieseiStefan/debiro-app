import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {AppShell} from './AppShell';
import {AppSidebar} from './AppSidebar';
import {AppTopBar} from './AppTopBar';

export function AuthenticatedAppShell({locale, organizationName, userName, userInitials, notificationCount, children}: {
  locale: string;
  organizationName: string;
  userName: string;
  userInitials: string;
  notificationCount: number;
  children: ReactNode;
}) {
  const t = useTranslations('AppShell');

  return (
    <AppShell
      sidebarLabel={t('sidebarLabel')}
      sidebar={<AppSidebar organizationName={organizationName} userName={userName} notificationCount={notificationCount} />}
      header={<AppTopBar locale={locale} currentPath="/dashboard" userInitials={userInitials} />}
    >
      {children}
    </AppShell>
  );
}
