import type {ReactNode} from 'react';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {Surface} from '@/components/ui/Surface';
import {Link} from '@/i18n/navigation';
import {Tooltip} from '@/components/ui/Tooltip';
import styles from './DashboardPage.module.css';
import documentStyles from '@/components/ui/DocumentSummary.module.css';
import directory from '@/features/vendors/VendorsListPage.module.css';

export function SummaryMetricCard({title, value, note, icon, tone, chevron = false, href, variant = 'dashboard', unavailable}: {title: string; value: number | null; note: ReactNode; icon: AppIconName; tone: 'blue' | 'green' | 'amber' | 'red' | 'gray'; chevron?: boolean; href?: string; variant?: 'dashboard' | 'documents' | 'directory' | 'overview'; unavailable?: string}) {
  if (variant === 'overview') return <Link href={href!} className={styles.metricLink}><Surface className={styles.overviewMetric} data-tone={tone}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><AppIcon name={icon} size={25}/></span><div className={styles.overviewMetricCopy}><h2>{title}</h2><strong>{value ?? '—'}</strong></div><AppIcon name="chevronRight" size={18} className={styles.metricChevron}/>
    <p className={styles.overviewMetricNote}>{note}</p>
  </Surface></Link>;
  if (variant === 'directory') {
    const content = <><span className={directory.summaryIcon}><AppIcon name={icon} size={25}/></span><span className={directory.summaryCopy}><span>{title}</span><strong>{value ?? '—'}</strong></span></>;
    return <Surface className={directory.summaryCard} data-status={tone === 'amber' ? 'attention' : tone === 'red' ? 'noncompliant' : tone === 'green' ? 'compliant' : 'all'}>
      {unavailable ? <Tooltip content={unavailable}>{(props) => <button {...props} type="button" className={documentStyles.directoryAction} aria-label={`${title}: ${unavailable}`} aria-disabled="true" onKeyDown={(event) => {if (['Enter', ' '].includes(event.key)) event.preventDefault();}}>{content}</button>}</Tooltip> : content}
    </Surface>;
  }
  const content = <><span className={documentStyles.icon}><AppIcon name={icon} size={25}/></span><div className={documentStyles.copy}><h2>{title}</h2><strong>{value ?? '—'}</strong><p>{note}</p></div>{chevron && <AppIcon name="chevronRight" size={19} className={documentStyles.chevron}/>}</>;
  const card = variant === 'documents' ? <Surface className={documentStyles.card} data-unavailable={unavailable ? true : undefined} data-tone={tone} data-status={tone === 'amber' ? 'expiring' : tone === 'red' ? 'review' : tone === 'green' ? 'valid' : 'total'}>
    {unavailable ? <Tooltip content={unavailable}>{(props) => <button {...props} type="button" className={documentStyles.action} aria-label={`${title}: ${unavailable}`} aria-disabled="true" onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') event.preventDefault();}}>{content}</button>}</Tooltip> : <div className={documentStyles.body}>{content}</div>}
  </Surface> : <Surface className={styles.metricCard} data-tone={tone}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><AppIcon name={icon} size={24}/></span>
    <div className={styles.metricCopy}><h2>{title}</h2><strong>{value ?? '—'}</strong><p className={styles[`${tone}Text`]}>{note}</p></div>
    {chevron && <AppIcon name="chevronRight" size={17} className={styles.metricChevron}/>}
  </Surface>;
  return href ? <Link href={href} className={styles.metricLink}>{card}</Link> : card;
}
