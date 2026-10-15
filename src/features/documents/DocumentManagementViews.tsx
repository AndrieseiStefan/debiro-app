import type {ReactNode} from 'react';
import {AppIcon} from '@/components/layout/AppIcon';
import styles from './DocumentManagementDrawer.module.css';

/** Shared details/history presentation only; no vendor/company selectors or authorization. */
export function DocumentFileCard({filename, fileType, fileSize, action}: {filename: string; fileType?: string; fileSize?: number; action: ReactNode}) {
  const type = ({'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG'} as Record<string, string>)[fileType ?? ''] ?? (fileType || '—');
  return <div className={styles.fileCard}><AppIcon name={type === 'PDF' ? 'filePdf' : 'file'} size={32}/><span><strong>{filename}</strong><small>{type}{fileSize && fileSize > 0 ? ` · ${Math.ceil(fileSize / 1024)} KB` : ''}</small></span>{action}</div>;
}
export type HistoryPresentation = {id: string; version: number; state: 'current' | 'rejected' | 'superseded'; dateTime: string; date: string; actor: string; summary: ReactNode; context?: ReactNode; menu?: ReactNode; filename?: string};
export function DocumentVersionHistory({entries}: {entries: HistoryPresentation[]}) {
  return <ol className={styles.timeline}>{entries.map((item) => <li key={item.id} data-version={item.version} data-version-state={item.state}>
    <div className={styles.versionProvenance}><strong>v{item.version}</strong><time dateTime={item.dateTime}>{item.date}</time><span>{item.actor}</span>{item.filename && <small>{item.filename}</small>}</div>
    <div className={styles.versionSummary}><div className={styles.versionActions}>{item.summary}</div>{item.menu}{item.context}</div>
  </li>)}</ol>;
}
