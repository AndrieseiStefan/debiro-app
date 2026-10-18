'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Surface} from '@/components/ui/Surface';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {SearchInput} from '@/components/ui/SearchInput';
import {SelectField} from '@/components/ui/SelectField';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Avatar} from '@/components/ui/Avatar';
import {Tooltip} from '@/components/ui/Tooltip';
import {RowActionMenu} from '@/components/ui/RowActionMenu';
import {Pagination} from '@/components/ui/Pagination';
import {AppIcon} from '@/components/layout/AppIcon';
import {CompanyDocumentManager, type CompanyManagementSelection} from '@/features/company-documents/CompanyDocumentManager';
import {CompanyTemplateDrawer} from '@/features/company-documents/CompanyTemplateDrawer';
import {filterCompanyDocuments, sortCompanyDocuments} from '@/features/company-documents/projections';
import type {CompanyDocumentSort} from '@/features/company-documents/types';
import {getRequirementsWorkspace, useRequirementsState} from '@/features/requirements/requirements-state';
import {TemplateSourceLabels} from '@/features/requirements/TemplateSources';
import {resolveTemplateSources, templateAccentStyle} from '@/features/requirements/template-accents';
import {employeeDocumentAdapter} from './employee-documents';
import {employeeDocumentBytes, employeeDocumentWorkspace, useEmployeeState} from './employees-state';
import {projectEmployeeDocuments} from './employee-document-projections';
import table from '@/components/ui/DataTable.module.css';
import list from '@/features/company-documents/CompanyDocumentsPage.module.css';
import styles from './EmployeeDetails.module.css';

