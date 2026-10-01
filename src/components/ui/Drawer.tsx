'use client';

import {useEffect, useRef, type ReactNode, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {AppIcon} from '@/components/layout/AppIcon';
import styles from './Drawer.module.css';

export type DrawerPhase = 'open' | 'closing';

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function Drawer({phase, onClose, onExited, triggerRef, titleId, descriptionId, closeLabel, contentClassName, panelClassName, children}: {
  phase: DrawerPhase;
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  titleId: string;
  descriptionId: string;
  closeLabel: string;
  contentClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (phase !== 'closing') return;
    const timer = window.setTimeout(onExited, 240);
    return () => window.clearTimeout(timer);
  }, [phase, onExited]);

  useEffect(() => {
    panelRef.current?.focus();
    const background = document.querySelector<HTMLElement>('main')?.parentElement;
    const trigger = triggerRef.current;
    const previousInert = background?.inert ?? false;
    const previousHidden = background?.getAttribute('aria-hidden');
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (background) {background.inert = true; background.setAttribute('aria-hidden', 'true');}
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {event.preventDefault(); onClose(); return;}
      if (event.key !== 'Tab') return;
      const focusables = [...(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((item) => item.getClientRects().length > 0);
      if (focusables.length === 0) {event.preventDefault(); panelRef.current?.focus(); return;}
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (!panelRef.current?.contains(document.activeElement)) {event.preventDefault(); first.focus();}
      else if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (background) {
        background.inert = previousInert;
        if (previousHidden == null) background.removeAttribute('aria-hidden');
        else background.setAttribute('aria-hidden', previousHidden);
      }
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo(scrollX, scrollY);
      trigger?.focus();
    };
  }, [onClose, triggerRef]);

  return createPortal(<div className={styles.backdrop} data-phase={phase} onMouseDown={(event) => {if (event.target === event.currentTarget) {event.preventDefault(); onClose();}}}>
    <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className={[styles.drawer, panelClassName].filter(Boolean).join(' ')} data-phase={phase}>
      <div className={[styles.content, contentClassName].filter(Boolean).join(' ')}>
        <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}><AppIcon name="close" size={23}/></button>
        {children}
      </div>
    </aside>
  </div>, document.body);
}
