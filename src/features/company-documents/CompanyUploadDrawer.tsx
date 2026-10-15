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
import {getRequirementsWorkspace, useRequirementsState} from '@/features/requirements/requirements-state';
import {templateAppliesToTarget} from '@/features/requirements/template-scope';
import type {DocumentType} from '@/features/documents/types';
import {addCompanyDocument, applyCompanyTemplate, getCompanyDocumentDetails, listCompanyRequirements, replaceCompanyDocument} from './management';
import {companyDocumentTypes} from './projections';
import styles from '@/features/documents/AddDocumentDrawer.module.css';

export function CompanyUploadDrawer({companyId, locale, requirementId: initialRequirement, replacementId, phase, triggerRef, onClose, onExited, onSuccess}: {
  companyId: string; locale: 'ro' | 'en'; requirementId?: string; replacementId?: string;
  phase: DrawerPhase; triggerRef: RefObject<HTMLElement | null>; onClose: () => void; onExited: () => void; onSuccess: (kind: 'added' | 'replaced') => void;
}) {
  const t = useTranslations('CompanyDocumentManagement'), common = useTranslations('AddDocument'), listing = useTranslations('CompanyDocuments');
  const templates = getRequirementsWorkspace(useRequirementsState(), companyId).templates.filter((item) => templateAppliesToTarget(item, 'company'));
  const [requirementId, setRequirementId] = useState(initialRequirement ?? '');
  const requirements = listCompanyRequirements(companyId);
  const requirement = requirements.find((item) => item.id === requirementId);
  const [name, setName] = useState(''), [type, setType] = useState('');
  const [issuer, setIssuer] = useState(requirement?.issuer ?? '');
  const [expiresAt, setExpiresAt] = useState(''), [required, setRequired] = useState(false);
  const [file, setFile] = useState<File | null>(null), [errors, setErrors] = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState(''), [templateMessage, setTemplateMessage] = useState('');
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
    if (!requirement && !name.trim()) next.name = t('errors.name');
    if (!requirement && !type) next.type = common('typeRequired');
    setErrors(next);
    if (Object.keys(next).length || !file) return;
    submitting.current = true;
    const input = {requirementId: requirementId || undefined, name: requirement?.name[locale] ?? name, documentType: requirement?.documentType ?? type as DocumentType, issuer, expiresAt, file, required};
    const result = replacementId && requirement ? replaceCompanyDocument(companyId, requirement.id, replacementId, input) : addCompanyDocument(companyId, input);
    if (!result.ok) {setErrors({[result.reason === 'date' ? 'expiresAt' : 'form']: t(`errors.${result.reason}`)}); submitting.current = false; return;}
    onSuccess(replacementId ? 'replaced' : 'added');
  }
  return <DocumentUploadDrawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} title={t(replacementId ? 'replaceTitle' : 'addTitle')} description={t(replacementId ? 'replaceDescription' : 'addDescription')}>
    <p role="note" className={styles.intro}>{t('sessionNotice')}</p>
    {!replacementId && <details style={{marginTop: 16}}><summary>{t('applyTemplate')}</summary>{templates.length ? <div className={styles.form}>
      <SelectField id="company-template" label={t('template')} placeholder={t('chooseTemplate')} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.title[locale]}</option>)}</SelectField>
      <Button variant="secondary" disabled={!templateId} onClick={() => {const result = applyCompanyTemplate(companyId, templateId); if (!result.ok) setErrors({form: t(`errors.${result.reason}`)}); else {setErrors({}); setTemplateMessage(t('templateApplied', {count: result.added}));}}}>{t('applyTemplate')}</Button>
    </div> : <p>{t('noTemplates')}</p>}{templateMessage && <p role="status">{templateMessage}</p>}</details>}
    <form noValidate onSubmit={submit} className={styles.form}>
      <DocumentFileDropzone file={file} error={errors.file} onSelect={selectFile}/>
      <SelectField id="company-upload-requirement" label={t('requirement')} value={requirementId || 'standalone'} disabled={Boolean(replacementId || initialRequirement)} onChange={(event) => {const id = event.target.value === 'standalone' ? '' : event.target.value; const selected = requirements.find((item) => item.id === id); setRequirementId(id); setIssuer(selected?.issuer ?? ''); setErrors({});}}>
        <option value="standalone">{t('standalone')}</option>{requirements.map((item) => <option key={item.id} value={item.id} disabled={Boolean(getCompanyDocumentDetails(companyId, item.id)?.current) && item.id !== initialRequirement}>{item.name[locale]}</option>)}
      </SelectField>
      <small>{t('uploadExisting')}</small>
      {!requirement ? <><Field id="company-upload-name" label={t('name')} required value={name} onChange={(event) => setName(event.target.value)} error={errors.name}/>
        <SelectField id="company-upload-type" label={t('documentType')} required value={type} placeholder={common('typePlaceholder')} onChange={(event) => setType(event.target.value)} error={errors.type}>{companyDocumentTypes.map((value) => <option key={value} value={value}>{listing(`types.${value}`)}</option>)}</SelectField>
        <label><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)}/> {t('required')}</label></> : <Field id="company-upload-type" label={t('documentType')} value={listing(`types.${requirement.documentType}`)} readOnly/>}
      <div className={styles.metadataGrid}><Field id="company-upload-issuer" label={t('issuer')} value={issuer} onChange={(event) => setIssuer(event.target.value)}/><Field id="company-upload-expires" label={t('expiresAt')} placeholder={common('datePlaceholder')} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} error={errors.expiresAt}/></div>
      {errors.form && <p role="alert" className={styles.error}>{errors.form}</p>}
      <div className={styles.actions}><Button variant="secondary" onClick={onClose}>{common('cancel')}</Button><Button type="submit"><AppIcon name="upload" size={18}/>{common('submit')}</Button></div>
    </form>
  </DocumentUploadDrawer>;
}
