'use client';

import {useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {setVendorLifecycle} from './created-vendors';
import type {VendorListItem} from './types';
import styles from './VendorsListPage.module.css';

export function VendorRowActions({vendor, open, onOpenChange}: {vendor: VendorListItem; open: boolean; onOpenChange: (open: boolean) => void}) {
  const t = useTranslations('Vendors');
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialItem = useRef(0);
  const [position, setPosition] = useState({left: 0, top: 0, width: 0});

  function close(restoreFocus = false) {
    onOpenChange(false);
    if (restoreFocus) triggerRef.current?.focus({preventScroll: true});
  }

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const gutter = 12;
      const width = Math.min(240, innerWidth - gutter * 2);
      const height = menuRef.current?.offsetHeight ?? 100;
      const left = Math.max(gutter, Math.min(trigger.right - width, innerWidth - width - gutter));
      const top = trigger.bottom + height + gutter <= innerHeight ? trigger.bottom + 4 : Math.max(gutter, trigger.top - height - 4);
      setPosition({left, top, width});
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) onOpenChange(false);
    }
    function focusOutside(event: FocusEvent) {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) onOpenChange(false);
    }
    place();
    menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[initialItem.current]?.focus({preventScroll: true});
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', focusOutside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', focusOutside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, onOpenChange]);

  return <>
    <button type="button" ref={triggerRef} aria-label={t('rowAction', {name: vendor.name})} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} className={styles.rowAction}
      onClick={() => {initialItem.current = 0; onOpenChange(!open);}} onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault(); initialItem.current = event.key === 'ArrowUp' ? 1 : 0; onOpenChange(true);}
        else if (event.key === 'Escape' && open) {event.preventDefault(); close(true);}
      }}><AppIcon name="more" size={21}/></button>
    {open && createPortal(<div id={id} ref={menuRef} role="menu" aria-label={t('rowAction', {name: vendor.name})} className={styles.rowMenu} style={position} onKeyDown={(event) => {
      if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); close(true);}
      else if (event.key === 'Tab') close(true);
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
      <Link href={`/vendors/${vendor.id}`} role="menuitem" tabIndex={-1} onClick={() => close()}>{t('openVendor')}</Link>
      <button type="button" role="menuitem" tabIndex={-1} onClick={() => {setVendorLifecycle(vendor.id, vendor.lifecycleStatus === 'active' ? 'inactive' : 'active'); close(true);}}>{t(vendor.lifecycleStatus === 'active' ? 'markInactive' : 'markActive')}</button>
    </div>, document.body)}
  </>;
}
