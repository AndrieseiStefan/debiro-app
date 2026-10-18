'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {Button, ButtonLink} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {Avatar} from '@/components/ui/Avatar';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {AppIcon} from '@/components/layout/AppIcon';
import {SummaryMetricCard} from '@/features/dashboard/SummaryMetricCard';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import type {CompanyManagementSelection} from '@/features/company-documents/CompanyDocumentManager';
import {employeeDocumentAccess, employeeDocumentWorkspace, employeeWorkspace, useEmployeeState} from './employees-state';
import {employeeDocumentMetrics, projectEmployeeDocuments} from './employee-document-projections';
import {departmentName, employeeName} from './projections';
import {EmployeeDrawer} from './EmployeeDrawer';
import {EmployeeDocumentPanel} from './EmployeeDocumentPanel';
import {EmployeeActivityPanel} from './EmployeeActivityPanel';
import tabs from '@/features/vendors/VendorDetailsPage.module.css';
import styles from './EmployeeDetails.module.css';

export function EmployeeDetailsPage({locale, employeeId}: {locale: string; employeeId: string}) {
  const companyId = getActiveCompany(useCompanyState())?.company.id ?? '';
  return <AuthenticatedAppShell locale={locale} currentPath={`/company/employees/${encodeURIComponent(employeeId)}`} organizationName="" userName="" userInitials="">
    <EmployeeDetailsWorkspace key={`${companyId}:${employeeId}`} companyId={companyId} employeeId={employeeId} locale={locale === 'en' ? 'en' : 'ro'}/>
  </AuthenticatedAppShell>;
}

function EmployeeDetailsWorkspace({companyId, employeeId, locale}: {companyId: string; employeeId: string; locale: 'ro' | 'en'}) {
  const t = useTranslations('EmployeeDocuments'), people = useTranslations('Employees'), app = useTranslations('AppShell');
  const snapshot = useEmployeeState(), workspace = employeeWorkspace(companyId, snapshot), employee = workspace.employees.find((item) => item.id === employeeId);
  const access = employeeDocumentAccess(companyId, employeeId), owned = employeeDocumentWorkspace(companyId, employeeId, snapshot);
  const projection = owned ? projectEmployeeDocuments(owned, companyId, employeeId, locale) : null, metrics = projection && !projection.error ? employeeDocumentMetrics(projection.rows) : null;
  const [tab, setTab] = useState<'documents' | 'activity'>('documents'), [editing, setEditing] = useState(false), [feedback, setFeedback] = useState('');
  const [selection, setSelection] = useState<CompanyManagementSelection | null>(null);
  if (!employee) return <Surface><ErrorState title={people('employeeUnavailable')} description={people('errors.unavailable')} retryAction={<ButtonLink href="/company/employees" variant="secondary">{people('back')}</ButtonLink>}/></Surface>;
  return <div className={styles.page}>
    <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs root={{label: app('navigation.company')}} items={[{label: people('title'), href: '/company/employees'}, {label: employeeName(employee)}]} label={people('breadcrumbLabel')}/>} title={t('title')} titleId="employee-title" description={t('description')}
      actions={access.replace && <div className={styles.headerActions}><Button variant="secondary" onClick={() => setEditing(true)}><AppIcon name="edit" size={21}/>{people('edit')}</Button><AuthenticatedPagePrimaryAction icon="plus" onClick={() => {setTab('documents'); setSelection({mode: 'add'});}}>{t('add')}</AuthenticatedPagePrimaryAction></div>}/>
    {feedback && <p role="status">{feedback}</p>}
    <Surface className={styles.profile}><div className={styles.identity}><Avatar size="large" initials={`${employee.firstName[0]}${employee.lastName[0]}`}/><div><h2>{employeeName(employee)}</h2><p><AppIcon name="briefcase" size={17}/>{employee.jobTitle} · <StatusBadge tone={employee.employmentStatus === 'active' ? 'success' : 'neutral'} size="compact">{people(employee.employmentStatus)}</StatusBadge></p>
      <dl className={styles.contacts}>{([{icon: 'users', label: t('department'), value: departmentName(workspace, employee) || '—'}, {icon: 'mail', label: people('email'), value: employee.email}, {icon: 'phone', label: t('phone'), value: employee.phone || '—'}, {icon: 'calendar', label: people('hireDate'), value: new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(`${employee.hireDate}T12:00:00Z`))}] as const).map(({icon, label, value}) => <div key={label}><dt><AppIcon name={icon} size={21}/>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div></div><div className={styles.tracking}><h3>{t('trackingLabel')}</h3><StatusBadge tone={metrics?.tracking === 'complete' ? 'success' : metrics?.tracking === 'attention' ? 'warning' : 'neutral'}>{t(!access.visible ? 'restricted' : metrics ? `tracking.${metrics.tracking}` : 'unavailable')}</StatusBadge></div></Surface>
    {access.visible ? <>
      <section className={styles.metrics} aria-label={t('summaryLabel')}>
        {([{key: 'total', title: 'documents', icon: 'file', tone: 'blue'}, {key: 'valid', title: 'valid', icon: 'check', tone: 'green'}, {key: 'expiring', title: 'expiring', icon: 'clock', tone: 'amber'}, {key: 'missing', title: 'missing', icon: 'fileX', tone: 'red'}] as const).map(({key, title, icon, tone}) => <SummaryMetricCard key={key} variant="documents" title={t(title)} value={metrics?.[key] ?? null} note={t(`notes.${key}`)} unavailable={metrics ? undefined : t('unavailableDescription')} icon={icon} tone={tone}/>)}
      </section>
      <div className={tabs.tabs} role="tablist" aria-label={t('tabsLabel')}>{(['documents', 'activity'] as const).map((value, index) => <button type="button" role="tab" key={value} id={`employee-tab-${value}`} aria-controls={`employee-${value}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} className={tab === value ? tabs.activeTab : undefined} onClick={() => setTab(value)} onKeyDown={(event) => {if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 'documents' : event.key === 'End' ? 'activity' : index === 0 ? 'activity' : 'documents'; setTab(next); document.getElementById(`employee-tab-${next}`)?.focus();}}><AppIcon name={value === 'documents' ? 'file' : 'bars'} size={21}/>{t(value)}</button>)}</div>
      {tab === 'documents' ? <EmployeeDocumentPanel companyId={companyId} employeeId={employeeId} locale={locale} selection={selection} onSelection={setSelection} onEditEmployee={() => setEditing(true)}/> : <EmployeeActivityPanel companyId={companyId} employeeId={employeeId} locale={locale}/>}
    </> : <Surface className={styles.documents}><EmptyState title={t('restricted')} description={t('restrictedDescription')}/></Surface>}
    {editing && access.replace && <EmployeeDrawer companyId={companyId} employeeId={employeeId} onClose={() => setEditing(false)} onSuccess={() => setFeedback(people('success.updated'))}/>}
  </div>;
}
