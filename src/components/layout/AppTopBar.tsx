import {useTranslations} from 'next-intl';
import type {NotificationActivityItem} from '@/features/notifications/types';
import type {CompanySettingsViewModel} from '@/features/company-settings/types';
import {AppIcon} from './AppIcon';
import {AppUtilities} from './AppUtilities';
import styles from './AppTopBar.module.css';

export function AppTopBar({locale, currentPath, notifications, notificationReferenceTime, profile}: {
  locale: string;
  currentPath: string;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
  profile: CompanySettingsViewModel;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={styles.topBar}>
      <div className={styles.search}>
        <AppIcon name="search" size={21} />
        <input type="search" aria-label={t('searchLabel')} placeholder={t('searchPlaceholder')} />
        <kbd aria-hidden="true">⌘ K</kbd>
      </div>

      <div className={styles.desktopUtilities}>
        <AppUtilities locale={locale} currentPath={currentPath} notifications={notifications} notificationReferenceTime={notificationReferenceTime} profile={profile} />
      </div>
    </div>
  );
}
