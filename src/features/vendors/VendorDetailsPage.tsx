'use client';

import {useCallback, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import type {VendorDetailsViewModel, VendorDocumentRow} from './types';
import {InviteVendorDrawer} from './InviteVendorDrawer';
import {AddDocumentDrawer} from '@/features/documents/AddDocumentDrawer';
import {createLocalDocument, toVendorDocumentRow, useCreatedDocuments} from '@/features/documents/created-documents';
import {useVendorState} from './created-vendors';
import styles from './VendorDetailsPage.module.css';

const statusTone: Record<VendorDocumentRow['status'], StatusTone> = {
  valid: 'success', expiring: 'warning', expired: 'danger', missing: 'neutral', uploaded: 'neutral', review: 'danger'
};

function ContactItem({icon, label, children}: {icon: 'users' | 'mail' | 'phone' | 'pin' | 'globe'; label: string; children: React.ReactNode}) {
  return <div className={styles.contactItem} data-vendor-contact>
    <span className={styles.contactIcon} aria-hidden="true">{icon === 'users' ? <AppIcon name="users" size={21} /> :
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon === 'mail' ? <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></> :
          icon === 'phone' ? <path d="M5 3h4l2 5-2 2a15 15 0 0 0 5 5l2-2 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/> :
            icon === 'pin' ? <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></> :
              <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>}
      </svg>}</span>
    <span className={styles.contactText}><small>{label}</small>{children}</span>
  </div>;
}

