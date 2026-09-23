import type {HTMLAttributes} from 'react';
import styles from './Containers.module.css';

export function PortalContainer({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.portal, className].filter(Boolean).join(' ')} {...props} />;
}
