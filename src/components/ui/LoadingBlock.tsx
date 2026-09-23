import styles from './LoadingBlock.module.css';

export function LoadingBlock({label}: {label: string}) {
  return (
    <div className={styles.block} role="status" aria-label={label}>
      <div className={styles.line} aria-hidden="true" />
      <div className={styles.lineShort} aria-hidden="true" />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
