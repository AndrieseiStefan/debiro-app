'use client';

import {useCallback, useLayoutEffect, useRef, useState, type FormEvent, type RefObject} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {useCompanyState} from '@/features/companies/company-state';
import {notificationsFixture} from '@/features/notifications/fixtures';
import {getVendorRequirements, markDocumentExpired, replaceInternalDocument, useVendorRequirements} from '@/features/vendors/vendor-requirements';
import {canManuallyExpire} from './compliance';
import {VendorDocumentActions} from '@/features/vendors/VendorDocumentActions';
import {documentAccess} from './document-access';
import {documentFile, reviewDateToIso, useDocumentRecords, type CreatedDocument} from './created-documents';
import {accessibleDocument, documentHistory, documentManagementHref, downloadDocument, type DocumentSelection} from './document-management';
import {uploadFileError} from './upload-file';
import styles from './DocumentManagementDrawer.module.css';

export function DocumentManagementDrawer({documentId, documentAction, contextPath, vendorId}: DocumentSelection & {contextPath: string; vendorId?: string}) {
  const triggerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!documentId) triggerRef.current = null;
    else if (!triggerRef.current) triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [documentId]);
  if (!documentId) return null;
  return <DocumentDrawer documentId={documentId} action={documentAction} contextPath={contextPath} vendorId={vendorId} triggerRef={triggerRef}/>;
}

function ComplianceBadge({document}: {document: CreatedDocument}) {
  const t = useTranslations('Documents');
  return <StatusBadge indicator="none" tone={document.status === 'valid' ? 'success' : document.status === 'expiring' ? 'warning' : 'danger'}><AppIcon name={document.status === 'valid' ? 'check' : document.status === 'expiring' ? 'clock' : 'info'} size={13}/>{t(`status.${document.status}`)}</StatusBadge>;
}

type DrawerScreen = {type: 'details' | 'history' | 'replace' | 'success'; documentId: string};
function initialScreens(documentId: string, action?: string): DrawerScreen[] {
  const details: DrawerScreen = {type: 'details', documentId};
  if (action === 'history') return [details, {type: 'history', documentId}];
  return [{type: action === 'replace' || action === 'success' ? action : 'details', documentId}];
}

