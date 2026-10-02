'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Surface} from '@/components/ui/Surface';
import {SearchInput} from '@/components/ui/SearchInput';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {SelectField} from '@/components/ui/SelectField';
import {useLocalAuditEvents} from '@/features/notifications/local-audit';
import {activityIcons, activityTones} from '@/features/notifications/presentation';
import {notificationsFixture} from '@/features/notifications/fixtures';
import type {AuditEventType} from '@/features/notifications/types';
import {vendorActivity, filterVendorActivity, type VendorActivityFilters} from './vendor-activity';
import styles from './VendorWorkspace.module.css';

export function VendorActivityPanel({companyId, vendorId, language}: {companyId: string; vendorId: string; language: 'ro' | 'en'}) {
  const t = useTranslations('VendorWorkspace.activity');
  const filtersT = useTranslations('DataFilters');
  const events = vendorActivity(companyId, vendorId, useLocalAuditEvents());
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<VendorActivityFilters>({type: 'all', range: 'all', actor: 'all'});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const referenceTime = events.reduce((latest, event) => event.occurredAt > latest ? event.occurredAt : latest, notificationsFixture.referenceTime);
  const visible = filterVendorActivity(events, query, filters, language, referenceTime);
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const count = Number(filters.type !== 'all') + Number(filters.range !== 'all') + Number(filters.actor !== 'all');
  const types = [...new Set(events.map((event) => event.eventType))];
  const actors = [...new Set(events.flatMap((event) => event.actorName ? [event.actorName] : event.actorType === 'system' ? ['system'] : []))];
  function reset() {setFilters({type: 'all', range: 'all', actor: 'all'}); setPage(1);}
  function change(patch: Partial<VendorActivityFilters>) {setFilters({...filters, ...patch}); setPage(1);}
  return <Surface role="tabpanel" id="vendor-activity" aria-labelledby="tab-activity" className={styles.panel}>
    <header className={styles.heading}><div><h2><AppIcon name="file" size={22}/>{t('title', {count: events.length})}</h2><p>{t('description')}</p></div><div className={styles.activityControls}>
      <SearchInput className={styles.activitySearch} label={t('searchLabel')} placeholder={t('searchPlaceholder')} value={query} onChange={(event) => {setQuery(event.target.value); setPage(1);}}/>
      <FilterPanel activeCount={count} onReset={reset}>
        <SelectField id="vendor-activity-type" label={t('type')} value={filters.type} onChange={(event) => change({type: event.target.value as AuditEventType | 'all'})}><option value="all">{t('allTypes')}</option>{types.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</SelectField>
        <SelectField id="vendor-activity-range" label={t('range')} value={filters.range} onChange={(event) => change({range: event.target.value as VendorActivityFilters['range']})}>{(['all', 'last7', 'last30'] as const).map((range) => <option key={range} value={range}>{t(range)}</option>)}</SelectField>
        {actors.length > 0 && <SelectField id="vendor-activity-actor" label={t('actor')} value={filters.actor} onChange={(event) => change({actor: event.target.value})}><option value="all">{t('allActors')}</option>{actors.map((actor) => <option key={actor} value={actor}>{actor === 'system' ? t('system') : actor}</option>)}</SelectField>}
      </FilterPanel>
    </div></header>
    {rows.length ? <ol className={styles.timeline}>{rows.map((event) => <li key={event.id} data-vendor-event={event.id} data-event-type={event.eventType}>
      <span className={styles.eventIcon} data-tone={activityTones[event.eventType]}><AppIcon name={activityIcons[event.eventType]} size={21}/></span><span className={styles.eventCopy}><strong>{event.action[language]}</strong><span>{event.description[language]}</span></span><span className={styles.eventMeta}><span>{event.actorName ?? (event.actorType === 'system' ? t('system') : '—')}</span><time dateTime={event.occurredAt}>{new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', ...(!event.dateOnly && {hour: '2-digit', minute: '2-digit'}), timeZone: 'UTC'}).format(new Date(event.occurredAt))}</time></span>
    </li>)}</ol> : <p className={styles.empty}>{t(events.length ? 'noResults' : 'empty')}{count > 0 && <button type="button" onClick={reset}>{filtersT('reset')}</button>}</p>}
    {visible.length > 0 && <footer className={styles.pagination}><nav aria-label={t('pagination')}><button type="button" disabled={currentPage === 1} aria-label={t('previous')} onClick={() => setPage(currentPage - 1)}>‹</button>{Array.from({length: pages}, (_, index) => <button key={index} type="button" aria-current={currentPage === index + 1 ? 'page' : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" disabled={currentPage === pages} aria-label={t('next')} onClick={() => setPage(currentPage + 1)}>›</button></nav><label>{t('pageSize')}<select value={pageSize} onChange={(event) => {setPageSize(Number(event.target.value)); setPage(1);}}>{[5, 10, 20].map((size) => <option key={size} value={size}>{t('perPage', {count: size})}</option>)}</select></label></footer>}
  </Surface>;
}
