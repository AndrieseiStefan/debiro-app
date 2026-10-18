'use client';

import {useRef, useState, type FormEvent, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {DocumentUploadDrawer} from '@/features/documents/AddDocumentDrawer';
import {DocumentFileDropzone} from '@/features/documents/DocumentFileDropzone';
import {uploadFileError} from '@/features/documents/upload-file';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {Button} from '@/components/ui/Button';
import {AppIcon} from '@/components/layout/AppIcon';
import type {DrawerPhase} from '@/components/ui/Drawer';
import type {DocumentType} from '@/features/documents/types';
import {companyDocumentAdapter, type DocumentManagementAdapter} from './document-adapter';
import {companyDocumentTypes} from './projections';
import styles from '@/features/documents/AddDocumentDrawer.module.css';
import uploadStyles from './CompanyUploadDrawer.module.css';

export type CompanyUploadContext =
  | {kind: 'standalone'}
  | {kind: 'requirement'; requirementId: string}
  | {kind: 'replacement'; requirementId: string; documentId: string};

export function CompanyUploadDrawer({companyId, locale, context, phase, triggerRef, onClose, onExited, onSuccess, adapter = companyDocumentAdapter}: {
  adapter?: DocumentManagementAdapter; companyId: string; locale: 'ro' | 'en'; context: CompanyUploadContext;
  phase: DrawerPhase; triggerRef: RefObject<HTMLElement | null>; onClose: () => void; onExited: () => void; onSuccess: (kind: 'added' | 'replaced') => void;
}) {
  const t = useTranslations('CompanyDocumentManagement'), common = useTranslations('AddDocument'), listing = useTranslations('CompanyDocuments');
  const owner = useTranslations(adapter.scope === 'employee' ? 'EmployeeDocuments' : 'CompanyDocumentManagement');
  const standalone = context.kind === 'standalone';
  const details = !standalone ? adapter.getCompanyDocumentDetails(companyId, context.requirementId) : null;
  const requirement = details?.requirement;
  const replacement = context.kind === 'replacement';
  const [name, setName] = useState(''), [type, setType] = useState('');
  const [issuer, setIssuer] = useState(requirement?.issuer ?? '');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null), [errors, setErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);
  function selectFile(selected: File) {
    const error = uploadFileError(selected) ?? (!selected.size ? 'empty' : null);
    setFile(error ? null : selected); setErrors((previous) => ({...previous, file: error ? t(`errors.${error}`) : ''}));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const next: Record<string, string> = {};
    if (!file) next.file = errors.file || t('errors.file');
    if (standalone && !name.trim()) next.name = t('errors.name');
    if (standalone && !type) next.type = common('typeRequired');
    if (!standalone && !requirement) next.form = t('errors.unavailable');
    setErrors(next);
    if (Object.keys(next).length || !file) return;
    submitting.current = true;
    const input = {requirementId: !standalone ? context.requirementId : undefined, name: requirement?.name[locale] ?? name, documentType: requirement?.documentType ?? type as DocumentType, issuer, expiresAt, file};
    const result = context.kind === 'replacement' ? adapter.replaceCompanyDocument(companyId, context.requirementId, context.documentId, input) : adapter.addCompanyDocument(companyId, input);
    if (!result.ok) {setErrors({[result.reason === 'date' ? 'expiresAt' : 'form']: t(`errors.${result.reason}`)}); submitting.current = false; return;}
    onSuccess(replacement ? 'replaced' : 'added');
  }
  return <DocumentUploadDrawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} headerClassName={uploadStyles.header} title={t(replacement ? 'replaceTitle' : 'addTitle')} description={owner(replacement ? 'replaceDescription' : 'addDescription')}>
    <p role="note" className={styles.intro}>{t('sessionNotice')}</p>
    <form noValidate onSubmit={submit} className={styles.form}>
      <DocumentFileDropzone file={file} error={errors.file} onSelect={selectFile}/>
      <Field controlSize="compact" id="company-upload-name" label={t('name')} required={standalone} value={standalone ? name : details?.current?.documentName[locale] ?? requirement?.name[locale] ?? ''} readOnly={!standalone} onChange={(event) => setName(event.target.value)} error={errors.name}/>
      {standalone ? <SelectField controlSize="compact" id="company-upload-type" label={t('documentType')} required value={type} placeholder={common('typePlaceholder')} onChange={(event) => setType(event.target.value)} error={errors.type}>{companyDocumentTypes.map((value) => <option key={value} value={value}>{listing(`types.${value}`)}</option>)}</SelectField>
        : <Field controlSize="compact" id="company-upload-type" label={t('documentType')} value={requirement ? listing(`types.${requirement.documentType}`) : ''} readOnly/>}
      <div className={styles.metadataGrid}><Field controlSize="compact" id="company-upload-issuer" label={t('issuer')} value={issuer} onChange={(event) => setIssuer(event.target.value)}/><Field controlSize="compact" id="company-upload-expires" label={t('expiresAt')} placeholder={common('datePlaceholder')} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} error={errors.expiresAt}/></div>
      {errors.form && <p role="alert" className={styles.error}>{errors.form}</p>}
      <div className={`${styles.actions} ${uploadStyles.actions}`}><Button variant="secondary" onClick={onClose}>{common('cancel')}</Button><Button type="submit"><AppIcon name="upload" size={18}/>{common('submit')}</Button></div>
    </form>
  </DocumentUploadDrawer>;
}
