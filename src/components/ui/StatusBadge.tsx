import type {HTMLAttributes} from 'react';
import styles from './StatusBadge.module.css';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone: StatusTone;
  indicator?: 'dot' | 'none';
};

export function StatusBadge({tone, indicator = 'dot', className, children, ...props}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={[styles.badge, styles[tone], className].filter(Boolean).join(' ')}
      data-tone={tone}
    >
      {indicator === 'dot' && <span aria-hidden="true" className={styles.dot} />}
      {children}
    </span>
  );
}
