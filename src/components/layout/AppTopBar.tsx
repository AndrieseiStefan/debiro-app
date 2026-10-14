import type {NotificationActivityItem} from '@/features/notifications/types';
import {GlobalSearch} from '@/features/global-search/GlobalSearch';
import {AppUtilities} from './AppUtilities';
import styles from './AppTopBar.module.css';

export function AppTopBar({locale, currentPath, notifications, notificationReferenceTime}: {
  locale: string;
  currentPath: string;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
}) {
  return (
    <div className={styles.topBar}>
      <GlobalSearch locale={locale} currentPath={currentPath} className={styles.search}/>

      <div className={styles.desktopUtilities}>
        <AppUtilities locale={locale} currentPath={currentPath} notifications={notifications} notificationReferenceTime={notificationReferenceTime} />
      </div>
    </div>
  );
}
