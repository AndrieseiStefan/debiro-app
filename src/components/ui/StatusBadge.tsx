import type {HTMLAttributes} from 'react';
import styles from './StatusBadge.module.css';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone: StatusTone;
};

export function StatusBadge({tone, className, children, ...props}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={[styles.badge, styles[tone], className].filter(Boolean).join(' ')}
      data-tone={tone}
    >
      <span aria-hidden="true" className={styles.dot} />
      {children}
    </span>
  );
}
