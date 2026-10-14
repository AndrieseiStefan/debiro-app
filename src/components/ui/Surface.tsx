import {forwardRef, type HTMLAttributes} from 'react';
import styles from './Surface.module.css';

export const Surface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Surface({className, ...props}, ref) {
  return <div ref={ref} className={[styles.surface, className].filter(Boolean).join(' ')} {...props} />;
});
