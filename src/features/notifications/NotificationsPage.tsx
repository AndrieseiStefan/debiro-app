'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Link} from '@/i18n/navigation';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {EmptyState} from '@/components/ui/EmptyState';
import {ErrorState} from '@/components/ui/ErrorState';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {SectionAction} from '@/components/ui/SectionAction';
import {useNotificationItems} from './local-state';
import {useCompanyState} from '@/features/companies/company-state';
import {documentAccess} from '@/features/documents/document-access';
import {CompanyDocumentManager, type CompanyManagementSelection} from '@/features/company-documents/CompanyDocumentManager';
import {useNotificationWorkspace} from './use-notification-workspace';
import {activityNotification, workspaceAuditEvents, type WorkspaceAttention} from './workspace-projections';
import {activityIcons, activityTones} from './presentation';
import {calendarDaysUntil} from '@/lib/fixture-clock';
import {downloadCsv} from '@/lib/download-csv';
import {auditEventsToCsv, filterAuditEvents, filterNotifications, type ActivityCategory, type ActivityRange} from './selectors';
import type {AuditEventType, NotificationDomain, NotificationsViewModel} from './types';
import styles from './NotificationsPage.module.css';

const categories: ActivityCategory[] = ['all', 'unread', 'reminders', 'uploads', 'status'];

function dateLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(value));
}

function EventIcon({type}: {type: AuditEventType}) {
  return <span className={styles.eventIcon} data-tone={activityTones[type]}><AppIcon name={activityIcons[type]} size={16} /></span>;
}

