import type {HTMLAttributes} from 'react';
import styles from './Containers.module.css';

export function PageContainer({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.page, className].filter(Boolean).join(' ')} {...props} />;
}
