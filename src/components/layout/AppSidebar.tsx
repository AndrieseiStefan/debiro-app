import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {Link} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from './AppIcon';
import {AppUtilities} from './AppUtilities';
import styles from './AppSidebar.module.css';

const items = [
  {id: 'dashboard', icon: 'home'},
  {id: 'suppliers', icon: 'users'},
  {id: 'documents', icon: 'file'},
  {id: 'requirements', icon: 'shield'},
  {id: 'notifications', icon: 'bell'},
  {id: 'reports', icon: 'bars'},
  {id: 'settings', icon: 'settings'}
] as const satisfies ReadonlyArray<{id: string; icon: AppIconName}>;

export function AppSidebar({locale, currentPath, organizationName, userName, userInitials, notificationCount}: {
  locale: string;
  currentPath: string;
  organizationName: string;
  userName: string;
  userInitials: string;
  notificationCount: number;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={styles.sidebarContents}>
      <div className={styles.brandArea}>
        <BrandWordmark className={styles.brand} />
        <p>{t('taglineOne')}<br />{t('taglineTwo')}</p>
      </div>

      <div className={styles.reducedUtilities}>
        <AppUtilities locale={locale} currentPath={currentPath} userInitials={userInitials} userName={userName} compact />
      </div>

      <nav className={styles.navigation} aria-label={t('navigationLabel')}>
        {items.map((item) => {
          const content = <><AppIcon name={item.icon} size={22} /><span>{t(`navigation.${item.id}`)}</span>{item.id === 'notifications' && <span className={styles.notificationCount}>{notificationCount}</span>}</>;
          if (item.id === 'dashboard' || item.id === 'suppliers') {
            const path = item.id === 'dashboard' ? '/dashboard' : '/vendors';
            return <Link key={item.id} href={path} aria-current={currentPath === path ? 'page' : undefined} className={`${styles.navItem} ${currentPath === path ? styles.active : ''}`}>{content}</Link>;
          }
          return <button key={item.id} type="button" aria-disabled="true" className={styles.navItem}>{content}</button>;
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <p className={styles.motto}>{t('mottoOne')}<br />{t('mottoTwo')}<br />{t('mottoThree')}</p>
        <button type="button" aria-disabled="true" className={styles.accountCard} aria-label={organizationName}>
          <span className={styles.companyIcon}><AppIcon name="building" size={22} /></span>
          <span className={styles.accountText}><strong>{organizationName}</strong><small>{userName}</small></span>
          <AppIcon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
}
