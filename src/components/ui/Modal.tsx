'use client';

import {useEffect, useRef, type ReactNode, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import styles from './Modal.module.css';

/** Shared existing confirmation behavior, also used by larger compositional dialogs. */
export function Modal({children, onClose, titleId, descriptionId, role = 'dialog', className, blurred = false, backgroundSelector, initialFocusRef, fallbackFocusRef}: {
  children: ReactNode; onClose: () => void; titleId: string; descriptionId: string; role?: 'dialog' | 'alertdialog'; className: string; blurred?: boolean; backgroundSelector?: string; initialFocusRef?: RefObject<HTMLElement | null>; fallbackFocusRef?: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const fallbackFocus = fallbackFocusRef?.current;
    const background = backgroundSelector ? document.querySelector<HTMLElement>(backgroundSelector) : document.querySelector<HTMLElement>('main')?.parentElement;
    const previousInert = background?.inert ?? false, previousHidden = background?.getAttribute('aria-hidden'), previousOverflow = document.body.style.overflow;
    if (background) {background.inert = true; background.setAttribute('aria-hidden', 'true');}
    document.body.style.overflow = 'hidden';
    (initialFocusRef?.current ?? panelRef.current)?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {event.preventDefault(); if (role === 'alertdialog') event.stopImmediatePropagation(); onClose();}
      if (event.key !== 'Tab') return;
      if (role === 'alertdialog') event.stopImmediatePropagation();
      const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])].filter((item) => item.getClientRects().length > 0);
      if (!controls.length) {event.preventDefault(); panelRef.current?.focus();}
      else if (!panelRef.current?.contains(document.activeElement)) {event.preventDefault(); controls[0].focus();}
      else if (event.shiftKey && document.activeElement === controls[0]) {event.preventDefault(); controls.at(-1)?.focus();}
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) {event.preventDefault(); controls[0].focus();}
    }
    const capture = role === 'alertdialog';
    document.addEventListener('keydown', onKeyDown, capture);
    return () => {
      document.removeEventListener('keydown', onKeyDown, capture);
      if (background) {background.inert = previousInert; if (previousHidden == null) background.removeAttribute('aria-hidden'); else background.setAttribute('aria-hidden', previousHidden);}
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
      else (fallbackFocus ?? background?.querySelector<HTMLElement>('h2[tabindex="-1"]') ?? document.querySelector<HTMLElement>('[data-template-id][data-selected="true"]') ?? document.querySelector<HTMLElement>('[data-page-primary-action]'))?.focus({preventScroll: true});
    };
  }, [onClose, backgroundSelector, fallbackFocusRef, initialFocusRef, role]);
  // Like existing ConfirmationDialog, backdrop clicks do not dismiss a modal.
  return createPortal(<div className={styles.backdrop} data-blurred={blurred || undefined}><div ref={panelRef} tabIndex={-1} role={role} aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className={className}>{children}</div></div>, document.body);
}
