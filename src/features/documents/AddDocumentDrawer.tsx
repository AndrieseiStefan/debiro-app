'use client';

import {useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {getSimulatedExtraction, type CreatedDocument} from './created-documents';
import type {DocumentType} from './types';
import styles from './AddDocumentDrawer.module.css';

const maxBytes = 10 * 1024 * 1024;
const fileTypes: Record<string, string> = {pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png'};
const documentTypes: DocumentType[] = ['tax', 'registration', 'fire', 'insurance', 'inspector', 'financial', 'environment', 'safety'];
const documentNames: Record<DocumentType, {ro: string; en: string}> = {
  tax: {ro: 'Certificat fiscal', en: 'Tax certificate'}, registration: {ro: 'Certificat de înregistrare', en: 'Registration certificate'},
  fire: {ro: 'Autorizație ISU', en: 'Fire safety authorization'}, insurance: {ro: 'Asigurare', en: 'Insurance'},
  inspector: {ro: 'Certificat constatator', en: 'Company status certificate'}, financial: {ro: 'Situații financiare', en: 'Financial statements'},
  environment: {ro: 'Autorizație mediu', en: 'Environmental authorization'}, safety: {ro: 'Certificat SSM', en: 'Workplace safety certificate'}
};
type Details = {number: string; issuedAt: string; expiresAt: string; issuer: string};
type Errors = Partial<Record<'file' | 'type' | 'issuedAt' | 'expiresAt', string>>;

function toIso(value: string) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day) ? `${year}-${month}-${day}` : null;
}

