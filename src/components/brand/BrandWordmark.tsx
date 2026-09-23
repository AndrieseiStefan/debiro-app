import type {HTMLAttributes} from 'react';
import styles from './BrandWordmark.module.css';

export function BrandWordmark({className, ...props}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={[styles.wordmark, className].filter(Boolean).join(' ')} {...props}>
      debiro
    </span>
  );
}
