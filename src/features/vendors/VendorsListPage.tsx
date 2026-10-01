'use client';

import {useCallback, useRef, useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {SearchInput} from '@/components/ui/SearchInput';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {SelectField} from '@/components/ui/SelectField';
import {vendorCategories, type VendorCategory, type VendorListItem, type VendorStatus, type VendorsListViewModel} from './types';
import {AddVendorDrawer} from './AddVendorDrawer';
import {createLocalVendor, useVendorState, vendorListItems, vendorSummary, type NewVendorInput} from './created-vendors';
import {VendorRowActions} from './VendorRowActions';
import {sortVendors, type VendorSort, type VendorSortColumn} from './sorting';
import styles from './VendorsListPage.module.css';

const statuses: VendorStatus[] = ['compliant', 'attention', 'noncompliant'];
const statusTones: Record<VendorStatus, StatusTone> = {compliant: 'success', attention: 'warning', noncompliant: 'danger'};
const statusIcons: Record<VendorStatus, AppIconName> = {compliant: 'check', attention: 'clock', noncompliant: 'close'};

const categoryPaths: Record<VendorCategory, ReactNode> = {
  construction: <><path d="M3 19h18M5 16l2-8 5-3 5 3 2 8M9 5V3m6 2V3M9 16v3m6-3v3" /></>,
  cleaning: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z" /></>,
  software: <><rect x="3" y="4" width="18" height="14" rx="1" /><path d="M9 22h6m-3-4v4" /></>,
  materials: <><path d="M4 21V8h7v13M11 21V3h8v18M2 21h20M7 11h1m-1 4h1m6-8h2m-2 4h2m-2 4h2" /></>,
  logistics: <><path d="M3 6h12v11H3zM15 10h4l3 4v3h-7M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm13 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></>,
  energy: <><path d="M20 4c-8 0-15 2-15 10a6 6 0 0 0 6 6c8 0 10-7 9-16ZM5 20c3-6 6-8 11-11" /></>,
  food: <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 21V3c-3 2-4 5-4 9h4" /></>,
  medical: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 7v10M7 12h10" /></>
};

function CategoryIcon({category}: {category: VendorCategory}) {
  return <svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{categoryPaths[category]}</svg>;
}

function VendorStatusBadge({status}: {status: VendorStatus}) {
  const t = useTranslations('Vendors');
  return <StatusBadge tone={statusTones[status]} className={styles.statusBadge}>
    <span className={styles.statusIcon}><AppIcon name={statusIcons[status]} size={14} /></span>
    {t(`status.${status}`)}
  </StatusBadge>;
}

function VendorRow({vendor, locale, menuOpen, onMenuChange}: {vendor: VendorListItem; locale: string; menuOpen: boolean; onMenuChange: (open: boolean) => void}) {
  const t = useTranslations('Vendors');
  const initials = vendor.name.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const documentPercent = vendor.documentTarget > 0 ? vendor.documentCount / vendor.documentTarget * 100 : 0;

  return <tr data-vendor-id={vendor.id} data-lifecycle={vendor.lifecycleStatus}>
    <td><div className={styles.vendorIdentity}>
      <span className={styles.avatar} data-avatar={vendor.category}>{initials}</span>
      <span className={styles.vendorName}><span className={styles.nameLine}><Link href={`/vendors/${vendor.id}`} aria-label={t('detailsAction', {name: vendor.name})}>{vendor.name}</Link>{vendor.lifecycleStatus === 'inactive' && <span className={styles.inactiveBadge}>{t('inactive')}</span>}</span><small>{t('registrationPrefix')}: {vendor.registrationNumber}</small></span>
    </div></td>
    <td><span className={styles.category}><CategoryIcon category={vendor.category} />{t(`category.${vendor.category}`)}</span></td>
    <td><VendorStatusBadge status={vendor.status} /></td>
    <td><span className={styles.documents}><span className={styles.progressTrack}><span className={styles.progressFill} data-status={vendor.status} style={{width: `${documentPercent}%`}} /></span><span>{vendor.documentCount}/{vendor.documentTarget}</span></span></td>
    <td><time className={styles.expiry} dateTime={vendor.nextExpiry.date ?? undefined} data-tone={vendor.nextExpiry.tone}>{locale === 'en' ? vendor.nextExpiry.en : vendor.nextExpiry.ro}</time></td>
    <td className={styles.actionsCell}><VendorRowActions vendor={vendor} open={menuOpen} onOpenChange={onMenuChange}/></td>
  </tr>;
}

export function VendorsListPage({locale, view}: {locale: string; view: VendorsListViewModel}) {
  const t = useTranslations('Vendors');
  const router = useRouter();
  const filtersT = useTranslations('DataFilters');
  const vendorState = useVendorState();
  const allVendors = vendorListItems(vendorState, view.vendors);
  const [addPhase, setAddPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const closeAdd = useCallback(() => setAddPhase('closing'), []);
  const finishAdd = useCallback(() => setAddPhase('closed'), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<VendorCategory | 'all'>('all');
  const [status, setStatus] = useState<VendorStatus | 'all'>('all');
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<VendorSort | null>(null);
  const [menuVendorId, setMenuVendorId] = useState<string | null>(null);
  const counts = vendorSummary(allVendors);
  const filtered = allVendors.filter((vendor) => {
    const matchesQuery = `${vendor.name} ${vendor.registrationNumber} ${vendor.contactName ?? ''}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
    return matchesQuery && (category === 'all' || vendor.category === category) && (status === 'all' || vendor.status === status);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const sorted = sortVendors(filtered, sort, locale, (item) => t(`category.${item}`));
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, filtered.length);
  const activeCount = Number(category !== 'all') + Number(status !== 'all');

  function resetFilters() {
    setCategory('all');
    setStatus('all');
    setPage(1);
  }

  function changeSort(column: VendorSortColumn) {
    setSort((current) => ({column, direction: current?.column === column && current.direction === 'ascending' ? 'descending' : 'ascending'}));
    setPage(1);
  }

  function createVendor(input: NewVendorInput) {
    const vendor = createLocalVendor(input);
    router.push(`/vendors/${vendor.id}`);
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/vendors" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
    <div className={styles.pageContent}>
      <AuthenticatedPageHeader
        context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: t('title')}]} />}
        title={t('title')}
        titleId="vendors-title"
        description={t('description')}
        actions={<AuthenticatedPagePrimaryAction icon="plus" onClick={(event) => {addTriggerRef.current = event.currentTarget; setAddPhase('open');}}>{t('addVendor')}</AuthenticatedPagePrimaryAction>}
      />

      <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
        {(['all', ...statuses] as const).map((item) => {
          const value = item === 'all' ? allVendors.length : counts[item];
          const icon = item === 'all' ? 'users' : statusIcons[item];
          return <Surface key={item} className={styles.summaryCard} data-status={item}>
            <span className={styles.summaryIcon}><AppIcon name={icon} size={25} /></span>
            <span className={styles.summaryCopy}><span>{t(`summary.${item}`)}</span><strong>{value}</strong></span>
          </Surface>;
        })}
      </section>

      <section className={styles.filterGrid} aria-label={t('filtersLabel')}>
        <SearchInput className={styles.vendorSearch} label={t('searchLabel')} value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}} placeholder={t('searchPlaceholder')}/>
        <FilterPanel activeCount={activeCount} onReset={resetFilters}>
          <SelectField id="vendor-category-filter" label={t('categoryLabel')} value={category} onChange={(event) => {setCategory((event.target.value || 'all') as VendorCategory | 'all'); setPage(1);}}>
            <option value="all">{t('allCategories')}</option>{vendorCategories.map((item) => <option key={item} value={item}>{t(`category.${item}`)}</option>)}
          </SelectField>
          <SelectField id="vendor-status-filter" label={filtersT('complianceStatus')} value={status} onChange={(event) => {setStatus((event.target.value || 'all') as VendorStatus | 'all'); setPage(1);}}>
            <option value="all">{t('allStatuses')}</option>{statuses.map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}
          </SelectField>
        </FilterPanel>
      </section>

      <Surface className={styles.listSurface}>
        <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}>
          <table className={styles.vendorTable}>
            <thead><tr>
              {(['vendor', 'category', 'generalStatus', 'documents', 'nextExpiry'] as const).map((column) => <th key={column} scope="col" aria-sort={sort?.column === column ? sort.direction : undefined}>
                <button type="button" className={styles.sortHeader} data-active={sort?.column === column || undefined} onClick={() => changeSort(column)}>{t(`table.${column}`)}<span aria-hidden="true">{sort?.column === column ? sort.direction === 'ascending' ? '↑' : '↓' : '↕'}</span></button>
              </th>)}
              <th scope="col">{t('table.actions')}</th>
            </tr></thead>
            <tbody>{visible.map((vendor) => <VendorRow key={vendor.id} vendor={vendor} locale={locale} menuOpen={menuVendorId === vendor.id} onMenuChange={(open) => setMenuVendorId(open ? vendor.id : null)} />)}
              {visible.length === 0 && <tr><td colSpan={6} className={styles.noResults}>{t('noResults')}{activeCount > 0 && <button type="button" onClick={resetFilters}>{filtersT('reset')}</button>}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className={styles.tableFooter}>
          <p>{t('showing', {start, end, count: filtered.length})}</p>
          <nav className={styles.pagination} aria-label={t('paginationLabel')}>
            <button type="button" disabled={currentPage === 1} aria-label={t('previousPage')} onClick={() => setPage(currentPage - 1)}><AppIcon name="chevronRight" size={18} className={styles.chevronLeft} /></button>
            {Array.from({length: pageCount}, (_, index) => index + 1).map((number) => <button key={number} type="button" aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}
            <button type="button" disabled={currentPage === pageCount} aria-label={t('nextPage')} onClick={() => setPage(currentPage + 1)}><AppIcon name="chevronRight" size={18} /></button>
          </nav>
          <label className={styles.pageSize}><span className={styles.visuallyHidden}>{t('pageSizeLabel')}</span><select value={pageSize} onChange={(event) => {setPageSize(Number(event.target.value)); setPage(1);}}>
            {[8, 16, 24].map((size) => <option key={size} value={size}>{t('perPage', {count: size})}</option>)}
          </select><AppIcon name="chevronDown" size={17} /></label>
        </div>
      </Surface>

      <aside className={styles.banner} aria-label={t('bannerTitle')}><div><h2>{t('bannerTitle')}</h2><p>{t('bannerDescription')}</p></div><p className={styles.bannerHandwriting}>{t('bannerHandwriting')}</p></aside>
    </div>
    {addPhase !== 'closed' && <AddVendorDrawer phase={addPhase} onClose={closeAdd} onExited={finishAdd} triggerRef={addTriggerRef} onCreate={createVendor}/>}
  </AuthenticatedAppShell>;
}
