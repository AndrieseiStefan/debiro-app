import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon} from './AppIcon';
import styles from './AppUtilities.module.css';

export function AppUtilities({locale, currentPath, userInitials, userName, compact = false}: {
  locale: string;
  currentPath: string;
  userInitials: string;
  userName: string;
  compact?: boolean;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={`${styles.utilities} ${compact ? styles.compact : ''}`}>
      <button type="button" aria-disabled="true" aria-label={t('notificationLabel')} className={styles.notificationButton}>
        <AppIcon name="bell" size={23} />
        <span className={styles.notificationDot} aria-hidden="true" />
      </button>
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
