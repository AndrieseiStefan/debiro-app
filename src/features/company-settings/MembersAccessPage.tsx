'use client';

import {useCallback, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {getActiveCompany, getCurrentMembership, manageCompanyMember, useCompanyState, type MemberManagementResult} from '@/features/companies/company-state';
import {manageCompanyInvitation} from '@/features/profile/invitations-state';
import {RowActionMenu} from '@/components/ui/RowActionMenu';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import type {DrawerPhase} from '@/components/ui/Drawer';
import {createLocalInvitation, useLocalInvitations} from './local-invitations';
import {getCompanyMembershipSummary} from './membership-summary';
import {RoleBadge, RoleIcon} from './RoleVisual';
import {InviteMemberDrawer} from './InviteMemberDrawer';
import {ChangeMemberRoleDrawer} from './ChangeMemberRoleDrawer';
import {companyRoles, type CompanyMembership, type CompanyRole, type CompanySettingsViewModel} from './types';
import styles from './MembersAccessPage.module.css';
import {companyIndustries} from '@/features/companies/company-options';
import {currentMemberIdentity, useUserProfile} from '@/features/profile/user-profile-state';


function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase();
}

export function MembersAccessPage({locale, view: initialView}: {locale: string; view: CompanySettingsViewModel}) {
  const t = useTranslations('CompanyMembers');
  const app = useTranslations('AppShell');
  const companyState = useCompanyState();
  const active = getActiveCompany(companyState);
  const user = useUserProfile();
  const view = active ? {...initialView, currentUser: user, company: active.company, members: active.members.map((member) => currentMemberIdentity(member, user))} : {...initialView, currentUser: user};
  const localInvitations = useLocalInvitations(view.company.id);
  const {members, activeCount, pendingCount} = getCompanyMembershipSummary(view, localInvitations);
  const currentMembership = active ? getCurrentMembership(active) : null;
  const canManage = currentMembership?.role === 'administrator';
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<CompanyMembership | null>(null);
  const [rolePhase, setRolePhase] = useState<DrawerPhase | null>(null);
  const memberTriggerRef = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState<{member: CompanyMembership; action: 'remove' | 'cancel'} | null>(null);
  const [feedback, setFeedback] = useState<{error: boolean; text: string} | null>(null);
  const cancelConfirmation = useCallback(() => setConfirmation(null), []);
  const closeRoleDrawer = useCallback(() => setRolePhase('closing'), []);
  const roleDrawerExited = useCallback(() => {setRolePhase(null); setEditingMember(null);}, []);
  const [drawerPhase, setDrawerPhase] = useState<DrawerPhase | null>(null);
  const inviteTriggerRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setDrawerPhase('closing'), []);
  const drawerExited = useCallback(() => setDrawerPhase(null), []);

  function invite(input: {companyId: string; fullName: string; email: string; role: CompanyRole}) {
    const created = createLocalInvitation(input, view.members);
    if (!created) return false;
    closeDrawer();
    return true;
  }

  function roleChanged(role: CompanyRole): MemberManagementResult {
    if (!editingMember) return {ok: false, reason: 'notFound'};
    const result = editingMember.status === 'active' ? manageCompanyMember(view.company.id, editingMember.id, 'role', role) : manageCompanyInvitation(view.company.id, editingMember.id, 'role', role);
    if (result.ok) setFeedback({error: false, text: t('management.saved')});
    return result;
  }
  function confirmAction() {
    if (!confirmation) return;
    const {member, action} = confirmation;
    const result = action === 'remove' ? manageCompanyMember(view.company.id, member.id, 'remove') : manageCompanyInvitation(view.company.id, member.id, 'cancel');
    setFeedback({error: !result.ok, text: result.ok ? t(action === 'remove' ? 'management.removed' : 'management.cancelled') : t(`management.errors.${result.reason}`)});
    setConfirmation(null);
  }

  function memberRow(member: CompanyMembership) {
    const self = member.userId === user.userId || member.email.trim().toLowerCase() === user.email.trim().toLowerCase();
    return <tr key={member.id} data-member-id={member.id}>
      <td><span className={styles.memberIdentity}><span className={styles.avatar}>{member.isCurrentUser && member.userId === user.userId ? user.initials : initials(member.fullName)}</span><strong>{member.fullName}</strong>{member.isCurrentUser && <span className={styles.you}>{t('you')}</span>}</span></td>
      <td>{member.email}</td>
      <td><RoleBadge role={member.role} label={t(`roles.${member.role}`)}/></td>
      <td><span className={styles.status} data-status={member.status}><AppIcon name={member.status === 'active' ? 'check' : 'clock'} size={17}/>{t(`statuses.${member.status}`)}</span></td>
      <td>{canManage && !self && <RowActionMenu label={t('memberActions', {name: member.fullName})} open={menuMemberId === member.id} onOpenChange={(open) => setMenuMemberId(open ? member.id : null)} items={[
        {label: t('management.changeRole'), onSelect: () => {memberTriggerRef.current = document.activeElement as HTMLButtonElement; setEditingMember(member); setRolePhase('open');}},
        {label: t(member.status === 'active' ? 'management.remove' : 'management.cancelInvitation'), destructive: true, onSelect: () => setConfirmation({member, action: member.status === 'active' ? 'remove' : 'cancel'})}
      ]}/>}</td>
    </tr>;
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/company/settings/members" organizationName={view.company.name} userName={view.currentUser.fullName} userInitials={view.currentUser.initials} scope="company-aware">
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.settings')}, {label: t('title')}]} />} title={t('title')} titleId="members-title" description={t('description')}/>
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={styles.feedback} data-error={feedback.error}>{feedback.text}</p>}

      <Surface className={styles.companySummary}>
        <span className={styles.companyIcon}><AppIcon name="building" size={32}/></span>
        <div className={styles.companyCopy}><h2>{view.company.name}</h2><p>{t('taxId')}: {view.company.taxId}<span aria-hidden="true">|</span>{companyIndustries[view.company.industry][locale === 'en' ? 'en' : 'ro']}</p></div>
        <div className={styles.companyBadges}><span className={styles.plan}><AppIcon name="crown" size={20}/>{view.company.subscription.plan}</span>{view.company.subscription.trialDaysRemaining > 0 && <span className={styles.trial}><AppIcon name="clock" size={20}/>{t('trialDays', {count: view.company.subscription.trialDaysRemaining})}</span>}</div>
      </Surface>

      <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="blue"><AppIcon name="users" size={25}/></span><div><h2>{t('activeMembers')}</h2><strong>{activeCount}/{view.company.subscription.seatLimit}</strong><p>{t('activeMembersNote', {active: activeCount, pending: pendingCount, limit: view.company.subscription.seatLimit})}</p></div></Surface>
        <Surface className={styles.summaryCard}>{currentMembership ? <RoleIcon role={currentMembership.role} size={25} diameter={50}/> : <span className={styles.summaryIcon} data-tone="blue"><AppIcon name="user" size={25}/></span>}<div><h2>{t('yourRole')}</h2><strong>{currentMembership ? t(`roles.${currentMembership.role}`) : '—'}</strong><p>{currentMembership ? t(`roleDescriptions.${currentMembership.role}`) : t('noMembership')}</p></div></Surface>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="blue"><AppIcon name="building" size={25}/></span><div><h2>{t('accessibleCompanies')}</h2><strong>{companyState.companies.length}</strong><p>{t('accessibleCompaniesNote', {count: companyState.companies.length})}</p></div></Surface>
      </section>

      <Surface className={styles.membersPanel}>
        <div className={styles.membersHeading}><h2>{t('membersTitle')}</h2>{canManage && <Button ref={inviteTriggerRef} onClick={() => setDrawerPhase('open')}><AppIcon name="userPlus" size={20}/>{t('inviteMember')}</Button>}</div>
        <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">{t('table.user')}</th><th scope="col">{t('table.email')}</th><th scope="col">{t('table.role')}</th><th scope="col">{t('table.status')}</th><th scope="col">{t('table.actions')}</th></tr></thead><tbody>{members.map(memberRow)}</tbody></table></div>
        <p className={styles.tableFooter}>{t('membersCount', {count: members.length})}</p>
      </Surface>

      <Surface className={styles.roleExplanation}><h2><AppIcon name="info" size={22}/>{t('roleSectionTitle')}</h2><div className={styles.roleGrid}>{companyRoles.map((role) => <div key={role} className={styles.roleInfo}><RoleIcon role={role}/><div><h3>{t(`roles.${role}`)}</h3><p>{t(`roleDescriptions.${role}`)}</p></div></div>)}</div></Surface>
    </div>
    {drawerPhase && <InviteMemberDrawer phase={drawerPhase} onClose={closeDrawer} onExited={drawerExited} triggerRef={inviteTriggerRef} company={view.company} members={members} onInvite={invite}/>}
    {editingMember && rolePhase && <ChangeMemberRoleDrawer key={editingMember.id} member={editingMember} phase={rolePhase} onClose={closeRoleDrawer} onExited={roleDrawerExited} triggerRef={memberTriggerRef} onSave={roleChanged}/>}
    {confirmation && <ConfirmationDialog icon={confirmation.action === 'remove' ? 'users' : 'mail'} title={t(confirmation.action === 'remove' ? 'management.removeTitle' : 'management.cancelTitle')} description={t(confirmation.action === 'remove' ? 'management.removeDescription' : 'management.cancelDescription', {name: confirmation.member.fullName, email: confirmation.member.email, companyName: view.company.name})} cancelLabel={t(confirmation.action === 'remove' ? 'drawer.cancel' : 'management.keepInvitation')} confirmLabel={t(confirmation.action === 'remove' ? 'management.remove' : 'management.cancelInvitation')} onCancel={cancelConfirmation} onConfirm={confirmAction} fallbackFocusRef={inviteTriggerRef}/>}
  </AuthenticatedAppShell>;
}