export function AddDocumentDrawer({phase, onClose, onExited, triggerRef, vendor, uploadedBy, onCreate}: {
  phase: DrawerPhase;
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  vendor: {id: string; name: string; registrationNumber: string; registrationCode: string};
  uploadedBy: string;
  onCreate: (document: Omit<CreatedDocument, 'id' | 'status' | 'reviewRoute' | 'extractionState'> & {reviewRequired: boolean}) => void;
}) {
  const t = useTranslations('AddDocument');
  const documentsT = useTranslations('Documents');
  const inputRef = useRef<HTMLInputElement>(null);
  const autoFilled = useRef<Partial<Details>>({});
  const [file, setFile] = useState<{name: string; type: string; size: number} | null>(null);
  const [fileError, setFileError] = useState('');
  const [type, setType] = useState<DocumentType | ''>('');
  const [details, setDetails] = useState<Details>({number: '', issuedAt: '', expiresAt: '', issuer: ''});
  const [extract, setExtract] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const sample = extract && file && type ? getSimulatedExtraction(vendor.id, file.name, type) : null;

  function clearAutoFill() {
    const previous = autoFilled.current;
    autoFilled.current = {};
    setDetails((current) => ({
      number: current.number === previous.number ? '' : current.number,
      issuedAt: current.issuedAt === previous.issuedAt ? '' : current.issuedAt,
      expiresAt: current.expiresAt === previous.expiresAt ? '' : current.expiresAt,
      issuer: current.issuer === previous.issuer ? '' : current.issuer
    }));
  }

  function prefillSample(filename: string, selectedType: DocumentType | '') {
    const sample = getSimulatedExtraction(vendor.id, filename, selectedType);
    if (!sample) return;
    setDetails((current) => {
      autoFilled.current = {
        number: current.number ? undefined : sample.documentNumber,
        issuedAt: current.issuedAt ? undefined : sample.issuedAt,
        expiresAt: current.expiresAt ? undefined : sample.expiresAt,
        issuer: current.issuer ? undefined : sample.issuer
      };
      return {number: current.number || sample.documentNumber, issuedAt: current.issuedAt || sample.issuedAt, expiresAt: current.expiresAt || sample.expiresAt, issuer: current.issuer || sample.issuer};
    });
  }

  function validateFile(selected: File) {
    clearAutoFill();
    const extension = selected.name.split('.').pop()?.toLowerCase() ?? '';
    const expectedMime = fileTypes[extension];
    const error = !expectedMime || (selected.type && selected.type !== expectedMime) ? t('fileTypeError') : selected.size > maxBytes ? t('fileSizeError') : '';
    setFileError(error);
    setErrors((current) => ({...current, file: error || undefined}));
    setFile(error ? null : {name: selected.name, type: selected.type || expectedMime, size: selected.size});
    if (!error && extract) prefillSample(selected.name, type);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0];
    if (selected) validateFile(selected);
    event.currentTarget.value = '';
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const selected = event.dataTransfer.files[0];
    if (selected) validateFile(selected);
  }

  function updateDetails(key: keyof Details, value: string) {
    autoFilled.current[key] = undefined;
    setDetails((current) => ({...current, [key]: value}));
    setErrors((current) => ({...current, [key]: undefined}));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!file) next.file = fileError || t('fileRequired');
    if (!type) next.type = t('typeRequired');
    const issuedAt = details.issuedAt.trim() ? toIso(details.issuedAt) : null;
    const expiresAt = details.expiresAt.trim() ? toIso(details.expiresAt) : null;
    if (details.issuedAt.trim() && !issuedAt) next.issuedAt = t('dateError');
    if (details.expiresAt.trim() && !expiresAt) next.expiresAt = t('dateError');
    if (issuedAt && expiresAt && expiresAt < issuedAt) next.expiresAt = t('chronologyError');
    return next;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length || !file || !type) return;
    const now = new Date().toISOString();
    onCreate({
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorRegistrationNumber: vendor.registrationNumber,
      vendorRegistrationCode: vendor.registrationCode,
      documentName: documentNames[type],
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentType: type,
      documentNumber: details.number.trim() || undefined,
      issuedAt: details.issuedAt.trim() ? toIso(details.issuedAt)! : undefined,
      expiresAt: details.expiresAt.trim() ? toIso(details.expiresAt)! : null,
      issuer: details.issuer.trim() || undefined,
      extractionRequested: extract,
      reviewRequired: Boolean(sample),
      createdAt: now,
      uploadedAt: now.slice(0, 10),
      uploadedBy
    });
  }

  const canSubmit = Boolean(file && type);
  return <Drawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} titleId="add-document-title" descriptionId="add-document-description" closeLabel={t('close')} panelClassName={styles.panel} contentClassName={styles.content}>
    <header className={styles.header}><span className={styles.headerIcon}><AppIcon name="file" size={28}/></span><h2 id="add-document-title">{t('title')}</h2></header>
    <p id="add-document-description" className={styles.intro}>{t('description')}</p>
    <form noValidate onSubmit={submit} className={styles.form}>
      <div className={styles.dropzone} data-add-document-dropzone data-dragging={dragging || undefined} onDragEnter={(event) => {event.preventDefault(); setDragging(true);}} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => {event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);}} onDrop={drop}>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className={styles.fileInput} aria-label={t('chooseFile')} aria-invalid={Boolean(errors.file)} aria-describedby={errors.file ? 'add-document-file-error' : undefined} onChange={chooseFile}/>
        <span className={styles.uploadIcon}><AppIcon name="upload" size={29}/></span>
        {file ? <strong className={styles.filename} title={file.name}>{file.name}</strong> : <strong>{t('dropPrompt')}</strong>}
        <Button type="button" onClick={() => inputRef.current?.click()}><AppIcon name="upload" size={18}/>{t('chooseFile')}</Button>
        <small>{file ? t('selectedSize', {size: file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}) : t('fileHint')}</small>
      </div>
      {errors.file && <p id="add-document-file-error" className={styles.error} role="alert">{errors.file}</p>}
      <div className={styles.extractionNotice}><div className={styles.noticeCopy}><AppIcon name="info" size={21}/><p>{t('extractionDescription')}</p></div><label className={styles.toggleRow}><input type="checkbox" checked={extract} onChange={(event) => {setExtract(event.target.checked); if (event.target.checked && file) prefillSample(file.name, type); else clearAutoFill();}}/><span className={styles.switch} aria-hidden="true"/>{t('extractionToggle')}</label>{extract && <p className={styles.extractionStatus} role="status">{sample ? t('sampleAvailable') : t('sampleUnavailable')}</p>}</div>
      <h3>{t('detailsTitle')}</h3>
      <div className={styles.selectField}><label htmlFor="add-document-type">{t('type')} <span>*</span></label><div className={styles.selectWrap}><AppIcon name="file" size={18}/><select id="add-document-type" value={type} data-empty={type === ''} required aria-invalid={Boolean(errors.type)} aria-describedby={errors.type ? 'add-document-type-error' : undefined} onBlur={() => {if (!type) setErrors((current) => ({...current, type: t('typeRequired')}));}} onChange={(event) => {const selectedType = event.target.value as DocumentType | ''; clearAutoFill(); setType(selectedType); setErrors((current) => ({...current, type: undefined})); if (extract && file) prefillSample(file.name, selectedType);}}><option value="">{t('typePlaceholder')}</option>{documentTypes.map((item) => <option key={item} value={item}>{documentsT(`documentType.${item}`)}</option>)}</select><AppIcon name="chevronDown" size={17}/></div>{errors.type && <p id="add-document-type-error" className={styles.error} role="alert">{errors.type}</p>}</div>
      <Field id="add-document-company" label={t('company')} value={vendor.name} readOnly helperText={t('companyHelper')} className={styles.field}/>
      <div className={styles.metadataGrid} data-add-document-metadata>
        <Field id="add-document-number" label={t('number')} placeholder={t('numberPlaceholder')} value={details.number} onChange={(event) => updateDetails('number', event.target.value)} helperText={t('optionalExtractionHelper')} className={styles.field}/>
        <Field id="add-document-issued" label={t('issuedAt')} placeholder={t('datePlaceholder')} value={details.issuedAt} onChange={(event) => updateDetails('issuedAt', event.target.value)} onBlur={() => setErrors((current) => ({...current, issuedAt: details.issuedAt.trim() && !toIso(details.issuedAt) ? t('dateError') : undefined}))} error={errors.issuedAt} className={styles.field}/>
        <Field id="add-document-expires" label={t('expiresAt')} placeholder={t('datePlaceholder')} value={details.expiresAt} onChange={(event) => updateDetails('expiresAt', event.target.value)} onBlur={() => setErrors((current) => ({...current, expiresAt: details.expiresAt.trim() && !toIso(details.expiresAt) ? t('dateError') : details.issuedAt.trim() && toIso(details.issuedAt) && toIso(details.expiresAt) && toIso(details.expiresAt)! < toIso(details.issuedAt)! ? t('chronologyError') : undefined}))} error={errors.expiresAt} className={styles.field}/>
        <Field id="add-document-issuer" label={t('issuer')} placeholder={t('issuerPlaceholder')} value={details.issuer} onChange={(event) => updateDetails('issuer', event.target.value)} helperText={t('optionalExtractionHelper')} className={styles.field}/>
      </div>
      <div className={styles.actions} data-add-document-actions><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={!canSubmit}><AppIcon name="upload" size={18}/>{t('submit')}</Button></div>
    </form>
  </Drawer>;
}
