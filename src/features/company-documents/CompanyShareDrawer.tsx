'use client';

import {useCallback, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {Switch} from '@/components/ui/Switch';
import {StatusBadge, type StatusTone} from '@/components/ui/StatusBadge';
import {Tooltip} from '@/components/ui/Tooltip';
import {documentAccess} from '@/features/documents/document-access';
import {useCompanyState} from '@/features/companies/company-state';
import {localizedDate} from '@/lib/fixture-clock';
import fieldStyles from '@/components/ui/Field.module.css';
import {availableCompanyFile, companyDocumentList, useCompanyDocumentsState} from './company-documents-state';
import {eligibleCompanyDocumentIds} from './projections';
import {inspectShareSelection, prepareSharePreview, shareSelection, sharingDate, type ShareDocumentSelection, type ShareErrors, type ShareForm, type SharePreview} from './sharing';
import type {CompanyDocumentStatus} from './types';
import controls from '@/features/vendors/InviteVendorDrawer.module.css';
import segments from '@/features/requirements/AddRequirementDocumentDrawer.module.css';
import listing from './CompanyDocumentsPage.module.css';
import styles from './CompanyShareDrawer.module.css';

const tones: Record<CompanyDocumentStatus, StatusTone> = {missing: 'danger', needs_review: 'warning', valid: 'success', expiring_soon: 'warning', expired: 'danger'};

export function CompanyShareDrawer({companyId, locale, initialSelection, onClose}: {companyId: string; locale: 'ro' | 'en'; initialSelection: ShareDocumentSelection[]; onClose: () => void}) {
  const t = useTranslations('CompanyDocumentSharing'), documentsT = useTranslations('CompanyDocuments'), common = useTranslations('DocumentManagement');
  const companyState = useCompanyState(), snapshot = useCompanyDocumentsState();
  const {rows} = companyDocumentList(snapshot, companyId, locale);
  const eligible = new Set(eligibleCompanyDocumentIds(rows));
  const triggerRef = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const formRef = useRef<HTMLFormElement>(null), previewRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<'open' | 'closing'>('open');
  const [selection, setSelection] = useState(initialSelection);
  const [form, setForm] = useState<ShareForm>(() => ({name: '', deliveryMethod: 'link', recipientName: '', recipientEmail: '', expiresOn: sharingDate(7), allowDownload: true, passwordProtected: false, password: '', message: ''}));
  const [errors, setErrors] = useState<ShareErrors>({}), [preview, setPreview] = useState<SharePreview | null>(null);
  const close = useCallback(() => {setForm((value) => ({...value, password: '', recipientName: '', recipientEmail: ''})); setPreview(null); setSelection([]); setPhase('closing');}, []);
  const inspected = inspectShareSelection(companyId, selection, locale), invalid = inspected.filter((item) => item.problem);
  function update<K extends keyof ShareForm>(key: K, value: ShareForm[K]) {setForm((current) => ({...current, [key]: value, ...(key === 'passwordProtected' && !value ? {password: ''} : {})})); setErrors({}); setPreview(null);}
  function toggle(id: string) {setSelection((current) => current.some((item) => item.documentId === id) ? current.filter((item) => item.documentId !== id) : [...current, ...shareSelection(rows, [id])]); setErrors({}); setPreview(null);}
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = prepareSharePreview(companyId, selection, form, locale);
    if (!result.ok) {setErrors(result.errors); setPreview(null); requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus());}
    else {setErrors({}); setPreview(result.preview); requestAnimationFrame(() => previewRef.current?.focus());}
  }
  // The keyed page unmounts on switch. Also fail closed if access changes independently of routing.
  if (companyState.activeCompanyId !== companyId || !documentAccess(companyId).visible) return null;
  const usablePreview = preview && !invalid.length;

  return <Drawer phase={phase} onClose={close} onExited={onClose} triggerRef={triggerRef} titleId="company-share-title" descriptionId="company-share-description" closeLabel={common('close')} contentClassName={styles.content}>
    <DrawerHeader titleId="company-share-title" title={documentsT('shareDocuments')}/>
    <p id="company-share-description" className={controls.intro}>{t('description')}</p>
    <form ref={formRef} onSubmit={submit} noValidate className={styles.form}>
      <div className={segments.sourceChoices} role="group" aria-label={t('deliveryMethod')}>
        {(['link', 'email'] as const).map((mode) => <button type="button" key={mode} className={segments.source} aria-pressed={form.deliveryMethod === mode} onClick={() => update('deliveryMethod', mode)}><AppIcon name={mode === 'link' ? 'share' : 'mail'} size={19}/>{t(mode)}</button>)}
      </div>
      <Field controlSize="compact" id="company-share-name" label={t('name')} required value={form.name} onChange={(event) => update('name', event.target.value)} error={errors.name && t(`errors.${errors.name}`)}/>
      <Field controlSize="compact" id="company-share-recipient" label={t('recipientName')} placeholder={t('recipientPlaceholder')} value={form.recipientName} onChange={(event) => update('recipientName', event.target.value)}/>
      {form.deliveryMethod === 'email' && <Field controlSize="compact" id="company-share-email" label={t('recipientEmail')} type="email" autoComplete="email" required value={form.recipientEmail} onChange={(event) => update('recipientEmail', event.target.value)} error={errors.recipientEmail && t(`errors.${errors.recipientEmail}`)}/>}
      <Field controlSize="compact" id="company-share-expires" label={t('expiresOn')} required placeholder={t('datePlaceholder')} value={form.expiresOn} onChange={(event) => update('expiresOn', event.target.value)} helperText={t('expiryPolicy')} error={errors.expiresOn && t(`errors.${errors.expiresOn}`)}/>
      <section className={styles.documents} aria-labelledby="company-share-documents">
        <div className={styles.selectionHeading}><strong id="company-share-documents">{t('selectedDocuments', {count: selection.length})}</strong></div>
        {eligible.size === 0 && <p className={styles.notice}>{t('noEligible')}</p>}
        <div className={styles.documentList}>
          {rows.toSorted((a, b) => Number(selection.some((item) => item.documentId === b.id)) - Number(selection.some((item) => item.documentId === a.id))).map((row) => {
            const selected = selection.some((item) => item.documentId === row.id), bytes = row.currentDocumentId && availableCompanyFile(companyId, row.currentDocumentId);
            const record = snapshot.byCompany[companyId]?.documents.find((item) => item.id === row.currentDocumentId);
            const fileType = bytes && (bytes.type || record?.fileType);
            return <label className={styles.document} key={row.id} data-share-document={row.id}>
              <input type="checkbox" checked={selected} disabled={!selected && !eligible.has(row.id)} onChange={() => toggle(row.id)} aria-label={documentsT('selectDocument', {name: row.name})}/>
              <span className={listing.fileIcon} data-status={row.status}><AppIcon name="file" size={21}/></span>
              <span className={styles.documentCopy}><strong>{row.name}</strong><small>{documentsT(`types.${row.documentType}`)}{row.issuer && ` · ${row.issuer}`}{fileType && ` · ${fileType}`}</small>
                {!eligible.has(row.id) && <small>{t(row.currentDocumentId ? 'fileUnavailable' : 'notUploaded')}</small>}
              </span>
              <StatusBadge size="compact" tone={tones[row.status]}>{documentsT(`status.${row.status}`)}</StatusBadge>
            </label>;
          })}
        </div>
        {invalid.map((item) => <div className={styles.invalid} key={item.documentId} role="alert"><span>{item.name ?? t('removedDocument')}: {t(`errors.${item.problem!}`)}</span><Button variant="secondary" size="table" onClick={() => toggle(item.documentId)}>{t('remove')}</Button></div>)}
        {errors.documents && <p className={controls.error} role="alert" tabIndex={-1}>{t(`errors.${errors.documents}`)}</p>}
      </section>
      <div className={controls.options}>
        <label className={controls.option}><span className={controls.optionIcon}><AppIcon name="download" size={21}/></span><span className={controls.optionCopy}><strong>{t('allowDownload')}</strong><small>{t('downloadHelp')}</small></span><Switch checked={form.allowDownload} onChange={(event) => update('allowDownload', event.target.checked)} aria-label={t('allowDownload')}/></label>
        <label className={controls.option}><span className={controls.optionIcon}><AppIcon name="shield" size={21}/></span><span className={controls.optionCopy}><strong>{t('passwordProtected')}</strong><small>{t('passwordHelp')}</small></span><Switch checked={form.passwordProtected} onChange={(event) => update('passwordProtected', event.target.checked)} aria-label={t('passwordProtected')}/></label>
      </div>
      {form.passwordProtected && <Field controlSize="compact" id="company-share-password" label={t('password')} type="password" autoComplete="new-password" required value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password && t(`errors.${errors.password}`)}/>}
      <div className={controls.messageField}><label htmlFor="company-share-message">{t('message')}</label><textarea className={fieldStyles.input} data-size="compact" data-invalid={errors.message ? 'true' : undefined} id="company-share-message" value={form.message} maxLength={500} onChange={(event) => update('message', event.target.value)} aria-invalid={Boolean(errors.message)} aria-describedby={`company-share-counter${errors.message ? ' company-share-message-error' : ''}`}/><span id="company-share-counter" className={controls.counter}>{form.message.length}/500</span>{errors.message && <p id="company-share-message-error" role="alert" className={controls.error}>{t(`errors.${errors.message}`)}</p>}</div>
      <Button type="submit" variant="secondary"><AppIcon name="eye" size={19}/>{t('preparePreview')}</Button>
      {errors.preview && <p role="alert" tabIndex={-1} className={controls.error}>{t(`errors.${errors.preview}`)}</p>}
      {usablePreview && <section ref={previewRef} tabIndex={-1} className={styles.preview} aria-labelledby="company-share-preview-title">
        <h3 id="company-share-preview-title">{t('previewTitle')}</h3><p>{t('previewNotice')}</p>
        <dl><div><dt>{t('name')}</dt><dd>{preview.name}</dd></div><div><dt>{t('deliveryMethod')}</dt><dd>{t(preview.deliveryMethod)}</dd></div>
          {preview.recipientName && <div><dt>{t('recipientName')}</dt><dd>{preview.recipientName}</dd></div>}{preview.recipientEmail && <div><dt>{t('recipientEmail')}</dt><dd>{preview.recipientEmail}</dd></div>}
          <div><dt>{t('expiresOn')}</dt><dd>{localizedDate(preview.expiresAt)[locale]}</dd></div><div><dt>{t('allowDownload')}</dt><dd>{t(preview.allowDownload ? 'yes' : 'no')}</dd></div><div><dt>{t('passwordProtected')}</dt><dd>{t(preview.passwordProtected ? 'yes' : 'no')}</dd></div>
        </dl><strong>{t('selectedDocuments', {count: preview.documents.length})}</strong><ul>{preview.documents.map((item) => <li key={item.documentId}>{item.name}</li>)}</ul>{preview.message && <p className={styles.message}>{preview.message}</p>}
      </section>}
      <p id="company-share-unavailable" className={controls.demoNote}>{t('backendUnavailable')}</p>
      <div className={styles.actions}><Button variant="secondary" onClick={close}>{common('cancel')}</Button><Tooltip content={t('backendUnavailable')}>{(props) => <Button {...props} aria-disabled="true" onKeyDown={(event) => {if (event.key === 'Enter' || event.key === ' ') event.preventDefault();}}><AppIcon name={form.deliveryMethod === 'link' ? 'share' : 'send'} size={19}/>{t(form.deliveryMethod === 'link' ? 'generateLink' : 'sendEmail')}</Button>}</Tooltip></div>
    </form>
  </Drawer>;
}
