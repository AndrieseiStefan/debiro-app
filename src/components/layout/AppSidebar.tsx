import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {Link} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from './AppIcon';
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

export function AppSidebar({organizationName, userName, notificationCount}: {
  organizationName: string;
  userName: string;
  notificationCount: number;
}) {
  const t = useTranslations('AppShell');

  return (
    <div className={styles.sidebarContents}>
      <div className={styles.brandArea}>
        <BrandWordmark className={styles.brand} />
        <p>{t('taglineOne')}<br />{t('taglineTwo')}</p>
      </div>

      <nav className={styles.navigation} aria-label={t('navigationLabel')}>
        {items.map((item) => {
          const content = <><AppIcon name={item.icon} size={22} /><span>{t(`navigation.${item.id}`)}</span>{item.id === 'notifications' && <span className={styles.notificationCount}>{notificationCount}</span>}</>;
          return item.id === 'dashboard'
            ? <Link key={item.id} href="/dashboard" aria-current="page" className={`${styles.navItem} ${styles.active}`}>{content}</Link>
            : <button key={item.id} type="button" aria-disabled="true" className={styles.navItem}>{content}</button>;
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <p className={styles.motto}>{t('mottoOne')}<br />{t('mottoTwo')}<br />{t('mottoThree')}</p>
        <button type="button" aria-disabled="true" className={styles.accountCard} aria-label={`${organizationName}, ${userName}`}>
          <span className={styles.companyIcon}><AppIcon name="building" size={22} /></span>
          <span className={styles.accountText}><strong>{organizationName}</strong><small>{userName}</small></span>
          <AppIcon name="chevronRight" size={18} />
        </button>
      </div>
    </div>
  );
}
