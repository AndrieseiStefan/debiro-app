'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import menuStyles from './VendorsListPage.module.css';
import styles from './VendorDetailsPage.module.css';

export function VendorDocumentActions({name, reviewRoute, onRemove}: {name: string; reviewRoute?: string | null; onRemove?: () => void}) {
  const t = useTranslations('VendorTemplates');
  const [open, setOpen] = useState(false);
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
      setPosition({width, left: Math.max(12, Math.min(rect.right - width, innerWidth - width - 12)), top: rect.bottom + height + 12 <= innerHeight ? rect.bottom + 4 : Math.max(12, rect.top - height - 4)});
    }
    function outside(event: Event) {if (event.target instanceof Node && !trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false);}
    place(); menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => {document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);};
  }, [open]);
  function close() {setOpen(false); trigger.current?.focus({preventScroll: true});}
  if (!onRemove && reviewRoute) return <Link href={reviewRoute} aria-label={t('rowActions', {name})} className={styles.moreAction}><AppIcon name="more" size={19}/></Link>;
  return <><button ref={trigger} type="button" aria-label={t('rowActions', {name})} aria-haspopup="menu" aria-expanded={open} aria-disabled={!onRemove || undefined} className={styles.moreAction} onClick={onRemove ? () => setOpen(!open) : undefined} onKeyDown={(event) => {if (onRemove && ['ArrowDown', 'ArrowUp'].includes(event.key)) {event.preventDefault(); setOpen(true);}}}><AppIcon name="more" size={19}/></button>
    {open && createPortal(<div ref={menu} role="menu" aria-label={t('rowActions', {name})} className={menuStyles.rowMenu} style={position} onKeyDown={(event) => {
      if (event.key === 'Escape' || event.key === 'Tab') {if (event.key === 'Escape') event.preventDefault(); close();}
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {event.preventDefault(); const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')]; const index = items.indexOf(document.activeElement as HTMLElement); items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length]?.focus();}
    }}>{reviewRoute && <Link role="menuitem" tabIndex={-1} href={reviewRoute} onClick={close}>{t('review')}</Link>}<button role="menuitem" type="button" tabIndex={-1} onClick={() => {close(); onRemove?.();}}>{t('removeRequirement')}</button></div>, document.body)}
  </>;
}
