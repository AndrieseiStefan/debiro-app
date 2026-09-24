import type {CSSProperties} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {Button} from '@/components/ui/Button';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import type {DashboardActivityKind, DashboardDocumentStatus, DashboardViewModel, LocalizedSample} from './types';
import styles from './DashboardPage.module.css';

const metricAppearance: Record<'total' | 'compliant' | 'attention' | 'noncompliant', {icon: AppIconName; tone: string}> = {
  total: {icon: 'users', tone: 'blue'},
  compliant: {icon: 'check', tone: 'green'},
  attention: {icon: 'clock', tone: 'amber'},
  noncompliant: {icon: 'close', tone: 'red'}
};

const documentTones: Record<DashboardDocumentStatus, StatusTone> = {
  expired: 'danger',
  expiring: 'warning',
  missing: 'neutral'
};

const activityIcons: Record<DashboardActivityKind, AppIconName> = {
  uploaded: 'file',
  expiring: 'clock',
  expired: 'fileX',
  added: 'userPlus'
};

function sample(value: LocalizedSample, locale: string) {
  return locale === 'en' ? value.en : value.ro;
}

function SectionAction({children}: {children: React.ReactNode}) {
  return <button type="button" aria-disabled="true" className={styles.sectionAction}>{children}<AppIcon name="arrowRight" size={16} /></button>;
}

function SummaryMetricCard({id, value, note}: {id: keyof typeof metricAppearance; value: number; note: string}) {
  const t = useTranslations('Dashboard');
  const appearance = metricAppearance[id];

  return (
    <Surface className={styles.metricCard} data-tone={appearance.tone}>
      <span className={`${styles.metricIcon} ${styles[appearance.tone]}`}><AppIcon name={appearance.icon} size={24} /></span>
      <div className={styles.metricCopy}>
        <h2>{t(`summary.${id}`)}</h2>
        <strong>{value}</strong>
        <p className={styles[`${appearance.tone}Text`]}>{note}</p>
      </div>
      <AppIcon name="chevronRight" size={17} className={styles.metricChevron} />
    </Surface>
  );
}

