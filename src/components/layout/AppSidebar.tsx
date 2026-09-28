'use client';

import {useLayoutEffect, useRef, useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {Link, usePathname} from '@/i18n/navigation';
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

let settingsExpansion: boolean | null = null;
const settingsExpansionListeners = new Set<() => void>();

function subscribeSettingsExpansion(listener: () => void) {
  settingsExpansionListeners.add(listener);
  return () => settingsExpansionListeners.delete(listener);
}

function setSettingsExpansion(expanded: boolean) {
  settingsExpansion = expanded;
  settingsExpansionListeners.forEach((listener) => listener());
}

export function AppSidebar({locale, currentPath, organizationName, userName, userInitials, notificationCount, notifications, notificationReferenceTime}: {
  locale: string;
  currentPath: string;
  organizationName: string;
  userName: string;
  userInitials: string;
  notificationCount: number;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
}) {
  const t = useTranslations('AppShell');
  const pathname = usePathname().replace(/^\/(?:en|ro)(?=\/|$)/, '').replace(/\/+$/, '') || '/';
  const activeSection = pathname === '/' || pathname === '/dashboard' ? 'dashboard' :
    pathname === '/vendors' || pathname.startsWith('/vendors/') ? 'suppliers' :
      pathname === '/documents' || pathname.startsWith('/documents/') ? 'documents' :
      pathname === '/requirements' || pathname.startsWith('/requirements/') ? 'requirements' :
          pathname === '/notifications' || pathname.startsWith('/notifications/') ? 'notifications' :
            pathname === '/company/settings' || pathname.startsWith('/company/settings/') ? 'settings' : null;
  const settingsOverride = useSyncExternalStore(subscribeSettingsExpansion, () => settingsExpansion, () => null);
  const settingsExpanded = settingsOverride ?? activeSection === 'settings';
  const navigationRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (activeSection === 'settings' && settingsOverride === null) setSettingsExpansion(true);
  }, [activeSection, settingsOverride]);

  useLayoutEffect(() => {
    if (activeSection !== 'settings' || !settingsExpanded || !window.matchMedia('(max-width: 800px)').matches) return;
    const navigation = navigationRef.current;
    const active = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!navigation || !active) return;
    const group = active.closest<HTMLElement>(`.${styles.settingsGroup}`);
    const navigationBounds = navigation.getBoundingClientRect();
    const groupBounds = group?.getBoundingClientRect();
    if (groupBounds && groupBounds.right > navigationBounds.right) navigation.scrollLeft += groupBounds.right - navigationBounds.right;
    else if (groupBounds && groupBounds.left < navigationBounds.left) navigation.scrollLeft -= navigationBounds.left - groupBounds.left;
    const subnav = active.parentElement;
    if (!subnav) return;
    const subnavBounds = subnav.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    if (activeBounds.right > subnavBounds.right) subnav.scrollLeft += activeBounds.right - subnavBounds.right + 8;
    else if (activeBounds.left < subnavBounds.left) subnav.scrollLeft -= subnavBounds.left - activeBounds.left + 8;
  }, [activeSection, pathname, settingsExpanded]);

  return (
    <div className={styles.sidebarContents}>
      <div className={styles.brandArea}>
        <BrandWordmark className={styles.brand} />
        <p>{t('taglineOne')}<br />{t('taglineTwo')}</p>
      </div>

      <div className={styles.reducedUtilities}>
        <AppUtilities locale={locale} currentPath={currentPath} userInitials={userInitials} userName={userName} notifications={notifications} notificationReferenceTime={notificationReferenceTime} compact />
      </div>

      <nav ref={navigationRef} className={styles.navigation} aria-label={t('navigationLabel')}>
        {items.map((item) => {
          const content = <><AppIcon name={item.icon} size={22} /><span>{t(`navigation.${item.id}`)}</span>{item.id === 'notifications' && notificationCount > 0 && <span className={styles.notificationCount}>{notificationCount}</span>}</>;
          if (item.id === 'settings') return <div key={item.id} className={styles.settingsGroup} data-expanded={settingsExpanded}>
            <button type="button" className={`${styles.navItem} ${styles.settingsToggle} ${activeSection === 'settings' ? styles.active : ''}`} aria-label={t('navigation.settings')} aria-expanded={settingsExpanded} aria-controls={settingsExpanded ? 'company-settings-subnav' : undefined} onClick={() => setSettingsExpansion(!settingsExpanded)}>{content}<AppIcon name="chevronDown" size={17} /></button>
            {settingsExpanded && <div id="company-settings-subnav" className={styles.settingsSubnav}>
              <button type="button" className={styles.settingsLink} aria-disabled="true"><AppIcon name="building" size={18}/>{t('navigation.companyProfile')}</button>
              <Link href="/company/settings/members" aria-current={pathname === '/company/settings/members' ? 'page' : undefined} className={`${styles.settingsLink} ${pathname === '/company/settings/members' ? styles.settingsActive : ''}`}><AppIcon name="users" size={18}/>{t('navigation.membersAccess')}</Link>
              <button type="button" className={styles.settingsLink} aria-disabled="true"><AppIcon name="file" size={18}/>{t('navigation.plansBilling')}</button>
            </div>}
          </div>;
          if (item.id === 'dashboard' || item.id === 'suppliers' || item.id === 'requirements' || item.id === 'documents' || item.id === 'notifications') {
            const path = item.id === 'dashboard' ? '/dashboard' : item.id === 'suppliers' ? '/vendors' : item.id === 'requirements' ? '/requirements' : item.id === 'notifications' ? '/notifications' : '/documents';
            const active = activeSection === item.id;
            return <Link key={item.id} href={path} aria-current={active ? 'page' : undefined} className={`${styles.navItem} ${active ? styles.active : ''}`}>{content}</Link>;
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
