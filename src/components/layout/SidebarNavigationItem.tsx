'use client';

import type {ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {Tooltip} from '@/components/ui/Tooltip';
import styles from './AppSidebar.module.css';

export type NavigationAvailability = 'available' | 'comingSoon';

/** Primary and nested destinations share availability semantics without changing their geometry. */
export function SidebarNavigationItem({href, active = false, availability = 'available', nested = false, label, describedBy, children}: {
  href: string; active?: boolean; availability?: NavigationAvailability; nested?: boolean; label?: string; describedBy?: string; children: ReactNode;
}) {
  const t = useTranslations('AppShell');
  const baseClass = nested ? styles.settingsLink : styles.navItem;
  if (availability === 'comingSoon') return <Tooltip content={t('navigationComingSoon')} placement="right">{(props) =>
    <button {...props} type="button" aria-disabled="true" className={`${baseClass} ${styles.comingSoon}`} onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') event.preventDefault();}}>{children}</button>
  }</Tooltip>;
  return <Link href={href} aria-label={label} aria-describedby={describedBy} aria-current={active ? 'page' : undefined} className={`${baseClass} ${active ? nested ? styles.settingsActive : styles.active : ''}`}>{children}</Link>;
}