function DocumentDrawer({documentId, action, contextPath, vendorId, triggerRef}: {documentId: string; action?: string; contextPath: string; vendorId?: string; triggerRef: RefObject<HTMLElement | null>}) {
  const t = useTranslations('DocumentManagement');
  const language = useLocale() === 'en' ? 'en' : 'ro';
  const router = useRouter();
  const [navigation, setNavigation] = useState(() => ({entryId: documentId, entryAction: action, screens: initialScreens(documentId, action)}));
  const sameEntry = navigation.entryId === documentId && navigation.entryAction === action;
  const screens = sameEntry ? navigation.screens : initialScreens(documentId, action);
  if (!sameEntry) setNavigation({entryId: documentId, entryAction: action, screens});
  const screen = screens[screens.length - 1]!;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const initialScreen = useRef(true);
  useLayoutEffect(() => {
    // Keep the shared Drawer’s initial focus/trigger capture; focus only internal screen transitions here.
    if (initialScreen.current) {initialScreen.current = false; return;}
    headingRef.current?.focus({preventScroll: true});
    const panel = headingRef.current?.closest<HTMLElement>('[role="dialog"]');
    if (panel) panel.scrollTop = 0;
  }, [screen.type, screen.documentId]);
  const companyId = useCompanyState().activeCompanyId ?? '';
  const records = useDocumentRecords();
  const record = accessibleDocument(records, companyId, screen.documentId, vendorId);
  const history = documentHistory(records, companyId, screen.documentId, vendorId);
  const requirement = getVendorRequirements(useVendorRequirements(), companyId, record?.vendorId ?? '').requirements.find((item) => item.id === record?.vendorRequirementId);
  const current = record && !record.supersededById && record.reviewOutcome !== 'rejected';
  const replaceAllowed = current && documentAccess(companyId).replace;
  const mode = screen.type;
  const details = mode === 'details';
  const available = Boolean(record && (mode !== 'replace' || replaceAllowed));
  const [phase, setPhase] = useState<'open' | 'closing'>('open');
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [expiryTarget, setExpiryTarget] = useState<{companyId: string; documentId: string} | null>(null);
  const [expiryFailed, setExpiryFailed] = useState(false);
  const cancelExpiry = useCallback(() => setExpiryTarget(null), [setExpiryTarget]);
  const close = useCallback(() => setPhase('closing'), []);
  const exited = useCallback(() => router.replace(contextPath, {scroll: false}), [router, contextPath]);
  function navigate(document: CreatedDocument, type: DrawerScreen['type']) {
    setDownloadFailed(false);
    setNavigation((previous) => ({...previous, screens: [...previous.screens, {type, documentId: document.id}]}));
  }
  function back() {setDownloadFailed(false); setNavigation((previous) => ({...previous, screens: previous.screens.slice(0, -1)}));}
  function date(value?: string | null) {
    return value ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : '—';
  }
  function uploadedDate(item: CreatedDocument) {
    const event = item.origin === 'fixture' ? notificationsFixture.auditEvents.find((event) => event.eventType === 'document_upload' && event.documentId === item.id) : undefined;
    // Date-only fixture provenance must not acquire an invented upload time.
    if (item.origin === 'fixture' && (!event || event.dateOnly)) return date(item.uploadedAt);
    const time = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro-RO', {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'}).format(new Date(item.createdAt));
    return `${date(item.createdAt)}, ${time}`;
  }
  function startDownload(item: CreatedDocument) {setDownloadFailed(!downloadDocument(companyId, item.id, vendorId ?? item.vendorId));}
  function download(item: CreatedDocument) {return <button className={styles.smallAction} type="button" disabled={!documentFile(companyId, item.id)} onClick={() => startDownload(item)}><AppIcon name="download" size={15}/>{t('download')}</button>;}
  function historyTimeline() {
    return <ol className={styles.timeline}>{history.map((item) => {
      const isCurrent = !item.supersededById && item.reviewOutcome !== 'rejected';
      const hasFile = Boolean(documentFile(companyId, item.id));
      const internal = item.updateSource === 'internal';
      const outcome = item.reviewOutcome;
      const manuallyExpired = Boolean(item.manuallyExpiredAt);
      return <li key={item.id} data-version={item.version ?? 1} data-version-state={outcome === 'rejected' ? 'rejected' : isCurrent ? 'current' : 'superseded'}>
        <div className={styles.versionProvenance}><strong>v{item.version ?? 1}</strong><time dateTime={item.createdAt}>{uploadedDate(item)}</time><span>{item.uploadedBy || '—'}</span></div>
        <div className={styles.versionSummary}><div className={styles.versionActions}>
          <StatusBadge indicator="none" tone={manuallyExpired ? 'danger' : internal || outcome === 'pending' ? 'info' : outcome === 'approved' ? 'success' : 'danger'} className={styles.historyOutcome}><AppIcon name={manuallyExpired ? 'clock' : internal ? 'clipboard' : outcome === 'approved' ? 'check' : outcome === 'rejected' ? 'close' : 'info'} size={13}/>{t(manuallyExpired ? 'manualExpiryOutcome' : internal ? 'internalOutcome' : outcome === 'pending' ? 'historyPending' : `outcome.${outcome}`)}</StatusBadge>
          {!isCurrent && hasFile && download(item)}
        </div>
          {isCurrent && <VendorDocumentActions withinDialog name={`v${item.version ?? 1}`} actionLabel={t('versionActions', {version: item.version ?? 1})} className={styles.versionMenu} actions={[
            {label: t('openDetails'), onClick: () => navigate(item, 'details')},
            ...(hasFile ? [{label: t('download'), onClick: () => startDownload(item)}] : [])
          ]}/>}
        {isCurrent ? <span className={styles.currentVersion}>{t('current')}</span> : !manuallyExpired && outcome === 'approved' && item.expiresAt ? <small className={styles.versionContext}>{t('validUntil', {date: date(item.expiresAt)})}</small> : null}</div>
      </li>;
    })}</ol>;
  }
  function fileCard(item: CreatedDocument) {
    const type = ({'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG'} as Record<string, string>)[item.fileType] ?? (item.fileType || '—');
    return <div className={styles.fileCard}><AppIcon name={type === 'PDF' ? 'filePdf' : 'file'} size={32}/><span><strong>{item.filename}</strong><small>{type}{item.fileSize > 0 ? ` · ${Math.ceil(item.fileSize / 1024)} KB` : ''}</small></span>{details ? <Button variant="secondary" className={styles.fileDownload} disabled={!documentFile(companyId, item.id)} onClick={() => startDownload(item)}><AppIcon name="download" size={16}/>{t('download')}</Button> : download(item)}</div>;
  }
  return <><Drawer phase={phase} onClose={close} onExited={exited} triggerRef={triggerRef} titleId="document-management-title" descriptionId="document-management-description" closeLabel={t('close')} size={details ? 'wide' : 'standard'} contentClassName={styles.content}>
    <DrawerHeader titleRef={headingRef} titleId="document-management-title" title={t(!available ? 'unavailableTitle' : mode === 'replace' ? 'replaceTitle' : mode === 'history' ? 'historyTitle' : mode === 'success' ? 'successTitle' : 'detailsTitle')} onBack={screens.length > 1 ? back : undefined} backLabel={t(screens[screens.length - 2]?.type === 'history' ? 'backToHistory' : 'backToDetails')}/>
    <p id="document-management-description" className={available && (details || mode === 'history') ? styles.srOnly : styles.intro}>{t(!available ? 'unavailableDescription' : mode === 'replace' ? 'replaceDescription' : mode === 'history' ? 'historyDescription' : mode === 'success' ? 'successDescription' : 'detailsDescription')}</p>
    {!available || !record ? <Button variant="secondary" onClick={close}>{t('close')}</Button> : mode === 'replace' ? <ReplacementForm key={record.id} document={record} companyId={companyId} onCancel={close} onSuccess={(replacement) => router.replace(documentManagementHref(replacement, contextPath, 'success'), {scroll: false})}/> : mode === 'success' ? <div className={styles.success} role="status"><span className={styles.successIcon}><AppIcon name="check" size={32}/></span>{fileCard(record)}<section className={styles.currentStatus}><strong>{t('currentStatus')}</strong><ComplianceBadge document={record}/></section><Button onClick={close}>{t('close')}</Button></div> : mode === 'history' ? historyTimeline() : <div className={styles.detailsGrid}>
      <section>{fileCard(record)}{!documentFile(companyId, record.id) && <p className={styles.fileNotice}>{t('downloadUnavailable')}</p>}<h3>{t('information')}</h3><dl className={styles.metadata}>
        {([
          [t('name'), record.documentName[language]],
          [t('requirement'), requirement ? t(requirement.required ? 'required' : 'optional') : '—'],
          [t('complianceStatus'), <ComplianceBadge key="status" document={record}/>],
          [t('expiryDate'), record.expiresAt ? <span className={styles.expiryDate} key="expiry">{date(record.expiresAt)}<AppIcon name="calendar" size={16}/></span> : '—'],
          [t('uploadedAt'), uploadedDate(record)],
          [t('uploadedBy'), record.uploadedBy || '—']
        ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl></section>
      <aside className={styles.actions}><section className={styles.actionCard} aria-label={t('actions')}><h3>{t('actions')}</h3><Button disabled={!replaceAllowed} onClick={() => navigate(record, 'replace')}><AppIcon name="clipboard" size={16}/>{t('replaceTitle')}</Button>{canManuallyExpire(record) && <Button variant="secondary" disabled={!replaceAllowed} onClick={() => {setExpiryFailed(false); setExpiryTarget({companyId, documentId: record.id});}}><AppIcon name="info" size={16}/>{t('markExpired')}</Button>}{record.complianceStatus === 'needs_review' && current && <Link className={styles.smallAction} href={record.reviewRoute ?? `/documents/${record.id}/review`}>{t('reviewAction')}</Link>}</section><div className={styles.historyHeading}><h3>{t('versions', {count: history.length})}</h3><button type="button" className={styles.viewAll} onClick={() => navigate(record, 'history')}>{t('viewAll')}</button></div><ol className={styles.miniHistory}>{history.slice(0, 3).map((item) => <li key={item.id} data-preview-version={item.version ?? 1}><b>v{item.version ?? 1}</b><span><time dateTime={item.createdAt}>{uploadedDate(item)}</time><small>{item.uploadedBy || '—'}</small></span>{!item.supersededById && item.reviewOutcome !== 'rejected' && <StatusBadge indicator="none" tone="info">{t('currentShort')}</StatusBadge>}</li>)}</ol></aside>
    </div>}
    {available && downloadFailed && <p role="alert" className={styles.error}>{t('downloadUnavailable')}</p>}
    {available && expiryFailed && <p role="alert" className={styles.error}>{t('unavailableDescription')}</p>}
  </Drawer>{expiryTarget && expiryTarget.companyId === companyId && expiryTarget.documentId === record?.id && canManuallyExpire(record) && <ConfirmationDialog icon="warning" backgroundSelector='[aria-labelledby="document-management-title"]' title={t('expireTitle')} description={t('expireDescription')} cancelLabel={t('cancel')} confirmLabel={t('markExpired')} onCancel={cancelExpiry} onConfirm={() => {setExpiryFailed(!markDocumentExpired(expiryTarget.companyId, expiryTarget.documentId)); setExpiryTarget(null);}}/>}</>;
}

function ReplacementForm({document, companyId, onCancel, onSuccess}: {document: CreatedDocument; companyId: string; onCancel: () => void; onSuccess: (document: CreatedDocument) => void}) {
  const t = useTranslations('DocumentManagement');
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState({documentNumber: document.documentNumber ?? '', issuedAt: '', expiresAt: '', issuer: document.issuer ?? '', notes: ''});
  const [errors, setErrors] = useState<Record<string, string>>({});
  function selectFile(selected?: File) {
    if (!selected) return;
    const error = uploadFileError(selected);
    setErrors((previous) => ({...previous, file: error ? t(error === 'size' ? 'fileSizeError' : 'fileTypeError') : ''}));
    setFile(error ? null : selected);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!file) next.file = t('fileRequired');
    for (const field of ['issuedAt', 'expiresAt'] as const) if (values[field].trim() && !reviewDateToIso(values[field])) next[field] = t('dateError');
    const issued = reviewDateToIso(values.issuedAt); const expires = reviewDateToIso(values.expiresAt);
    if (issued && expires && expires < issued) next.expiresAt = t('expiryError');
    setErrors(next);
    if (Object.keys(next).length || !file) return;
    const result = replaceInternalDocument(companyId, document.id, {...values, file});
    if (!result.ok) {setErrors({form: t('unavailableDescription')}); return;}
    onSuccess(result.document);
  }
  return <form noValidate onSubmit={submit} className={styles.form}>
    <div className={styles.info}><AppIcon name="info" size={20}/><span><strong>{t('replaceNotice')}</strong><span>{t('internalNotice')}</span></span></div>
    <div className={styles.dropzone} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {event.preventDefault(); selectFile(event.dataTransfer.files[0]);}}><AppIcon name="upload" size={30}/><strong>{file?.name ?? t('dropFile')}</strong><Button variant="secondary" onClick={() => fileInput.current?.click()}>{t('chooseFile')}</Button><small>{t('fileHelp')}</small><input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label={t('chooseFile')} className={styles.srOnly} onChange={(event) => {selectFile(event.target.files?.[0]); event.target.value = '';}}/>{errors.file && <p role="alert" className={styles.error}>{errors.file}</p>}</div>
    <div className={styles.formGrid}>{(['documentNumber', 'issuedAt', 'expiresAt', 'issuer'] as const).map((field) => <Field key={field} id={`replace-${field}`} label={t(field)} controlSize="compact" value={values[field]} onChange={(event) => setValues({...values, [field]: event.target.value})} placeholder={field === 'issuedAt' || field === 'expiresAt' ? 'DD.MM.YYYY' : undefined} error={errors[field]}/>)}</div>
    <label className={styles.notes}>{t('optionalNotes')}<textarea value={values.notes} onChange={(event) => setValues({...values, notes: event.target.value})} rows={3}/></label>{errors.form && <p role="alert" className={styles.error}>{errors.form}</p>}<div className={styles.formActions}><Button variant="secondary" onClick={onCancel}>{t('cancel')}</Button><Button type="submit">{t('upload')}</Button></div>
  </form>;
}
