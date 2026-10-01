'use client';

import {useCallback, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Drawer} from './Drawer';
import {FilterTrigger} from './FilterTrigger';
import styles from './FilterPanel.module.css';

const mediaQuery = '(max-width: 600px)';
function subscribe(listener: () => void) {
  const media = window.matchMedia?.(mediaQuery);
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}
const getSnapshot = () => window.matchMedia?.(mediaQuery).matches ?? false;
const getServerSnapshot = () => false;

// Domain fields/state stay with the view; containment, focus and dismissal live here.
export function FilterPanel({activeCount, onReset, children, className}: {activeCount: number; onReset: () => void; children: ReactNode; className?: string}) {
  const t = useTranslations('DataFilters');
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const narrow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({left: 0, top: 0, width: 320, maxHeight: 600});
  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || narrow) return;
    function place() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const gutter = 12;
      const width = Math.min(320, innerWidth - gutter * 2);
      const height = panelRef.current?.scrollHeight ?? 300;
      const anchorTop = Math.max(gutter, Math.min(trigger.top, innerHeight - gutter));
      const anchorBottom = Math.max(gutter, Math.min(trigger.bottom, innerHeight - gutter));
      const below = innerHeight - anchorBottom - gutter - 8;
      const above = anchorTop - gutter - 8;
      const useBelow = height <= below || below >= above;
      const maxHeight = Math.max(0, Math.min(innerHeight - gutter * 2, useBelow ? below : above));
      const top = useBelow ? Math.max(gutter, Math.min(anchorBottom + 8, innerHeight - gutter - maxHeight)) : Math.max(gutter, anchorTop - 8 - Math.min(height, maxHeight));
      setPosition({left: Math.max(gutter, Math.min(trigger.right - width, innerWidth - width - gutter)), top, width, maxHeight});
    }
    function outside(event: Event) {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
      triggerRef.current?.focus({preventScroll: true});
    }
    place();
    panelRef.current?.focus({preventScroll: true});
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, narrow, close]);

  const content = <>
    <header className={styles.header}><h2 id={titleId}>{t('title')}</h2><button type="button" onClick={onReset}>{t('reset')}</button></header>
    <p id={descriptionId} className={styles.srOnly}>{t('description')}</p>
    <div className={styles.fields}>{children}</div>
  </>;

  return <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
    <FilterTrigger ref={triggerRef} activeCount={activeCount} aria-expanded={open} aria-haspopup="dialog" aria-controls={open && !narrow ? id : undefined} onClick={() => setOpen((current) => !current)}/>
    {open && (narrow ? <Drawer phase="open" onClose={close} onExited={close} triggerRef={triggerRef} titleId={titleId} descriptionId={descriptionId} closeLabel={t('close')} contentClassName={styles.drawerContent}>{content}</Drawer> : createPortal(
      <div id={id} ref={panelRef} role="dialog" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className={styles.popover} style={position} onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])')];
        if ((!event.shiftKey && document.activeElement === controls.at(-1)) || (event.shiftKey && document.activeElement === controls[0])) {
          close();
          triggerRef.current?.focus({preventScroll: true});
          // Continue into the view's normal tab order; Shift+Tab returns to the trigger.
          if (event.shiftKey) event.preventDefault();
        }
      }}>{content}</div>, document.body
    ))}
  </div>;
}
