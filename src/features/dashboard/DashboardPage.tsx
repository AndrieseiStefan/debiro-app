'use client';

import {useCallback, useRef, useState, type CSSProperties} from 'react';
import {useRouter} from '@/i18n/navigation';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {AddVendorDrawer} from '@/features/vendors/AddVendorDrawer';
import {createLocalVendor, type NewVendorInput} from '@/features/vendors/created-vendors';
import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import type {DashboardActivityKind, DashboardDocumentStatus, DashboardViewModel, LocalizedSample} from './types';
import styles from './DashboardPage.module.css';
import {useDocumentRecords} from '@/features/documents/created-documents';
import {useVendorRequirements} from '@/features/vendors/vendor-requirements';
import {useVendorState, vendorListItems} from '@/features/vendors/created-vendors';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {useLocalAuditEvents} from '@/features/notifications/local-audit';
import {useCompanyState} from '@/features/companies/company-state';
import {projectDashboard} from './projections';
import {SummaryMetricCard as SharedSummaryMetricCard} from './SummaryMetricCard';
import {useUserProfile} from '@/features/profile/user-profile-state';

const metricAppearance: Record<'total' | 'compliant' | 'attention' | 'noncompliant', {icon: AppIconName; tone: 'blue' | 'green' | 'amber' | 'red'}> = {
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
  added: 'userPlus',
  updated: 'file'
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

  return <SharedSummaryMetricCard title={t(`summary.${id}`)} value={value} note={note} icon={appearance.icon} tone={appearance.tone} chevron/>;
}

function DocumentsAttentionPanel({view, locale}: {view: DashboardViewModel; locale: string}) {
  const t = useTranslations('Dashboard');
  const empty = useTranslations('CompanyWorkspace');

  return (
    <Surface className={styles.documentsPanel}>
      <div className={styles.panelHeader}>
        <h2><AppIcon name="file" size={22} />{t('documentsTitle')}</h2>
        <SectionAction>{t('viewAll')}</SectionAction>
      </div>
      {view.documentsRequiringAttention.length === 0 ? <EmptyState icon={<AppIcon name="check" size={25}/>} title={empty('noAttention')}/> : <><div className={styles.tableScroll}>
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
      </div></>}
    </Surface>
  );
}

function SupplierStatusPanel({view}: {view: DashboardViewModel}) {
  const t = useTranslations('Dashboard');
  const {suppliers} = view;
  const compliantStop = suppliers.total ? (suppliers.compliant / suppliers.total) * 100 : 0;
  const attentionStop = suppliers.total ? ((suppliers.compliant + suppliers.attention) / suppliers.total) * 100 : 0;
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
        <div className={styles.donut} data-empty={suppliers.total === 0 || undefined} style={donutStyle} role="img" aria-label={`${t('supplierStatusTitle')}: ${suppliers.total} ${t('suppliersLower')}`}>
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
  const empty = useTranslations('CompanyWorkspace');

  return (
    <Surface className={styles.activityPanel}>
      <div className={styles.panelHeader}>
        <h2><AppIcon name="calendar" size={21} />{t('recentActivityTitle')}</h2>
        <SectionAction>{t('viewAll')}</SectionAction>
      </div>
      {view.recentActivity.length === 0 ? <EmptyState icon={<AppIcon name="calendar" size={25}/>} title={empty('noActivity')}/> : <ol className={styles.activityList}>
        {view.recentActivity.map((activity) => <li key={activity.id}>
          <span className={`${styles.activityIcon} ${styles[activity.kind]}`}><AppIcon name={activityIcons[activity.kind]} size={18} /></span>
          <span className={styles.activityCopy}><strong>{activity.action ? sample(activity.action, locale) : t(`activity.${activity.kind === 'updated' ? 'added' : activity.kind}`)}</strong><small>{activity.supplier}{activity.document && ` — ${sample(activity.document, locale)}`}</small></span>
          <time>{sample(activity.time, locale)}</time>
        </li>)}
      </ol>}
    </Surface>
  );
}

export function DashboardPage({locale, view: initialView}: {locale: string; view: DashboardViewModel}) {
  const user = useUserProfile();
  const t = useTranslations('Dashboard');
  const empty = useTranslations('CompanyWorkspace');
  const router = useRouter();
  const companyId = useCompanyState().activeCompanyId ?? '';
  const [addPhase, setAddPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const addTrigger = useRef<HTMLButtonElement>(null);
  const closeAdd = useCallback(() => setAddPhase('closing'), []);
  const finishAdd = useCallback(() => setAddPhase('closed'), []);
  function createVendor(input: NewVendorInput) {const vendor = createLocalVendor(input, companyId); router.push(`/vendors/${vendor.id}`);}
  const local = useLocalAuditEvents().filter((event) => event.companyId === companyId);
  const view = projectDashboard(initialView, companyId, vendorListItems(useVendorState(), companyId), useVendorRequirements(), useDocumentRecords(), [...notificationsFixture.auditEvents, ...local]);
  const {suppliers} = view;

  return (
    <AuthenticatedAppShell locale={locale} currentPath="/dashboard" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
      <div className={styles.pageContent}>
        <AuthenticatedPageHeader
          context={<p className={styles.welcomeEyebrow}>{t('welcomeEyebrow')}</p>}
          title={t('welcomeTitle', {name: user.firstName})}
          titleId="dashboard-title"
          description={t('welcomeDescription', {count: suppliers.total})}
          supportingContent={<div className={styles.complianceCallout}><span><AppIcon name="target" size={27} /></span><p>{t('calloutOne')}<br />{t('calloutTwo')}</p></div>}
        />

        <section className={styles.metricGrid} aria-label={t('supplierStatusTitle')}>
          <SummaryMetricCard id="total" value={suppliers.total} note={t('summary.monthlyIncrease', {count: suppliers.monthlyIncrease})} />
          <SummaryMetricCard id="compliant" value={suppliers.compliant} note={t('summary.percentOfTotal', {percent: suppliers.percentages.compliant})} />
          <SummaryMetricCard id="attention" value={suppliers.attention} note={t('summary.percentOfTotal', {percent: suppliers.percentages.attention})} />
          <SummaryMetricCard id="noncompliant" value={suppliers.noncompliant} note={t('summary.percentOfTotal', {percent: suppliers.percentages.noncompliant})} />
        </section>

        {suppliers.total === 0 && <div className={styles.firstRun}><EmptyState icon={<AppIcon name="users" size={25}/>} title={empty('firstRunTitle')} description={empty('vendorsDescription')} action={<Button ref={addTrigger} onClick={() => setAddPhase('open')}><AppIcon name="plus" size={20}/>{empty('firstVendor')}</Button>}/></div>}
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
      {addPhase !== 'closed' && <AddVendorDrawer key={companyId} phase={addPhase} onClose={closeAdd} onExited={finishAdd} triggerRef={addTrigger} onCreate={createVendor}/>}
    </AuthenticatedAppShell>
  );
}
