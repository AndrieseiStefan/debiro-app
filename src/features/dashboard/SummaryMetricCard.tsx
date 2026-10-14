import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {Surface} from '@/components/ui/Surface';
import {Link} from '@/i18n/navigation';
import styles from './DashboardPage.module.css';

export function SummaryMetricCard({title, value, note, icon, tone, chevron = false, href}: {title: string; value: number; note: string; icon: AppIconName; tone: 'blue' | 'green' | 'amber' | 'red' | 'gray'; chevron?: boolean; href?: string}) {
  const card = <Surface className={styles.metricCard} data-tone={tone}>
    <span className={`${styles.metricIcon} ${styles[tone]}`}><AppIcon name={icon} size={24}/></span>
    <div className={styles.metricCopy}><h2>{title}</h2><strong>{value}</strong><p className={styles[`${tone}Text`]}>{note}</p></div>
    {chevron && <AppIcon name="chevronRight" size={17} className={styles.metricChevron}/>}
  </Surface>;
  return href ? <Link href={href} className={styles.metricLink}>{card}</Link> : card;
}
