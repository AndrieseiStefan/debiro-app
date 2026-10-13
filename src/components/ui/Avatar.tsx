import type {HTMLAttributes} from 'react';
import styles from './Avatar.module.css';

/** Existing profile-menu initials treatment, also available at profile-page scale. */
export function Avatar({initials, size = 'normal', className, ...props}: HTMLAttributes<HTMLSpanElement> & {initials: string; size?: 'normal' | 'large'}) {
  return <span {...props} aria-hidden="true" className={[styles.avatar, className].filter(Boolean).join(' ')} data-size={size}>{initials}</span>;
}
