'use client';

import {useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {Link} from '@/i18n/navigation';
import {currentUser, getActiveCompany, getCurrentMembership, useCompanyState} from '@/features/companies/company-state';
import {RoleBadge} from '@/features/company-settings/RoleVisual';
import styles from './ProfileDropdown.module.css';

// Desktop and compact controls are both mounted. This keeps their panels exclusive.
let openProfileId: string | null = null;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}
function setOpenProfile(id: string | null) {
  openProfileId = id;
  listeners.forEach((listener) => listener());
}

export function ProfileDropdown({compact, triggerClassName}: {
  compact: boolean;
  triggerClassName: string;
}) {
  const t = useTranslations('ProfileMenu');
  const app = useTranslations('AppShell');
  const members = useTranslations('CompanyMembers');
  const companyState = useCompanyState();
  const activeCompany = getActiveCompany(companyState);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const activeId = useSyncExternalStore(subscribe, () => openProfileId, () => null);
  const open = activeId === id;
  const [position, setPosition] = useState({left: 0, top: 0, width: 0, maxHeight: 0});
  const membership = activeCompany ? getCurrentMembership(activeCompany) : null;

  useEffect(() => () => {
    if (openProfileId === id) setOpenProfile(null);
  }, [id]);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const gutter = window.innerWidth <= 600 ? 12 : 16;
      const width = Math.min(320, window.innerWidth - 2 * gutter);
      const left = Math.max(gutter, Math.min(trigger.right - width, window.innerWidth - gutter - width));
      const compactHeaderBottom = compact ? triggerRef.current?.closest('aside')?.getBoundingClientRect().bottom ?? 0 : 0;
      const top = Math.max(trigger.bottom, compactHeaderBottom) + 9;
      setPosition({left, top, width, maxHeight: Math.max(0, window.innerHeight - top - gutter)});
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpenProfile(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpenProfile(null);
      triggerRef.current?.focus({preventScroll: true});
    }
    place();
    firstActionRef.current?.focus({preventScroll: true});
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, compact]);

  const rows: {key: 'myProfile' | 'myCompanies' | 'myInvitations'; icon: AppIconName; count?: number}[] = [
    {key: 'myProfile', icon: 'user'},
    {key: 'myCompanies', icon: 'building', count: companyState.companies.length},
    {key: 'myInvitations', icon: 'mail'}
  ];

  return <div className={styles.anchor}>
    <button ref={triggerRef} type="button" className={triggerClassName} aria-label={`${app('profileLabel')}: ${currentUser.fullName}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpenProfile(open ? null : id)}>
      <span>{currentUser.initials}</span><AppIcon name="chevronDown" size={16} />
    </button>
    {open && <div ref={panelRef} id={id} role="dialog" aria-label={t('title')} className={styles.panel} style={{left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight}}>
      <div className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">{currentUser.initials}</span>
        <div className={styles.identity}>
          <strong>{currentUser.fullName}</strong>
          <span className={styles.email}>{currentUser.email}</span>
        </div>
        <div className={styles.membership}>
          {membership && <RoleBadge role={membership.role} label={members(`roles.${membership.role}`)} className={styles.role} iconSize={13}/>}
          {activeCompany && <span>{t('inCompany', {company: activeCompany.company.name})}</span>}
        </div>
      </div>
      <div className={styles.actions}>
        {rows.map(({key, icon, count}, index) => key === 'myCompanies' ? <Link key={key} href="/profile/companies" onClick={() => setOpenProfile(null)} className={styles.row}>
          <AppIcon name={icon} size={19} /><span>{t(key)}</span><span className={styles.count}>{count}</span>
        </Link> : <button key={key} ref={index === 0 ? firstActionRef : undefined} type="button" aria-disabled="true" className={styles.row}>
          <AppIcon name={icon} size={19} /><span>{t(key)}</span>
        </button>)}
        <button type="button" aria-disabled="true" className={`${styles.row} ${styles.groupStart}`}>
          <AppIcon name="info" size={19} /><span>{t('help')}</span><AppIcon name="external" size={16} />
        </button>
        <button type="button" aria-disabled="true" className={`${styles.row} ${styles.groupStart} ${styles.logout}`}>
          <AppIcon name="logout" size={19} /><span>{t('logout')}</span>
        </button>
      </div>
    </div>}
  </div>;
}
