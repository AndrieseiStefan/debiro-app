'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Surface} from '@/components/ui/Surface';
import {EmptyState} from '@/components/ui/EmptyState';
import {Pagination} from '@/components/ui/Pagination';
import {AppIcon} from '@/components/layout/AppIcon';
import {activityIcons, activityTones} from '@/features/notifications/presentation';
import {getEmployeeActivity, useEmployeeState} from './employees-state';
import styles from '@/features/vendors/VendorWorkspace.module.css';

export function EmployeeActivityPanel({companyId, employeeId, locale}: {companyId: string; employeeId: string; locale: 'ro' | 'en'}) {
  const t = useTranslations('EmployeeDocuments'); useEmployeeState();
  const events = getEmployeeActivity(companyId, employeeId), [page, setPage] = useState(1), [size, setSize] = useState(10);
  const pages = Math.max(1, Math.ceil(events.length / size)), current = Math.min(page, pages);
  return <Surface className={styles.panel} role="tabpanel" id="employee-activity" aria-labelledby="employee-tab-activity">
    <header className={styles.heading}><h2>{t('activity')}</h2></header>
    {events.length ? <><ol className={styles.timeline}>{events.slice((current - 1) * size, current * size).map((event) => {
      const type = event.type === 'employee_created' || event.type === 'employee_edited' || event.type === 'metadata_updated' ? 'other' : event.type;
      return <li key={event.id} data-employee-event={event.id} data-event-type={event.type}><span className={styles.eventIcon} data-tone={activityTones[type]}><AppIcon name={activityIcons[type]} size={21}/></span><span className={styles.eventCopy}><strong>{t(`events.${event.type}`)}</strong></span><span className={styles.eventMeta}><span>{event.actorName || '—'}</span><time dateTime={event.occurredAt}>{new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'}).format(new Date(event.occurredAt))}</time></span></li>;
    })}</ol><Pagination page={current} pageCount={pages} pageSize={size} total={events.length} pageSizeLabel={t('activityPageSize')} totalLabel={t('activityTotal', {count: events.length})} onPage={setPage} onPageSize={(value) => {setSize(value); setPage(1);}}/></> : <EmptyState title={t('noActivity')}/>}
  </Surface>;
}
