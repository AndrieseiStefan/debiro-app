'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon} from '@/components/layout/AppIcon';
import {Avatar} from '@/components/ui/Avatar';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {SearchInput} from '@/components/ui/SearchInput';
import {SelectField} from '@/components/ui/SelectField';
import {Tooltip} from '@/components/ui/Tooltip';
import {RowActionMenu} from '@/components/ui/RowActionMenu';
import {Pagination} from '@/components/ui/Pagination';
import {SummaryMetricCard} from '@/features/dashboard/SummaryMetricCard';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import table from '@/components/ui/DataTable.module.css';
import list from '@/features/company-documents/CompanyDocumentsPage.module.css';
import {employeeAccess, employeeWorkspace, setEmployeeStatus, useEmployeeState} from './employees-state';
import {employeeDocumentWorkspace} from './employees-state';
import {employeeDocumentMetrics, employeeListDocumentMetrics, projectEmployeeDocuments} from './employee-document-projections';
import progress from '@/features/vendors/VendorsListPage.module.css';
import {departmentName, employeeName, filterEmployees, sortEmployees} from './projections';
import {EmployeeDrawer} from './EmployeeDrawer';
import type {EmployeeSort} from './types';
import styles from './Employees.module.css';

function Selection({label, checked, mixed = false, disabled = false, onChange}: {label: string; checked: boolean; mixed?: boolean; disabled?: boolean; onChange: () => void}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {if (ref.current) ref.current.indeterminate = mixed;}, [mixed]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={onChange}/>;
}

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
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [department, setDepartment] = useState('all');
  const [sort, setSort] = useState<EmployeeSort>({column: 'name', direction: 'ascending'});
  const [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<{id?: string} | null>(null), [menu, setMenu] = useState<string | null>(null), [bulkMenu, setBulkMenu] = useState(false);
  const [feedback, setFeedback] = useState(''), [failure, setFailure] = useState(false);
  const filtered = sortEmployees(filterEmployees(workspace, query, status, department), workspace, sort, locale);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), ids = visible.map((item) => item.id);
  const checked = ids.filter((id) => selected.includes(id)).length;
  function reset() {setQuery(''); setStatus('all'); setDepartment('all'); setPage(1);}
  function togglePage() {setSelected((current) => checked === ids.length ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);}
  function sortColumn(column: EmployeeSort['column']) {setSort({column, direction: sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending'}); setPage(1);}
  const sortable = (column: EmployeeSort['column']) => <th scope="col" aria-sort={sort.column === column ? sort.direction : undefined}><button type="button" className={list.sortHeader} onClick={() => sortColumn(column)}>{t(`table.${column}`)}<AppIcon name="sort" size={14}/></button></th>;
  const selectPage = (label: string) => <Selection label={label} checked={ids.length > 0 && checked === ids.length} mixed={checked > 0 && checked < ids.length} disabled={!ids.length} onChange={togglePage}/>;
  return <div className={styles.page}>
    <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs root={{label: app('navigation.company')}} items={[{label: t('title')}]} label={t('breadcrumbLabel')}/>} title={t('title')} titleId="employees-title" description={t('description')}
      actions={access.manage && <AuthenticatedPagePrimaryAction icon="plus" onClick={() => {setFeedback(''); setEditing({});}}>{t('add')}</AuthenticatedPagePrimaryAction>}/>
    {feedback && <p role="status">{feedback}</p>}{failure && <p role="alert">{t('errors.save')}</p>}
    {workspace.error ? <Surface className={list.error}><ErrorState title={foundation('errorTitle')} description={t('errors.unavailable')}/></Surface> : <>
      <section className={list.metrics} aria-label={t('summaryLabel')}>
        <SummaryMetricCard variant="documents" title={t('total')} value={workspace.employees.length} note={t('totalDescription')} icon="users" tone="blue"/>
        <SummaryMetricCard variant="documents" title={t('attention')} value={privateMetricsAvailable ? activeMetrics.attention : null} note={documentsT('attentionNote')} unavailable={privateMetricsAvailable ? undefined : documentsT(access.manage ? 'unavailableDescription' : 'restrictedDescription')} icon="warning" tone="amber"/>
        <SummaryMetricCard variant="documents" title={t('expiring')} value={privateMetricsAvailable ? activeMetrics.expiring : null} note={documentsT('expiringNote')} unavailable={privateMetricsAvailable ? undefined : documentsT(access.manage ? 'unavailableDescription' : 'restrictedDescription')} icon="clock" tone="amber"/>
      </section>
      <section className={styles.toolbar} aria-label={t('filters')}>
        <SearchInput label={t('search')} placeholder={t('searchPlaceholder')} value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}}/>
        <SelectField id="employee-status-filter" label={t('statusFilter')} controlSize="compact" value={status} onChange={(event) => {setStatus(event.target.value); setPage(1);}}><option value="all">{t('allStatuses')}</option><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></SelectField>
        <SelectField id="employee-department-filter" label={t('departmentFilter')} controlSize="compact" value={department} onChange={(event) => {setDepartment(event.target.value); setPage(1);}}><option value="all">{t('allDepartments')}</option><option value="none">{t('noDepartment')}</option>{workspace.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectField>
      </section>
      <Surface className={list.list}>
        <div className={list.bulk}><div className={`${list.selected} ${table.selection}`}>{selectPage(t('selectPage'))}<span role="status">{t('selected', {count: selected.length})}</span></div>
          <div className={list.bulkActions}>{(['download', 'reminders'] as const).map((action) => <Tooltip key={action} content={t('bulkUnavailable')}>{(props) => <Button {...props} variant="secondary" size="compact" aria-disabled="true" className={list.unavailable} onKeyDown={(event) => {if (['Enter', ' '].includes(event.key)) event.preventDefault();}}><AppIcon name={action === 'download' ? 'download' : 'bell'} size={18}/>{t(action)}</Button>}</Tooltip>)}
            <RowActionMenu label={t('bulkActions')} open={bulkMenu} onOpenChange={setBulkMenu} items={selected.length ? [{label: t('deselectAll'), onSelect: () => setSelected([])}] : []}/>
          </div>
        </div>
        {!workspace.employees.length ? <EmptyState icon={<AppIcon name="users" size={28}/>} title={t('empty')} description={t('emptyDescription')} action={access.manage && <Button onClick={() => setEditing({})}>{t('add')}</Button>}/> : !filtered.length ? <EmptyState title={t('noMatches')} action={<Button variant="secondary" onClick={reset}>{t('resetFilters')}</Button>}/> : <>
          <div className={list.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={`${table.table} ${styles.table}`}>
            <thead><tr><th scope="col">{selectPage(t('selectPageHeader'))}</th>{sortable('name')}{sortable('jobTitle')}{sortable('department')}<th scope="col">{t('table.documents')}</th><th scope="col">{t('table.deadline')}</th>{sortable('employmentStatus')}<th scope="col">{t('table.actions')}</th></tr></thead>
            <tbody>{visible.map((employee) => {const metrics = documentMetrics.get(employee.id); return <tr key={employee.id} data-selected={selected.includes(employee.id) ? 'true' : undefined}>
              <td><Selection label={t('selectEmployee', {name: employeeName(employee)})} checked={selected.includes(employee.id)} onChange={() => setSelected((current) => current.includes(employee.id) ? current.filter((id) => id !== employee.id) : [...current, employee.id])}/></td>
              <td><div className={list.identity}><Avatar initials={`${employee.firstName[0]}${employee.lastName[0]}`}/><span><Link className={`${styles.name} ${table.primary}`} href={`/company/employees/${encodeURIComponent(employee.id)}`}>{employeeName(employee)}</Link><small>{employee.email}</small></span></div></td>
              <td>{employee.jobTitle}</td><td>{departmentName(workspace, employee) || '—'}</td><td>{metrics?.total ? <span className={styles.documentProgress}><span>{documentsT('progress', {uploaded: metrics.uploaded, total: metrics.total})}</span><span className={progress.progressTrack} aria-hidden="true"><span className={progress.progressFill} style={{width: `${metrics.uploaded / metrics.total * 100}%`}}/></span></span> : <StatusBadge size="document" tone="neutral" indicator="none">{documentsT(!access.manage ? 'restricted' : metrics ? 'tracking.not_configured' : 'unavailable')}</StatusBadge>}</td><td>{metrics?.nextDeadline ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(`${metrics.nextDeadline}T12:00:00Z`)) : '—'}</td>
              <td><span className={styles.documentProgress}><StatusBadge size="document" tone={metrics?.tracking === 'complete' ? 'success' : metrics?.tracking === 'attention' ? 'warning' : 'neutral'}>{documentsT(!access.manage ? 'restricted' : metrics ? `tracking.${metrics.tracking}` : 'unavailable')}</StatusBadge><small>{t(employee.employmentStatus)}</small></span></td>
              <td><div className={list.rowActions}><Button variant="ghost" size="icon" aria-label={t('viewEmployee', {name: employeeName(employee)})} onClick={() => router.push(`/company/employees/${encodeURIComponent(employee.id)}`)}><AppIcon name="eye" size={18}/></Button>
                {access.manage && <RowActionMenu label={t('employeeActions', {name: employeeName(employee)})} open={menu === employee.id} onOpenChange={(open) => setMenu(open ? employee.id : null)} items={[
                  {label: t('edit'), onSelect: () => setEditing({id: employee.id})},
                  {label: t(employee.employmentStatus === 'active' ? 'markInactive' : 'markActive'), onSelect: () => {const result = setEmployeeStatus(companyId, employee.id, employee.employmentStatus === 'active' ? 'inactive' : 'active'); setFailure(!result.ok); if (result.ok) setFeedback(t('success.updated'));}}
                ]}/>}
              </div></td>
            </tr>;})}</tbody>
          </table></div>
          <Pagination page={currentPage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} pageSizeLabel={t('pageSize')} totalLabel={t('ofTotal', {count: filtered.length})} onPage={setPage} onPageSize={(size) => {setPageSize(size); setPage(1);}}/>
        </>}
      </Surface>
    </>}
    {editing && <EmployeeDrawer companyId={companyId} employeeId={editing.id} onClose={() => setEditing(null)} onSuccess={(kind, id) => {reset(); setFailure(false); setFeedback(t(`success.${kind}`)); const ordered = sortEmployees(employeeWorkspace(companyId).employees, employeeWorkspace(companyId), sort, locale); setPage(Math.floor(ordered.findIndex((employee) => employee.id === id) / pageSize) + 1);}}/>}
  </div>;
}