export function NotificationsPage({locale, view: initialView}: {locale: string; view: NotificationsViewModel}) {
  const t = useTranslations('Notifications');
  const app = useTranslations('AppShell');
  const foundation = useTranslations('Foundation'), documentCopy = useTranslations('CompanyDocuments');
  const language = locale === 'en' ? 'en' : 'ro';
  const [category, setCategory] = useState<ActivityCategory>('all');
  const [range, setRange] = useState<ActivityRange>('last30');
  const [expanded, setExpanded] = useState({expiring: false, missing: false, attention: false, recent: false, audit: false});
  const companyId = useCompanyState().activeCompanyId ?? '';
  const workspace = useNotificationWorkspace(locale, initialView);
  const view = {...initialView, referenceTime: workspace.referenceTime, expiringDocuments: workspace.attention.filter((item) => item.status === 'expiring_soon'), missingDocuments: workspace.attention.filter((item) => item.status === 'missing')};
  const notifications = useNotificationItems(workspace.notifications);
  const activity = workspace.activity.map((item) => {
    const notice = notifications.find((notice) => notice.id === item.sourceId || notice.id === item.sourceId.replace(/^audit-/, 'notice-'));
    return {...activityNotification(item), isUnread: notice?.isUnread ?? false};
  });
  // Unread/Reminders are notification-specific views. All/Uploads/Status show
  // actual recorded activity, never seeded delivery claims or current-state alerts.
  const notificationView = category === 'unread' || category === 'reminders';
  const itemsFor = (value: ActivityCategory) => value === 'unread' || value === 'reminders' ? notifications.filter((item) => item.sourceKind !== 'attention') : activity;
  const visibleNotifications = filterNotifications(itemsFor(category), category, range, view.referenceTime);
  const auditEvents = filterAuditEvents(workspace.activity, range, view.referenceTime);
  const [document, setDocument] = useState<{companyId: string; selection: CompanyManagementSelection} | null>(null);
  const unreadCount = notifications.filter((item) => item.isUnread).length;
  const expiringRows = expanded.expiring ? view.expiringDocuments : view.expiringDocuments.slice(0, 3);
  const missingRows = expanded.missing ? view.missingDocuments : view.missingDocuments.slice(0, 3);
  const recentRows = expanded.recent ? visibleNotifications : visibleNotifications.slice(0, 5);
  const auditRows = expanded.audit ? auditEvents : auditEvents.slice(0, 6);
  const attention = workspace.attention.filter((item) => item.status === 'expired' || item.status === 'needs_review');
  const attentionRows = expanded.attention ? attention : attention.slice(0, 3);

  function relativeDate(value: string) {
    const event = new Date(value);
    const dayDelta = -calendarDaysUntil(value, view.referenceTime);
    const time = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ro-RO', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'}).format(event);
    return dayDelta === 0 ? `${t('today')}, ${time}` : dayDelta === 1 ? `${t('yesterday')}, ${time}` : dateLabel(value, language);
  }

  function toggle(section: keyof typeof expanded) {
    setExpanded((current) => ({...current, [section]: !current[section]}));
  }

  function expansionAction(section: keyof typeof expanded, count: number, preview: number) {
    return count > preview ? <SectionAction mode="expand" expanded={expanded[section]} onClick={() => toggle(section)}/> : null;
  }

  function exportAudit() {
    const csv = auditEventsToCsv(workspaceAuditEvents(auditEvents), language);
    downloadCsv(t('downloadFilename'), csv);
  }

  function sectionTitle(title: string, count?: number) {
    return count === undefined ? title : `${title} (${count})`;
  }

  function entity(item: {entityName?: string; domain?: NotificationDomain; href?: string}) {
    return <>{item.href ? <Link className={styles.textAction} href={item.href}>{item.entityName || '—'}</Link> : item.entityName || '—'}{item.domain && <small>{t(`domains.${item.domain}`)}</small>}</>;
  }
  function documentName(item: WorkspaceAttention) {
    return item.domain === 'company_document' && item.requirementId && item.status !== 'missing' ? <button type="button" className={styles.textAction} onClick={() => setDocument({companyId, selection: {mode: 'details', requirementId: item.requirementId, documentId: item.documentId}})}>{item.documentName[language]}</button> : item.href ? <Link className={styles.textAction} href={item.href}>{item.documentName[language]}</Link> : item.documentName[language];
  }
  function documentTable(rows: WorkspaceAttention[], kind: 'expiring' | 'missing' | 'attention') {
    return <div className={styles.tableScroll} role="region" aria-label={t(kind === 'attention' ? 'attentionTitle' : `${kind}Title`)} tabIndex={0}><table className={styles.table}>
      <thead><tr><th scope="col">{t('entity')}</th><th scope="col">{t('expiringTable.document')}</th>{kind === 'missing' ? <><th scope="col">{t('missingTable.requirement')}</th><th scope="col">{t('missingTable.due')}</th></> : <><th scope="col">{t('expiringTable.expires')}</th>{kind === 'expiring' && <th scope="col">{t('expiringTable.remaining')}</th>}</>}<th scope="col">{t('expiringTable.status')}</th></tr></thead>
      <tbody>{rows.map((item) => <tr key={item.id} data-notification-document={item.id}><td>{entity(item)}</td><td>{documentName(item)}</td>{kind === 'missing' ? <><td>{item.requirement[language]}</td><td>—</td></> : <><td>{item.expiresAt ? <time dateTime={item.expiresAt}>{dateLabel(item.expiresAt, language)}</time> : '—'}</td>{kind === 'expiring' && <td><span className={styles.days}>{t('daysRemaining', {count: item.daysRemaining!})}</span></td>}</>}<td><StatusBadge tone={item.status === 'expired' || item.status === 'missing' ? 'danger' : 'warning'}>{documentCopy(`status.${item.status}`)}</StatusBadge></td></tr>)}</tbody>
    </table></div>;
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/notifications" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={unreadCount} notificationItems={view.notifications} notificationReferenceTime={view.referenceTime}>
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.notifications')}]} />} title={t('title')} titleId="notifications-title" description={t('description')}
        supportingContent={<div className={styles.headerCallout}><span><AppIcon name="file" size={26} /></span><p>{t('traceabilityTitle')}<br />{t('traceabilityDescription')}</p></div>} />

      <div className={styles.toolbar}>
        <nav className={styles.categoryScroll} aria-label={t('categoriesLabel')}>
          {categories.map((item) => <button key={item} type="button" className={styles.category} data-active={category === item} aria-current={category === item ? 'page' : undefined} onClick={() => setCategory(item)}>
            <AppIcon name={item === 'uploads' ? 'file' : item === 'status' ? 'clock' : 'bell'} size={18} />{t(`categories.${item}`)}<span className={styles.categoryCount} data-unread={item === 'unread'}>{filterNotifications(itemsFor(item), item, range, view.referenceTime).length}</span>
          </button>)}
        </nav>
        <label className={styles.rangeControl}><AppIcon name="calendar" size={19} /><span className={styles.srOnly}>{t('rangeLabel')}</span><select value={range} onChange={(event) => setRange(event.target.value as ActivityRange)} aria-label={t('rangeLabel')}><option value="last30">{t('ranges.last30')}</option><option value="last7">{t('ranges.last7')}</option><option value="all">{t('ranges.all')}</option></select><AppIcon name="chevronDown" size={15} /></label>
      </div>

      <div className={styles.workspace}>
        <div className={styles.leftColumn}>
          <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
            <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="amber"><AppIcon name="clock" size={25} /></span><div><h2>{t('expiringTitle')}</h2><strong>{view.expiringDocuments.length}</strong><p>{t('expiringNote')}</p></div></Surface>
            <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="red"><AppIcon name="fileX" size={25} /></span><div><h2>{t('missingTitle')}</h2><strong>{view.missingDocuments.length}</strong><p>{t('missingNote')}</p></div></Surface>
            <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="green"><AppIcon name="check" size={25} /></span><div><h2>{t('recentTitle')}</h2><strong>{auditEvents.length}</strong><p>{t(`recentNotes.${range}`)}</p></div></Surface>
          </section>
          {Object.values(workspace.errors).some(Boolean) && <ErrorState title={foundation('errorTitle')} description={t('sourceUnavailable')}/>}

          <Surface id="expiring-section" className={styles.panel} role="region" aria-label={t('expiringTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="document_expiring" />{sectionTitle(t('expiringTitle'), view.expiringDocuments.length)}</h2>{expansionAction('expiring', view.expiringDocuments.length, 3)}</div>
            {view.expiringDocuments.length === 0 ? <EmptyState title={t('noExpiring')} /> : documentTable(expiringRows, 'expiring')}
          </Surface>

          <Surface id="missing-section" className={styles.panel} role="region" aria-label={t('missingTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="document_missing" />{sectionTitle(t('missingTitle'), view.missingDocuments.length)}</h2>{expansionAction('missing', view.missingDocuments.length, 3)}</div>
            {view.missingDocuments.length === 0 ? <EmptyState title={t('noMissing')} /> : documentTable(missingRows, 'missing')}
          </Surface>

          <Surface id="attention-section" className={styles.panel} role="region" aria-label={t('attentionTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="status_changed"/>{sectionTitle(t('attentionTitle'), attention.length)}</h2>{expansionAction('attention', attention.length, 3)}</div>
            {attention.length ? documentTable(attentionRows, 'attention') : <EmptyState title={t('noAttention')}/>}
          </Surface>

          <Surface id="recent-section" className={styles.panel} role="region" aria-label={t('recentTitle')}>
            <div className={styles.panelHeading}><h2><EventIcon type="document_upload" />{t('recentTitle')}</h2>{expansionAction('recent', visibleNotifications.length, 5)}</div>
            {itemsFor(category).length === 0 ? <EmptyState title={t('noNotifications')} description={t('noNotificationsDescription')} /> : visibleNotifications.length === 0 ? <EmptyState title={t('noMatches')} description={t('noMatchesDescription')} action={<button className={styles.reset} type="button" onClick={() => {setCategory('all'); setRange('last30');}}>{t('resetFilters')}</button>} /> : <div className={styles.tableScroll} role="region" aria-label={t('recentTitle')} tabIndex={0}><table className={styles.table}>
              <thead><tr><th scope="col">{t('recentTable.type')}</th><th scope="col">{t('recentTable.description')}</th><th scope="col">{t('entity')}</th><th scope="col">{t('recentTable.document')}</th><th scope="col">{t('recentTable.date')}</th></tr></thead>
              <tbody>{recentRows.map((item) => <tr key={item.id} data-notification-id={item.id} data-activity-id={notificationView ? undefined : item.id}>
                <td><EventIcon type={item.type}/></td><td><strong title={item.description[language]}>{item.title[language]}</strong>{item.type === 'reminder' && <small>{t('demoNotification')}</small>}{item.isUnread && <span className={styles.unread}>{t('unreadBadge')}</span>}</td>
                <td>{entity(item)}</td><td>{item.documentName?.[language] ?? '—'}</td><td><time dateTime={item.occurredAt}>{item.dateOnly ? dateLabel(item.occurredAt, language) : relativeDate(item.occurredAt)}</time></td>
              </tr>)}</tbody>
            </table></div>}
          </Surface>
        </div>

        <Surface className={styles.auditPanel} role="region" aria-labelledby="audit-title">
          <div className={styles.panelHeading}><h2 id="audit-title"><AppIcon name="file" size={20} />{t('auditTitle')}</h2>{expansionAction('audit', auditEvents.length, 6)}</div>
          {auditEvents.length === 0 ? <EmptyState title={t('noAudit')} /> : <ol className={styles.timeline}>{auditRows.map((event) => <li key={event.id} data-audit-id={event.sourceId} data-activity-id={event.id}><div className={styles.timelineSymbol}>{event.actorType === 'user' ? <span className={styles.avatar}>{event.actorName?.split(' ').map((part) => part[0]).join('').slice(0, 2) || '—'}</span> : <span className={styles.systemIcon}><AppIcon name="settings" size={18} /></span>}<EventIcon type={event.eventType} /></div><div className={styles.timelineCopy}><div className={styles.timelineMeta}><strong>{event.actorName ?? (event.actorType === 'system' ? t('systemActor') : '—')}</strong><time dateTime={event.occurredAt}>{event.dateOnly ? dateLabel(event.occurredAt, language) : relativeDate(event.occurredAt)}</time></div><b>{event.action[language]}</b><p>{entity(event)}{event.description[language] && <> — {event.description[language]}</>}</p></div></li>)}</ol>}
          <div className={styles.auditCallout}><span><AppIcon name="shield" size={24} /></span><div><strong>{t('auditCalloutTitle')}</strong><p>{t('auditCalloutDescription')}</p><button type="button" onClick={exportAudit}>{t('export')}</button></div></div>
        </Surface>
      </div>
      {document?.companyId === companyId && documentAccess(companyId).visible && <CompanyDocumentManager companyId={companyId} locale={language} selection={document.selection} onClose={() => setDocument(null)} onSuccess={() => {}}/>}
    </div>
  </AuthenticatedAppShell>;
}
