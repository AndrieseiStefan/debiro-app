'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import menuStyles from './VendorsListPage.module.css';
import styles from './VendorDetailsPage.module.css';

export function VendorDocumentActions({name, reviewRoute, onRemove, actions, actionLabel, className, icon = 'more', withinDialog = false}: {name: string; reviewRoute?: string | null; onRemove?: () => void; actions?: {label: string; onClick?: () => void; href?: string; disabled?: boolean}[]; actionLabel?: string; className?: string; icon?: AppIconName; withinDialog?: boolean}) {
  const t = useTranslations('VendorTemplates');
  const label = actionLabel ?? t('rowActions', {name});
  const available = Boolean(onRemove || actions?.length);
  const [open, setOpen] = useState(false);
  const [menuHost, setMenuHost] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({left: 0, top: 0, width: 220});
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(220, innerWidth - 24);
      const height = menu.current?.offsetHeight ?? 90;
      const host = menuHost;
      const hostRect = host?.getBoundingClientRect();
      setPosition({width,
        left: Math.max(hostRect ? hostRect.left + 12 : 12, Math.min(rect.right - width, innerWidth - width - 12)) - (hostRect?.left ?? 0) + (host?.scrollLeft ?? 0),
        top: (rect.bottom + height + 12 <= innerHeight ? rect.bottom + 4 : Math.max(12, rect.top - height - 4)) - (hostRect?.top ?? 0) + (host?.scrollTop ?? 0)});
    }
    function outside(event: Event) {if (event.target instanceof Node && !trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false);}
    place(); menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus(withinDialog ? {preventScroll: true} : undefined);
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => {document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);};
  }, [open, menuHost, withinDialog]);
  function close() {setOpen(false); trigger.current?.focus({preventScroll: true});}
  function openMenu() {
    // Keep drawer menus inside the existing dialog's focus/scroll boundary.
    setMenuHost(withinDialog ? trigger.current?.closest<HTMLElement>('[role="dialog"]') ?? null : null);
    setOpen(true);
  }
  if (!available && reviewRoute) return <Link href={reviewRoute} aria-label={label} className={styles.moreAction}><AppIcon name="more" size={19}/></Link>;
  return <><button ref={trigger} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-disabled={!available || undefined} className={className ?? styles.moreAction} onClick={available ? () => open ? close() : openMenu() : undefined} onKeyDown={(event) => {if (available && ['ArrowDown', 'ArrowUp'].includes(event.key)) {event.preventDefault(); openMenu();}}}><AppIcon name={icon} size={19}/></button>
    {open && createPortal(<div ref={menu} role="menu" aria-label={label} className={menuStyles.rowMenu} style={{...position, ...(withinDialog && {position: 'absolute'})}} onKeyDown={(event) => {
      if (event.key === 'Escape' || event.key === 'Tab') {if (event.key === 'Escape') {event.preventDefault(); if (withinDialog) event.stopPropagation();} close();}
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {event.preventDefault(); const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')]; const index = items.indexOf(document.activeElement as HTMLElement); items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length]?.focus();}
    }}>{reviewRoute && <Link role="menuitem" tabIndex={-1} href={reviewRoute} onClick={close}>{t('review')}</Link>}{onRemove && <button role="menuitem" type="button" tabIndex={-1} onClick={() => {close(); onRemove();}}>{t('removeRequirement')}</button>}{actions?.map((action) => action.href && !action.disabled ? <Link key={action.label} role="menuitem" tabIndex={-1} href={action.href} onClick={close}>{action.label}</Link> : <button key={action.label} role="menuitem" type="button" tabIndex={-1} disabled={action.disabled} onClick={() => {close(); action.onClick?.();}}>{action.label}</button>)}</div>, menuHost ?? document.body)}
  </>;
}
