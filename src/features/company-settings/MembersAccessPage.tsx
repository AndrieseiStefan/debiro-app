'use client';

import {useCallback, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import type {DrawerPhase} from '@/components/ui/Drawer';
import {createLocalInvitation, useLocalInvitations} from './local-invitations';
import {getCompanyMembershipSummary} from './membership-summary';
import {InviteMemberDrawer} from './InviteMemberDrawer';
import {companyRoles, type CompanyMembership, type CompanyRole, type CompanySettingsViewModel} from './types';
import styles from './MembersAccessPage.module.css';

const roleIcons: Record<CompanyRole, AppIconName> = {administrator: 'crown', reviewer: 'shield', viewer: 'eye'};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase();
}

export function MembersAccessPage({locale, view: initialView}: {locale: string; view: CompanySettingsViewModel}) {
  const t = useTranslations('CompanyMembers');
  const app = useTranslations('AppShell');
  const companyState = useCompanyState();
  const active = getActiveCompany(companyState);
  const view = active ? {...initialView, company: active.company, members: active.members} : initialView;
  const localInvitations = useLocalInvitations(view.company.id);
  const {members, activeCount, pendingCount} = getCompanyMembershipSummary(view, localInvitations);
  const currentMembership = members.find((member) => member.isCurrentUser);
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

  function memberRow(member: CompanyMembership) {
    return <tr key={member.id} data-member-id={member.id}>
      <td><span className={styles.memberIdentity}><span className={styles.avatar} data-role={member.role}>{initials(member.fullName)}</span><strong>{member.fullName}</strong>{member.isCurrentUser && <span className={styles.you}>{t('you')}</span>}</span></td>
      <td>{member.email}</td>
      <td><span className={styles.roleBadge} data-role={member.role}><AppIcon name={roleIcons[member.role]} size={17}/>{t(`roles.${member.role}`)}</span></td>
      <td><span className={styles.status} data-status={member.status}><AppIcon name={member.status === 'active' ? 'check' : 'clock'} size={17}/>{t(`statuses.${member.status}`)}</span></td>
      <td><button type="button" aria-disabled="true" aria-label={t('memberActions', {name: member.fullName})} className={styles.more}><AppIcon name="more" size={19}/></button></td>
    </tr>;
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/company/settings/members" organizationName={view.company.name} userName={view.currentUser.fullName} userInitials={view.currentUser.initials} scope="company-aware">
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.settings')}, {label: t('title')}]} />} title={t('title')} titleId="members-title" description={t('description')}/>

      <Surface className={styles.companySummary}>
        <span className={styles.companyIcon}><AppIcon name="building" size={32}/></span>
        <div className={styles.companyCopy}><h2>{view.company.name}</h2><p>{t('taxId')}: {view.company.taxId}<span aria-hidden="true">|</span>{view.company.industry[locale === 'en' ? 'en' : 'ro']}</p></div>
        <div className={styles.companyBadges}><span className={styles.plan}><AppIcon name="crown" size={20}/>{view.company.subscription.plan}</span>{view.company.subscription.trialDaysRemaining > 0 && <span className={styles.trial}><AppIcon name="clock" size={20}/>{t('trialDays', {count: view.company.subscription.trialDaysRemaining})}</span>}</div>
      </Surface>

      <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="blue"><AppIcon name="users" size={25}/></span><div><h2>{t('activeMembers')}</h2><strong>{activeCount}/{view.company.subscription.seatLimit}</strong><p>{t('activeMembersNote', {active: activeCount, pending: pendingCount, limit: view.company.subscription.seatLimit})}</p></div></Surface>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="green"><AppIcon name="shield" size={25}/></span><div><h2>{t('yourRole')}</h2><strong>{currentMembership ? t(`roles.${currentMembership.role}`) : '—'}</strong><p>{currentMembership ? t(`roleDescriptions.${currentMembership.role}`) : t('noMembership')}</p></div></Surface>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon} data-tone="blue"><AppIcon name="building" size={25}/></span><div><h2>{t('accessibleCompanies')}</h2><strong>{companyState.companies.length}</strong><p>{t('accessibleCompaniesNote', {count: companyState.companies.length})}</p></div></Surface>
      </section>

      <Surface className={styles.membersPanel}>
        <div className={styles.membersHeading}><h2>{t('membersTitle')}</h2><Button ref={inviteTriggerRef} onClick={() => setDrawerPhase('open')}><AppIcon name="userPlus" size={20}/>{t('inviteMember')}</Button></div>
        <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={styles.table}><thead><tr><th scope="col">{t('table.user')}</th><th scope="col">{t('table.email')}</th><th scope="col">{t('table.role')}</th><th scope="col">{t('table.status')}</th><th scope="col">{t('table.actions')}</th></tr></thead><tbody>{members.map(memberRow)}</tbody></table></div>
        <p className={styles.tableFooter}>{t('membersCount', {count: members.length})}</p>
      </Surface>

      <Surface className={styles.roleExplanation}><h2><AppIcon name="info" size={22}/>{t('roleSectionTitle')}</h2><div className={styles.roleGrid}>{companyRoles.map((role) => <div key={role} className={styles.roleInfo}><span className={styles.roleIcon} data-role={role}><AppIcon name={roleIcons[role]} size={23}/></span><div><h3>{t(`roles.${role}`)}</h3><p>{t(`roleDescriptions.${role}`)}</p></div></div>)}</div></Surface>
    </div>
    {drawerPhase && <InviteMemberDrawer phase={drawerPhase} onClose={closeDrawer} onExited={drawerExited} triggerRef={inviteTriggerRef} company={view.company} members={members} onInvite={invite}/>}
  </AuthenticatedAppShell>;
}
