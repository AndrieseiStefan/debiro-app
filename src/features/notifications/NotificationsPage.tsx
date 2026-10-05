'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {EmptyState} from '@/components/ui/EmptyState';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {useNotificationItems} from './local-state';
import {useLocalAuditEvents} from './local-audit';
import {useCompanyState} from '@/features/companies/company-state';
import {useDocumentRecords} from '@/features/documents/created-documents';
import {useVendorRequirements} from '@/features/vendors/vendor-requirements';
import {useVendorState, vendorListItems} from '@/features/vendors/created-vendors';
import {vendorsListFixture} from '@/features/vendors/fixtures';
import {calendarDaysUntil} from '@/lib/fixture-clock';
import {notificationDocuments} from './document-projections';
import {auditEventsToCsv, filterAuditEvents, filterNotifications, type ActivityCategory, type ActivityRange} from './selectors';
import type {AuditEventType, NotificationsViewModel} from './types';
import styles from './NotificationsPage.module.css';

const categories: ActivityCategory[] = ['all', 'unread', 'reminders', 'uploads', 'status'];
const activityIcons: Record<AuditEventType, AppIconName> = {
  reminder: 'bell', document_upload: 'file', document_replaced: 'upload', document_confirmed: 'check', document_rejected: 'close', document_expiring: 'clock',
  document_missing: 'fileX', status_changed: 'clock', vendor_added: 'users', other: 'info', template_applied: 'file', vendor_invited: 'send', vendor_edited: 'edit', vendor_active: 'check', vendor_inactive: 'close', requirement_removed: 'fileX'
};
const activityTones: Record<AuditEventType, string> = {
  reminder: 'blue', document_upload: 'green', document_replaced: 'blue', document_confirmed: 'green', document_rejected: 'red', document_expiring: 'amber',
  document_missing: 'red', status_changed: 'blue', vendor_added: 'blue', other: 'blue', template_applied: 'blue', vendor_invited: 'blue', vendor_edited: 'amber', vendor_active: 'green', vendor_inactive: 'red', requirement_removed: 'red'
};

function dateLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(value));
}

function EventIcon({type}: {type: AuditEventType}) {
  return <span className={styles.eventIcon} data-tone={activityTones[type]}><AppIcon name={activityIcons[type]} size={16} /></span>;
}

