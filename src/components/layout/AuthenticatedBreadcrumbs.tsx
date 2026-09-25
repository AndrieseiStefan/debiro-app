import {Link} from '@/i18n/navigation';
import {AppIcon} from './AppIcon';
import styles from './AuthenticatedBreadcrumbs.module.css';

type BreadcrumbItem = {label: string; href?: string};

export function AuthenticatedBreadcrumbs({items, label}: {items: BreadcrumbItem[]; label: string}) {
  return <nav className={styles.breadcrumbs} aria-label={label}>
    {items.map((item, index) => <span className={styles.item} key={`${item.href ?? 'current'}-${item.label}`}>
      {index > 0 && <AppIcon name="chevronRight" size={15} />}
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item.label}</span>}
    </span>)}
  </nav>;
}
