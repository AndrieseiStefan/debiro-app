'use client';

import {useState, type MouseEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {SearchInput} from '@/components/ui/SearchInput';
import {SelectField} from '@/components/ui/SelectField';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {RowActionMenu} from '@/components/ui/RowActionMenu';
import {Pagination} from '@/components/ui/Pagination';
import {SummaryMetricCard} from '@/features/dashboard/SummaryMetricCard';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import table from '@/components/ui/DataTable.module.css';
import directory from '@/features/vendors/VendorsListPage.module.css';
import {employeeAccess, employeeDocumentWorkspace, employeeWorkspace, setEmployeeStatus, useEmployeeState} from './employees-state';
import {employeeDocumentMetrics, employeeListDocumentMetrics, projectEmployeeDocuments} from './employee-document-projections';
import {departmentName, employeeName, filterEmployees, sortEmployees} from './projections';
import {EmployeeDrawer} from './EmployeeDrawer';
import type {EmployeeSort} from './types';
import styles from './Employees.module.css';

export function EmployeesPage({locale}: {locale: string}) {
  const company = getActiveCompany(useCompanyState());
  return <AuthenticatedAppShell locale={locale} currentPath="/company/employees" organizationName={company?.company.name ?? ''} userName="" userInitials="">
    <EmployeesWorkspace key={company?.company.id ?? ''} companyId={company?.company.id ?? ''} locale={locale}/>
  </AuthenticatedAppShell>;
}

function EmployeesWorkspace({companyId, locale}: {companyId: string; locale: string}) {
  const t = useTranslations('Employees'), app = useTranslations('AppShell'), foundation = useTranslations('Foundation');
  const workspace = employeeWorkspace(companyId, useEmployeeState()), access = employeeAccess(companyId), router = useRouter();
  const documentsT = useTranslations('EmployeeDocuments');
  const documentMetrics = new Map(workspace.employees.map((employee) => {const owned = employeeDocumentWorkspace(companyId, employee.id); const projection = owned && projectEmployeeDocuments(owned, companyId, employee.id, locale === 'en' ? 'en' : 'ro'); return [employee.id, projection && !projection.error ? employeeDocumentMetrics(projection.rows) : null];}));
  const activeMetrics = employeeListDocumentMetrics(workspace.employees, documentMetrics);
  const privateMetricsAvailable = access.manage && !activeMetrics.error;
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [department, setDepartment] = useState('all'), [tracking, setTracking] = useState('all');
  const [sort, setSort] = useState<EmployeeSort>({column: 'name', direction: 'ascending'});
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<{id?: string} | null>(null), [menu, setMenu] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(''), [failure, setFailure] = useState(false);
  const filtered = sortEmployees(filterEmployees(workspace, query, status, department).filter((employee) => !access.manage || tracking === 'all' || documentMetrics.get(employee.id)?.tracking === tracking), workspace, sort, locale);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeCount = Number(status !== 'all') + Number(department !== 'all') + Number(access.manage && tracking !== 'all');
  function resetFilters() {setStatus('all'); setDepartment('all'); setTracking('all'); setPage(1);}
  function reset() {setQuery(''); resetFilters();}
  function sortColumn(column: EmployeeSort['column']) {setSort({column, direction: sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending'}); setPage(1);}
  const sortable = (column: EmployeeSort['column']) => <th scope="col" aria-sort={sort.column === column ? sort.direction : undefined}><button type="button" className={directory.sortHeader} data-active={sort.column === column || undefined} onClick={() => sortColumn(column)}>{t(`table.${column}`)}<span aria-hidden="true">{sort.column === column ? sort.direction === 'ascending' ? '↑' : '↓' : '↕'}</span></button></th>;
  function openRow(event: MouseEvent<HTMLTableRowElement>, href: string) {
    // Progressive pointer enhancement: the native name link remains the keyboard/new-tab target.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
      !(event.target instanceof Element) || event.target.closest('a, button, input, select, textarea, [role="menu"], [role="menuitem"]') || window.getSelection()?.toString()) return;
    router.push(href);
  }
  return <div className={styles.page}>
    <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs root={{label: app('navigation.company')}} items={[{label: t('title')}]} label={t('breadcrumbLabel')}/>} title={t('title')} titleId="employees-title" description={t('description')}
      actions={access.manage && <AuthenticatedPagePrimaryAction icon="plus" onClick={() => {setFeedback(''); setEditing({});}}>{t('add')}</AuthenticatedPagePrimaryAction>}/>
    {feedback && <p role="status">{feedback}</p>}{failure && <p role="alert">{t('errors.save')}</p>}
    {workspace.error ? <Surface><ErrorState title={foundation('errorTitle')} description={t('errors.unavailable')}/></Surface> : <>
      <section className={`${directory.summaryGrid} ${styles.summaryGrid}`} aria-label={t('summaryLabel')}>
        <SummaryMetricCard variant="directory" title={t('total')} value={workspace.employees.length} note={t('totalDescription')} icon="users" tone="blue"/>
        <SummaryMetricCard variant="directory" title={t('attention')} value={privateMetricsAvailable ? activeMetrics.attention : null} note={documentsT('attentionNote')} unavailable={privateMetricsAvailable ? undefined : documentsT(access.manage ? 'unavailableDescription' : 'restrictedDescription')} icon="warning" tone="amber"/>
        <SummaryMetricCard variant="directory" title={t('expiring')} value={privateMetricsAvailable ? activeMetrics.expiring : null} note={documentsT('expiringNote')} unavailable={privateMetricsAvailable ? undefined : documentsT(access.manage ? 'unavailableDescription' : 'restrictedDescription')} icon="clock" tone="amber"/>
      </section>
      <section className={directory.filterGrid} aria-label={t('filters')}>
        <SearchInput className={directory.vendorSearch} label={t('search')} placeholder={t('searchPlaceholder')} value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}}/>
        <FilterPanel activeCount={activeCount} onReset={resetFilters}>
          <SelectField id="employee-status-filter" label={t('employmentFilter')} value={status} onChange={(event) => {setStatus(event.target.value); setPage(1);}}><option value="all">{t('allStatuses')}</option><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></SelectField>
          <SelectField id="employee-department-filter" label={t('departmentFilter')} value={department} onChange={(event) => {setDepartment(event.target.value); setPage(1);}}><option value="all">{t('allDepartments')}</option><option value="none">{t('noDepartment')}</option>{workspace.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
          {access.manage && <SelectField id="employee-tracking-filter" label={documentsT('trackingLabel')} value={tracking} onChange={(event) => {setTracking(event.target.value); setPage(1);}}><option value="all">{t('allTrackingStatuses')}</option>{(['not_configured', 'complete', 'attention'] as const).map((value) => <option key={value} value={value}>{documentsT(`tracking.${value}`)}</option>)}</SelectField>}
        </FilterPanel>
      </section>
      <Surface className={directory.listSurface}>
        {!workspace.employees.length ? <EmptyState title={t('empty')} description={t('emptyDescription')} action={access.manage && <Button onClick={() => setEditing({})}>{t('add')}</Button>}/> : !filtered.length ? <EmptyState title={t('noMatches')} action={<Button variant="secondary" onClick={reset}>{t('resetFilters')}</Button>}/> : <>
          <div className={directory.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={`${directory.vendorTable} ${table.interactive} ${styles.table}`}>
            <thead><tr>{sortable('name')}{sortable('jobTitle')}{sortable('department')}<th scope="col">{t('table.documents')}</th><th scope="col">{t('table.deadline')}</th>{sortable('employmentStatus')}<th scope="col">{t('table.actions')}</th></tr></thead>
            <tbody>{visible.map((employee) => {const metrics = documentMetrics.get(employee.id), href = `/company/employees/${encodeURIComponent(employee.id)}`; return <tr key={employee.id} data-employee-id={employee.id} data-lifecycle={employee.employmentStatus} onClick={(event) => openRow(event, href)}>
              <td><div className={directory.vendorIdentity}><span className={directory.avatar} aria-hidden="true">{employee.firstName[0]}{employee.lastName[0]}</span><span className={directory.vendorName}><span className={directory.nameLine}><Link className={styles.name} href={href}>{employeeName(employee)}</Link>{employee.employmentStatus === 'inactive' && <span className={directory.inactiveBadge}>{t('inactive')}</span>}</span><small>{employee.email}</small></span></div></td>
              <td>{employee.jobTitle}</td><td>{departmentName(workspace, employee) || '—'}</td><td>{metrics?.total ? <span className={directory.documents}><span className={directory.progressTrack} aria-hidden="true"><span className={directory.progressFill} style={{width: `${metrics.uploaded / metrics.total * 100}%`}}/></span><span>{documentsT('progress', {uploaded: metrics.uploaded, total: metrics.total})}</span></span> : <StatusBadge size="document" tone="neutral" indicator="none">{documentsT(!access.manage ? 'restricted' : metrics ? 'tracking.not_configured' : 'unavailable')}</StatusBadge>}</td><td>{metrics?.nextDeadline ? <time dateTime={metrics.nextDeadline}>{new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(`${metrics.nextDeadline}T12:00:00Z`))}</time> : '—'}</td>
              <td><StatusBadge size="document" tone={metrics?.tracking === 'complete' ? 'success' : metrics?.tracking === 'attention' ? 'warning' : 'neutral'}>{documentsT(!access.manage ? 'restricted' : metrics ? `tracking.${metrics.tracking}` : 'unavailable')}</StatusBadge></td>
              <td className={directory.actionsCell} onClick={(event) => event.stopPropagation()}>{access.manage && <RowActionMenu label={t('employeeActions', {name: employeeName(employee)})} open={menu === employee.id} onOpenChange={(open) => setMenu(open ? employee.id : null)} items={[
                {label: t('edit'), onSelect: () => setEditing({id: employee.id})},
                {label: t(employee.employmentStatus === 'active' ? 'markInactive' : 'markActive'), onSelect: () => {const result = setEmployeeStatus(companyId, employee.id, employee.employmentStatus === 'active' ? 'inactive' : 'active'); setFailure(!result.ok); if (result.ok) setFeedback(t('success.updated'));}}
              ]}/>}</td>
            </tr>;})}</tbody>
          </table></div>
          <Pagination variant="directory" page={currentPage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} pageSizeLabel={t('pageSize')} rangeLabel={t('showing', {start: filtered.length ? (currentPage - 1) * pageSize + 1 : 0, end: Math.min(currentPage * pageSize, filtered.length), count: filtered.length})} onPage={setPage} onPageSize={(size) => {setPageSize(size); setPage(1);}}/>
        </>}
      </Surface>
    </>}
    {editing && <EmployeeDrawer companyId={companyId} employeeId={editing.id} onClose={() => setEditing(null)} onSuccess={(kind, id) => {reset(); setFailure(false); setFeedback(t(`success.${kind}`)); const ordered = sortEmployees(employeeWorkspace(companyId).employees, employeeWorkspace(companyId), sort, locale); setPage(Math.floor(ordered.findIndex((employee) => employee.id === id) / pageSize) + 1);}}/>}
  </div>;
}
