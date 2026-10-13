import type {ReactNode} from 'react';
import styles from './StateContainers.module.css';

export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={styles.state}>
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <strong className={styles.title}>{title}</strong>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
