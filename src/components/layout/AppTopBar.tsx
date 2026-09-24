import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon} from './AppIcon';
import styles from './AppTopBar.module.css';

export function AppTopBar({locale, currentPath, userInitials}: {
  locale: string;
  currentPath: '/dashboard';
  userInitials: string;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={styles.topBar}>
      <div className={styles.search}>
        <AppIcon name="search" size={21} />
        <input type="search" aria-label={t('searchLabel')} placeholder={t('searchPlaceholder')} />
        <kbd aria-hidden="true">⌘ K</kbd>
      </div>

      <div className={styles.utilities}>
        <button type="button" aria-disabled="true" aria-label={t('notificationLabel')} className={styles.notificationButton}>
          <AppIcon name="bell" size={23} />
          <span className={styles.notificationDot} aria-hidden="true" />
        </button>
        <nav className={styles.localeSwitch} aria-label={t('languageLabel')}>
          <Link href={currentPath} locale="ro" aria-current={locale === 'ro' ? 'page' : undefined} className={locale === 'ro' ? styles.activeLocale : undefined}>RO</Link>
          <Link href={currentPath} locale="en" aria-current={locale === 'en' ? 'page' : undefined} className={locale === 'en' ? styles.activeLocale : undefined}>EN</Link>
        </nav>
        <button type="button" aria-disabled="true" aria-label={t('profileLabel')} className={styles.profileButton}>
          <span>{userInitials}</span><AppIcon name="chevronDown" size={16} />
        </button>
      </div>
    </div>
  );
}
