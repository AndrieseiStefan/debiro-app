'use client';

import {useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {SearchInput} from '@/components/ui/SearchInput';
import {Surface} from '@/components/ui/Surface';
import {EmptyState} from '@/components/ui/EmptyState';
import {Avatar} from '@/components/ui/Avatar';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {getActiveCompany, getCurrentMembership, useCompanyState} from '@/features/companies/company-state';
import {useDocumentRecords} from '@/features/documents/created-documents';
import {useVendorState} from '@/features/vendors/created-vendors';
import {useVendorRequirements} from '@/features/vendors/vendor-requirements';
import {useRequirementsState} from '@/features/requirements/requirements-state';
import {useCompanyDocumentsState} from '@/features/company-documents/company-documents-state';
import {CompanyDocumentManager} from '@/features/company-documents/CompanyDocumentManager';
import {documentAccess} from '@/features/documents/document-access';
import {useEmployeeState} from '@/features/employees/employees-state';
import {vendorCategories} from '@/features/vendors/types';
import {VendorComplianceBadge} from '@/features/vendors/VendorComplianceBadge';
import {DocumentComplianceBadge} from '@/features/documents/DocumentComplianceBadge';
import {AppearanceIcon} from '@/features/requirements/AppearancePicker';
import type {DocumentType} from '@/features/documents/types';
import {normalizeSearchQuery, readWorkspaceSearchData, searchGroups, searchHighlightParts, searchResultDestination, searchWorkspace, type GlobalSearchResult, type SearchDestination, type SearchLabels} from './search-workspace';
import styles from './GlobalSearch.module.css';

const documentTypes: DocumentType[] = ['tax', 'registration', 'fire', 'insurance', 'inspector', 'financial', 'environment', 'safety', 'iso', 'permit', 'custom'];
const resultKey = (result: GlobalSearchResult) => `${result.type}:${result.id}`;
export function GlobalSearch({locale, currentPath, className}: {locale: string; currentPath: string; className?: string}) {
  const companyId = useCompanyState().activeCompanyId ?? '';
  // Switching company unmounts temporary query/selection before old metadata can render.
  return <WorkspaceGlobalSearch key={`${companyId}:${locale}:${currentPath}`} locale={locale} currentPath={currentPath} className={className}/>;
}
function WorkspaceGlobalSearch({locale, currentPath, className}: {locale: string; currentPath: string; className?: string}) {
  const t = useTranslations('GlobalSearch'), app = useTranslations('AppShell'), vendorsT = useTranslations('Vendors'), documentsT = useTranslations('Documents'), requirementsT = useTranslations('Requirements'), companyT = useTranslations('CompanyDocuments');
  const router = useRouter();
  const companies = useCompanyState(), vendors = useVendorState(), documents = useDocumentRecords(), vendorRequirements = useVendorRequirements(), requirements = useRequirementsState(), companyDocuments = useCompanyDocumentsState(), employees = useEmployeeState();
  const data = useMemo(() => ({companies, vendors, documents, vendorRequirements, requirements, companyDocuments, employees}), [companies, vendors, documents, vendorRequirements, requirements, companyDocuments, employees]);
  const active = getActiveCompany(data.companies), companyId = active?.company.id ?? '';
  const accessible = Boolean(active && getCurrentMembership(active));
  const language = locale === 'en' ? 'en' : 'ro';
  const labels: SearchLabels = useMemo(() => ({categories: Object.fromEntries(vendorCategories.map((key) => [key, vendorsT(`category.${key}`)])) as SearchLabels['categories'], documentTypes: Object.fromEntries(documentTypes.map((key) => [key, documentsT(`documentType.${key}`)])) as SearchLabels['documentTypes'], draftTitle: requirementsT('creation.draftListTitle'), companyDocuments: t('groups.companyDocuments'), employeeDocuments: t('groups.employeeDocuments')}), [vendorsT, documentsT, requirementsT, t]);
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [selected, setSelected] = useState<string | null>(null), [failed, setFailed] = useState(false);
  const [position, setPosition] = useState({left: 12, top: 72, width: 0, maxHeight: 0});
  const [companyDocument, setCompanyDocument] = useState<SearchDestination['companyDocument'] | null>(null);
  const input = useRef<HTMLInputElement>(null), root = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLElement>());
  const suppressFocusOpen = useRef(false);
  const id = useId(), listId = `${id}-results`, titleId = `${id}-title`;
  const results = useMemo(() => searchWorkspace(data, companyId, query, language, labels), [data, companyId, query, language, labels]);
  const flat = useMemo(() => searchGroups.flatMap((group) => results[group]), [results]);
  const destinations = useMemo(() => new Map(flat.map((result) => [resultKey(result), searchResultDestination(result, data)])), [flat, data]);
  const selectedIndex = flat.findIndex((result) => resultKey(result) === selected);
  const ready = !normalizeSearchQuery(query);
  const close = useCallback(() => {setOpen(false); setQuery(''); setSelected(null); setFailed(false);}, []);
  function dismiss() {
    close(); suppressFocusOpen.current = true; input.current?.focus({preventScroll: true}); suppressFocusOpen.current = false;
  }

  useEffect(() => {
    function shortcut(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'k' || !accessible || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault(); input.current?.focus(); setOpen(true);
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [accessible]);
  useLayoutEffect(() => {if (panel.current) panel.current.scrollTop = 0;}, [query]);
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = window.innerWidth < 768 ? 12 : 24;
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0, viewportTop = viewport?.offsetTop ?? 0;
      const left = Math.max(viewportLeft + gutter, rect.left), top = Math.max(viewportTop + gutter, rect.bottom + 12);
      setPosition({left, top, width: Math.max(0, viewportLeft + (viewport?.width ?? window.innerWidth) - left - gutter), maxHeight: Math.max(0, viewportTop + (viewport?.height ?? window.innerHeight) - top - gutter)});
    }
    function outside(event: Event) {
      if (event.target instanceof Node && !root.current?.contains(event.target) && !panel.current?.contains(event.target)) close();
    }
    place();
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true); window.visualViewport?.addEventListener('resize', place); window.visualViewport?.addEventListener('scroll', place);
    return () => {document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); window.visualViewport?.removeEventListener('resize', place); window.visualViewport?.removeEventListener('scroll', place);};
  }, [open, close]);

  function keyboard(event: KeyboardEvent) {
    // Drawer portals share this React ancestor; leave their native focus/Escape
    // handling to the existing modal rather than consuming search shortcuts.
    if (event.target instanceof HTMLElement && event.target.closest('[aria-modal="true"]')) return;
    if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); dismiss(); return;}
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!flat.length) return;
      const index = selectedIndex < 0 ? event.key === 'ArrowDown' ? 0 : flat.length - 1 : (selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length;
      const next = resultKey(flat[index]); setSelected(next);
      const row = rows.current.get(next); row?.scrollIntoView({block: 'nearest'});
      if (document.activeElement !== input.current) row?.focus({preventScroll: true});
    }
    if (event.key === 'Enter' && event.target === input.current) {event.preventDefault(); if (selectedIndex >= 0) rows.current.get(resultKey(flat[selectedIndex]))?.click();}
  }
  function activate(event: MouseEvent<HTMLElement>, result: GlobalSearchResult) {
    const destination = searchResultDestination(result, readWorkspaceSearchData());
    if (!destination) {event.preventDefault(); setSelected(null); setFailed(true); return;}
    if (destination.companyDocument) {
      event.preventDefault(); dismiss(); suppressFocusOpen.current = true; setCompanyDocument(destination.companyDocument); return;
    }
    if (result.type === 'employee_document' && currentPath === destination.href) {
      const documentsTab = document.getElementById('employee-tab-documents');
      if (documentsTab) {event.preventDefault(); documentsTab.click(); close(); return;}
    }
    // A role/status can change between rendering and activation; use the revalidated destination.
    if (destination.href !== destinations.get(resultKey(result))?.href || event.currentTarget.tagName === 'BUTTON') {event.preventDefault(); router.push(destination.href);}
    close();
  }
  function row(result: GlobalSearchResult) {
    const identity = resultKey(result), destination = destinations.get(identity);
    if (!destination) return null;
    const props = {id: `${id}-${encodeURIComponent(identity)}`, ref: (element: HTMLElement | null) => {if (element) rows.current.set(identity, element); else rows.current.delete(identity);}, role: 'option', 'aria-selected': selected === identity, className: styles.row, 'data-search-result': identity, 'data-requirement-result-id': result.type === 'requirement' ? result.id : undefined, onFocus: () => setSelected(identity), onClick: (event: MouseEvent<HTMLElement>) => activate(event, result)};
    const content = <>
      <div className={styles.identity}>{result.type === 'vendor' || result.type === 'employee' ? <Avatar initials={result.title.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}/> : <AppearanceIcon appearance={result.type === 'requirement' ? result.appearance : {iconKey: 'file', iconColorKey: 'blue'}} size="list"/>}<div><strong>{searchHighlightParts(result.title, query).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : part.text)}</strong><small>{result.subtitle}</small></div></div>
      {result.type === 'document' && <span className={styles.vendor}><AppIcon name="building" size={18}/>{result.vendorName}</span>}
      <span className={styles.status}>{result.type === 'vendor' ? <><VendorComplianceBadge status={result.status}/>{result.inactive && <StatusBadge tone="neutral">{vendorsT('inactive')}</StatusBadge>}</> : result.type === 'document' ? <DocumentComplianceBadge status={result.status}/> : result.type === 'company_document' || result.type === 'employee_document' ? <StatusBadge tone={result.status === 'valid' ? 'success' : result.status === 'missing' || result.status === 'expired' ? 'danger' : 'warning'}>{companyT(`status.${result.status}`)}</StatusBadge> : result.type === 'requirement' && result.isDraft ? <StatusBadge tone="info">{t('draft')}</StatusBadge> : null}</span>
      {result.type === 'document' && result.expiresAt && <time className={styles.expiry} dateTime={result.expiresAt} data-status={result.status}>{new Intl.DateTimeFormat(language, {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${result.expiresAt}T12:00:00Z`))}</time>}
      <AppIcon name="chevronRight" size={18}/>
    </>;
    return destination.companyDocument ? <button type="button" key={identity} {...props}>{content}</button> : <Link key={identity} href={destination.href} {...props}>{content}</Link>;
  }
  return <div ref={root} className={[styles.control, className].filter(Boolean).join(' ')} onKeyDown={keyboard}>
    <SearchInput ref={input} label={app('searchLabel')} placeholder={app('searchPlaceholder')} value={query} role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && selectedIndex >= 0 ? `${id}-${encodeURIComponent(selected!)}` : undefined} disabled={!accessible} onFocus={() => {if (suppressFocusOpen.current) {suppressFocusOpen.current = false; return;} setOpen(true);}} onChange={(event) => {setQuery(event.target.value); setSelected(null); setFailed(false); setOpen(true);}} endAdornment={<>{query && <button type="button" className={styles.iconButton} aria-label={t('clear')} onClick={() => {setQuery(''); setSelected(null); setFailed(false); input.current?.focus();}}><AppIcon name="close" size={18}/></button>}<kbd aria-hidden="true">⌘ K</kbd></>}/>
    {open && createPortal(<Surface ref={panel} className={styles.panel} style={position} role="region" aria-labelledby={titleId} data-global-search-panel>
        <header className={styles.heading}><span className={styles.searchIcon}><AppIcon name="search" size={24}/></span><div><h2 id={titleId}>{ready ? t('readyTitle') : t('resultsFor', {query: query.trim().replace(/\s+/g, ' ')})}</h2>{!ready && <p role="status" aria-live="polite">{t('total', {count: results.totalCount})}{results.totalCount > 0 && `: ${searchGroups.filter((group) => results[group].length).map((group) => t(`counts.${group}`, {count: results[group].length})).join(', ')}`}</p>}</div><button type="button" className={styles.iconButton} aria-label={t('close')} onClick={dismiss}><AppIcon name="close" size={20}/></button></header>
        {failed && <p role="alert" className={styles.error}>{t('unavailable')}</p>}
        <div id={listId} role="listbox" aria-labelledby={titleId}>
          {ready ? <EmptyState title={t('readyTitle')} description={t('readyDescription')}/> : results.totalCount === 0 ? <EmptyState icon={<AppIcon name="search" size={26}/>} title={t('emptyTitle')} description={t('emptyDescription')}/> : searchGroups.filter((group) => results[group].length).map((group) => <section key={group} role="group" aria-labelledby={`${id}-${group}`} className={styles.group}><h3 id={`${id}-${group}`}><AppIcon name={group === 'vendors' || group === 'employees' ? 'users' : group === 'requirements' ? 'shield' : 'file'} size={22}/>{t(`groups.${group}`)} <span>({results[group].length})</span></h3>{results[group].map(row)}</section>)}
        </div>
    </Surface>, document.body)}
    {companyDocument && documentAccess(companyId, data.companies).visible && <CompanyDocumentManager companyId={companyId} locale={language} selection={{mode: 'details', ...companyDocument}} onClose={() => setCompanyDocument(null)} onSuccess={() => {}}/>}
  </div>;
}
