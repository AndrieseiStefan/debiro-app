import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {Surface} from '@/components/ui/Surface';
import {Link} from '@/i18n/navigation';
import styles from './DashboardPage.module.css';
import documentStyles from '@/components/ui/DocumentSummary.module.css';

export function SummaryMetricCard({title, value, note, icon, tone, chevron = false, href, variant = 'dashboard'}: {title: string; value: number; note: string; icon: AppIconName; tone: 'blue' | 'green' | 'amber' | 'red' | 'gray'; chevron?: boolean; href?: string; variant?: 'dashboard' | 'documents'}) {
  const card = variant === 'documents' ? <Surface className={documentStyles.card} data-tone={tone} data-status={tone === 'amber' ? 'expiring' : tone === 'red' ? 'review' : tone === 'green' ? 'valid' : 'total'}>
    <div className={documentStyles.body}><span className={documentStyles.icon}><AppIcon name={icon} size={25}/></span><div className={documentStyles.copy}><h2>{title}</h2><strong>{value}</strong><p>{note}</p></div>{chevron && <AppIcon name="chevronRight" size={19} className={documentStyles.chevron}/>}</div>
  </Surface> : <Surface className={styles.metricCard} data-tone={tone}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><AppIcon name={icon} size={24}/></span>
    <div className={styles.metricCopy}><h2>{title}</h2><strong>{value}</strong><p className={styles[`${tone}Text`]}>{note}</p></div>
    {chevron && <AppIcon name="chevronRight" size={17} className={styles.metricChevron}/>}
  </Surface>;
  return href ? <Link href={href} className={styles.metricLink}>{card}</Link> : card;
}
