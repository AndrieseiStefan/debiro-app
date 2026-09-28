'use client';

import {useId, useLayoutEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {getActiveCompany, getCurrentMembership, currentUser, switchActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {AppIcon} from './AppIcon';
import sidebar from './AppSidebar.module.css';
import styles from './CompanySwitcher.module.css';

export function CompanySwitcher() {
  const t = useTranslations('Companies');
  const roles = useTranslations('CompanyMembers');
  const snapshot = useCompanyState();
  const active = getActiveCompany(snapshot);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({left: 0, top: 0, width: 0, maxHeight: 0});
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstCompanyRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const gutter = 12;
      const width = Math.min(260, window.innerWidth - gutter * 2);
      const compact = window.innerWidth <= 800;
      const left = compact ? Math.max(gutter, Math.min(trigger.right - width, window.innerWidth - gutter - width)) : Math.max(gutter, Math.min(trigger.left, window.innerWidth - gutter - width));
      const panelHeight = panelRef.current?.scrollHeight ?? 320;
      const compactHeaderBottom = compact ? triggerRef.current?.closest('aside')?.getBoundingClientRect().bottom ?? 0 : 0;
      const top = compact ? compactHeaderBottom + 8 : Math.max(gutter, trigger.top - panelHeight - 8);
      const maxHeight = compact ? Math.max(0, window.innerHeight - top - gutter) : Math.max(0, trigger.top - top - 8);
      setPosition({left, top, width, maxHeight});
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({preventScroll: true});
    }
    place();
    firstCompanyRef.current?.focus({preventScroll: true});
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
  }, [open, snapshot.companies.length]);

  return <div className={styles.anchor}>
    <button ref={triggerRef} type="button" className={sidebar.accountCard} aria-label={active?.company.name ?? t('noCompanies')} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((value) => !value)}>
      <span className={sidebar.companyIcon}><AppIcon name="building" size={22}/></span>
      <span className={sidebar.accountText}><strong>{active?.company.name ?? t('noCompanies')}</strong><small>{currentUser.fullName}</small></span>
      <AppIcon name="chevronRight" size={18}/>
    </button>
    {open && <div ref={panelRef} id={id} role="dialog" aria-label={t('switchTitle')} className={styles.panel} style={{left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight}}>
      <h2>{t('switchTitle')}</h2>
      {snapshot.companies.length === 0 ? <p className={styles.empty}>{t('noCompanies')}</p> : <div className={styles.list}>
        {snapshot.companies.map((record, index) => {
          const membership = getCurrentMembership(record);
          const isActive = record.company.id === snapshot.activeCompanyId;
          return <button ref={index === 0 ? firstCompanyRef : undefined} type="button" key={record.company.id} aria-pressed={isActive} className={styles.company} onClick={() => {switchActiveCompany(record.company.id); setOpen(false); triggerRef.current?.focus({preventScroll: true});}}>
            <span className={styles.companyAvatar} aria-hidden="true">{record.company.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase()}</span>
            <span className={styles.companyCopy}><strong>{record.company.name}</strong><small>{membership ? roles(`roles.${membership.role}`) : '—'}</small></span>
            {isActive && <AppIcon name="check" size={18}/>}
          </button>;
        })}
      </div>}
      <Link href="/profile/companies" className={styles.footer} onClick={() => setOpen(false)}><AppIcon name="building" size={18}/><span>{t('viewAll')}</span><AppIcon name="chevronRight" size={17}/></Link>
    </div>}
  </div>;
}