export function NotificationsPage({locale, view: initialView}: {locale: string; view: NotificationsViewModel}) {
  const t = useTranslations('Notifications');
  const app = useTranslations('AppShell');
  const language = locale === 'en' ? 'en' : 'ro';
  const [category, setCategory] = useState<ActivityCategory>('all');
  const [range, setRange] = useState<ActivityRange>('last30');
  const [expanded, setExpanded] = useState({expiring: false, missing: false, recent: false, audit: false});
  const companyId = useCompanyState().activeCompanyId;
  const localAudit = useLocalAuditEvents().filter((event) => event.companyId === companyId);
  const vendors = vendorListItems(useVendorState(), vendorsListFixture.vendors);
  const view = {...initialView, ...notificationDocuments(companyId ?? '', vendors, useVendorRequirements(), useDocumentRecords())};
  const notifications = useNotificationItems(view.notifications);
  // Existing successful local audit events are activity rows, not new delivered/unread notices.
  const activity = [...notifications, ...localAudit.map((event) => ({id: event.id, type: event.eventType === 'template_applied' || event.eventType === 'vendor_invited' || event.eventType === 'vendor_edited' || event.eventType === 'vendor_active' || event.eventType === 'vendor_inactive' || event.eventType === 'requirement_removed' ? 'other' as const : event.eventType,
    title: event.action, description: event.description, vendorId: event.vendorId, vendorName: vendors.find((vendor) => vendor.id === event.vendorId)?.name,
    documentName: event.description, occurredAt: event.occurredAt, isUnread: false, actor: event.actorType, actorName: event.actorName}))];
  const visibleNotifications = filterNotifications(activity, category, range, view.referenceTime);
  const rangedNotifications = filterNotifications(activity, 'all', range, view.referenceTime);
  const auditEvents = filterAuditEvents([...view.auditEvents, ...localAudit], range, view.referenceTime);
  const unreadCount = notifications.filter((item) => item.isUnread).length;
  const expiringRows = expanded.expiring ? view.expiringDocuments : view.expiringDocuments.slice(0, 3);
  const missingRows = expanded.missing ? view.missingDocuments : view.missingDocuments.slice(0, 3);
  const recentRows = expanded.recent ? visibleNotifications : visibleNotifications.slice(0, 5);
  const auditRows = expanded.audit ? auditEvents : auditEvents.slice(0, 6);

  function relativeDate(value: string) {
    const event = new Date(value);
    const dayDelta = -calendarDaysUntil(value, view.referenceTime);
    const time = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ro-RO', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'}).format(event);
    return dayDelta === 0 ? `${t('today')}, ${time}` : dayDelta === 1 ? `${t('yesterday')}, ${time}` : dateLabel(value, language);
  }

  function toggle(section: keyof typeof expanded) {
    setExpanded((current) => ({...current, [section]: !current[section]}));
  }

  function showSection(section: 'expiring' | 'missing' | 'recent') {
    setExpanded((current) => ({...current, [section]: true}));
    if (section === 'recent') setCategory('all');
    document.getElementById(`${section}-section`)?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  function exportAudit() {
    const csv = auditEventsToCsv(auditEvents, language);
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = t('downloadFilename');
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function sectionTitle(title: string, count?: number) {
    return count === undefined ? title : `${title} (${count})`;
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/notifications" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={unreadCount} notificationItems={view.notifications} notificationReferenceTime={view.referenceTime}>
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.notifications')}]} />} title={t('title')} titleId="notifications-title" description={t('description')}
        supportingContent={<div className={styles.headerCallout}><span><AppIcon name="file" size={26} /></span><p>{t('traceabilityTitle')}<br />{t('traceabilityDescription')}</p></div>} />

      <div className={styles.toolbar}>
        <nav className={styles.categoryScroll} aria-label={t('categoriesLabel')}>
          {categories.map((item) => <button key={item} type="button" className={styles.category} data-active={category === item} aria-current={category === item ? 'page' : undefined} onClick={() => setCategory(item)}>
            <AppIcon name={item === 'uploads' ? 'file' : item === 'status' ? 'clock' : 'bell'} size={18} />{t(`categories.${item}`)}<span className={styles.categoryCount} data-unread={item === 'unread'}>{filterNotifications(activity, item, range, view.referenceTime).length}</span>
          </button>)}
        </nav>
        <label className={styles.rangeControl}><AppIcon name="calendar" size={19} /><span className={styles.srOnly}>{t('rangeLabel')}</span><select value={range} onChange={(event) => setRange(event.target.value as ActivityRange)} aria-label={t('rangeLabel')}><option value="last30">{t('ranges.last30')}</option><option value="last7">{t('ranges.last7')}</option><option value="all">{t('ranges.all')}</option></select><AppIcon name="chevronDown" size={15} /></label>
      </div>

      <div className={styles.workspace}>
        <div className={styles.leftColumn}>
          <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
            <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="amber"><AppIcon name="clock" size={25} /></span><div><h2>{t('expiringTitle')}</h2><strong>{view.expiringDocuments.length}</strong><p>{t('expiringNote')}</p><button type="button" onClick={() => showSection('expiring')}>{t('viewAll')} <AppIcon name="arrowRight" size={15} /></button></div></Surface>
            <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="red"><AppIcon name="fileX" size={25} /></span><div><h2>{t('missingTitle')}</h2><strong>{view.missingDocuments.length}</strong><p>{t('missingNote')}</p><button type="button" onClick={() => showSection('missing')}>{t('viewAll')} <AppIcon name="arrowRight" size={15} /></button></div></Surface>
            <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="green"><AppIcon name="check" size={25} /></span><div><h2>{t('recentTitle')}</h2><strong>{rangedNotifications.length}</strong><p>{t(`recentNotes.${range}`)}</p><button type="button" onClick={() => showSection('recent')}>{t('viewAll')} <AppIcon name="arrowRight" size={15} /></button></div></Surface>
          </section>

          <Surface id="expiring-section" className={styles.panel} role="region" aria-label={t('expiringTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="document_expiring" />{sectionTitle(t('expiringTitle'), view.expiringDocuments.length)}</h2><button type="button" onClick={() => toggle('expiring')}>{t('viewAll')} <AppIcon name="arrowRight" size={16} /></button></div>
            {view.expiringDocuments.length === 0 ? <EmptyState title={t('noExpiring')} /> : <div className={styles.tableScroll} role="region" aria-label={t('expiringTitle')} tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">{t('expiringTable.vendor')}</th><th scope="col">{t('expiringTable.document')}</th><th scope="col">{t('expiringTable.expires')}</th><th scope="col">{t('expiringTable.remaining')}</th><th scope="col">{t('expiringTable.status')}</th></tr></thead><tbody>{expiringRows.map((item) => <tr key={item.id}><td>{item.vendorName}</td><td>{item.documentName[language]}</td><td><time dateTime={item.expiresAt}>{dateLabel(item.expiresAt, language)}</time></td><td><span className={styles.days}>{t('daysRemaining', {count: item.daysRemaining})}</span></td><td><StatusBadge tone="warning">{t('expiringStatus')}</StatusBadge></td></tr>)}</tbody></table></div>}
          </Surface>

          <Surface id="missing-section" className={styles.panel} role="region" aria-label={t('missingTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="document_missing" />{sectionTitle(t('missingTitle'), view.missingDocuments.length)}</h2><button type="button" onClick={() => toggle('missing')}>{t('viewAll')} <AppIcon name="arrowRight" size={16} /></button></div>
            {view.missingDocuments.length === 0 ? <EmptyState title={t('noMissing')} /> : <div className={styles.tableScroll} role="region" aria-label={t('missingTitle')} tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">{t('missingTable.vendor')}</th><th scope="col">{t('missingTable.document')}</th><th scope="col">{t('missingTable.requirement')}</th><th scope="col">{t('missingTable.due')}</th><th scope="col">{t('missingTable.status')}</th></tr></thead><tbody>{missingRows.map((item) => <tr key={item.id}><td>{item.vendorName}</td><td>{item.documentName[language]}</td><td>{item.requirement[language]}</td><td>{item.dueAt ? <time dateTime={item.dueAt}>{dateLabel(item.dueAt, language)}</time> : '—'}</td><td><StatusBadge tone="danger">{t('missingStatus')}</StatusBadge></td></tr>)}</tbody></table></div>}
          </Surface>

          <Surface id="recent-section" className={styles.panel} role="region" aria-label={t('recentTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="document_upload" />{t('recentTitle')}</h2><button type="button" onClick={() => toggle('recent')}>{t('viewAll')} <AppIcon name="arrowRight" size={16} /></button></div>
            {activity.length === 0 ? <EmptyState title={t('noNotifications')} description={t('noNotificationsDescription')} /> : visibleNotifications.length === 0 ? <EmptyState title={t('noMatches')} description={t('noMatchesDescription')} action={<button className={styles.reset} type="button" onClick={() => {setCategory('all'); setRange('last30');}}>{t('resetFilters')}</button>} /> : <div className={styles.tableScroll} role="region" aria-label={t('recentTitle')} tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">{t('recentTable.type')}</th><th scope="col">{t('recentTable.description')}</th><th scope="col">{t('recentTable.vendor')}</th><th scope="col">{t('recentTable.document')}</th><th scope="col">{t('recentTable.date')}</th></tr></thead><tbody>{recentRows.map((item) => <tr key={item.id} data-notification-id={item.id}><td><EventIcon type={item.type} /></td><td><strong title={item.description[language]}>{item.title[language]}</strong>{item.isUnread && <span className={styles.unread}>{t('unreadBadge')}</span>}</td><td>{item.vendorName ?? '—'}</td><td>{item.documentName?.[language] ?? '—'}</td><td><time dateTime={item.occurredAt}>{relativeDate(item.occurredAt)}</time></td></tr>)}</tbody></table></div>}
          </Surface>
        </div>

        <Surface className={styles.auditPanel} role="region" aria-labelledby="audit-title">
          <div className={styles.panelHeading}><h2 id="audit-title"><AppIcon name="file" size={20} />{t('auditTitle')}</h2><button type="button" onClick={() => toggle('audit')}>{t('viewAll')} <AppIcon name="arrowRight" size={16} /></button></div>
          {auditEvents.length === 0 ? <EmptyState title={t('noAudit')} /> : <ol className={styles.timeline}>{auditRows.map((event) => <li key={event.id} data-audit-id={event.id}><div className={styles.timelineSymbol}>{event.actorType === 'user' ? <span className={styles.avatar}>{event.actorName?.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span> : <span className={styles.systemIcon}><AppIcon name="settings" size={18} /></span>}<EventIcon type={event.eventType} /></div><div className={styles.timelineCopy}><div className={styles.timelineMeta}><strong>{event.actorName ?? t('systemActor')}</strong><time dateTime={event.occurredAt}>{event.dateOnly ? dateLabel(event.occurredAt, language) : relativeDate(event.occurredAt)}</time></div><b>{event.action[language]}</b><p>{event.description[language]}</p></div></li>)}</ol>}
          <div className={styles.auditCallout}><span><AppIcon name="shield" size={24} /></span><div><strong>{t('auditCalloutTitle')}</strong><p>{t('auditCalloutDescription')}</p><button type="button" onClick={exportAudit}>{t('export')}</button></div></div>
        </Surface>
      </div>
    </div>
  </AuthenticatedAppShell>;
}
