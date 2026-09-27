'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {EmptyState} from '@/components/ui/EmptyState';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import type {DocumentStatus, DocumentSummary, DocumentType, DocumentsViewModel} from './types';
import {useCreatedDocuments} from './created-documents';
import styles from './DocumentsPage.module.css';

const pageSize = 8;
const statuses: DocumentStatus[] = ['uploaded', 'review', 'valid', 'expiring', 'expired'];
const types: DocumentType[] = ['tax', 'registration', 'fire', 'insurance', 'inspector', 'financial', 'environment', 'safety'];
const tones: Record<DocumentStatus, StatusTone> = {uploaded: 'neutral', review: 'danger', valid: 'success', expiring: 'warning', expired: 'danger'};
const icons: Record<DocumentStatus, AppIconName> = {uploaded: 'file', review: 'info', valid: 'check', expiring: 'clock', expired: 'info'};

function displayDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${value}T12:00:00Z`));
}

function DocumentStatusBadge({status}: {status: DocumentStatus}) {
  const t = useTranslations('Documents');
  return <StatusBadge tone={tones[status]} className={styles.statusBadge} data-status={status}><AppIcon name={icons[status]} size={13} />{t(`status.${status}`)}</StatusBadge>;
}

function DocumentRow({document, locale}: {document: DocumentSummary; locale: string}) {
  const t = useTranslations('Documents');
  const name = document.documentName[locale === 'en' ? 'en' : 'ro'];
  const actionLabel = t('reviewDocument', {name, vendor: document.vendorName});
  return <tr>
    <td><div className={styles.documentIdentity}>
      <span className={styles.documentIcon} data-status={document.status}><AppIcon name="file" size={21} /></span>
      <span className={styles.documentText}>
        {document.reviewRoute ? <Link href={document.reviewRoute} aria-label={actionLabel}>{name}</Link> : <strong>{name}</strong>}
        <small title={document.filename}>{document.filename}</small>
      </span>
    </div></td>
    <td>{document.vendorName}</td>
    <td>{t(`documentType.${document.documentType}`)}</td>
    <td><DocumentStatusBadge status={document.status} /></td>
    <td><time dateTime={document.uploadedAt}>{displayDate(document.uploadedAt, locale)}</time></td>
    <td>{document.expiresAt ? <time dateTime={document.expiresAt} className={styles.expiry} data-status={document.status}>{displayDate(document.expiresAt, locale)}</time> : '—'}</td>
    <td className={styles.actionsCell}>{document.reviewRoute ? <Link href={document.reviewRoute} aria-label={actionLabel} className={styles.rowAction}><AppIcon name="more" size={20} /></Link> : <button type="button" aria-disabled="true" aria-label={t('unavailableAction', {name})} title={t('unavailableAction', {name})} className={styles.rowAction}><AppIcon name="more" size={20} /></button>}</td>
  </tr>;
}

export function DocumentsPage({locale, view}: {locale: string; view: DocumentsViewModel}) {
  const t = useTranslations('Documents');
  const documents = [...useCreatedDocuments(), ...view.documents];
  const [tab, setTab] = useState<'all' | 'review'>('all');
  const [query, setQuery] = useState('');
  const [vendor, setVendor] = useState('all');
  const [type, setType] = useState<DocumentType | 'all'>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<DocumentStatus[]>([]);
  const [uploadYear, setUploadYear] = useState('any');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const counts = Object.fromEntries(statuses.map((status) => [status, documents.filter((document) => document.status === status).length])) as Record<DocumentStatus, number>;
  const vendorOptions = [...new Map(documents.map((document) => [document.vendorId, document.vendorName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const uploadYears = [...new Set(documents.map((document) => document.uploadedAt.slice(0, 4)))].sort().reverse();
  const needle = query.trim().toLocaleLowerCase(locale);
  const filtered = documents.filter((document) => {
    const searchable = `${document.documentName.ro} ${document.documentName.en} ${document.filename} ${document.vendorName} ${t(`documentType.${document.documentType}`)}`.toLocaleLowerCase(locale);
    return (tab === 'all' || document.status === 'review')
      && (!needle || searchable.includes(needle))
      && (vendor === 'all' || document.vendorId === vendor)
      && (type === 'all' || document.documentType === type)
      && (selectedStatuses.length === 0 || selectedStatuses.includes(document.status))
      && (uploadYear === 'any' || document.uploadedAt.startsWith(uploadYear));
  }).sort((a, b) => sort === 'newest' ? b.uploadedAt.localeCompare(a.uploadedAt) : a.uploadedAt.localeCompare(b.uploadedAt));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, filtered.length);

  function resetFilters() {
    setVendor('all');
    setType('all');
    setSelectedStatuses([]);
    setUploadYear('any');
    setPage(1);
  }

  function resetSearchAndFilters() {
    resetFilters();
    setQuery('');
    setTab('all');
  }

  function toggleStatus(status: DocumentStatus) {
    setSelectedStatuses((current) => current.includes(status) ? current.filter((item) => item !== status) : [...current, status]);
    setPage(1);
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/documents" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
    <div className={styles.page}>
      <AuthenticatedPageHeader
        context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: t('title')}]} />}
        title={t('title')}
        titleId="documents-title"
        description={t('description')}
      />

      <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
        {(['total', 'review', 'valid', 'expiring'] as const).map((item) => {
          const count = item === 'total' ? documents.length : counts[item];
          const helper = item === 'total' ? t('summary.increase', {count: Math.max(0, documents.length - view.previousMonthCount)}) : t('summary.percent', {percent: documents.length ? Math.round(count / documents.length * 100) : 0});
          const card = <><span className={styles.summaryIcon}><AppIcon name={item === 'total' ? 'file' : icons[item]} size={25} /></span><span className={styles.summaryCopy}><strong>{t(`summary.${item}`)}</strong><b>{count}</b><small>{helper}</small></span>{item === 'review' && <AppIcon name="chevronRight" size={19} className={styles.summaryChevron} />}</>;
          return <Surface key={item} className={styles.summaryCard} data-status={item}>{item === 'review' ? <button type="button" onClick={() => {setTab('review'); setPage(1);}} aria-label={`${t('summary.review')}: ${count}`} className={styles.summaryAction}>{card}</button> : <div className={styles.summaryBody}>{card}</div>}</Surface>;
        })}
      </section>

      <nav className={styles.tabs} aria-label={t('tabsLabel')}>
        <button type="button" aria-current={tab === 'all' ? 'page' : undefined} onClick={() => {setTab('all'); setPage(1);}}>{t('tabs.all')} <span>{documents.length}</span></button>
        <button type="button" aria-current={tab === 'review' ? 'page' : undefined} onClick={() => {setTab('review'); setPage(1);}}>{t('tabs.review')} <span>{counts.review}</span></button>
      </nav>

      <div className={styles.workspace} data-filters-open={filtersOpen}>
        <section className={styles.listSurface} aria-label={t('tableRegion')}>
          <div className={styles.toolbar}>
            <label className={styles.search}><AppIcon name="search" size={20} /><span className={styles.srOnly}>{t('searchLabel')}</span><input type="search" value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}} placeholder={t('searchPlaceholder')} /></label>
            <div className={styles.toolbarActions}>
              <button type="button" className={styles.toolbarButton} aria-controls="document-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><AppIcon name="filter" size={17} />{t('filterToggle')}</button>
              <label className={`${styles.toolbarButton} ${styles.sortControl}`}><span className={styles.srOnly}>{t('sortLabel')}</span><span aria-hidden="true">↕</span><select value={sort} onChange={(event) => {setSort(event.target.value as 'newest' | 'oldest'); setPage(1);}} aria-label={t('sortLabel')}><option value="newest">{t('sortVisible')} ↓</option><option value="oldest">{t('sortVisible')} ↑</option></select><AppIcon name="chevronDown" size={16} /></label>
            </div>
          </div>
          {documents.length === 0 ? <EmptyState title={t('noDocuments')} description={t('noDocumentsDescription')} /> : filtered.length === 0 ? <EmptyState title={t('noMatches')} description={t('noMatchesDescription')} action={<button type="button" className={styles.emptyReset} onClick={resetSearchAndFilters}>{t('resetSearchAndFilters')}</button>} /> : <>
            <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={styles.table}>
              <thead><tr><th scope="col">{t('table.document')}</th><th scope="col">{t('table.vendor')}</th><th scope="col">{t('table.type')}</th><th scope="col">{t('table.status')}</th><th scope="col">{t('table.uploaded')}</th><th scope="col">{t('table.expires')}</th><th scope="col">{t('table.actions')}</th></tr></thead>
              <tbody>{visible.map((document) => <DocumentRow key={document.id} document={document} locale={locale} />)}</tbody>
            </table></div>
            <div className={styles.tableFooter}><p>{t('showing', {start, end, count: filtered.length})}</p><nav className={styles.pagination} aria-label={t('paginationLabel')}>
              <button type="button" aria-label={t('previousPage')} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><AppIcon name="chevronRight" size={16} className={styles.previousIcon} /></button>
              {Array.from({length: pageCount}, (_, index) => index + 1).map((number) => <button type="button" key={number} aria-label={t('pageNumber', {page: number})} aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}
              <button type="button" aria-label={t('nextPage')} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><AppIcon name="chevronRight" size={16} /></button>
            </nav></div>
          </>}
        </section>

        <aside id="document-filters" className={styles.filterPanel} aria-labelledby="document-filters-title" hidden={!filtersOpen}><div className={styles.filterHeading}><h2 id="document-filters-title">{t('filtersTitle')}</h2><button type="button" onClick={resetFilters}>{t('reset')}</button></div>
          <div className={styles.filterFields}>
            <label className={styles.filterSelect}>{t('vendor')}<select value={vendor} onChange={(event) => {setVendor(event.target.value); setPage(1);}}><option value="all">{t('allVendors')}</option>{vendorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><AppIcon name="chevronDown" size={16} /></label>
            <label className={styles.filterSelect}>{t('type')}<select value={type} onChange={(event) => {setType(event.target.value as DocumentType | 'all'); setPage(1);}}><option value="all">{t('allTypes')}</option>{types.map((item) => <option key={item} value={item}>{t(`documentType.${item}`)}</option>)}</select><AppIcon name="chevronDown" size={16} /></label>
            <fieldset className={styles.statusFilters}><legend>{t('statusLabel')}</legend>{statuses.filter((status) => status !== 'uploaded' || counts.uploaded > 0).map((status) => <label key={status}><input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} /><span className={styles.filterStatusIcon} data-status={status}><AppIcon name={icons[status]} size={14} /></span><span>{t(`status.${status}`)}</span><small>{counts[status]}</small></label>)}</fieldset>
            <label className={styles.filterSelect}>{t('uploadPeriod')}<select value={uploadYear} onChange={(event) => {setUploadYear(event.target.value); setPage(1);}}><option value="any">{t('anytime')}</option>{uploadYears.map((year) => <option key={year} value={year}>{t('year', {year})}</option>)}</select><AppIcon name="chevronDown" size={16} /></label>
          </div><div className={styles.filterFooter}><button type="button" onClick={resetFilters}>{t('clearFilters')}</button></div>
        </aside>
      </div>
    </div>
  </AuthenticatedAppShell>;
}