function DocumentsAttentionPanel({view, locale}: {view: DashboardViewModel; locale: string}) {
  const t = useTranslations('Dashboard');

  return (
    <Surface className={styles.documentsPanel}>
      <div className={styles.panelHeader}>
        <h2><AppIcon name="file" size={22} />{t('documentsTitle')}</h2>
        <SectionAction>{t('viewAll')}</SectionAction>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.documentsTable}>
          <thead><tr>
            <th scope="col">{t('table.supplier')}</th>
            <th scope="col">{t('table.document')}</th>
            <th scope="col">{t('table.status')}</th>
            <th scope="col">{t('table.expiry')}</th>
            <th scope="col">{t('table.actions')}</th>
          </tr></thead>
          <tbody>
            {view.documentsRequiringAttention.map((document) => (
              <tr key={document.id}>
                <td className={styles.supplierCell}>{document.supplier}</td>
                <td>{sample(document.document, locale)}</td>
                <td><StatusBadge tone={documentTones[document.status]} className={styles.tableStatus}>{t(`documentStatus.${document.status}`)}</StatusBadge></td>
                <td className={styles[`${document.status}Date`]}>{sample(document.expiry, locale)}</td>
                <td><button type="button" aria-disabled="true" aria-label={t('table.rowAction', {supplier: document.supplier})} className={styles.rowAction}><AppIcon name="more" size={17} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.documentNotice}>
        <span><span className={styles.infoIcon}><AppIcon name="info" size={19} /></span>{t('urgentDocuments', {count: view.documentsRequiringAttention.length})}</span>
        <SectionAction>{t('checkAndUpdate')}</SectionAction>
      </div>
    </Surface>
  );
}

function SupplierStatusPanel({view}: {view: DashboardViewModel}) {
  const t = useTranslations('Dashboard');
  const {suppliers} = view;
  const compliantStop = (suppliers.compliant / suppliers.total) * 100;
  const attentionStop = ((suppliers.compliant + suppliers.attention) / suppliers.total) * 100;
  const donutStyle = {
    '--compliant-stop': `${compliantStop}%`,
    '--attention-stop': `${attentionStop}%`
  } as CSSProperties;
  const legend = [
    {id: 'compliant', value: suppliers.compliant, percent: suppliers.percentages.compliant, tone: 'green'},
    {id: 'attention', value: suppliers.attention, percent: suppliers.percentages.attention, tone: 'amber'},
    {id: 'noncompliant', value: suppliers.noncompliant, percent: suppliers.percentages.noncompliant, tone: 'red'},
    {id: 'missingDocuments', value: suppliers.missingDocuments, percent: suppliers.percentages.missingDocuments, tone: 'gray'}
  ] as const;

  return (
    <Surface className={styles.statusPanel}>
      <div className={styles.panelHeader}>
        <h2><AppIcon name="settings" size={21} />{t('supplierStatusTitle')}</h2>
        <SectionAction>{t('viewDetails')}</SectionAction>
      </div>
      <div className={styles.statusBody}>
        <div className={styles.donut} style={donutStyle} role="img" aria-label={`${t('supplierStatusTitle')}: ${suppliers.total} ${t('suppliersLower')}`}>
          <span><strong>{suppliers.total}</strong><small>{t('suppliersLower')}</small></span>
        </div>
        <ul className={styles.statusLegend}>
          {legend.map((item) => <li key={item.id}>
            <span className={`${styles.legendDot} ${styles[item.tone]}`} aria-hidden="true" />
            <span className={styles.legendLabel}>{t(`supplierStatus.${item.id}`)}</span>
            <strong>{item.value}</strong><small>{item.percent}%</small>
          </li>)}
        </ul>
      </div>
    </Surface>
  );
}

function RecentActivityPanel({view, locale}: {view: DashboardViewModel; locale: string}) {
  const t = useTranslations('Dashboard');

  return (
    <Surface className={styles.activityPanel}>
      <div className={styles.panelHeader}>
        <h2><AppIcon name="calendar" size={21} />{t('recentActivityTitle')}</h2>
        <SectionAction>{t('viewAll')}</SectionAction>
      </div>
      <ol className={styles.activityList}>
        {view.recentActivity.map((activity) => <li key={activity.id}>
          <span className={`${styles.activityIcon} ${styles[activity.kind]}`}><AppIcon name={activityIcons[activity.kind]} size={18} /></span>
          <span className={styles.activityCopy}><strong>{t(`activity.${activity.kind}`)}</strong><small>{activity.supplier}{activity.document && ` — ${sample(activity.document, locale)}`}</small></span>
          <time>{sample(activity.time, locale)}</time>
        </li>)}
      </ol>
    </Surface>
  );
}

export function DashboardPage({locale, view}: {locale: string; view: DashboardViewModel}) {
  const t = useTranslations('Dashboard');
  const {suppliers} = view;

  return (
    <AuthenticatedAppShell locale={locale} organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
      <div className={styles.pageContent}>
        <section className={styles.welcomeRow} aria-labelledby="dashboard-title">
          <div className={styles.welcomeCopy}>
            <p className={styles.welcomeEyebrow}>{t('welcomeEyebrow')}</p>
            <h1 id="dashboard-title">{t('welcomeTitle', {name: view.user.firstName})}</h1>
            <p>{t('welcomeDescription', {count: suppliers.total})}</p>
          </div>
          <div className={styles.welcomeActions}>
            <div className={styles.complianceCallout}><span><AppIcon name="target" size={27} /></span><p>{t('calloutOne')}<br />{t('calloutTwo')}</p></div>
            <Button className={styles.addSupplier} aria-disabled="true"><AppIcon name="plus" size={22} />{t('addSupplier')}</Button>
          </div>
        </section>

        <section className={styles.metricGrid} aria-label={t('supplierStatusTitle')}>
          <SummaryMetricCard id="total" value={suppliers.total} note={t('summary.monthlyIncrease', {count: suppliers.monthlyIncrease})} />
          <SummaryMetricCard id="compliant" value={suppliers.compliant} note={t('summary.percentOfTotal', {percent: suppliers.percentages.compliant})} />
          <SummaryMetricCard id="attention" value={suppliers.attention} note={t('summary.percentOfTotal', {percent: suppliers.percentages.attention})} />
          <SummaryMetricCard id="noncompliant" value={suppliers.noncompliant} note={t('summary.percentOfTotal', {percent: suppliers.percentages.noncompliant})} />
        </section>

        <div className={styles.dashboardPanels}>
          <DocumentsAttentionPanel view={view} locale={locale} />
          <div className={styles.rightPanels}>
            <SupplierStatusPanel view={view} />
            <RecentActivityPanel view={view} locale={locale} />
          </div>
        </div>

        <aside className={styles.banner} aria-label={t('bannerTitle')}>
          <div><h2>{t('bannerTitle')}</h2><p>{t('bannerDescription')}</p></div>
          <p className={styles.bannerHandwriting}>{t('bannerHandwriting')}</p>
        </aside>
      </div>
    </AuthenticatedAppShell>
  );
}
