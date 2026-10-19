import type {CSSProperties} from 'react';
import styles from './DashboardPage.module.css';

type Segment = {id: string; label: string; count: number; tone: 'green' | 'amber' | 'red' | 'gray'};
const colors = {green: '#0ca56d', amber: '#f0a511', red: '#e6344b', gray: '#9cacc1'};

/** Presentation only: callers supply existing, authorized domain counts and labels. */
export function DashboardStatusChart({total, label, description, segments}: {total: number; label: string; description: string; segments: Segment[]}) {
  const stops = segments.map((segment, index) => {
    const preceding = segments.slice(0, index).reduce((count, item) => count + item.count, 0);
    return `${colors[segment.tone]} ${total ? preceding / total * 100 : 0}% ${total ? (preceding + segment.count) / total * 100 : 0}%`;
  });
  return <div className={styles.vendorChart}>
    <div className={styles.donut} data-empty={!total || undefined} style={{'--chart-stops': stops.join(', ')} as CSSProperties} role="img" aria-label={description}><span><strong>{total}</strong><small>{label}</small></span></div>
    <ul className={styles.chartLegend}>{segments.map((segment) => <li key={segment.id} data-chart-segment={segment.id}><i className={`${styles.legendDot} ${styles[segment.tone]}`} aria-hidden="true"/><span>{segment.label}</span><strong>{segment.count}</strong></li>)}</ul>
  </div>;
}
