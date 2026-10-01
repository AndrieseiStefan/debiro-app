import {useTranslations} from 'next-intl';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {SearchInput} from '@/components/ui/SearchInput';
import {AppUtilities} from './AppUtilities';
import styles from './AppTopBar.module.css';

export function AppTopBar({locale, currentPath, notifications, notificationReferenceTime}: {
  locale: string;
  currentPath: string;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={styles.topBar}>
      <SearchInput className={styles.search} label={t('searchLabel')} placeholder={t('searchPlaceholder')} endAdornment={<kbd aria-hidden="true">⌘ K</kbd>}/>

      <div className={styles.desktopUtilities}>
        <AppUtilities locale={locale} currentPath={currentPath} notifications={notifications} notificationReferenceTime={notificationReferenceTime} />
      </div>
    </div>
  );
}
