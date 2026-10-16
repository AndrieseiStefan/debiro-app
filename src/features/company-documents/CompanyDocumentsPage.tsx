'use client';

import {Fragment, useEffect, useRef, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {Avatar} from '@/components/ui/Avatar';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {SearchInput} from '@/components/ui/SearchInput';
import {SelectField} from '@/components/ui/SelectField';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {Tooltip} from '@/components/ui/Tooltip';
import {RowActionMenu} from '@/components/ui/RowActionMenu';
import {Pagination} from '@/components/ui/Pagination';
import tableStyles from '@/components/ui/DataTable.module.css';
import {getRequirementsWorkspace, useRequirementsState} from '@/features/requirements/requirements-state';
import {resolveTemplateSources, templateAccentStyle} from '@/features/requirements/template-accents';
import {TemplateSourceLabels} from '@/features/requirements/TemplateSources';
import {documentAccess} from '@/features/documents/document-access';
import {CompanyDocumentManager, type CompanyManagementSelection} from './CompanyDocumentManager';
import {CompanyTemplateDrawer} from './CompanyTemplateDrawer';
import {CompanyShareDrawer} from './CompanyShareDrawer';
import {shareSelection, type ShareDocumentSelection} from './sharing';
import {companyDocumentFile, companyDocumentHistory, downloadCompanyDocument} from './management';
import {SummaryMetricCard} from '@/features/dashboard/SummaryMetricCard';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {localizedDate} from '@/lib/fixture-clock';
import {companyDocumentList, useCompanyDocumentsState} from './company-documents-state';
import {companyDocumentMetrics, eligibleCompanyDocumentIds, filterCompanyDocuments, sortCompanyDocuments} from './projections';
import type {CompanyDocumentListRow, CompanyDocumentSort, CompanyDocumentSortColumn, CompanyDocumentStatus} from './types';
import styles from './CompanyDocumentsPage.module.css';

const statuses: CompanyDocumentStatus[] = ['missing', 'needs_review', 'valid', 'expiring_soon', 'expired'];
const tones: Record<CompanyDocumentStatus, StatusTone> = {missing: 'danger', needs_review: 'warning', valid: 'success', expiring_soon: 'warning', expired: 'danger'};
const columns: CompanyDocumentSortColumn[] = ['name', 'status', 'expiresAt', 'updatedAt'];

function UnavailableAction({children, icon, explanation, label, disabled = false, compact = false, size}: {
  children?: ReactNode; icon: AppIconName; explanation: string; label?: string; disabled?: boolean; compact?: boolean; size?: 'compact';
}) {
  return <Tooltip content={explanation}>{(props) => <Button {...props} variant="secondary" size={compact ? 'icon' : size} className={styles.unavailable} disabled={disabled} aria-disabled="true" aria-label={label}
    onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') event.preventDefault();}}><AppIcon name={icon} size={compact ? 18 : 21}/>{children}</Button>}</Tooltip>;
}
function SelectionCheckbox({label, checked, mixed = false, disabled, onChange}: {label: string; checked: boolean; mixed?: boolean; disabled: boolean; onChange: () => void}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {if (ref.current) ref.current.indeterminate = mixed;}, [mixed]);
  return <input ref={ref} type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={onChange}/>;
}

export function CompanyDocumentsPage({locale}: {locale: string}) {
  const company = getActiveCompany(useCompanyState());
  return <AuthenticatedAppShell locale={locale} currentPath="/company/documents" organizationName={company?.company.name ?? ''} userName="" userInitials="">
    <CompanyDocumentsWorkspace key={company?.company.id ?? ''} companyId={company?.company.id ?? ''} locale={locale === 'en' ? 'en' : 'ro'}/>
  </AuthenticatedAppShell>;
}

function CompanyDocumentsWorkspace({companyId, locale}: {companyId: string; locale: 'ro' | 'en'}) {
  const t = useTranslations('CompanyDocuments');
  const app = useTranslations('AppShell');
  const states = useTranslations('Foundation');
  const management = useTranslations('CompanyDocumentManagement');
  const templatesT = useTranslations('VendorTemplates');
  const common = useTranslations('DocumentManagement');
  const snapshot = useCompanyDocumentsState();
  const templates = getRequirementsWorkspace(useRequirementsState(), companyId).templates;
  const {rows, error} = companyDocumentList(snapshot, companyId, locale);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<CompanyDocumentSort>({column: 'expiresAt', direction: 'ascending'});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [activeDocument, setActiveDocument] = useState<CompanyManagementSelection | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [sharing, setSharing] = useState<ShareDocumentSelection[] | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [downloadFailed, setDownloadFailed] = useState(false);
  const access = documentAccess(companyId);
  const [bulkMenu, setBulkMenu] = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);
  const metrics = companyDocumentMetrics(rows);
  const filtered = sortCompanyDocuments(filterCompanyDocuments(rows, query, type, status, (value) => t(`types.${value}`)), sort, locale);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const eligible = new Set(eligibleCompanyDocumentIds(rows));
  const selected = Object.entries(selection).filter(([id, version]) => eligible.has(id) && rows.some((row) => row.id === id && row.currentDocumentId === version)).map(([id]) => id);
  const onPage = eligibleCompanyDocumentIds(visible);
  const checkedOnPage = onPage.filter((id) => selected.includes(id)).length;
  const activeCount = Number(type !== 'all') + Number(status !== 'all');
  const typeOptions = [...new Set(rows.map((row) => row.documentType))].sort((a, b) => t(`types.${a}`).localeCompare(t(`types.${b}`), locale));

  function resetFilters() {setType('all'); setStatus('all'); setPage(1);}
  function select(ids: string[]) {setSelection(Object.fromEntries(rows.filter((row) => ids.includes(row.id) && row.currentDocumentId).map((row) => [row.id, row.currentDocumentId!])));}
  function togglePage() {select(checkedOnPage === onPage.length ? selected.filter((id) => !onPage.includes(id)) : [...new Set([...selected, ...onPage])]);}
  function toggleRow(id: string) {if (eligible.has(id)) select(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);}
  function deselectAll() {setSelection({}); requestAnimationFrame(() => bulkRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus());}
  function openDocument(row: CompanyDocumentListRow, mode: 'details' | 'history' | 'replace' | 'add' = 'details') {if (row.requirementId) {setFeedback(''); setRowMenu(null); setActiveDocument({mode, requirementId: row.requirementId, documentId: row.currentDocumentId ?? undefined});}}
  function downloadRow(row: CompanyDocumentListRow) {setDownloadFailed(!row.requirementId || !row.currentDocumentId || !downloadCompanyDocument(companyId, row.requirementId, row.currentDocumentId));}
  function sortColumn(column: CompanyDocumentSortColumn) {setSort({column, direction: sort.column === column && sort.direction === 'ascending' ? 'descending' : 'ascending'}); setPage(1);}
  function fields(suffix = '') {
    return <>
      <SelectField controlSize="compact" id={`company-document-type${suffix}`} label={t('typeFilter')} value={type} onChange={(event) => {setType(event.target.value); setPage(1);}}><option value="all">{t('allTypes')}</option>{typeOptions.map((value) => <option key={value} value={value}>{t(`types.${value}`)}</option>)}</SelectField>
      <SelectField controlSize="compact" id={`company-document-status${suffix}`} label={t('statusFilter')} value={status} onChange={(event) => {setStatus(event.target.value); setPage(1);}}><option value="all">{t('allStatuses')}</option>{statuses.map((value) => <option key={value} value={value}>{t(`status.${value}`)}</option>)}</SelectField>
    </>;
  }
  function date(value: string | null) {return value ? <time dateTime={value}>{localizedDate(value)[locale]}</time> : '—';}
  function renderRow(row: CompanyDocumentListRow) {
    const requirement = snapshot.byCompany[companyId]?.requirements.find((item) => item.id === row.requirementId && item.companyId === companyId);
    const sources = resolveTemplateSources(templates, companyId, 'company', requirement?.templateId && requirement.templateRequirementId ? [requirement.templateId] : []), accent = sources[0]?.accentToken;
    return <tr key={row.id} data-company-document-row={row.id} data-current-document={row.currentDocumentId ?? undefined} aria-selected={selected.includes(row.id)} data-template-accent={accent ?? undefined} style={templateAccentStyle(accent)}>
      <td><SelectionCheckbox label={t('selectDocument', {name: row.name})} checked={selected.includes(row.id)} disabled={!eligible.has(row.id)} onChange={() => toggleRow(row.id)}/></td>
      <td><div className={styles.identity}><span className={styles.fileIcon} data-status={row.status}><AppIcon name="file" size={21}/></span><span>{row.requirementId ? <button type="button" className={`${styles.documentLink} ${tableStyles.primary}`} onClick={() => openDocument(row)}>{row.name}</button> : <strong>{row.name}</strong>}<small>{t(`types.${row.documentType}`)}{row.issuer && <> · {row.issuer}</>}</small></span></div></td>
      <td><TemplateSourceLabels sources={sources} hasTemplateSource={Boolean(requirement?.templateId || requirement?.templateRequirementId)} locale={locale}/></td>
      <td><StatusBadge size="document" tone={tones[row.status]} data-status={row.status}>{t(`status.${row.status}`)}</StatusBadge></td>
      <td className={styles.expiry} data-status={row.status}>{date(row.expiresAt)}</td>
      <td><div className={styles.updated}>{row.updatedByDisplayName && <Avatar initials={row.updatedByDisplayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('')}/>}<span>{row.updatedByDisplayName ?? (row.currentDocumentId ? '—' : t('notUploaded'))}<small>{date(row.updatedAt)}</small></span></div></td>
      <td><div className={styles.rowActions}>
        {row.currentDocumentId ? <>{row.hasDownloadableFile && row.requirementId ? <Button variant="secondary" size="icon" aria-label={t('downloadDocument', {name: row.name})} onClick={() => downloadRow(row)}><AppIcon name="download" size={18}/></Button> : <UnavailableAction compact icon="download" label={t('downloadDocument', {name: row.name})} explanation={t('fileUnavailable')}/>}<Button variant="secondary" size="icon" aria-label={t('shareDocument', {name: row.name})} onClick={() => setSharing([{documentId: row.id, documentVersionId: row.currentDocumentId!}])}><AppIcon name="share" size={18}/></Button></>
          : <Button variant="secondary" size="table" disabled={!access.replace || !row.requirementId} onClick={() => openDocument(row, 'add')}><AppIcon name="upload" size={18}/>{t('upload')}</Button>}
        {row.requirementId && <RowActionMenu label={t('rowActions', {name: row.name})} open={rowMenu === row.id} onOpenChange={(open) => setRowMenu(open ? row.id : null)} items={[
          {label: common('openDetails'), onSelect: () => openDocument(row)},
          ...(companyDocumentHistory(companyId, row.requirementId).length ? [{label: common('historyAction'), onSelect: () => openDocument(row, 'history')}] : []),
          ...(row.currentDocumentId && access.replace ? [{label: management('replaceTitle'), onSelect: () => openDocument(row, 'replace')}] : [])
        ]}/>}
      </div></td>
    </tr>;
  }

  return <div className={styles.page}>
    <AuthenticatedPageHeader className={styles.header} context={<AuthenticatedBreadcrumbs root={{label: app('navigation.company')}} items={[{label: t('title')}]} label={t('breadcrumbLabel')}/>} title={t('title')} titleId="company-documents-title" description={t('description')}
      actions={<div className={styles.headerActions}><Button variant="secondary" disabled={!access.visible} onClick={() => setSharing(shareSelection(rows, selected))}><AppIcon name="share" size={21}/>{t('shareDocuments')}</Button><AuthenticatedPagePrimaryAction icon="plus" disabled={!access.replace} onClick={() => {setFeedback(''); setActiveDocument({mode: 'add'});}}>{t('addDocuments')}</AuthenticatedPagePrimaryAction></div>}/>
    {feedback && <p role="status">{feedback}</p>}{downloadFailed && <p role="alert">{common('downloadUnavailable')}</p>}
    {error ? <Surface className={styles.error}><ErrorState title={states('errorTitle')} description={states('errorDescription')}/></Surface> : <>
      <section className={styles.metrics} aria-label={t('summaryLabel')}>
        <SummaryMetricCard variant="documents" title={t('total')} value={metrics.total} note={t('currentDocuments')} icon="file" tone="blue"/>
        <SummaryMetricCard variant="documents" title={t('attention')} value={metrics.attention} note={t('attentionDescription')} icon="warning" tone="amber"/>
        <SummaryMetricCard variant="documents" title={t('activeShares')} value={metrics.activeShares} note={t('sharesDescription')} icon="share" tone="green"/>
      </section>
      <section className={styles.toolbar} aria-label={t('filters')}>
        <SearchInput label={t('searchLabel')} placeholder={t('searchPlaceholder')} value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}}/>
        <div className={styles.inlineFilters}>{fields()}</div>
        <div className={styles.sort}><SelectField controlSize="compact" id="company-document-sort" label={t('sortLabel')} value={`${sort.column}:${sort.direction}`} onChange={(event) => {const [column, direction] = event.target.value.split(':') as [CompanyDocumentSortColumn, CompanyDocumentSort['direction']]; setSort({column, direction}); setPage(1);}}>{columns.flatMap((column) => (['ascending', 'descending'] as const).map((direction) => <option key={`${column}:${direction}`} value={`${column}:${direction}`}>{t(`sort.${column}`)} {direction === 'ascending' ? '↑' : '↓'}</option>))}</SelectField></div>
        <FilterPanel activeCount={activeCount} onReset={resetFilters}>{fields('-panel')}</FilterPanel>
      </section>
      <Surface className={styles.list}>
        <div ref={bulkRef} className={styles.bulk}>
          <div className={`${styles.selected} ${tableStyles.selection}`}><SelectionCheckbox label={t('selectPage')} checked={onPage.length > 0 && checkedOnPage === onPage.length} mixed={checkedOnPage > 0 && checkedOnPage < onPage.length} disabled={onPage.length === 0} onChange={togglePage}/><span role="status" aria-live="polite">{t('selected', {count: selected.length})}</span></div>
          <div className={styles.bulkActions}><Button variant="secondary" size="compact" disabled={selected.length === 0} onClick={() => {const chosen = rows.filter((row) => selected.includes(row.id)); setDownloadFailed(chosen.some((row) => !row.requirementId || !row.currentDocumentId || !companyDocumentFile(companyId, row.requirementId, row.currentDocumentId)) || !chosen.every((row) => Boolean(row.requirementId && row.currentDocumentId && downloadCompanyDocument(companyId, row.requirementId, row.currentDocumentId))));}}><AppIcon name="download" size={21}/>{t('downloadSelected')}</Button><Button variant="secondary" size="compact" disabled={selected.length === 0} onClick={() => setSharing(shareSelection(rows, selected))}><AppIcon name="share" size={21}/>{t('shareSelected')}</Button>
            <Button size="compact" disabled={!access.replace} onClick={() => {setFeedback(''); setApplyingTemplate(true);}}><AppIcon name="plus" size={18}/>{templatesT('title')}</Button>
            {selected.length > 0 ? <RowActionMenu label={t('bulkActions')} items={[{label: t('deselectAll'), onSelect: deselectAll}]} open={bulkMenu} onOpenChange={setBulkMenu}/> : <Button variant="secondary" size="icon" disabled aria-label={t('bulkActions')}><AppIcon name="more" size={18}/></Button>}</div>
        </div>
        {rows.length === 0 ? <EmptyState icon={<AppIcon name="file" size={28}/>} title={t('empty')} description={t('emptyDescription')}/> : filtered.length === 0 ? <EmptyState title={t('noMatches')} action={<Button variant="secondary" onClick={() => {resetFilters(); setQuery('');}}>{t('resetFilters')}</Button>}/> : <>
          <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={`${tableStyles.table} ${styles.table}`}>
            <thead><tr><th scope="col"><SelectionCheckbox label={t('selectPageHeader')} checked={onPage.length > 0 && checkedOnPage === onPage.length} mixed={checkedOnPage > 0 && checkedOnPage < onPage.length} disabled={onPage.length === 0} onChange={togglePage}/></th>
              {columns.map((column) => <Fragment key={column}><th scope="col" aria-sort={sort.column === column ? sort.direction : undefined}><button type="button" className={styles.sortHeader} onClick={() => sortColumn(column)}>{t(`table.${column}`)}<AppIcon name="sort" size={14}/></button></th>{column === 'name' && <th scope="col" data-column="source">{templatesT('source')}</th>}</Fragment>)}<th scope="col">{t('table.actions')}</th></tr></thead>
            <tbody>{visible.map(renderRow)}</tbody>
          </table></div>
          <Pagination page={currentPage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => {setPageSize(size); setPage(1);}}/>
        </>}
      </Surface>
    </>}
    {activeDocument && <CompanyDocumentManager companyId={companyId} locale={locale} selection={activeDocument} onClose={() => setActiveDocument(null)} onSuccess={(kind) => setFeedback(management(`success.${kind}`))}/>}
    {applyingTemplate && <CompanyTemplateDrawer companyId={companyId} locale={locale} onClose={() => setApplyingTemplate(false)}/>}
    {sharing && <CompanyShareDrawer companyId={companyId} locale={locale} initialSelection={sharing} onClose={() => setSharing(null)}/>}
  </div>;
}
