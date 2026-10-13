import type {InputHTMLAttributes} from 'react';
import styles from './Switch.module.css';

/** Existing Invite Vendor toggle geometry and keyboard focus treatment. */
export function Switch(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <span className={styles.control}><input {...props} type="checkbox" role={props.role ?? 'switch'}/><span className={styles.track} aria-hidden="true"/></span>;
}
