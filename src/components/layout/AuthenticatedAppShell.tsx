import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {AppShell} from './AppShell';
import {AppSidebar} from './AppSidebar';
import {AppTopBar} from './AppTopBar';

export function AuthenticatedAppShell({locale, currentPath, organizationName, userName, userInitials, notificationCount, children}: {
  locale: string;
  currentPath: string;
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
      sidebar={<AppSidebar locale={locale} currentPath={currentPath} organizationName={organizationName} userName={userName} userInitials={userInitials} notificationCount={notificationCount} />}
      header={<AppTopBar locale={locale} currentPath={currentPath} userInitials={userInitials} userName={userName} />}
    >
      {children}
    </AppShell>
  );
}
