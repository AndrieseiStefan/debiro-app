'use client';

import {useCallback, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {SearchInput} from '@/components/ui/SearchInput';
import {FilterPanel} from '@/components/ui/FilterPanel';
import {SelectField} from '@/components/ui/SelectField';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Surface} from '@/components/ui/Surface';
import {useCreatedDocuments, toVendorDocumentRow} from '@/features/documents/created-documents';
import {getRequirementsWorkspace, useRequirementsState} from '@/features/requirements/requirements-state';
import {AppearanceIcon} from '@/features/requirements/AppearancePicker';
import {applyVendorTemplates, getVendorRequirements, removeAppliedTemplate, removeVendorRequirement, useVendorRequirements, type VendorRequirement} from './vendor-requirements';
import {ApplyTemplatesDrawer} from './ApplyTemplatesDrawer';
import {VendorDocumentActions} from './VendorDocumentActions';
import type {VendorDetailsViewModel, VendorDocumentRow} from './types';
import styles from './VendorDetailsPage.module.css';

const statusTone: Record<VendorDocumentRow['status'], StatusTone> = {valid: 'success', expiring: 'warning', expired: 'danger', missing: 'neutral', uploaded: 'neutral', review: 'danger'};

export function VendorDocumentsPanel({view, companyId, language, query, setQuery, onUpload}: {view: VendorDetailsViewModel; companyId: string; language: 'ro' | 'en'; query: string; setQuery: (value: string) => void; onUpload: (requirement: VendorRequirement, trigger: HTMLButtonElement) => void}) {
  const t = useTranslations('VendorDetails');
  const templatesT = useTranslations('VendorTemplates');
  const filtersT = useTranslations('DataFilters');
  const [status, setStatus] = useState<VendorDocumentRow['status'] | 'all'>('all');
  const [phase, setPhase] = useState<'closed' | 'open' | 'closing'>('closed');
  const [confirmation, setConfirmation] = useState<{templateId: string} | {requirement: VendorRequirement} | null>(null);
  const [success, setSuccess] = useState<ReturnType<typeof applyVendorTemplates>>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setPhase('closing'), []);
  const finishDrawer = useCallback(() => setPhase('closed'), []);
  const cancelConfirmation = useCallback(() => setConfirmation(null), []);
  const workspace = getVendorRequirements(useVendorRequirements(), companyId, view.vendor.id);
  const templates = getRequirementsWorkspace(useRequirementsState(), companyId).templates;
  const documents = useCreatedDocuments().filter((document) => document.vendorId === view.vendor.id && (document.companyId ?? 'demo-company') === companyId);
  const associated = new Set(workspace.requirements.map((item) => item.uploadedDocumentId));
  const rows: {row: VendorDocumentRow; requirement?: VendorRequirement; reviewRoute?: string | null}[] = [
    ...documents.filter((document) => !associated.has(document.id)).map((document) => ({row: toVendorDocumentRow(document, language), reviewRoute: document.reviewRoute})),
    ...workspace.requirements.map((requirement) => {
      const document = documents.find((item) => item.id === requirement.uploadedDocumentId);
      const row = document ? toVendorDocumentRow(document, language) : requirement.fixtureRow ? {...requirement.fixtureRow, name: language === 'ro' ? requirement.fixtureRow.name : requirement.name.en}
        : {id: requirement.id, name: requirement.name[language], issuer: requirement.issuer ?? '', subtitle: requirement.description?.[language], status: requirement.status, issued: null, expires: null};
      return {row, requirement, reviewRoute: document?.reviewRoute};
    })
  ];
  const visible = rows.filter(({row}) => (status === 'all' || row.status === status) && `${row.name} ${row.issuer} ${row.subtitle ?? ''}`.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)));
  const missingRequirements = workspace.requirements.filter((requirement) => requirement.status === 'missing').length;
  const uploadedConfirmation = confirmation && 'requirement' in confirmation && Boolean(confirmation.requirement.uploadedDocumentId);

  return <><Surface className={styles.documentsPanel} role="tabpanel" id="vendor-documents" aria-labelledby="tab-documents">
    <div className={styles.panelHeader}><div className={styles.panelHeading}><AppIcon name="file" size={24}/><div><h2>{t('tabs.documents')}{documents.length > 0 || workspace.requirements.length > 5 ? ` (${rows.length})` : ''}</h2><p>{t('documentsDescription')}</p></div></div><div className={styles.documentControls}>
      <SearchInput className={styles.documentSearch} label={t('searchLabel')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')}/>
      <FilterPanel activeCount={Number(status !== 'all')} onReset={() => setStatus('all')}>
        <SelectField id="vendor-document-status-filter" label={t('table.status')} value={status} onChange={(event) => setStatus((event.target.value || 'all') as VendorDocumentRow['status'] | 'all')}>
          <option value="all">{filtersT('allStatuses')}</option>{(['valid', 'expiring', 'expired', 'missing', 'uploaded', 'review'] as const).map((item) => <option key={item} value={item}>{t(`status.${item}`)}</option>)}
        </SelectField>
      </FilterPanel>
      <Button ref={triggerRef} className={styles.templateAction} onClick={() => {setSuccess(null); setPhase('open');}}><AppIcon name="plus" size={18}/>{templatesT('title')}</Button>
    </div></div>
    {workspace.appliedTemplates.length > 0 && <div className={styles.appliedTemplates}><span>{templatesT('appliedLabel')}</span>{workspace.appliedTemplates.map((template) => <span key={template.templateId} className={styles.appliedChip}>{template.title[language]}<button type="button" aria-label={templatesT('removeAssociation', {name: template.title[language]})} onClick={() => setConfirmation({templateId: template.templateId})}><AppIcon name="close" size={14}/></button></span>)}</div>}
    {success && <div role="status" className={styles.templateSuccess}><AppIcon name="check" size={20}/><span><strong>{templatesT('successTitle')}</strong><span>{templatesT('successDescription', {added: success.addedCount, count: success.templateCount, existing: success.existingCount})}</span></span></div>}
    <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={styles.documentsTable}><thead><tr><th scope="col">{t('table.type')}</th><th scope="col">{templatesT('source')}</th><th scope="col">{templatesT('required')}</th><th scope="col">{t('table.status')}</th><th scope="col">{t('table.issued')}</th><th scope="col">{t('table.expires')}</th><th scope="col">{t('table.uploadedBy')}</th><th scope="col">{t('table.actions')}</th></tr></thead><tbody>{visible.map(({row: document, requirement, reviewRoute}) => <tr key={requirement?.id ?? document.id} data-requirement-id={requirement?.id}>
      <td><span className={styles.documentIdentity}>{requirement && !requirement.fixtureRow ? <AppearanceIcon appearance={requirement} size="small"/> : <span className={styles.documentIcon} data-status={document.status}><AppIcon name={document.status === 'missing' ? 'fileX' : 'file'} size={19}/></span>}<span><strong>{document.name}</strong><small>{document.subtitle ?? document.issuer}</small></span></span></td>
      <td><span className={styles.sourceList}>{requirement?.sourceTemplateIds.length ? requirement.sourceTemplateIds.map((id) => <span key={id} className={styles.sourceChip}>{templatesT('templateSource', {name: requirement.sourceTemplateNames[id]?.[language] ?? id})}</span>) : <span className={styles.manualSource}>{templatesT('manualSource')}</span>}</span></td>
      <td>{requirement ? templatesT(requirement.required ? 'yes' : 'no') : '—'}</td>
      <td><StatusBadge tone={statusTone[document.status]} className={styles.documentStatus}><AppIcon name={document.status === 'valid' ? 'check' : document.status === 'expiring' ? 'clock' : document.status === 'expired' ? 'close' : document.status === 'review' ? 'info' : 'file'} size={16}/>{t(`status.${document.status}`)}</StatusBadge></td><td>{document.issued?.[language] ?? '—'}</td><td>{document.expires ? <span className={styles.dateCell}>{document.expires[language]}<small data-status={document.status}>{document.countdown?.[language]}</small></span> : '—'}</td><td>{document.uploadedBy ? <span className={styles.dateCell}>{document.uploadedBy}<small>{document.uploadedOn?.[language]}</small></span> : '—'}</td><td>{requirement && document.status === 'missing' && <button type="button" className={styles.uploadAction} onClick={(event) => onUpload(requirement, event.currentTarget)}>{t('upload')}</button>}<VendorDocumentActions name={document.name} reviewRoute={reviewRoute} onRemove={requirement ? () => setConfirmation({requirement}) : undefined}/></td>
    </tr>)}</tbody></table>{visible.length === 0 && <p className={styles.noResults}>{rows.length === 0 ? t('emptyDocuments') : t('noDocuments')}{status !== 'all' && <button type="button" onClick={() => setStatus('all')}>{filtersT('reset')}</button>}</p>}</div>
    {missingRequirements > 0 && <div className={styles.notice} data-missing-requirements={missingRequirements} aria-live="polite"><AppIcon name="info" size={21}/><span>{t('missingNotice', {count: missingRequirements})}</span></div>}
  </Surface>
    {phase !== 'closed' && <ApplyTemplatesDrawer phase={phase} onClose={closeDrawer} onExited={finishDrawer} triggerRef={triggerRef} templates={templates} requirements={workspace.requirements} category={view.vendor.category} language={language} onApply={(ids) => {const result = applyVendorTemplates(companyId, view.vendor.id, ids); if (!result) return false; setSuccess(result); setQuery(''); setPhase('closed'); return true;}}/>}
    {confirmation && <ConfirmationDialog icon="warning" title={templatesT('templateId' in confirmation ? 'removeAssociationTitle' : uploadedConfirmation ? 'removeUploadedTitle' : 'removeEmptyTitle')} description={templatesT('templateId' in confirmation ? 'removeAssociationDescription' : uploadedConfirmation ? 'removeUploadedDescription' : 'removeEmptyDescription')} cancelLabel={templatesT('cancelRemoval')} confirmLabel={templatesT('templateId' in confirmation ? 'confirmRemoveAssociation' : uploadedConfirmation ? 'confirmDeleteDocument' : 'removeRequirement')} onCancel={cancelConfirmation} onConfirm={() => {if ('templateId' in confirmation) removeAppliedTemplate(companyId, view.vendor.id, confirmation.templateId); else removeVendorRequirement(companyId, view.vendor.id, confirmation.requirement.id); setSuccess(null); setConfirmation(null);}}/>}
  </>;
}
