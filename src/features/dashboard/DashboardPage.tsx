'use client';

import {useCallback, useRef, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {Avatar} from '@/components/ui/Avatar';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {SectionAction} from '@/components/ui/SectionAction';
import {AddVendorDrawer} from '@/features/vendors/AddVendorDrawer';
import {createLocalVendor, useVendorState, type NewVendorInput} from '@/features/vendors/created-vendors';
import {VendorComplianceBadge} from '@/features/vendors/VendorComplianceBadge';
import {useVendorRequirements} from '@/features/vendors/vendor-requirements';
import {useDocumentRecords} from '@/features/documents/created-documents';
import {CompanyDocumentManager, type CompanyManagementSelection} from '@/features/company-documents/CompanyDocumentManager';
import {useCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {useEmployeeState} from '@/features/employees/employees-state';
import {useLocalAuditEvents} from '@/features/notifications/local-audit';
import {activityIcons} from '@/features/notifications/presentation';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {localizedDate} from '@/lib/fixture-clock';
import {SummaryMetricCard} from './SummaryMetricCard';
import {DashboardStatusChart} from './DashboardStatusChart';
import {workspaceOverview} from './workspace-overview';
import type {DashboardViewModel} from './types';
import styles from './DashboardPage.module.css';

/** Existing CSS compliance chart and directory counts; inactive lifecycle is neutral, not noncompliant. */
function VendorComplianceChart({view, inactive}: {view: DashboardViewModel; inactive: number}) {
  const t = useTranslations('Dashboard'), vendors = useTranslations('Vendors'), {suppliers: s} = view;
  return <DashboardStatusChart total={s.total} label={t('suppliersLower')} description={`${t('supplierStatusTitle')}: ${s.total} ${t('suppliersLower')}`} segments={[
    ...([{id: 'compliant', tone: 'green'}, {id: 'attention', tone: 'amber'}, {id: 'noncompliant', tone: 'red'}] as const).map(({id, tone}) => ({id, tone, count: s[id], label: t(`supplierStatus.${id}`)})),
    ...(inactive > 0 ? [{id: 'inactive', tone: 'gray' as const, count: inactive, label: vendors('inactive')}] : [])
  ]}/>;
}
function Panel({id, title, companyName, icon, description, href, action, children}: {id: string; title: string; companyName?: string; icon: AppIconName; description: string; href: string; action: string; children: ReactNode}) {
  return <Surface className={styles.overviewPanel} role="region" aria-labelledby={`${id}-title`} data-dashboard-panel={id}><div className={styles.overviewPanelHeading}><div className={styles.panelTitle}><h2 id={`${id}-title`}><AppIcon name={icon} size={23}/>{title}</h2>{companyName && <small className={styles.panelCompany}>{companyName}</small>}</div><SectionAction mode="navigate" href={href}>{action}</SectionAction></div><p className={styles.overviewPanelDescription}>{description}</p>{children}</Surface>;
}
function Note({count, children, tone}: {count: number; children: ReactNode; tone: string}) {return <span data-tone={tone}><i aria-hidden="true"/>{count} {children}</span>;}
function PreviewRow({href, onClick, icon = 'file', avatar, title, description, trailing, compact = false}: {href?: string; onClick?: () => void; icon?: AppIconName; avatar?: string; title: string; description?: ReactNode; trailing?: ReactNode; compact?: boolean}) {
  const content = <>{avatar ? <Avatar initials={avatar}/> : <span className={styles.previewIcon}><AppIcon name={icon} size={21}/></span>}<span className={styles.previewCopy}><strong>{title}</strong>{description && <small>{description}</small>}</span>{trailing && <span className={styles.previewTrailing}>{trailing}</span>}{(href || onClick) && <AppIcon name="chevronRight" size={16} className={styles.previewChevron}/>}</>;
  const className = `${styles.previewRow} ${compact ? styles.compactRow : ''}`;
  return href ? <Link className={className} href={href}>{content}</Link> : onClick ? <button className={className} type="button" onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
}

export function DashboardPage({locale, view: base}: {locale: string; view: DashboardViewModel}) {
  const language = locale === 'en' ? 'en' : 'ro', t = useTranslations('Dashboard'), app = useTranslations('AppShell'), vendorsT = useTranslations('Vendors'), companyT = useTranslations('CompanyDocuments'), employeesT = useTranslations('Employees'), employeeDocs = useTranslations('EmployeeDocuments'), empty = useTranslations('CompanyWorkspace'), foundation = useTranslations('Foundation');
  const company = getActiveCompany(useCompanyState()), companyId = company?.company.id ?? '';
  const overview = workspaceOverview(companyId, language, {base, vendorState: useVendorState(), requirements: useVendorRequirements(), documents: useDocumentRecords(), companyDocuments: useCompanyDocumentsState(), employees: useEmployeeState(), events: useLocalAuditEvents()});
  const router = useRouter(), addTrigger = useRef<HTMLButtonElement>(null);
  const [addPhase, setAddPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [document, setDocument] = useState<{companyId: string; selection: CompanyManagementSelection} | null>(null);
  const closeAdd = useCallback(() => setAddPhase('closing'), []), finishAdd = useCallback(() => setAddPhase('closed'), []);
  function createVendor(input: NewVendorInput) {const vendor = createLocalVendor(input, companyId); router.push(`/vendors/${vendor.id}`);}
  function openDocument(requirementId: string, documentId?: string) {setDocument({companyId, selection: {mode: 'details', requirementId, documentId}});}
  const {suppliers: s} = overview.vendorView;
  const employeeSegments = overview.employees.tracking ? ([
    {id: 'complete', tone: 'green'}, {id: 'attention', tone: 'amber'}, {id: 'not_configured', tone: 'gray'}
  ] as const).map(({id, tone}) => ({id, tone, count: overview.employees.tracking![id], label: id === 'complete' ? t('overview.employeeComplete') : employeeDocs(`tracking.${id}`)})) : [];
  const error = <ErrorState title={foundation('errorTitle')} description={foundation('errorDescription')}/>;
  const date = (value: string) => localizedDate(value)[language];
  return <AuthenticatedAppShell locale={locale} currentPath="/dashboard" organizationName={company?.company.name ?? ''} userName={base.user.fullName} userInitials={base.user.initials} notificationCount={base.notificationCount}>
    <div className={styles.pageContent}>
      <AuthenticatedPageHeader context={<span className={styles.dashboardContext}>{app('navigation.dashboard')}</span>} title={t('overview.title')} titleId="dashboard-title" description={t('overview.description')}/>
      {!overview.available ? error : <>
        <section className={styles.overviewMetrics} aria-label={t('overview.summary')}>
          <SummaryMetricCard variant="overview" title={vendorsT('title')} value={overview.vendorError ? null : s.total} icon="users" tone="blue" href="/vendors" note={overview.vendorError ? foundation('errorTitle') : <><Note tone="success" count={s.compliant}>{vendorsT('status.compliant')}</Note><Note tone="warning" count={s.attention}>{vendorsT('status.attention')}</Note><Note tone="danger" count={s.noncompliant}>{vendorsT('status.noncompliant')}</Note></>}/>
          <SummaryMetricCard variant="overview" title={companyT('title')} value={overview.company.error ? null : overview.company.metrics.total} icon="file" tone="blue" href="/company/documents" note={overview.company.error ? foundation('errorTitle') : <><Note tone="danger" count={overview.company.metrics.attention}>{companyT('attention')}</Note><Note tone="warning" count={overview.company.expiring}>{companyT('status.expiring_soon')}</Note><Note tone="success" count={overview.company.valid}>{companyT('status.valid')}</Note></>}/>
          <SummaryMetricCard variant="overview" title={t('overview.totalEmployees')} value={overview.employees.error && !overview.employees.total ? null : overview.employees.total} detail={!overview.employees.error && t('overview.employeePopulation', {active: overview.employees.active, inactive: overview.employees.inactive})} icon="users" tone="blue" href="/company/employees" note={overview.employees.restricted ? employeeDocs('restricted') : overview.employees.error ? employeeDocs('unavailable') : employeeSegments.map((segment) => <Note key={segment.id} tone={segment.tone === 'green' ? 'success' : segment.tone === 'amber' ? 'warning' : 'neutral'} count={segment.count}>{segment.label}</Note>)}/>
        </section>
        <div className={styles.domainGrid}>
          <Panel id="vendors" title={vendorsT('title')} icon="users" description={t('overview.vendorsDescription')} href="/vendors" action={t('overview.viewAllPeople')}>
            {overview.vendorError ? error : <><VendorComplianceChart view={overview.vendorView} inactive={overview.inactiveVendors}/><h3 className={styles.previewSubheading}>{t('overview.vendorAttention')}</h3>
              {!s.total ? <EmptyState title={empty('vendorsTitle')} description={empty('vendorsDescription')} action={overview.canManage && <Button ref={addTrigger} onClick={() => setAddPhase('open')}>{empty('firstVendor')}</Button>}/> : !overview.vendorPreview.length ? <EmptyState title={empty('noAttention')}/> : <ul className={styles.previewList}>{overview.vendorPreview.map((vendor) => <li key={vendor.id} data-dashboard-vendor={vendor.id}><PreviewRow href={`/vendors/${vendor.id}`} icon="building" title={vendor.name} description={`${vendorsT('table.documents')}: ${vendor.documentCount}/${vendor.documentTarget}`} trailing={<VendorComplianceBadge status={vendor.status}/>}/></li>)}</ul>}
            </>}
          </Panel>
          <Panel id="company-documents" title={companyT('title')} companyName={company?.company.name || undefined} icon="file" description={t('overview.companyDescription')} href="/company/documents" action={t('viewAll')}>
            {overview.company.error ? error : !overview.company.preview.length ? <EmptyState title={overview.company.rows.length ? empty('noAttention') : companyT('empty')}/> : <ul className={styles.previewList}>{overview.company.preview.map((row) => <li key={row.id} data-dashboard-company-document={row.id}><PreviewRow href={!row.requirementId ? '/company/documents' : undefined} onClick={row.requirementId ? () => openDocument(row.requirementId!, row.currentDocumentId ?? undefined) : undefined} title={row.name} description={row.issuer ?? companyT(`types.${row.documentType}`)} trailing={<><StatusBadge size="document" tone={row.status === 'expired' || row.status === 'missing' ? 'danger' : 'warning'}>{companyT(`status.${row.status}`)}</StatusBadge>{row.expiresAt && <time dateTime={row.expiresAt}>{date(row.expiresAt)}</time>}</>}/></li>)}</ul>}
          </Panel>
          <Panel id="employees" title={employeesT('title')} icon="users" description={t('overview.employeesDescription')} href="/company/employees" action={t('overview.viewAllPeople')}>
            {overview.employees.error ? error : overview.employees.restricted ? <EmptyState title={employeeDocs('restricted')} description={employeeDocs('restrictedDescription')}/> : <>
              {overview.employees.tracking && <DashboardStatusChart total={overview.employees.tracking.total} label={t('overview.activeEmployees')} description={`${employeeDocs('trackingLabel')}: ${overview.employees.tracking.total} ${t('overview.activeEmployees')}`} segments={employeeSegments}/>}
              <h3 className={styles.previewSubheading}>{t('overview.employeeAttention')}</h3>
              {!overview.employees.preview.length ? <div className={styles.compactEmpty}><EmptyState title={t('overview.noEmployeeAttention')}/></div> : <ul className={styles.previewList}>{overview.employees.preview.map((entry) => <li key={entry.employee.id} data-dashboard-employee={entry.employee.id}><PreviewRow href={entry.href} avatar={`${entry.employee.firstName[0]}${entry.employee.lastName[0]}`} title={entry.name} description={<>{entry.employee.jobTitle}{entry.attention && <span className={styles.employeeIssue}>{t(`overview.employeeIssues.${entry.attention.status}`, {count: entry.attention.count})}</span>}</>} trailing={<StatusBadge size="document" tone="warning">{employeeDocs('tracking.attention')}</StatusBadge>}/></li>)}</ul>}
            </>}
          </Panel>
        </div>
        <div className={styles.overviewBottom}>
          <Panel id="activity" title={t('recentActivityTitle')} icon="bars" description={t('overview.activityDescription')} href="/notifications#audit-title" action={t('overview.viewAllActivity')}>
            {!overview.activity.length ? <EmptyState title={empty('noActivity')}/> : <ul className={styles.previewList}>{overview.activity.map((item) => {
              const type = item.domain === 'vendor' ? item.event.eventType : ['employee_created', 'employee_edited', 'metadata_updated'].includes(item.event.type) ? 'other' : item.event.type as keyof typeof activityIcons;
              return <li key={item.id} data-dashboard-event={item.id}><PreviewRow compact href={item.href} icon={activityIcons[type]} title={item.domain === 'vendor' ? item.event.action[language] : employeeDocs(`events.${item.event.type}`)} description={[item.event.actorName, item.context].filter(Boolean).join(' — ')} trailing={<time dateTime={item.occurredAt}>{date(item.occurredAt)}{!item.dateOnly && `, ${new Intl.DateTimeFormat(language, {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'}).format(new Date(item.occurredAt))}`}</time>}/></li>;
            })}</ul>}
          </Panel>
          <Panel id="expirations" title={t('overview.expirationsTitle')} icon="clock" description={t('overview.expirationsDescription')} href="/notifications#expiring-section" action={t('viewAll')}>
            {!overview.expirations.length ? <EmptyState title={t('overview.noExpirations')}/> : <ul className={styles.previewList}>{overview.expirations.map((item) => <li key={item.id} data-dashboard-expiration={item.id}><PreviewRow compact href={item.href} onClick={item.domain === 'company_document' && item.requirementId ? () => openDocument(item.requirementId!, item.documentId) : undefined} title={item.name} description={item.domain === 'company_document' ? app('navigation.company') : item.owner} trailing={<><StatusBadge size="document" tone="warning">{t('overview.daysRemaining', {count: item.daysRemaining})}</StatusBadge><time dateTime={item.expiresAt}>{date(item.expiresAt)}</time></>}/></li>)}</ul>}
          </Panel>
        </div>
      </>}
    </div>
    {overview.available && addPhase !== 'closed' && <AddVendorDrawer key={companyId} phase={addPhase} onClose={closeAdd} onExited={finishAdd} triggerRef={addTrigger} onCreate={createVendor}/>}
    {overview.available && document?.companyId === companyId && overview.company.rows.some((row) => row.requirementId === document.selection.requirementId) && <CompanyDocumentManager key={companyId} companyId={companyId} locale={language} selection={document.selection} onClose={() => setDocument(null)} onSuccess={() => {}}/>}
  </AuthenticatedAppShell>;
}
