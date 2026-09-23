import type {ReactNode} from 'react';
import styles from './StateContainers.module.css';

export function ErrorState({
  title,
  description,
  retryAction
}: {
  title: ReactNode;
  description?: ReactNode;
  retryAction?: ReactNode;
}) {
  return (
    <div className={styles.state} role="alert">
      <strong className={styles.title}>{title}</strong>
      {description && <p className={styles.description}>{description}</p>}
      {retryAction && <div className={styles.action}>{retryAction}</div>}
    </div>
  );
}
