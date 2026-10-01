'use client';

import {useEffect, useId, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Button} from './Button';
import styles from './ConfirmationDialog.module.css';

export function ConfirmationDialog({onCancel, onConfirm, title, description, cancelLabel, confirmLabel, backgroundSelector}: {
  onCancel: () => void; onConfirm: () => void; title: string; description: string; cancelLabel: string; confirmLabel: string; backgroundSelector?: string;
}) {
  const id = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = backgroundSelector ? document.querySelector<HTMLElement>(backgroundSelector) : document.querySelector<HTMLElement>('main')?.parentElement;
    const previousInert = background?.inert ?? false;
    const previousHidden = background?.getAttribute('aria-hidden');
    const previousOverflow = document.body.style.overflow;
    if (background) {background.inert = true; background.setAttribute('aria-hidden', 'true');}
    document.body.style.overflow = 'hidden';
    continueRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {event.preventDefault(); event.stopImmediatePropagation(); onCancel();}
      if (event.key === 'Tab') {
        // A confirmation above a Drawer owns focus until it is dismissed.
        event.stopImmediatePropagation();
        const dialog = continueRef.current?.closest('[role="alertdialog"]');
        const buttons = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        if (event.shiftKey && document.activeElement === buttons[0]) {event.preventDefault(); buttons.at(-1)?.focus();}
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {event.preventDefault(); buttons[0]?.focus();}
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (background) {
        background.inert = previousInert;
        if (previousHidden == null) background.removeAttribute('aria-hidden');
        else background.setAttribute('aria-hidden', previousHidden);
      }
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
      else (document.querySelector<HTMLElement>('[data-template-id][data-selected="true"]') ?? document.querySelector<HTMLElement>('[data-page-primary-action]'))?.focus({preventScroll: true});
    };
  }, [onCancel, backgroundSelector]);
  return createPortal(<div className={styles.backdrop}>
    <div role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className={styles.dialog}>
      <h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p>
      <div><Button ref={continueRef} variant="secondary" onClick={onCancel}>{cancelLabel}</Button><Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button></div>
    </div>
  </div>, document.body);
}
