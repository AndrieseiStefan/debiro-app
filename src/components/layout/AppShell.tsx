import type {ReactNode} from 'react';
import styles from './AppShell.module.css';

export function AppShell({
  sidebar,
  header,
  sidebarLabel,
  children
}: {
  sidebar: ReactNode;
  header: ReactNode;
  sidebarLabel: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label={sidebarLabel}>{sidebar}</aside>
      <header className={styles.header}>{header}</header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
