import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {NotificationBell} from '@/features/notifications/NotificationBell';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {AppIcon} from './AppIcon';
import styles from './AppUtilities.module.css';

export function AppUtilities({locale, currentPath, userInitials, userName, notifications, notificationReferenceTime, compact = false}: {
  locale: string;
  currentPath: string;
  userInitials: string;
  userName: string;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
  compact?: boolean;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={`${styles.utilities} ${compact ? styles.compact : ''}`}>
      <NotificationBell locale={locale} items={notifications} referenceTime={notificationReferenceTime} compact={compact} />
      <nav className={styles.localeSwitch} aria-label={t('languageLabel')}>
        <Link href={currentPath} locale="ro" aria-current={locale === 'ro' ? 'page' : undefined} className={locale === 'ro' ? styles.activeLocale : undefined}>RO</Link>
        <Link href={currentPath} locale="en" aria-current={locale === 'en' ? 'page' : undefined} className={locale === 'en' ? styles.activeLocale : undefined}>EN</Link>
      </nav>
      <button type="button" aria-disabled="true" aria-label={`${t('profileLabel')}: ${userName}`} className={styles.profileButton}>
        <span>{userInitials}</span><AppIcon name="chevronDown" size={16} />
      </button>
    </div>
  );
}
