'use client';

import {useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import styles from './RowActionMenu.module.css';

type MenuAction = {label: string; href?: string; onSelect?: () => void; destructive?: boolean};
/** Existing Vendors contextual menu pattern, shared by authenticated data rows. */
export function RowActionMenu({label, items, open, onOpenChange}: {label: string; items: MenuAction[]; open: boolean; onOpenChange: (open: boolean) => void}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const initialItem = useRef(0);
  const [position, setPosition] = useState({left: 0, top: 0, width: 240});
  function close(restoreFocus = false) {onOpenChange(false); if (restoreFocus) trigger.current?.focus({preventScroll: true});}
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const gutter = 12, width = Math.min(240, innerWidth - 2 * gutter);
      const height = menu.current?.offsetHeight ?? 100;
      setPosition({width, left: Math.max(gutter, Math.min(anchor.right - width, innerWidth - width - gutter)), top: anchor.bottom + height + gutter <= innerHeight ? anchor.bottom + 4 : Math.max(gutter, anchor.top - height - 4)});
    }
    function outside(event: Event) {if (event.target instanceof Node && !trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) onOpenChange(false);}
    place(); menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[initialItem.current]?.focus({preventScroll: true});
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => {document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true);};
  }, [open, onOpenChange]);
  if (!items.length) return null;
  return <>
    <button ref={trigger} type="button" className={styles.rowAction} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => {initialItem.current = 0; onOpenChange(!open);}} onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault(); initialItem.current = event.key === 'ArrowUp' ? items.length - 1 : 0; onOpenChange(true);}
        else if (event.key === 'Escape' && open) {event.preventDefault(); close(true);}
      }}><AppIcon name="more" size={21}/></button>
    {open && createPortal(<div id={id} ref={menu} role="menu" aria-label={label} className={styles.rowMenu} style={position} onKeyDown={(event) => {
      if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); close(true);}
      else if (event.key === 'Tab') close(true);
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
        const current = controls.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
        controls[next]?.focus();
      }
    }}>{items.map((item) => item.href ? <Link key={item.label} href={item.href} role="menuitem" tabIndex={-1} onClick={() => close()}>{item.label}</Link> : <button key={item.label} type="button" role="menuitem" tabIndex={-1} className={item.destructive ? styles.destructive : undefined} onClick={() => {close(true); item.onSelect?.();}}>{item.label}</button>)}</div>, document.body)}
  </>;
}
