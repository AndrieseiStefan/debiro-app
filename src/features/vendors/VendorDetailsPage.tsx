'use client';

import {useCallback, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {EmptyState} from '@/components/ui/EmptyState';
import type {VendorDetailsViewModel} from './types';
import {InviteVendorDrawer} from './InviteVendorDrawer';
import {AddDocumentDrawer} from '@/features/documents/AddDocumentDrawer';
import {DocumentManagementDrawer} from '@/features/documents/DocumentManagementDrawer';
import type {DocumentSelection} from '@/features/documents/document-management';
import {createLocalDocument, useDocumentRecords} from '@/features/documents/created-documents';
import {associateRequirementUpload, getVendorRequirements, useVendorRequirements, type VendorRequirement} from './vendor-requirements';
import {projectVendorDocuments} from './projections';
import {VendorDocumentsPanel} from './VendorDocumentsPanel';
import {getVendorContacts, getVendorMetadata, projectVendorDetails, updateVendorMetadata, useVendorState, vendorOwnedByCompany} from './created-vendors';
import {VendorContactsPanel} from './VendorContactsPanel';
import {VendorActivityPanel} from './VendorActivityPanel';
import {VendorNotesPanel, type NotesNavigation} from './VendorNotesPanel';
import {VendorFormDrawer} from './AddVendorDrawer';
import {getActiveCompany, useCompanyState} from '@/features/companies/company-state';
import styles from './VendorDetailsPage.module.css';

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

export function VendorDetailsPage({locale, view: initialView, ...selection}: {locale: string; view: VendorDetailsViewModel} & DocumentSelection) {
  const company = useCompanyState();
  const companyId = company.activeCompanyId ?? '';
  const companyName = getActiveCompany(company)?.company.name ?? initialView.organization.name;
  useVendorState();
  const app = useTranslations('AppShell');
  if (!vendorOwnedByCompany(companyId, initialView.vendor.id)) return <AuthenticatedAppShell locale={locale} currentPath={`/vendors/${initialView.vendor.id}`} organizationName={companyName} userName={initialView.user.fullName} userInitials={initialView.user.initials} scope="company-aware"><EmptyState title={app('workspaceEmptyTitle')} description={app('workspaceEmptyDescription', {company: companyName})}/></AuthenticatedAppShell>;
  return <VendorDetailsWorkspace key={`${companyId}:${initialView.vendor.id}`} locale={locale} initialView={initialView} companyId={companyId} {...selection}/>;
}

function VendorDetailsWorkspace({locale, initialView, companyId, ...selection}: {locale: string; initialView: VendorDetailsViewModel; companyId: string} & DocumentSelection) {
  const t = useTranslations('VendorDetails');
  const vendorsT = useTranslations('Vendors');
  const vendorState = useVendorState();
  const projected = projectVendorDetails(initialView, vendorState);
  const workspace = getVendorRequirements(useVendorRequirements(), companyId, projected.vendor.id);
  const vendorProjection = projectVendorDocuments(projected.vendor, workspace, useDocumentRecords(), companyId);
  const view = {...projected, validDocumentCount: vendorProjection.documentCount, vendor: vendorProjection};
  const metadata = getVendorMetadata(vendorState, view.vendor.id);
  const contacts = getVendorContacts(vendorState, companyId, view.vendor.id);
  const configuredRequirements = workspace.requirements.length;
  const editT = useTranslations('EditVendor');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'documents' | 'contacts' | 'activity' | 'notes'>('documents');
  const notesRef = useRef<NotesNavigation>(null);
  function requestLeave(action: () => void) {if (notesRef.current) notesRef.current.requestLeave(action); else action();}
  const [invitePhase, setInvitePhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [addDocumentPhase, setAddDocumentPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [editPhase, setEditPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [updated, setUpdated] = useState(false);
  const [query, setQuery] = useState('');
  const [uploadRequirement, setUploadRequirement] = useState<VendorRequirement>();
  const uploadTriggerRef = useRef<HTMLButtonElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const inviteTriggerRef = useRef<HTMLButtonElement>(null);
  const addDocumentTriggerRef = useRef<HTMLButtonElement>(null);
  const closeInvite = useCallback(() => setInvitePhase('closing'), [setInvitePhase]);
  const finishInvite = useCallback(() => setInvitePhase('closed'), [setInvitePhase]);
  const closeEdit = useCallback(() => setEditPhase('closing'), [setEditPhase]);
  const finishEdit = useCallback(() => setEditPhase('closed'), [setEditPhase]);
  const localized = locale === 'en' ? 'en' : 'ro';
  const {vendor, contact} = view;
  const lifecycleStatus = vendorState.createdVendors.find((item) => item.id === vendor.id)?.lifecycleStatus
    ?? vendorState.fixtureVendors.find((item) => item.id === vendor.id)?.lifecycleStatus ?? vendor.lifecycleStatus;
  const setupNeeded = vendor.documentTarget === 0 && configuredRequirements === 0;
  const hasContact = Boolean(contact.name || contact.email || contact.phone || contact.address || contact.website);

  return <AuthenticatedAppShell locale={locale} currentPath={`/vendors/${vendor.id}`} organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount} scope="company-aware">
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
        <div className={styles.complianceSummary} data-vendor-status data-compliance={vendor.status} data-document-details={view.validDocumentCount === undefined ? 'unavailable' : undefined}><span className={styles.complianceIcon}><AppIcon name={vendor.status === 'attention' ? 'clock' : vendor.status === 'noncompliant' ? 'close' : 'check'} size={34}/></span><span><strong>{vendorsT(`status.${vendor.status}`)}</strong><small>{setupNeeded ? t('noRequirements') : view.validDocumentCount === undefined ? t('documentDetailsUnavailable') : <>{t('complianceDescription')}<br/><span>{t('validCount', {count: view.validDocumentCount, total: vendor.documentTarget || configuredRequirements})}</span></>}</small></span></div>
        <div className={styles.pageActions} data-vendor-actions><Button variant="secondary" ref={editTriggerRef} onClick={metadata ? () => requestLeave(() => {setUpdated(false); setEditPhase('open');}) : undefined} aria-disabled={!metadata || undefined} className={styles.inviteAction}>{editT('title')}</Button><Button variant="secondary" ref={inviteTriggerRef} onClick={() => requestLeave(() => setInvitePhase('open'))} className={styles.inviteAction}><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3ZM10.3 13.7 21 3"/></svg>{t('invite')}</Button><AuthenticatedPagePrimaryAction icon="plus" ref={addDocumentTriggerRef} onClick={() => requestLeave(() => {setUploadRequirement(undefined); setAddDocumentPhase('open');})}>{t('addDocument')}</AuthenticatedPagePrimaryAction></div>
      </div>

      {updated && <p role="status" className={styles.success}>{editT('success')}</p>}
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
          const sections = ['documents', 'contacts', 'activity', 'notes'] as const;
          return <button key={section} role="tab" type="button" id={`tab-${section}`} aria-controls={`vendor-${section}`} aria-selected={activeTab === section} tabIndex={activeTab === section ? 0 : -1} onClick={() => requestLeave(() => setActiveTab(section))} onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault(); const index = sections.indexOf(section); const next = sections[event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + 4) % 4];
            requestLeave(() => {setActiveTab(next); document.getElementById(`tab-${next}`)?.focus();});
          }} className={activeTab === section ? styles.activeTab : undefined}><AppIcon name={section === 'documents' ? 'file' : section === 'contacts' ? 'users' : section === 'activity' ? 'bars' : 'file'} size={21}/>{t(`tabs.${section}`)}</button>;
        })}
      </div>

      {activeTab === 'documents' && <VendorDocumentsPanel view={view} companyId={companyId} language={localized} query={query} setQuery={setQuery} onUpload={(requirement, trigger) => {uploadTriggerRef.current = trigger; setUploadRequirement(requirement); setAddDocumentPhase('open');}}/>}
      {activeTab === 'contacts' && <VendorContactsPanel companyId={companyId} vendorId={vendor.id} language={localized}/>}
      {activeTab === 'activity' && <VendorActivityPanel companyId={companyId} vendorId={vendor.id} language={localized}/>}
      {activeTab === 'notes' && <VendorNotesPanel companyId={companyId} vendorId={vendor.id} language={localized} navigationRef={notesRef}/>}
      <aside className={styles.banner}><div><h2>{t('bannerTitle')}</h2><p>{t('bannerDescription')}</p></div><p className={styles.bannerHandwriting}>{t('bannerHandwriting')}</p></aside>
    </div>
    {editPhase !== 'closed' && metadata && <VendorFormDrawer mode="edit" phase={editPhase} onClose={closeEdit} onExited={finishEdit} triggerRef={editTriggerRef} initialValues={metadata} companyId={companyId} vendorId={vendor.id} onSubmit={(input) => {const result = updateVendorMetadata(companyId, vendor.id, input); if (result === 'saved') {setEditPhase('closed'); setUpdated(true);} return result;}}/>}
    {invitePhase !== 'closed' && <InviteVendorDrawer phase={invitePhase} onClose={closeInvite} onExited={finishInvite} triggerRef={inviteTriggerRef} vendorName={vendor.name} contacts={contacts} companyId={companyId} vendorId={vendor.id} preview={view.invitationPreview} locale={locale} onAddContact={() => {setInvitePhase('closed'); setActiveTab('contacts');}}/>}
    {addDocumentPhase !== 'closed' && <AddDocumentDrawer phase={addDocumentPhase} onClose={() => setAddDocumentPhase('closing')} onExited={() => setAddDocumentPhase('closed')} triggerRef={uploadRequirement ? uploadTriggerRef : addDocumentTriggerRef} requiredType={uploadRequirement} vendor={{id: vendor.id, name: vendor.name, registrationNumber: vendor.registrationNumber, registrationCode: view.registrationCode ?? ''}} uploadedBy={view.user.fullName} onCreate={(input) => {const document = createLocalDocument(input); associateRequirementUpload(companyId, vendor.id, document, uploadRequirement?.id); setAddDocumentPhase('closed'); setActiveTab('documents'); setQuery(''); if (input.reviewRequired && document.reviewRoute) router.push(document.reviewRoute);}}/>}
    <DocumentManagementDrawer {...selection} contextPath={`/vendors/${vendor.id}`} vendorId={vendor.id}/>
  </AuthenticatedAppShell>;
}
