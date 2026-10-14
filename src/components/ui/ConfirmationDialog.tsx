'use client';

import {useId, useRef, type RefObject} from 'react';
import {Button, type ButtonVariant} from './Button';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import styles from './ConfirmationDialog.module.css';
import {Modal} from './Modal';

export function ConfirmationDialog({onCancel, onConfirm, title, description, cancelLabel, confirmLabel, backgroundSelector, icon, confirmVariant = 'destructive', fallbackFocusRef}: {
  onCancel: () => void; onConfirm: () => void; title: string; description: string; cancelLabel: string; confirmLabel: string; backgroundSelector?: string; icon?: AppIconName; confirmVariant?: ButtonVariant; fallbackFocusRef?: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  return <Modal role="alertdialog" onClose={onCancel} titleId={`${id}-title`} descriptionId={`${id}-description`} className={styles.dialog} backgroundSelector={backgroundSelector} initialFocusRef={continueRef} fallbackFocusRef={fallbackFocusRef}>
      {icon && <span className={styles.icon} aria-hidden="true"><AppIcon name={icon} size={24}/></span>}<h2 id={`${id}-title`}>{title}</h2><p id={`${id}-description`}>{description}</p>
      <div><Button ref={continueRef} variant="secondary" onClick={onCancel}>{cancelLabel}</Button><Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button></div>
  </Modal>;
}