function Selection({label, checked, mixed = false, disabled, onChange}: {label: string; checked: boolean; mixed?: boolean; disabled?: boolean; onChange: () => void}) {
  const ref = useRef<HTMLInputElement>(null); useEffect(() => {if (ref.current) ref.current.indeterminate = mixed;}, [mixed]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={onChange}/>;
}

export function EmployeeDocumentPanel({companyId, employeeId, locale, selection, onSelection: setSelection}: {companyId: string; employeeId: string; locale: 'ro' | 'en'; selection: CompanyManagementSelection | null; onSelection: (selection: CompanyManagementSelection | null) => void}) {
  const t = useTranslations('EmployeeDocuments'), listing = useTranslations('CompanyDocuments'), common = useTranslations('DocumentManagement'), templatesT = useTranslations('VendorTemplates');
  const snapshot = useEmployeeState(), workspace = employeeDocumentWorkspace(companyId, employeeId, snapshot), adapter = employeeDocumentAdapter(companyId, employeeId);
  const templates = getRequirementsWorkspace(useRequirementsState(), companyId).templates;
  const files = new Map((workspace?.documents ?? []).flatMap((record) => {const file = employeeDocumentBytes(companyId, employeeId, record.id); return file ? [[record.id, file] as const] : [];}));
  const result = workspace ? projectEmployeeDocuments(workspace, companyId, employeeId, locale, files) : {rows: [], error: true};
  const [query, setQuery] = useState(''), [status, setStatus] = useState('all'), [type, setType] = useState('all');
  const [sort, setSort] = useState<CompanyDocumentSort>({column: 'expiresAt', direction: 'ascending'}), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]), [menu, setMenu] = useState<string | null>(null), [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState(''), [failure, setFailure] = useState(false);
  const filtered = sortCompanyDocuments(filterCompanyDocuments(result.rows, query, type, status, (value) => listing(`types.${value}`)), sort, locale);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)), currentPage = Math.min(page, pageCount), visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const onPage = visible.map((row) => row.id), checked = onPage.filter((id) => selected.includes(id)).length;
  function reset() {setStatus('all'); setType('all'); setPage(1);}
  function togglePage() {setSelected((current) => checked === onPage.length ? current.filter((id) => !onPage.includes(id)) : [...new Set([...current, ...onPage])]);}
  function sources(requirementId: string | undefined) {const requirement = workspace?.requirements.find((item) => item.id === requirementId); return {values: resolveTemplateSources(templates, companyId, 'employee', requirement?.sourceTemplateIds), hasSource: Boolean(requirement?.sourceTemplateIds.length)};}
  function fields(suffix = '') {return <>
    <SelectField id={`employee-document-status${suffix}`} label={listing('table.status')} controlSize="compact" value={status} onChange={(event) => {setStatus(event.target.value); setPage(1);}}><option value="all">{listing('allStatuses')}</option>{(['missing', 'needs_review', 'valid', 'expiring_soon', 'expired'] as const).map((value) => <option key={value} value={value}>{listing(`status.${value}`)}</option>)}</SelectField>
    <SelectField id={`employee-document-type${suffix}`} label={t('documentType')} controlSize="compact" value={type} onChange={(event) => {setType(event.target.value); setPage(1);}}><option value="all">{listing('allTypes')}</option>{[...new Set(result.rows.map((row) => row.documentType))].map((value) => <option key={value} value={value}>{listing(`types.${value}`)}</option>)}</SelectField>
  </>;}
  function sortColumn(column: CompanyDocumentSort['column']) {setSort({column, direction: sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending'}); setPage(1);}
  const header = (column: CompanyDocumentSort['column'], label: string) => <th scope="col" aria-sort={sort.column === column ? sort.direction : undefined}><button type="button" className={list.sortHeader} onClick={() => sortColumn(column)}>{label}<AppIcon name="sort" size={14}/></button></th>;
  const allDownloadable = selected.length > 0 && selected.every((id) => {const row = result.rows.find((item) => item.id === id); return row?.currentDocumentId && row.hasDownloadableFile;});
  function downloadSelection() {
    const rows = selected.map((id) => result.rows.find((row) => row.id === id));
    if (rows.some((row) => !row?.currentDocumentId || !adapter.companyDocumentFile(companyId, row.requirementId!, row.currentDocumentId))) {setFailure(true); return;}
    setFailure(rows.some((row) => !adapter.downloadCompanyDocument(companyId, row!.requirementId!, row!.currentDocumentId!)));
  }
  const currentSource = sources(selection?.requirementId);
  return <>
    <Surface className={`${list.list} ${styles.documents}`} role="tabpanel" id="employee-documents" aria-labelledby="employee-tab-documents">
      <section className={styles.documentFilters} aria-label={t('filters')}><SearchInput label={t('searchLabel')} placeholder={t('searchPlaceholder')} value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}}/><div className={list.inlineFilters}>{fields()}</div><FilterPanel activeCount={Number(type !== 'all') + Number(status !== 'all')} onReset={reset}>{fields('-panel')}</FilterPanel></section>
      {feedback && <p role="status" className={styles.feedback}>{feedback}</p>}{failure && <p role="alert" className={styles.feedback}>{common('downloadUnavailable')}</p>}
      <div className={list.bulk}><div className={`${list.selected} ${table.selection}`}><Selection label={listing('selectPage')} checked={onPage.length > 0 && checked === onPage.length} mixed={checked > 0 && checked < onPage.length} disabled={!onPage.length} onChange={togglePage}/><span role="status">{listing('selected', {count: selected.length})}</span></div><div className={list.bulkActions}>
        {allDownloadable ? <Button size="compact" variant="secondary" onClick={downloadSelection}><AppIcon name="download" size={18}/>{listing('downloadSelected')}</Button> : <Tooltip content={listing('downloadSelectionUnavailable')}>{(props) => <Button {...props} size="compact" variant="secondary" aria-disabled="true" onKeyDown={(event) => {if (['Enter', ' '].includes(event.key)) event.preventDefault();}}><AppIcon name="download" size={18}/>{listing('downloadSelected')}</Button>}</Tooltip>}
        <Button size="compact" onClick={() => setApplying(true)}><AppIcon name="plus" size={18}/>{templatesT('title')}</Button>
        <RowActionMenu label={listing('bulkActions')} open={menu === 'bulk'} onOpenChange={(open) => setMenu(open ? 'bulk' : null)} items={selected.length ? [{label: listing('deselectAll'), onSelect: () => setSelected([])}] : []}/>
      </div></div>
      {result.error ? <ErrorState title={t('unavailable')} description={t('unavailableDescription')}/> : !result.rows.length ? <EmptyState icon={<AppIcon name="file" size={28}/>} title={t('empty')} description={t('emptyDescription')} action={<div className={list.bulkActions}><Button onClick={() => setApplying(true)}>{templatesT('title')}</Button><Button variant="secondary" onClick={() => setSelection({mode: 'add'})}>{t('add')}</Button></div>}/> : !filtered.length ? <EmptyState title={listing('noMatches')} action={<Button variant="secondary" onClick={() => {reset(); setQuery('');}}>{listing('resetFilters')}</Button>}/> : <>
        <div className={list.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={`${table.table} ${list.table}`}><thead><tr><th scope="col"><Selection label={listing('selectPageHeader')} checked={onPage.length > 0 && checked === onPage.length} mixed={checked > 0 && checked < onPage.length} onChange={togglePage}/></th>{header('name', listing('table.name'))}<th scope="col">{templatesT('source')}</th>{header('status', listing('table.status'))}{header('expiresAt', listing('table.expiresAt'))}<th scope="col">{common('uploadedBy')}</th><th scope="col">{listing('table.actions')}</th></tr></thead><tbody>{visible.map((row) => {
          const source = sources(row.requirementId ?? undefined), accent = source.values[0]?.accentToken;
          const document = workspace?.documents.find((item) => item.id === row.currentDocumentId);
          return <tr key={row.id} data-requirement-id={row.requirementId} data-template-accent={accent ?? undefined} style={templateAccentStyle(accent)} data-selected={selected.includes(row.id) ? 'true' : undefined}>
            <td><input type="checkbox" aria-label={listing('selectDocument', {name: row.name})} checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])}/></td>
            <td><div className={list.identity}><span className={list.fileIcon} data-status={row.status}><AppIcon name="file" size={19}/></span><span><button type="button" className={`${list.documentLink} ${table.primary}`} onClick={() => setSelection({mode: 'details', requirementId: row.requirementId!, documentId: row.currentDocumentId ?? undefined})}>{row.name}</button><small>{listing(`types.${row.documentType}`)}{row.issuer && ` · ${row.issuer}`}</small></span></div></td>
            <td><TemplateSourceLabels sources={source.values} hasTemplateSource={source.hasSource} locale={locale}/></td><td><StatusBadge size="document" tone={row.status === 'valid' ? 'success' : row.status === 'expired' || row.status === 'missing' ? 'danger' : 'warning'} data-status={row.status}>{listing(`status.${row.status}`)}</StatusBadge></td>
            <td className={list.expiry} data-status={row.status}>{row.expiresAt ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(`${row.expiresAt}T12:00:00Z`)) : '—'}</td>
            <td><div className={list.updated}>{document?.uploadedBy && <Avatar initials={document.uploadedBy.split(/\s+/).slice(0, 2).map((part) => part[0]).join('')}/>}<span>{document?.uploadedBy ?? listing('notUploaded')}<small>{document ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {dateStyle: 'medium', timeZone: 'UTC'}).format(new Date(document.uploadedAt)) : '—'}</small></span></div></td>
            <td><div className={list.rowActions}>{!row.currentDocumentId ? <Button variant="secondary" size="table" onClick={() => setSelection({mode: 'add', requirementId: row.requirementId!})}><AppIcon name="upload" size={18}/>{listing('upload')}</Button> : row.hasDownloadableFile ? <Button variant="secondary" size="icon" aria-label={listing('downloadDocument', {name: row.name})} onClick={() => setFailure(!adapter.downloadCompanyDocument(companyId, row.requirementId!, row.currentDocumentId!))}><AppIcon name="download" size={18}/></Button> : <Tooltip content={listing('fileUnavailable')}>{(props) => <Button {...props} variant="secondary" size="icon" aria-label={listing('downloadDocument', {name: row.name})} aria-disabled="true" onKeyDown={(event) => {if (['Enter', ' '].includes(event.key)) event.preventDefault();}}><AppIcon name="download" size={18}/></Button>}</Tooltip>}
              <RowActionMenu label={listing('rowActions', {name: row.name})} open={menu === row.id} onOpenChange={(open) => setMenu(open ? row.id : null)} items={[{label: common('openDetails'), onSelect: () => setSelection({mode: 'details', requirementId: row.requirementId!})}, {label: common('historyAction'), onSelect: () => setSelection({mode: 'history', requirementId: row.requirementId!})}, ...(row.currentDocumentId ? [{label: t('replaceTitle'), onSelect: () => setSelection({mode: 'replace', requirementId: row.requirementId!, documentId: row.currentDocumentId!})}] : [])]}/>
            </div></td>
          </tr>;
        })}</tbody></table></div>
        <Pagination page={currentPage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => {setPageSize(size); setPage(1);}}/>
      </>}
    </Surface>
    {selection && <CompanyDocumentManager adapter={adapter} companyId={companyId} locale={locale} selection={selection} source={<TemplateSourceLabels sources={currentSource.values} hasTemplateSource={currentSource.hasSource} locale={locale}/>} onClose={() => setSelection(null)} onSuccess={(kind) => {setFeedback(t(`success.${kind}`)); reset(); setQuery('');}}/>}
    {applying && <CompanyTemplateDrawer adapter={adapter} companyId={companyId} locale={locale} onClose={() => setApplying(false)}/>}
  </>;
}
