'use client';

import {useId, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {AppearanceIcon} from '@/features/requirements/AppearancePicker';
import {documentDisplay} from '@/features/requirements/document-presentation';
import {supplierRequirementProgress, type SupplierIdentity, type SupplierRequirementDocument} from './types';
import styles from './SupplierRequirements.module.css';

export function UploadGlyph() {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/></svg>;
}

export function SupplierRequirementContext({requester, supplier, locale}: {requester: SupplierIdentity; supplier: SupplierIdentity; locale: string}) {
  const t = useTranslations('SupplierPortal');
  const language = locale === 'en' ? 'en' : 'ro';
  return <section className={styles.context} aria-label={t('invitationContext')} data-supplier-context>
    {[requester, supplier].map((identity, index) => <div className={styles.identity} key={index}>
      <span className={styles.identityIcon}><AppIcon name={index === 0 ? 'building' : 'users'} size={34}/></span>
      <div><p>{index === 0 ? t('requestingCompany') : t('supplier')}</p><strong>{identity.name}</strong>
        {identity.registrationNumber ? <small>{t('registrationNumber', {number: identity.registrationNumber})}</small> : identity.tagline ? <small>{identity.tagline[language]}</small> : null}
      </div>
    </div>)}
  </section>;
}

function SupplierRequirementFile({document, language, action}: {document: SupplierRequirementDocument; language: 'ro' | 'en'; action?: ReactNode}) {
  const t = useTranslations('SupplierPortal');
  return <div className={styles.file}><AppIcon name="file" size={23}/><div className={styles.fileCopy}><strong title={document.uploadedFile}>{document.uploadedFile}</strong>
    {document.selectedLocally ? <small role="status">{t('selectedLocally')}</small> : document.uploadedAt ? <small>{t('uploadedOn', {date: document.uploadedAt[language]})}</small> : null}
  </div>{action}</div>;
}

export function SupplierRequirementList({documents, locale, renderUpload, renderFileAction, renderFeedback}: {
  documents: SupplierRequirementDocument[];
  locale: string;
  renderUpload?: (document: SupplierRequirementDocument) => ReactNode;
  renderFileAction?: (document: SupplierRequirementDocument) => ReactNode;
  renderFeedback?: (document: SupplierRequirementDocument) => ReactNode;
}) {
  const t = useTranslations('SupplierPortal');
  const language = locale === 'en' ? 'en' : 'ro';
  const titleId = useId();
  const progress = supplierRequirementProgress(documents);
  return <section className={styles.card} aria-labelledby={titleId} data-supplier-requirements>
    <div className={styles.header}>
      <div className={styles.title}><AppIcon name="file" size={27}/><h2 id={titleId}>{t('requestedDocuments', {count: progress.total})}</h2></div>
      <div className={styles.progress}><span>{t('completedCount', {count: progress.completed, total: progress.total})}</span>
        <div className={styles.track} role="progressbar" aria-label={t('uploadProgress')} aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100}><span style={{width: `${progress.percentage}%`}}/></div><span>{progress.percentage}%</span>
      </div>
    </div>
    {documents.length === 0 ? <div className={styles.empty}><AppIcon name="file" size={27}/><h3>{t('emptyTitle')}</h3><p>{t('emptyDescription')}</p></div> : <div className={styles.list}>{documents.map((document) => {
      const display = documentDisplay(document, language, 'supplier');
      const feedback = renderFeedback?.(document);
      return <article className={styles.row} key={document.id} data-document-id={document.id}>
        <div className={styles.documentIdentity}><AppearanceIcon appearance={display.appearance} size="list"/><div className={styles.copy}>
          <h3>{display.name}</h3><p>{display.detail}</p><span className={styles.requirement} data-required={document.required}>{document.required ? t('required') : t('optional')}</span>
        </div></div>
        <span className={styles.status} data-status={document.status}><AppIcon name={document.status === 'uploaded' ? 'check' : document.status === 'missing' ? 'info' : 'clock'} size={17}/>{t(`status.${document.status}`)}</span>
        {document.uploadedFile && document.status !== 'missing' ? <SupplierRequirementFile document={document} language={language} action={renderFileAction?.(document)}/> : <div className={styles.upload}>
          {document.uploadedFile && <SupplierRequirementFile document={document} language={language}/>}
          {renderUpload ? renderUpload(document) : <><button type="button" className={styles.uploadButton} disabled aria-label={t('uploadFor', {name: display.name})}><UploadGlyph/>{t('uploadDocument')}</button><small>{t('fileHint')}</small></>}
        </div>}
        {feedback && <div className={styles.feedback}>{feedback}</div>}
      </article>;
    })}</div>}
  </section>;
}
