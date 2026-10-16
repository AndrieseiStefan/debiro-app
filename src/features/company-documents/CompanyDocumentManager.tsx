'use client';

import {useCallback, useLayoutEffect, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {AppIcon} from '@/components/layout/AppIcon';
import {DocumentFileCard, DocumentVersionHistory} from '@/features/documents/DocumentManagementViews';
import {DocumentFilePreview} from '@/features/documents/DocumentFilePreview';
import {documentAccess} from '@/features/documents/document-access';
import {isoToReviewDate} from '@/features/documents/created-documents';
import {canManuallyExpire} from '@/features/documents/compliance';
import {CompanyUploadDrawer} from './CompanyUploadDrawer';
import {companyDocumentFile, downloadCompanyDocument, getCompanyDocumentDetails, markCompanyDocumentExpired, reviewCompanyDocument, updateCompanyDocumentMetadata} from './management';
import type {CompanyDocumentRecord, CompanyDocumentStatus} from './types';
import styles from '@/features/documents/DocumentManagementDrawer.module.css';

export type CompanyManagementSelection = {mode: 'add' | 'details' | 'history' | 'replace'; requirementId?: string; documentId?: string};
type Success = 'added' | 'replaced' | 'approved' | 'rejected' | 'metadata' | 'expired';

export function CompanyDocumentManager({companyId, locale, selection, onClose, onSuccess}: {
  companyId: string; locale: 'ro' | 'en'; selection: CompanyManagementSelection; onClose: () => void; onSuccess: (kind: Success) => void;
}) {
  const t = useTranslations('CompanyDocumentManagement'), common = useTranslations('DocumentManagement'), listing = useTranslations('CompanyDocuments');
  const triggerRef = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<CompanyManagementSelection['mode'] | 'preview'>(selection.mode);
  const [phase, setPhase] = useState<'open' | 'closing'>('open');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewReturn, setPreviewReturn] = useState<'details' | 'history'>('details');
  const [editing, setEditing] = useState(false), [rejecting, setRejecting] = useState(false), [reason, setReason] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [expire, setExpire] = useState<string | null>(null);
  const initial = useRef(true);
  const details = selection.requirementId ? getCompanyDocumentDetails(companyId, selection.requirementId) : null;
  const current = details?.current;
  const access = documentAccess(companyId);
  const close = useCallback(() => setPhase('closing'), []);
  const cancelExpiry = useCallback(() => setExpire(null), []);
  useLayoutEffect(() => {if (initial.current) {initial.current = false; return;} heading.current?.focus({preventScroll: true}); const panel = heading.current?.closest('[role="dialog"]'); if (panel) panel.scrollTop = 0;}, [mode, editing]);
  function success(kind: Success) {const message = t(`success.${kind}`); setNotice(message); setError(''); onSuccess(kind);}
  function date(value: string | null | undefined) {
    if (!value) return '—';
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', ...(value.length > 10 && {hour: '2-digit', minute: '2-digit'}), timeZone: 'UTC'}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
  }
  function badge(status: CompanyDocumentStatus) {return <StatusBadge tone={status === 'valid' ? 'success' : status === 'missing' || status === 'expired' ? 'danger' : 'warning'}>{listing(`status.${status}`)}</StatusBadge>;}
  function download(record: CompanyDocumentRecord) {if (!selection.requirementId || !downloadCompanyDocument(companyId, selection.requirementId, record.id)) setError(common('downloadUnavailable'));}
  function downloadButton(record: CompanyDocumentRecord) {return <Button variant="secondary" disabled={!selection.requirementId || !companyDocumentFile(companyId, selection.requirementId, record.id)} onClick={() => download(record)}><AppIcon name="download" size={16}/>{common('download')}</Button>;}
  function review(decision: 'approved' | 'rejected') {
    if (!current || !selection.requirementId) return;
    const result = reviewCompanyDocument(companyId, selection.requirementId, current.id, decision, reason);
    if (!result.ok) {setError(t(`errors.${result.reason}`)); return;}
    setRejecting(false); setReason(''); success(decision);
  }
  if (mode === 'add' || mode === 'replace') return <CompanyUploadDrawer companyId={companyId} locale={locale} context={mode === 'replace' ? {kind: 'replacement', requirementId: selection.requirementId ?? '', documentId: selection.documentId ?? current?.id ?? ''} : selection.requirementId ? {kind: 'requirement', requirementId: selection.requirementId} : {kind: 'standalone'}}
    phase={phase} triggerRef={triggerRef} onClose={close} onExited={onClose} onSuccess={(kind) => {onSuccess(kind); close();}}/>;
  const preview = details?.history.find((item) => item.id === previewId);
  return <><Drawer phase={phase} onClose={close} onExited={onClose} triggerRef={triggerRef} titleId="company-document-title" descriptionId="company-document-description" closeLabel={common('close')} size={mode === 'history' ? 'standard' : 'wide'} contentClassName={styles.content}>
    <DrawerHeader titleId="company-document-title" titleRef={heading} title={!details ? t('errors.unavailable') : mode === 'history' ? t('history') : mode === 'preview' ? t('previewTitle') : editing ? t('metadataTitle') : common('detailsTitle')} onBack={mode !== 'details' || editing ? () => {setMode(mode === 'preview' ? previewReturn : 'details'); setEditing(false); setRejecting(false); setError('');} : undefined} backLabel={common(mode === 'preview' && previewReturn === 'history' ? 'backToHistory' : 'backToDetails')}/>
    <p id="company-document-description" className={styles.srOnly}>{details?.requirement.name[locale] ?? t('errors.unavailable')}</p>
    {!details ? <p role="alert">{t('errors.unavailable')}</p> : mode === 'preview' ? <DocumentFilePreview file={preview ? companyDocumentFile(companyId, details.requirement.id, preview.id) : null} mime={preview?.fileType} title={preview?.filename ?? t('previewTitle')} unavailable={t('previewUnavailable')} unsupported={t('previewUnsupported')} action={preview && downloadButton(preview)}/>
      : mode === 'history' ? details.history.length ? <DocumentVersionHistory entries={details.history.map((record) => {
        const isCurrent = record.id === current?.id;
        const file = companyDocumentFile(companyId, details.requirement.id, record.id);
        return {id: record.id, version: record.version, state: isCurrent ? 'current' : record.reviewOutcome === 'rejected' ? 'rejected' : 'superseded', dateTime: record.uploadedAt, date: date(record.uploadedAt), actor: record.uploadedBy || '—', filename: record.filename,
          summary: <><StatusBadge tone={record.manuallyExpiredAt || record.reviewOutcome === 'rejected' ? 'danger' : record.reviewOutcome === 'approved' ? 'success' : 'info'}>{record.manuallyExpiredAt ? common('manualExpiryOutcome') : common(`outcome.${record.reviewOutcome}`)}</StatusBadge>{file && downloadButton(record)}{file && <button type="button" className={styles.smallAction} onClick={() => {setPreviewReturn('history'); setPreviewId(record.id); setMode('preview');}}>{t('preview')}</button>}</>,
          context: <><span className={isCurrent ? styles.currentVersion : styles.versionContext}>{isCurrent ? common('current') : t('historical')}</span><small className={styles.versionContext}>{common('expiryDate')}: {date(record.expiresAt)}</small>{record.rejectionReason && <small className={styles.versionContext}>{t('rejectionReason')}: {record.rejectionReason}</small>}</>};
      })}/> : <p>{t('noHistory')}</p> : editing && current ? <MetadataForm key={current.id} companyId={companyId} requirementId={details.requirement.id} record={current} locale={locale} onCancel={() => setEditing(false)} onSaved={() => {setEditing(false); success('metadata');}}/>
      : <div className={styles.detailsGrid}><section>
        {current ? <><DocumentFileCard filename={current.filename} fileType={current.fileType} fileSize={current.fileSize} action={downloadButton(current)}/>
          {companyDocumentFile(companyId, details.requirement.id, current.id) ? <Button variant="secondary" onClick={() => {setPreviewReturn('details'); setPreviewId(current.id); setMode('preview');}}>{t('preview')}</Button> : <p className={styles.fileNotice}>{t('previewUnavailable')}</p>}</> : <p>{t('noCurrent')}</p>}
        <h3>{common('information')}</h3><dl className={styles.metadata}>
          {[[common('name'), current?.documentName[locale] ?? details.requirement.name[locale]], [t('documentType'), listing(`types.${current?.documentType ?? details.requirement.documentType}`)],
            ...(current?.issuer ? [[t('issuer'), current.issuer]] : []), [common('requirement'), common(details.requirement.required ? 'required' : 'optional')],
            [common('complianceStatus'), badge(details.status)], [common('expiryDate'), date(current?.expiresAt)], [common('uploadedAt'), date(current?.uploadedAt)], [common('uploadedBy'), current?.uploadedBy || '—'],
            [t('reviewStatus'), current ? common(`outcome.${current.reviewOutcome}`) : '—'], [t('versionLabel'), current ? `v${current.version}` : '—'], ...(current?.reviewedBy ? [[common('reviewedBy'), current.reviewedBy], [t('reviewedAt'), date(current.reviewedAt)]] : [])
          ].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section><aside className={styles.actions}><section className={styles.actionCard}><h3>{common('actions')}</h3>
        <Button disabled={!access.replace} onClick={() => setMode(current ? 'replace' : 'add')}><AppIcon name="upload" size={16}/>{t(current ? 'replaceTitle' : 'addTitle')}</Button>
        {current && <Button variant="secondary" disabled={!access.replace} onClick={() => setEditing(true)}>{t('metadataTitle')}</Button>}
        {current && details.status !== 'missing' && canManuallyExpire({...current, complianceStatus: details.status}) && <Button variant="secondary" disabled={!access.replace} onClick={() => setExpire(current.id)}>{common('markExpired')}</Button>}
        {current?.reviewOutcome === 'pending' && <><p>{t('humanReview')}</p><Button disabled={!access.review} onClick={() => review('approved')}>{t('confirm')}</Button><Button variant="secondary" disabled={!access.review} onClick={() => setRejecting(!rejecting)}>{t('reject')}</Button>
          {rejecting && <form noValidate aria-label={t('reject')} onSubmit={(event) => {event.preventDefault(); review('rejected');}}><Field id="company-rejection-reason" label={t('rejectionReason')} required value={reason} onChange={(event) => setReason(event.target.value)}/><Button type="submit">{t('reject')}</Button></form>}</>}
      </section><div className={styles.historyHeading}><h3>{common('versions', {count: details.history.length})}</h3><button type="button" className={styles.viewAll} onClick={() => {setMode('history'); setError('');}}>{common('viewAll')}</button></div>
        {details.history.length ? <ol className={styles.miniHistory}>{details.history.slice(0, 3).map((record) => <li key={record.id}><b>v{record.version}</b><span><time dateTime={record.uploadedAt}>{date(record.uploadedAt)}</time><small>{record.uploadedBy || '—'}</small></span>{record.id === current?.id && <StatusBadge tone="info">{common('currentShort')}</StatusBadge>}</li>)}</ol> : <p>{t('noHistory')}</p>}
      </aside></div>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
  </Drawer>{expire && details?.current?.id === expire && <ConfirmationDialog backgroundSelector='[aria-labelledby="company-document-title"]' icon="warning" title={common('expireTitle')} description={t('expireDescription')} cancelLabel={common('cancel')} confirmLabel={common('markExpired')} onCancel={cancelExpiry} onConfirm={() => {const result = markCompanyDocumentExpired(companyId, details.requirement.id, expire); setExpire(null); if (result.ok) success('expired'); else setError(t(`errors.${result.reason}`));}}/>}</>;
}

function MetadataForm({companyId, requirementId, record, locale, onCancel, onSaved}: {companyId: string; requirementId: string; record: CompanyDocumentRecord; locale: 'ro' | 'en'; onCancel: () => void; onSaved: () => void}) {
  const t = useTranslations('CompanyDocumentManagement'), common = useTranslations('DocumentManagement');
  const [values, setValues] = useState({name: record.documentName[locale], issuer: record.issuer ?? '', expiresAt: isoToReviewDate(record.expiresAt)}), [error, setError] = useState('');
  function submit(event: FormEvent) {event.preventDefault(); const result = updateCompanyDocumentMetadata(companyId, requirementId, record.id, {...values, language: locale}); if (!result.ok) setError(t(`errors.${result.reason}`)); else onSaved();}
  return <form noValidate className={styles.form} onSubmit={submit}><p className={styles.info}>{t('metadataNotice')}</p>
    {(['name', 'issuer', 'expiresAt'] as const).map((key) => <Field key={key} id={`company-metadata-${key}`} required={key === 'name'} label={t(key)} value={values[key]} placeholder={key === 'expiresAt' ? 'DD.MM.YYYY' : undefined} onChange={(event) => setValues({...values, [key]: event.target.value})}/>)}
    {error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.formActions}><Button variant="secondary" onClick={onCancel}>{common('cancel')}</Button><Button type="submit" disabled={values.name === record.documentName[locale] && values.issuer === (record.issuer ?? '') && values.expiresAt === isoToReviewDate(record.expiresAt)}>{t('save')}</Button></div>
  </form>;
}
