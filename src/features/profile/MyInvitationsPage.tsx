'use client';

import {useCallback, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {SelectField} from '@/components/ui/SelectField';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {RoleBadge} from '@/features/company-settings/RoleVisual';
import {SummaryMetricCard} from '@/features/dashboard/SummaryMetricCard';
import {calendarDaysUntil, localizedDate} from '@/lib/fixture-clock';
import {invitationCompanies, invitationCounts, invitationsForUser, invitationStatus, resolveInvitation, useInvitations, type InvitationStatus} from './invitations-state';
import {useUserProfile} from './user-profile-state';
import styles from './MyInvitationsPage.module.css';

const tones: Record<InvitationStatus, StatusTone> = {pending: 'info', accepted: 'success', rejected: 'neutral', expired: 'danger'};
export function MyInvitationsPage({locale}: {locale: string}) {
  const t = useTranslations('MyInvitations');
  const roles = useTranslations('CompanyMembers');
  const user = useUserProfile();
  const invitations = invitationsForUser(useInvitations(), user);
  const counts = invitationCounts(invitations);
  const [filter, setFilter] = useState<InvitationStatus | 'all'>('all');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{error: boolean; text: string} | null>(null);
  const cancelReject = useCallback(() => setRejectId(null), []);
  const language = locale === 'en' ? 'en' : 'ro';
  const filtered = invitations.filter((item) => filter === 'all' || invitationStatus(item) === filter);
  function resolve(id: string, outcome: 'accepted' | 'rejected') {
    const result = resolveInvitation(id, outcome);
    setFeedback({error: !result.ok, text: result.ok ? t(`${outcome}Success`) : t(`errors.${result.reason}`)});
    setRejectId(null);
  }
  return <AuthenticatedAppShell locale={locale} currentPath="/invitations" organizationName="" userName={user.fullName} userInitials={user.initials} scope="global">
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: t('title')}]} />} title={t('title')} titleId="my-invitations-title" description={t('description')}/>
      <section className={styles.summary} aria-label={t('summaryLabel')}>
        <SummaryMetricCard title={t('total')} value={counts.total} note={t('totalNote')} icon="mail" tone="blue"/>
        <SummaryMetricCard title={t('pending')} value={counts.pending} note={t('pendingNote')} icon="check" tone="green"/>
        <SummaryMetricCard title={t('expired')} value={counts.expired} note={t('expiredNote')} icon="clock" tone="amber"/>
        <SummaryMetricCard title={t('accepted')} value={counts.accepted} note={t('acceptedNote')} icon="check" tone="gray"/>
      </section>
      <Surface className={styles.listPanel} role="region" aria-labelledby="invitation-list-title">
        <div className={styles.listHeading}><AppIcon name="mail" size={26}/><div><h2 id="invitation-list-title">{t('listTitle')}</h2><p>{t('listDescription')}</p></div><SelectField id="invitation-filter" label={t('filterLabel')} controlSize="compact" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>{(['all', 'pending', 'accepted', 'expired', 'rejected'] as const).map((status) => <option key={status} value={status}>{t(status === 'all' ? 'all' : status)}</option>)}</SelectField></div>
        {feedback && <p role={feedback.error ? 'alert' : 'status'} className={styles.feedback} data-error={feedback.error}>{feedback.text}</p>}
        {!invitations.length ? <EmptyState icon={<AppIcon name="mail" size={28}/>} title={t('emptyTitle')} description={t('emptyDescription')}/> : !filtered.length ? <EmptyState title={t('filteredEmpty')}/> : <div className={styles.list}>
          {filtered.map((invitation) => {
            const company = invitationCompanies.find((record) => record.id === invitation.companyId);
            const status = invitationStatus(invitation);
            return <Surface key={invitation.id} className={styles.invitation} data-invitation-id={invitation.id} data-status={status}>
              <span className={styles.companyIcon} data-status={status}><AppIcon name="building" size={28}/></span>
              <div className={styles.company}><h3>{company?.name ?? t('unknownCompany')}</h3>{company?.taxId && <p>{t('taxId')}: {company.taxId}</p>}</div>
              <div className={styles.detail}><span>{t('proposedRole')}</span><RoleBadge role={invitation.role} label={roles(`roles.${invitation.role}`)} iconSize={14}/></div>
              <div className={styles.detail}><span>{t('invitedBy')}</span><strong>{invitation.invitedByDisplayName}</strong><small>{invitation.invitedByEmail}</small></div>
              <div className={styles.detail}><span>{t('receivedAt')}</span><time dateTime={invitation.createdAt}>{localizedDate(invitation.createdAt)[language]}</time></div>
              <div className={styles.detail}><span>{t(status === 'accepted' ? 'acceptedAt' : status === 'rejected' ? 'rejectedAt' : status === 'expired' ? 'expiredAt' : 'expiresIn')}</span>{status === 'pending' && <strong className={styles.remaining}>{t('days', {count: calendarDaysUntil(invitation.expiresAt)})}</strong>}<time dateTime={invitation.resolvedAt ?? invitation.expiresAt}>{localizedDate(invitation.resolvedAt ?? invitation.expiresAt)[language]}</time></div>
              <div className={styles.actions}>{status === 'pending' ? <><Button onClick={() => resolve(invitation.id, 'accepted')}>{t('accept')}</Button><Button variant="destructive" onClick={() => setRejectId(invitation.id)}>{t('reject')}</Button></> : <StatusBadge tone={tones[status]}>{t(`status.${status}`)}</StatusBadge>}</div>
            </Surface>;
          })}
        </div>}
        <div className={styles.notice}><AppIcon name="info" size={24}/><div><strong>{t('noticeTitle')}</strong><p>{t('noticeDescription')}</p></div></div>
      </Surface>
    </div>
    {rejectId && <ConfirmationDialog icon="mail" title={t('rejectTitle')} description={t('rejectDescription')} cancelLabel={t('cancel')} confirmLabel={t('reject')} onCancel={cancelReject} onConfirm={() => resolve(rejectId, 'rejected')}/>}
  </AuthenticatedAppShell>;
}
