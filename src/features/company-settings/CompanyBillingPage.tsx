'use client';

import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {useLocalInvitations} from './local-invitations';
import {getCompanyMembershipSummary} from './membership-summary';
import type {CompanySettingsViewModel} from './types';
import styles from './CompanyBillingPage.module.css';

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(date + 'T12:00:00Z'));
}

export function CompanyBillingPage({locale, view: initialView}: {locale: string; view: CompanySettingsViewModel}) {
  const t = useTranslations('CompanyBilling');
  const app = useTranslations('AppShell');
  const membersT = useTranslations('CompanyMembers');
  const companyState = useCompanyState();
  const active = getActiveCompany(companyState);
  const view = active ? {...initialView, company: active.company, members: active.members} : initialView;
  const localInvitations = useLocalInvitations(view.company.id);
  const {members, activeCount, availableSeats} = getCompanyMembershipSummary(view, localInvitations);
  const currentMembership = members.find((member) => member.isCurrentUser);
  const roleName = currentMembership?.role === 'administrator' ? membersT('roles.administrator') :
    currentMembership?.role === 'reviewer' ? membersT('roles.reviewer') :
      currentMembership?.role === 'viewer' ? membersT('roles.viewer') : '—';
  const {company} = view;
  const {subscription} = company;
  const {billingProfile, paymentMethod} = subscription;
  const billingRows = [
    {label: t('billing.legalName'), value: billingProfile.legalName},
    {label: t('billing.taxId'), value: billingProfile.taxId},
    {label: t('billing.email'), value: billingProfile.email},
    {label: t('billing.address'), value: billingProfile.address},
    {label: t('billing.contact'), value: billingProfile.contactName}
  ];

  return <AuthenticatedAppShell locale={locale} currentPath="/company/settings/billing" organizationName={company.name} userName={view.currentUser.fullName} userInitials={view.currentUser.initials} scope="company-aware">
    <div className={styles.page}>
      <AuthenticatedPageHeader
        context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.settings')}, {label: t('title')}]} />}
        title={t('title')}
        titleId="billing-title"
        description={t('description')}
        actions={<div className={styles.headerActions}>
          <Button aria-disabled="true" title={t('demoUnavailable')} data-required-role="administrator"><AppIcon name="crown" size={20}/>{t('upgradePlan')}</Button>
          <Button variant="secondary" aria-disabled="true" title={t('demoUnavailable')}><AppIcon name="file" size={19}/>{t('viewAllInvoices')}</Button>
        </div>}
      />

      <Surface className={styles.companySummary}>
        <span className={styles.companyIcon}><AppIcon name="building" size={32}/></span>
        <div className={styles.companyCopy}><h2>{company.name}</h2><p>{t('taxId')}: {company.taxId}<span aria-hidden="true">|</span>{t('companyRole', {role: roleName, name: view.currentUser.fullName})}</p></div>
        <div className={styles.companyBadges}><span className={styles.plan}><AppIcon name="crown" size={20}/>{subscription.plan}</span>{subscription.trialDaysRemaining > 0 && <span className={styles.trial}><AppIcon name="clock" size={20}/>{t('trialDays', {count: subscription.trialDaysRemaining})}</span>}</div>
      </Surface>

      <section className={styles.summaryGrid} aria-label={t('summaryLabel')}>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon}><AppIcon name="crown" size={27}/></span><div><h2>{t('currentPlan')}</h2><strong>{subscription.plan}</strong><p>{t('includedUsers', {count: subscription.seatLimit})}</p></div></Surface>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon}><AppIcon name="users" size={27}/></span><div><h2>{t('activeMembers')}</h2><strong data-testid="billing-seat-usage">{activeCount}/{subscription.seatLimit}</strong><p data-testid="billing-available-seats">{t('availableSeats', {count: availableSeats})}</p></div></Surface>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon}><AppIcon name="creditCard" size={27}/></span><div><h2>{t('billingTitle')}</h2><strong>{t('monthlyPrice', {amount: subscription.monthlyPriceEur})}</strong><p>{subscription.nextPaymentDate ? t('nextPayment', {date: formatDate(subscription.nextPaymentDate, locale)}) : t('notScheduled')}</p></div></Surface>
        <Surface className={styles.summaryCard}><span className={styles.summaryIcon}><AppIcon name="building" size={27}/></span><div><h2>{t('accessibleCompanies')}</h2><strong>{companyState.companies.length}</strong><p>{t('separateSubscriptions')}</p></div></Surface>
      </section>

      <div className={styles.detailsGrid}>
        <Surface className={styles.billingPanel}>
          <div className={styles.panelHeading}><span className={styles.headingIcon}><AppIcon name="file" size={23}/></span><h2>{t('billing.title')}</h2><Button aria-disabled="true" title={t('demoUnavailable')} data-required-role="administrator"><AppIcon name="edit" size={18}/>{t('billing.update')}</Button></div>
          <dl className={styles.billingRows}>{billingRows.map((row) => <div className={styles.billingRow} key={row.label}><dt>{row.label}</dt><dd>{row.value || '—'}</dd></div>)}</dl>
        </Surface>

        <div className={styles.sidePanels}>
          <Surface className={styles.paymentPanel}>
            <h2 className={styles.panelTitle}><span className={styles.headingIcon}><AppIcon name="creditCard" size={23}/></span>{t('payment.title')}</h2>
            {paymentMethod ? <div className={styles.paymentMethod}><span className={styles.cardBrand}>{paymentMethod.brand}</span><div><strong>{t('payment.masked', {lastFour: paymentMethod.lastFour})}</strong><p>{t('payment.expires', {month: String(paymentMethod.expiryMonth).padStart(2, '0'), year: String(paymentMethod.expiryYear).slice(-2)})}</p></div><Button variant="secondary" aria-disabled="true" title={t('demoUnavailable')} data-required-role="administrator">{t('payment.change')}</Button></div> : <p>{t('payment.empty')}</p>}
          </Surface>

          <Surface className={styles.limitsPanel}>
            <h2 className={styles.panelTitle}><span className={styles.headingIcon}><AppIcon name="shield" size={23}/></span>{t('limits.title')}</h2>
            <ul className={styles.limitsList}>
              <li><AppIcon name="check" size={18}/>{t('limits.members', {count: subscription.seatLimit})}</li>
              {subscription.capabilities.customRequirements && <li><AppIcon name="check" size={18}/>{t('limits.customRequirements')}</li>}
              {subscription.capabilities.unlimitedDocuments && <li><AppIcon name="check" size={18}/>{t('limits.unlimitedDocuments')}</li>}
              {subscription.capabilities.notificationsAudit && <li><AppIcon name="check" size={18}/>{t('limits.notificationsAudit')}</li>}
            </ul>
          </Surface>

          <aside className={styles.companyNotice}><AppIcon name="info" size={28}/><p><strong>{t('notice.title')}</strong><span>{t('notice.description')}</span></p></aside>
        </div>
      </div>

      <Surface className={styles.invoicesPanel}>
        <h2 className={styles.panelTitle}><span className={styles.headingIcon}><AppIcon name="file" size={23}/></span>{t('invoices.title')}</h2>
        <div className={styles.invoiceScroll} role="region" aria-label={t('invoices.region')} tabIndex={0}>
          <table className={styles.invoiceTable}><thead><tr>
            <th scope="col">{t('invoices.number')}<AppIcon name="sort" size={16}/></th>
            <th scope="col">{t('invoices.date')}<AppIcon name="sort" size={16}/></th>
            <th scope="col">{t('invoices.amount')}<AppIcon name="sort" size={16}/></th>
            <th scope="col">{t('invoices.status')}<AppIcon name="sort" size={16}/></th>
            <th scope="col">{t('invoices.actions')}</th>
          </tr></thead><tbody>{subscription.invoices.map((invoice) => <tr key={invoice.id}>
            <td>{invoice.number}</td><td>{formatDate(invoice.date, locale)}</td><td>{t('invoiceAmount', {amount: invoice.amountEur})}</td>
            <td><span className={styles.paid}><AppIcon name="check" size={14}/>{t('invoices.paid')}</span></td>
            <td><div className={styles.invoiceActions}><button type="button" aria-disabled="true" title={t('demoUnavailable')}><AppIcon name="download" size={16}/>{t('invoices.download')}</button><button type="button" aria-disabled="true" title={t('demoUnavailable')} aria-label={t('invoices.moreActions', {number: invoice.number})}><AppIcon name="more" size={18}/></button></div></td>
          </tr>)}{subscription.invoices.length === 0 && <tr><td colSpan={5}>{t('invoices.empty')}</td></tr>}</tbody></table>
        </div>
      </Surface>
    </div>
  </AuthenticatedAppShell>;
}
