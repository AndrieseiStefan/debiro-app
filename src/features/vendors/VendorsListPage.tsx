'use client';

import {useState, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import type {VendorCategory, VendorListItem, VendorStatus, VendorsListViewModel} from './types';
import styles from './VendorsListPage.module.css';

const categories: VendorCategory[] = ['construction', 'cleaning', 'software', 'materials', 'logistics', 'energy', 'food', 'medical'];
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

function VendorRow({vendor, locale, selected, onSelect}: {vendor: VendorListItem; locale: string; selected: boolean; onSelect: (id: string, checked: boolean) => void}) {
  const t = useTranslations('Vendors');
  const initials = vendor.name.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const documentPercent = vendor.documentCount / vendor.documentTarget * 100;

  return <tr>
    <td className={styles.checkboxCell}><input type="checkbox" aria-label={t('selectVendor', {name: vendor.name})} checked={selected} onChange={(event) => onSelect(vendor.id, event.target.checked)} /></td>
    <td><div className={styles.vendorIdentity}>
      <span className={styles.avatar} data-avatar={vendor.category}>{initials}</span>
      <span className={styles.vendorName}><strong>{vendor.name}</strong><small>{t('registrationPrefix')}: {vendor.registrationNumber}</small></span>
    </div></td>
    <td><span className={styles.category}><CategoryIcon category={vendor.category} />{t(`category.${vendor.category}`)}</span></td>
    <td><VendorStatusBadge status={vendor.status} /></td>
    <td><span className={styles.documents}><span className={styles.progressTrack}><span className={styles.progressFill} data-status={vendor.status} style={{width: `${documentPercent}%`}} /></span><span>{vendor.documentCount}/{vendor.documentTarget}</span></span></td>
    <td><time className={styles.expiry} data-tone={vendor.nextExpiry.tone}>{locale === 'en' ? vendor.nextExpiry.en : vendor.nextExpiry.ro}</time></td>
    <td className={styles.actionsCell}>{vendor.id === 'construct-pro' ? <Link href={`/vendors/${vendor.id}`} aria-label={t('detailsAction', {name: vendor.name})} className={styles.rowAction}><AppIcon name="more" size={21} /></Link> : <button type="button" aria-disabled="true" aria-label={t('rowAction', {name: vendor.name})} className={styles.rowAction}><AppIcon name="more" size={21} /></button>}</td>
  </tr>;
}

export function VendorsListPage({locale, view}: {locale: string; view: VendorsListViewModel}) {
  const t = useTranslations('Vendors');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<VendorCategory | 'all'>('all');
  const [status, setStatus] = useState<VendorStatus | 'all'>('all');
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const counts = {
    compliant: view.vendors.filter((vendor) => vendor.status === 'compliant').length,
    attention: view.vendors.filter((vendor) => vendor.status === 'attention').length,
    noncompliant: view.vendors.filter((vendor) => vendor.status === 'noncompliant').length
  };
  const filtered = view.vendors.filter((vendor) => {
    const matchesQuery = `${vendor.name} ${vendor.registrationNumber} ${vendor.contactName ?? ''}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
    return matchesQuery && (category === 'all' || vendor.category === category) && (status === 'all' || vendor.status === status);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((vendor) => selectedIds.includes(vendor.id));
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, filtered.length);

  function selectVendor(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, id] : current.filter((selectedId) => selectedId !== id));
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/vendors" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
    <div className={styles.pageContent}>
      <AuthenticatedPageHeader
        context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: 'Dashboard', href: '/dashboard'}, {label: t('title')}]} />}
        title={t('title')}
        titleId="vendors-title"
        description={t('description')}
        actions={<AuthenticatedPagePrimaryAction icon="plus" aria-disabled="true">{t('addVendor')}</AuthenticatedPagePrimaryAction>}
      />

      <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
        {(['all', ...statuses] as const).map((item) => {
          const value = item === 'all' ? view.vendors.length : counts[item];
          const icon = item === 'all' ? 'users' : statusIcons[item];
          return <Surface key={item} className={styles.summaryCard} data-status={item}>
            <span className={styles.summaryIcon}><AppIcon name={icon} size={25} /></span>
            <span className={styles.summaryCopy}><span>{t(`summary.${item}`)}</span><strong>{value}</strong></span>
          </Surface>;
        })}
      </section>

      <section className={styles.filterGrid} aria-label={t('filtersLabel')}>
        <label className={styles.vendorSearch}>
          <AppIcon name="search" size={22} />
          <span className={styles.visuallyHidden}>{t('searchLabel')}</span>
          <input type="search" value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}} placeholder={t('searchPlaceholder')} />
        </label>
        <label className={styles.selectField}><span>{t('categoryLabel')}</span><select value={category} onChange={(event) => {setCategory(event.target.value as VendorCategory | 'all'); setPage(1);}}>
          <option value="all">{t('allCategories')}</option>
          {categories.map((item) => <option key={item} value={item}>{t(`category.${item}`)}</option>)}
        </select><AppIcon name="chevronDown" size={17} /></label>
        <label className={styles.selectField}><span>{t('statusLabel')}</span><select value={status} onChange={(event) => {setStatus(event.target.value as VendorStatus | 'all'); setPage(1);}}>
          <option value="all">{t('allStatuses')}</option>
          {statuses.map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}
        </select><AppIcon name="chevronDown" size={17} /></label>
        <button type="button" aria-disabled="true" className={styles.moreFilters}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="#fff" /><circle cx="16" cy="12" r="2" fill="#fff" /><circle cx="11" cy="18" r="2" fill="#fff" /></svg>{t('moreFilters')}</button>
      </section>

      <Surface className={styles.listSurface}>
        <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}>
          <table className={styles.vendorTable}>
            <thead><tr>
              <th scope="col" className={styles.checkboxCell}><input type="checkbox" aria-label={t('selectVisible')} checked={allVisibleSelected} onChange={(event) => {
                const visibleIds = visible.map((vendor) => vendor.id);
                setSelectedIds((current) => event.target.checked ? [...new Set([...current, ...visibleIds])] : current.filter((id) => !visibleIds.includes(id)));
              }} /></th>
              <th scope="col">{t('table.vendor')} <span aria-hidden="true">↕</span></th>
              <th scope="col">{t('table.category')} <span aria-hidden="true">↕</span></th>
              <th scope="col">{t('table.generalStatus')} <span aria-hidden="true">↕</span></th>
              <th scope="col">{t('table.documents')} <span aria-hidden="true">↕</span></th>
              <th scope="col">{t('table.nextExpiry')} <span aria-hidden="true">↕</span></th>
              <th scope="col">{t('table.actions')}</th>
            </tr></thead>
            <tbody>{visible.map((vendor) => <VendorRow key={vendor.id} vendor={vendor} locale={locale} selected={selectedIds.includes(vendor.id)} onSelect={selectVendor} />)}
              {visible.length === 0 && <tr><td colSpan={7} className={styles.noResults}>{t('noResults')}</td></tr>}
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
  </AuthenticatedAppShell>;
}
