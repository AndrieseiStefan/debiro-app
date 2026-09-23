import type {HTMLAttributes} from 'react';
import styles from './Containers.module.css';

export function PublicContainer({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.public, className].filter(Boolean).join(' ')} {...props} />;
}
