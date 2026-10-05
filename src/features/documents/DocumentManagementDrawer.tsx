'use client';

import {useCallback, useLayoutEffect, useRef, useState, type FormEvent, type RefObject} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {Drawer} from '@/components/ui/Drawer';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {useCompanyState} from '@/features/companies/company-state';
import {getVendorRequirements, replaceInternalDocument, useVendorRequirements} from '@/features/vendors/vendor-requirements';
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
  return <StatusBadge tone={document.status === 'valid' ? 'success' : document.status === 'expiring' ? 'warning' : 'danger'}><AppIcon name={document.status === 'valid' ? 'check' : document.status === 'expiring' ? 'clock' : 'info'} size={13}/>{t(`status.${document.status}`)}</StatusBadge>;
}

function DocumentDrawer({documentId, action, contextPath, vendorId, triggerRef}: {documentId: string; action?: string; contextPath: string; vendorId?: string; triggerRef: RefObject<HTMLElement | null>}) {
  const t = useTranslations('DocumentManagement');
  const language = useLocale() === 'en' ? 'en' : 'ro';
  const router = useRouter();
  const companyId = useCompanyState().activeCompanyId ?? '';
  const records = useDocumentRecords();
  const record = accessibleDocument(records, companyId, documentId, vendorId);
  const history = documentHistory(records, companyId, documentId, vendorId);
  const requirement = getVendorRequirements(useVendorRequirements(), companyId, record?.vendorId ?? '').requirements.find((item) => item.id === record?.vendorRequirementId);
  const current = record && !record.supersededById && record.reviewOutcome !== 'rejected';
  const replaceAllowed = current && documentAccess(companyId).replace;
  const mode = action === 'history' ? 'history' : action === 'replace' ? 'replace' : action === 'success' ? 'success' : 'details';
  const available = Boolean(record && (mode !== 'replace' || replaceAllowed));
  const [phase, setPhase] = useState<'open' | 'closing'>('open');
  const close = useCallback(() => setPhase('closing'), []);
  const exited = useCallback(() => router.replace(contextPath, {scroll: false}), [router, contextPath]);
  const navigate = (document: CreatedDocument, next?: string) => router.replace(documentManagementHref(document, contextPath, next), {scroll: false});
  function date(value?: string | null) {
    return value ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : '—';
  }
  function download(item: CreatedDocument) {return <button className={styles.smallAction} type="button" disabled={!documentFile(companyId, item.id)} onClick={() => downloadDocument(companyId, item.id)}><AppIcon name="download" size={15}/>{t('download')}</button>;}
  function versionState(item: CreatedDocument) {return t(item.reviewOutcome === 'rejected' ? 'rejected' : item.supersededById ? 'superseded' : 'current');}
  function reviewLabel(item: CreatedDocument) {return item.updateSource === 'internal' ? t('internalOutcome') : t(`outcome.${item.reviewOutcome}`);}
  function fileCard(item: CreatedDocument) {return <div className={styles.fileCard}><AppIcon name="file" size={32}/><span><strong>{item.filename}</strong><small>{item.fileType || '—'}{item.fileSize > 0 ? ` · ${Math.ceil(item.fileSize / 1024)} KB` : ''}</small></span>{download(item)}</div>;}
  return <Drawer phase={phase} onClose={close} onExited={exited} triggerRef={triggerRef} titleId="document-management-title" descriptionId="document-management-description" closeLabel={t('close')} contentClassName={styles.content}>
    <header className={styles.header}><h2 id="document-management-title">{t(!available ? 'unavailableTitle' : mode === 'replace' ? 'replaceTitle' : mode === 'history' ? 'historyTitle' : mode === 'success' ? 'successTitle' : 'detailsTitle')}</h2><p id="document-management-description" className={available && (mode === 'details' || mode === 'history') ? styles.srOnly : undefined}>{t(!available ? 'unavailableDescription' : mode === 'replace' ? 'replaceDescription' : mode === 'history' ? 'historyDescription' : mode === 'success' ? 'successDescription' : 'detailsDescription')}</p></header>
    {!available || !record ? <Button variant="secondary" onClick={close}>{t('close')}</Button> : mode === 'replace' ? <ReplacementForm key={record.id} document={record} companyId={companyId} onCancel={close} onSuccess={(replacement) => navigate(replacement, 'success')}/> : mode === 'success' ? <div className={styles.success} role="status"><span className={styles.successIcon}><AppIcon name="check" size={32}/></span>{fileCard(record)}<section className={styles.currentStatus}><strong>{t('currentStatus')}</strong><ComplianceBadge document={record}/></section><Button onClick={close}>{t('close')}</Button></div> : mode === 'history' ? <ol className={styles.timeline}>{history.map((item) => <li key={item.id} data-version={item.version ?? 1} data-version-state={item.reviewOutcome === 'rejected' ? 'rejected' : item.supersededById ? 'superseded' : 'current'}><div className={styles.versionHeading}><strong>v{item.version ?? 1}</strong><StatusBadge tone={item.reviewOutcome === 'rejected' ? 'danger' : item.supersededById ? 'neutral' : 'success'}>{versionState(item)}</StatusBadge></div><time dateTime={item.createdAt}>{date(item.createdAt)}</time><span>{item.uploadedBy || '—'}</span><strong className={styles.filename}>{item.filename}</strong><div className={styles.versionHeading}><ComplianceBadge document={item}/><span>{reviewLabel(item)}</span></div>{item.expiresAt && <small>{t('expiresAt')}: {date(item.expiresAt)}</small>}{item.reviewedBy && <small>{t('reviewedBy')}: {item.reviewedBy} · {date(item.reviewedAt)}</small>}{item.notes && <p>{item.notes}</p>}<div className={styles.versionHeading}><button className={styles.smallAction} type="button" onClick={() => navigate(item)}>{t('openDetails')}</button>{download(item)}</div>{!documentFile(companyId, item.id) && <small>{t('downloadUnavailable')}</small>}</li>)}</ol> : <div className={styles.detailsGrid}>
      <section>{fileCard(record)}{!documentFile(companyId, record.id) && <p className={styles.fileNotice}>{t('downloadUnavailable')}</p>}<h3>{t('information')}</h3><dl className={styles.metadata}>
        {([
          [t('name'), record.documentName[language]],
          [t('vendor'), <Link key="vendor" href={`/vendors/${record.vendorId}`}>{record.vendorName}</Link>],
          [t('source'), requirement?.sourceTemplateIds.length ? requirement.sourceTemplateIds.map((id) => requirement.sourceTemplateNames[id]?.[language] ?? id).join(', ') : !requirement && record.vendorRequirementId ? '—' : t('manual')],
          [t('requirement'), requirement ? t(requirement.required ? 'required' : 'optional') : '—'],
          [t('currentStatus'), <ComplianceBadge key="status" document={record}/>],
          [t('version'), `v${record.version ?? 1} · ${versionState(record)}`],
          [t('documentNumber'), record.documentNumber || '—'],
          [t('issuedAt'), date(record.issuedAt)],
          [t('expiresAt'), date(record.expiresAt)],
          [t('issuer'), record.issuer || '—'],
          [t('uploadedAt'), date(record.createdAt)],
          [t('uploadedBy'), record.uploadedBy || '—'],
          [t('reviewOutcome'), reviewLabel(record)],
          ...(record.reviewedBy ? [[t('reviewedBy'), `${record.reviewedBy} · ${date(record.reviewedAt)}`]] : []),
          [t('notes'), record.notes || '—']
        ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl></section>
      <aside className={styles.actions}><h3>{t('actions')}</h3>{replaceAllowed && <Button onClick={() => navigate(record, 'replace')}><AppIcon name="upload" size={16}/>{t('replaceAction')}</Button>}{record.complianceStatus === 'needs_review' && current && <Link className={styles.smallAction} href={record.reviewRoute ?? `/documents/${record.id}/review`}>{t('reviewAction')}</Link>}<div className={styles.historyHeading}><h3>{t('versions', {count: history.length})}</h3><button type="button" className={styles.smallAction} onClick={() => navigate(record, 'history')}>{t('viewAll')}</button></div><ol className={styles.miniHistory}>{history.slice(0, 3).map((item) => <li key={item.id}><button type="button" onClick={() => navigate(item)}><b>v{item.version ?? 1}</b><span><time dateTime={item.createdAt}>{date(item.createdAt)}</time><small>{item.uploadedBy || '—'}</small><small>{versionState(item)}</small></span></button></li>)}</ol></aside>
    </div>}
  </Drawer>;
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
