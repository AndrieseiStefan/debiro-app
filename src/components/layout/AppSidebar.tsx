'use client';

import {useLayoutEffect, useRef, useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import type {NotificationActivityItem} from '@/features/notifications/types';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {usePathname} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from './AppIcon';
import {AppUtilities} from './AppUtilities';
import {CompanySwitcher} from './CompanySwitcher';
import {SidebarNavigationItem, type NavigationAvailability} from './SidebarNavigationItem';
import styles from './AppSidebar.module.css';

const items = [
  {id: 'dashboard', icon: 'home', href: '/dashboard'},
  {id: 'suppliers', icon: 'users', href: '/vendors'},
  {id: 'documents', icon: 'file', href: '/documents'},
  {id: 'company', icon: 'building'},
  {id: 'requirements', icon: 'shield', href: '/requirements'},
  {id: 'notifications', icon: 'bell', href: '/notifications'},
  {id: 'reports', icon: 'bars', href: '/reports', availability: 'comingSoon'},
  {id: 'settings', icon: 'settings'}
] as const satisfies ReadonlyArray<{id: string; icon: AppIconName; href?: string; availability?: NavigationAvailability}>;

let settingsExpansion: boolean | null = null;
const settingsExpansionListeners = new Set<() => void>();
let companyExpansion: boolean | null = null;
const companyExpansionListeners = new Set<() => void>();
function subscribeCompanyExpansion(listener: () => void) {companyExpansionListeners.add(listener); return () => {companyExpansionListeners.delete(listener);};}
function setCompanyExpansion(expanded: boolean) {companyExpansion = expanded; companyExpansionListeners.forEach((listener) => listener());}

function subscribeSettingsExpansion(listener: () => void) {
  settingsExpansionListeners.add(listener);
  return () => settingsExpansionListeners.delete(listener);
}

function setSettingsExpansion(expanded: boolean) {
  settingsExpansion = expanded;
  settingsExpansionListeners.forEach((listener) => listener());
}

export function AppSidebar({locale, currentPath, notificationCount, notifications, notificationReferenceTime}: {
  locale: string;
  currentPath: string;
  notificationCount: number;
  notifications: NotificationActivityItem[];
  notificationReferenceTime: string;
}) {
  const t = useTranslations('AppShell');
  const companyName = getActiveCompany(useCompanyState())?.company.name;
  const pathname = usePathname().replace(/^\/(?:en|ro)(?=\/|$)/, '').replace(/\/+$/, '') || '/';
  const activeSection = pathname === '/' || pathname === '/dashboard' ? 'dashboard' :
    pathname === '/vendors' || pathname.startsWith('/vendors/') ? 'suppliers' :
      pathname === '/documents' || pathname.startsWith('/documents/') ? 'documents' :
        /^\/company\/(documents|employees)(\/|$)/.test(pathname) ? 'company' :
      pathname === '/requirements' || pathname.startsWith('/requirements/') ? 'requirements' :
          pathname === '/notifications' || pathname.startsWith('/notifications/') ? 'notifications' :
            pathname === '/company/settings' || pathname.startsWith('/company/settings/') ? 'settings' : null;
  const settingsOverride = useSyncExternalStore(subscribeSettingsExpansion, () => settingsExpansion, () => null);
  const settingsExpanded = settingsOverride ?? activeSection === 'settings';
  const companyOverride = useSyncExternalStore(subscribeCompanyExpansion, () => companyExpansion, () => null);
  const companyExpanded = companyOverride ?? activeSection === 'company';
  const navigationRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (activeSection === 'settings' && settingsOverride === null) setSettingsExpansion(true);
  }, [activeSection, settingsOverride]);

  useLayoutEffect(() => {
    if (activeSection === 'company') setCompanyExpansion(true);
  }, [activeSection, pathname]);

  useLayoutEffect(() => {
    if (!(activeSection === 'settings' && settingsExpanded || activeSection === 'company' && companyExpanded) || !window.matchMedia?.('(max-width: 800px)')?.matches) return;
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
  }, [activeSection, pathname, settingsExpanded, companyExpanded]);

  return (
    <div className={styles.sidebarContents}>
      <div className={styles.brandArea}>
        <BrandWordmark className={styles.brand} />
        <p>{t('taglineOne')}<br />{t('taglineTwo')}</p>
      </div>

      <div className={styles.reducedUtilities}>
        <AppUtilities locale={locale} currentPath={currentPath} notifications={notifications} notificationReferenceTime={notificationReferenceTime} compact />
      </div>

      <nav ref={navigationRef} className={styles.navigation} aria-label={t('navigationLabel')}>
        {items.map((item) => {
          const content = <><AppIcon name={item.icon} size={22} /><span>{t(`navigation.${item.id}`)}</span>{item.id === 'notifications' && notificationCount > 0 && <span className={styles.notificationCount}>{notificationCount}</span>}</>;
          if (item.id === 'company') return <div key={item.id} className={styles.settingsGroup} data-company-group data-expanded={companyExpanded}>
            <button type="button" className={`${styles.navItem} ${styles.settingsToggle} ${activeSection === 'company' ? styles.active : ''}`} aria-label={t('navigation.company')} aria-expanded={companyExpanded} aria-controls={companyExpanded ? 'company-subnav' : undefined} onClick={() => setCompanyExpansion(!companyExpanded)}>{content}<AppIcon name="chevronDown" size={17}/></button>
            {companyExpanded && <div id="company-subnav" className={styles.settingsSubnav}>
              <SidebarNavigationItem href="/company/documents" active={pathname === '/company/documents' || pathname.startsWith('/company/documents/')} nested label={t('navigation.companyDocuments')} describedBy={companyName ? 'company-documents-workspace' : undefined}><AppIcon name="file" size={18}/><span className={styles.companyItemText}><span>{t('navigation.companyDocuments')}</span>{companyName && <small id="company-documents-workspace" title={companyName}>{companyName}</small>}</span></SidebarNavigationItem>
              <SidebarNavigationItem href="/company/employees" active={pathname === '/company/employees' || pathname.startsWith('/company/employees/')} nested><AppIcon name="users" size={18}/>{t('navigation.employees')}</SidebarNavigationItem>
            </div>}
          </div>;
          if (item.id === 'settings') return <div key={item.id} className={styles.settingsGroup} data-expanded={settingsExpanded}>
            <button type="button" className={`${styles.navItem} ${styles.settingsToggle} ${activeSection === 'settings' ? styles.active : ''}`} aria-label={t('navigation.settings')} aria-expanded={settingsExpanded} aria-controls={settingsExpanded ? 'company-settings-subnav' : undefined} onClick={() => setSettingsExpansion(!settingsExpanded)}>{content}<AppIcon name="chevronDown" size={17} /></button>
            {settingsExpanded && <div id="company-settings-subnav" className={styles.settingsSubnav}>
              <SidebarNavigationItem href="/company/settings/profile" active={pathname === '/company/settings/profile'} nested><AppIcon name="building" size={18}/>{t('navigation.companyProfile')}</SidebarNavigationItem>
              <SidebarNavigationItem href="/company/settings/members" active={pathname === '/company/settings/members'} nested><AppIcon name="users" size={18}/>{t('navigation.membersAccess')}</SidebarNavigationItem>
              <SidebarNavigationItem href="/company/settings/billing" active={pathname === '/company/settings/billing'} nested><AppIcon name="file" size={18}/>{t('navigation.plansBilling')}</SidebarNavigationItem>
            </div>}
          </div>;
          return <SidebarNavigationItem key={item.id} href={item.href} active={activeSection === item.id} availability={'availability' in item ? item.availability : 'available'}>{content}</SidebarNavigationItem>;
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <p className={styles.motto}>{t('mottoOne')}<br />{t('mottoTwo')}<br />{t('mottoThree')}</p>
        <CompanySwitcher />
      </div>
    </div>
  );
}
