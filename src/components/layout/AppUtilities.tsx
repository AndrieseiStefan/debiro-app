import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {NotificationBell} from '@/features/notifications/NotificationBell';
import type {NotificationActivityItem} from '@/features/notifications/types';
import type {CompanySettingsViewModel} from '@/features/company-settings/types';
import {ProfileDropdown} from '@/features/profile/ProfileDropdown';
import styles from './AppUtilities.module.css';

export function AppUtilities({locale, currentPath, notifications, notificationReferenceTime, profile, compact = false}: {
  locale: string;
  currentPath: string;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
  profile: CompanySettingsViewModel;
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
      <ProfileDropdown profile={profile} compact={compact} triggerClassName={styles.profileButton} />
    </div>
  );
}