export function VendorDetailsPage({locale, view}: {locale: string; view: VendorDetailsViewModel}) {
  const t = useTranslations('VendorDetails');
  const vendorsT = useTranslations('Vendors');
  const vendorState = useVendorState();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'documents' | 'notes'>('documents');
  const [invitePhase, setInvitePhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [addDocumentPhase, setAddDocumentPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const inviteTriggerRef = useRef<HTMLButtonElement>(null);
  const addDocumentTriggerRef = useRef<HTMLButtonElement>(null);
  const closeInvite = useCallback(() => setInvitePhase('closing'), []);
  const finishInvite = useCallback(() => setInvitePhase('closed'), []);
  const localized = locale === 'en' ? 'en' : 'ro';
  const createdDocuments = useCreatedDocuments().filter((document) => document.vendorId === view.vendor.id);
  const allDocuments = [...createdDocuments.map((document) => toVendorDocumentRow(document, localized)), ...view.documents];
  const visibleDocuments = allDocuments.filter((document) => `${document.name} ${document.issuer} ${document.subtitle ?? ''}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));
  const {vendor, contact} = view;
  const lifecycleStatus = vendorState.createdVendors.find((item) => item.id === vendor.id)?.lifecycleStatus
    ?? vendorState.fixtureVendors.find((item) => item.id === vendor.id)?.lifecycleStatus ?? vendor.lifecycleStatus;
  const setupNeeded = vendor.documentTarget === 0;
  const hasContact = Boolean(contact.name || contact.email || contact.phone || contact.address || contact.website);

  return <AuthenticatedAppShell locale={locale} currentPath={`/vendors/${vendor.id}`} organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
    <div className={styles.pageContent}>
      <div className={styles.vendorHeader}>
        <div className={styles.identityBlock} data-vendor-identity>
          <AuthenticatedPageHeader
            context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: vendorsT('title'), href: '/vendors'}, {label: vendor.name}]} />}
            title={<span className={styles.titleLine}><span className={styles.vendorIcon} data-vendor-icon><AppIcon name="building" size={38} /></span><span data-vendor-name>{vendor.name}</span></span>}
            titleId="vendor-details-title"
            description={<span className={styles.identityMeta}><span>{vendorsT('registrationPrefix')} {vendor.registrationNumber}</span>{view.registrationCode && <><span className={styles.metaDivider} aria-hidden="true"/><span>{view.registrationCode}</span></>}<span className={styles.categoryChip} data-vendor-category><AppIcon name="file" size={14}/>{view.categoryDetail?.[localized] ?? vendorsT(`category.${vendor.category}`)}</span>{lifecycleStatus === 'inactive' && <span className={styles.inactiveBadge} data-vendor-lifecycle>{vendorsT('inactive')}</span>}{view.industry && <span className={styles.industryMeta}>{t('industry')}: {view.industry}</span>}</span>}
          />
        </div>
        <div className={styles.complianceSummary} data-vendor-status data-compliance={vendor.status} data-document-details={view.validDocumentCount === undefined ? 'unavailable' : undefined} data-setup={setupNeeded || undefined}><span className={styles.complianceIcon}><AppIcon name={setupNeeded || vendor.status === 'attention' ? 'clock' : vendor.status === 'noncompliant' ? 'close' : 'check'} size={34}/></span><span><strong>{setupNeeded ? t('setupRequired') : vendorsT(`status.${vendor.status}`)}</strong><small>{setupNeeded ? t('noRequirements') : view.validDocumentCount === undefined ? t('documentDetailsUnavailable') : <>{t('complianceDescription')}<br/><span>{t('validCount', {count: view.validDocumentCount, total: vendor.documentTarget})}</span></>}</small></span></div>
        <div className={styles.pageActions} data-vendor-actions><Button variant="secondary" ref={inviteTriggerRef} onClick={view.invitationPreview ? () => setInvitePhase('open') : undefined} aria-disabled={!view.invitationPreview || undefined} className={styles.inviteAction}><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3ZM10.3 13.7 21 3"/></svg>{t('invite')}</Button><AuthenticatedPagePrimaryAction icon="plus" ref={addDocumentTriggerRef} onClick={() => setAddDocumentPhase('open')}>{t('addDocument')}</AuthenticatedPagePrimaryAction></div>
      </div>

      <Surface className={styles.contacts} role="region" aria-label={t('contactDetails')}>
        {contact.name && <ContactItem icon="users" label={t('contactPerson')}><strong>{contact.name}</strong>{contact.role && <span>{contact.role[localized]}</span>}</ContactItem>}
        {contact.email && <ContactItem icon="mail" label={t('email')}><a href={`mailto:${contact.email}`}>{contact.email}</a></ContactItem>}
        {contact.phone && <ContactItem icon="phone" label={t('phone')}><a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></ContactItem>}
        {contact.address && <ContactItem icon="pin" label={t('address')}><span className={styles.address}>{contact.address[localized]}</span></ContactItem>}
        {contact.website && <ContactItem icon="globe" label={t('website')}><a href={/^https?:\/\//i.test(contact.website) ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer">{contact.website}<span aria-hidden="true"> ↗</span></a></ContactItem>}
        {!hasContact && <p className={styles.emptyContact}>{t('emptyContact')}</p>}
      </Surface>

      <div role="tablist" aria-label={t('sections')} className={styles.tabs}>
        {(['documents', 'contacts', 'activity', 'notes'] as const).map((section) => {
          const enabled = section === 'documents' || (section === 'notes' && Boolean(view.notes));
          return <button key={section} role="tab" type="button" id={`tab-${section}`} aria-controls={enabled ? `vendor-${section}` : undefined} aria-selected={activeTab === section} aria-disabled={!enabled || undefined} tabIndex={enabled ? 0 : -1} onClick={enabled ? () => setActiveTab(section as 'documents' | 'notes') : undefined} className={activeTab === section ? styles.activeTab : undefined}><AppIcon name={section === 'documents' ? 'file' : section === 'contacts' ? 'users' : section === 'activity' ? 'bars' : 'file'} size={21}/>{t(`tabs.${section}`)}</button>;
        })}
      </div>

      {activeTab === 'documents' ? <Surface className={styles.documentsPanel} role="tabpanel" id="vendor-documents" aria-labelledby="tab-documents">
        <div className={styles.panelHeader}><div className={styles.panelHeading}><AppIcon name="file" size={24}/><div><h2>{t('tabs.documents')}{createdDocuments.length > 0 ? ` (${allDocuments.length})` : ''}</h2><p>{t('documentsDescription')}</p></div></div><div className={styles.documentControls}><label className={styles.documentSearch}><AppIcon name="search" size={20}/><span className={styles.visuallyHidden}>{t('searchLabel')}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')}/></label><Button variant="secondary" aria-disabled="true" className={styles.filterButton}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/></svg>{t('filter')}</Button></div></div>
        <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={styles.documentsTable}><thead><tr><th scope="col">{t('table.type')}</th><th scope="col">{t('table.status')}</th><th scope="col">{t('table.issued')}</th><th scope="col">{t('table.expires')}</th><th scope="col">{t('table.uploadedBy')}</th><th scope="col">{t('table.actions')}</th></tr></thead><tbody>{visibleDocuments.map((document) => {const reviewRoute = createdDocuments.find((item) => item.id === document.id)?.reviewRoute; return <tr key={document.id}><td><span className={styles.documentIdentity}><span className={styles.documentIcon} data-status={document.status}><AppIcon name={document.status === 'missing' ? 'fileX' : 'file'} size={19}/></span><span><strong>{document.name}</strong><small>{document.subtitle ?? document.issuer}</small></span></span></td><td><StatusBadge tone={statusTone[document.status]} className={styles.documentStatus}><AppIcon name={document.status === 'valid' ? 'check' : document.status === 'expiring' ? 'clock' : document.status === 'expired' ? 'close' : document.status === 'review' ? 'info' : 'file'} size={16}/>{t(`status.${document.status}`)}</StatusBadge></td><td>{document.issued?.[localized] ?? '—'}</td><td>{document.expires ? <span className={styles.dateCell}>{document.expires[localized]}<small data-status={document.status}>{document.countdown?.[localized]}</small></span> : '—'}</td><td>{document.uploadedBy ? <span className={styles.dateCell}>{document.uploadedBy}<small>{document.uploadedOn?.[localized]}</small></span> : '—'}</td><td>{document.status === 'missing' && <button type="button" aria-disabled="true" className={styles.uploadAction}>{t('upload')}</button>}{reviewRoute ? <Link href={reviewRoute} aria-label={t('documentActions', {name: document.name})} className={styles.moreAction}><AppIcon name="more" size={19}/></Link> : <button type="button" aria-disabled="true" aria-label={t('documentActions', {name: document.name})} className={styles.moreAction}><AppIcon name="more" size={19}/></button>}</td></tr>;})}</tbody></table>{visibleDocuments.length === 0 && <p className={styles.noResults}>{allDocuments.length === 0 ? t('emptyDocuments') : t('noDocuments')}</p>}</div>
        {!setupNeeded && view.documents.some((document) => document.status === 'missing') && <div className={styles.notice}><AppIcon name="info" size={21}/><span>{t('missingNotice', {count: view.documents.filter((document) => document.status === 'missing').length})}</span><button type="button" aria-disabled="true">{t('viewRequirements')} <AppIcon name="arrowRight" size={19}/></button></div>}
      </Surface> : <Surface className={styles.notesPanel} role="tabpanel" id="vendor-notes" aria-labelledby="tab-notes"><h2>{t('tabs.notes')}</h2><p>{view.notes}</p></Surface>}
      <aside className={styles.banner}><div><h2>{t('bannerTitle')}</h2><p>{t('bannerDescription')}</p></div><p className={styles.bannerHandwriting}>{t('bannerHandwriting')}</p></aside>
    </div>
    {invitePhase !== 'closed' && view.invitationPreview && <InviteVendorDrawer phase={invitePhase} onClose={closeInvite} onExited={finishInvite} triggerRef={inviteTriggerRef} vendorName={vendor.name} contactEmail={contact.email ?? ''} preview={view.invitationPreview} locale={locale}/>}
    {addDocumentPhase !== 'closed' && <AddDocumentDrawer phase={addDocumentPhase} onClose={() => setAddDocumentPhase('closing')} onExited={() => setAddDocumentPhase('closed')} triggerRef={addDocumentTriggerRef} vendor={{id: vendor.id, name: vendor.name, registrationNumber: vendor.registrationNumber, registrationCode: view.registrationCode ?? ''}} uploadedBy={view.user.fullName} onCreate={(input) => {const document = createLocalDocument(input); setAddDocumentPhase('closed'); setActiveTab('documents'); setQuery(''); if (document.reviewRoute) router.push(document.reviewRoute);}}/>}
  </AuthenticatedAppShell>;
}
