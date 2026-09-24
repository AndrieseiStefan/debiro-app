'use client';

import {useState, type ChangeEvent, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {AppIcon} from '@/components/layout/AppIcon';
import {Link} from '@/i18n/navigation';
import type {SupplierDocument, SupplierPortalViewModel} from './types';
import styles from './SupplierUploadPortalPage.module.css';

type LocalFileState = Record<string, {name?: string; error?: string}>;
const maxFileBytes = 10 * 1024 * 1024;
const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

function PortalIcon({name, size = 21}: {name: 'upload' | 'lock' | 'eyeOff' | 'mail' | 'phone' | 'help'; size?: number}) {
  const paths: Record<typeof name, ReactNode> = {
    upload: <><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    eyeOff: <><path d="M3 3l18 18M10.6 5.2A10.9 10.9 0 0 1 12 5c6 0 10 7 10 7a15 15 0 0 1-3.1 3.5M6.1 6.1A15.3 15.3 0 0 0 2 12s4 7 10 7a10.3 10.3 0 0 0 4.2-.9"/><path d="M10 10a3 3 0 0 0 4 4"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
    phone: <path d="M5 3h4l2 5-2 2a15 15 0 0 0 5 5l2-2 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.6 9a2.6 2.6 0 0 1 5 1c0 1.8-2.6 2.5-2.6 4M12 17h.01"/></>
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function SupplierUploadPortalPage({locale, view}: {locale: string; view: SupplierPortalViewModel}) {
  const t = useTranslations('SupplierPortal');
  const lang = locale === 'en' ? 'en' : 'ro';
  const [localFiles, setLocalFiles] = useState<LocalFileState>({});
  const uploadedCount = view.documents.filter((document) => document.status === 'uploaded').length;
  const progress = Math.round(uploadedCount / view.documents.length * 100);

  function chooseFile(event: ChangeEvent<HTMLInputElement>, document: SupplierDocument) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const error = !extension || !allowedExtensions.includes(extension) ? t('fileTypeError') : file.size > maxFileBytes ? t('fileSizeError') : undefined;
    setLocalFiles((previous) => ({...previous, [document.id]: error ? {error} : {name: file.name}}));
    event.currentTarget.value = '';
  }

  return <div className={styles.portal}>
    <header className={styles.header}>
      <div className={styles.headerBrand}><BrandWordmark className={styles.brand}/><span>{t('brandTagline')}</span></div>
      <nav className={styles.localeSwitch} aria-label={t('languageLabel')}>
        <Link href={`/upload/${view.token}`} locale="ro" aria-current={lang === 'ro' ? 'page' : undefined} className={lang === 'ro' ? styles.activeLocale : undefined}>RO</Link>
        <Link href={`/upload/${view.token}`} locale="en" aria-current={lang === 'en' ? 'page' : undefined} className={lang === 'en' ? styles.activeLocale : undefined}>EN</Link>
      </nav>
    </header>

    <main className={styles.main}>
      <div className={styles.contentColumn}>
        <div className={styles.intro}><p className={styles.eyebrow}>{t('eyebrow')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div>

        <section className={styles.identityCard} aria-label={t('invitationContext')}>
          <div className={styles.identityItem}><span className={styles.identityIcon}><AppIcon name="building" size={34}/></span><div><p>{t('requestingCompany')}</p><strong>{view.requester.name}</strong><small>{view.requester.tagline[lang]}</small></div></div>
          <div className={styles.identityItem}><span className={styles.identityIcon}><AppIcon name="users" size={34}/></span><div><p>{t('supplier')}</p><strong>{view.supplier.name}</strong><small>{t('registrationNumber', {number: view.supplier.registrationNumber})}</small></div></div>
        </section>

        <section className={styles.documentsCard} aria-labelledby="requested-documents-title">
          <div className={styles.documentsHeader}><div className={styles.documentsTitle}><AppIcon name="file" size={27}/><h2 id="requested-documents-title">{t('requestedDocuments', {count: view.documents.length})}</h2></div><div className={styles.progressText}><span>{t('completedCount', {count: uploadedCount, total: view.documents.length})}</span><div className={styles.progressTrack} role="progressbar" aria-label={t('uploadProgress')} aria-valuenow={uploadedCount} aria-valuemin={0} aria-valuemax={view.documents.length}><span style={{width: `${progress}%`}} /></div><span>{progress}%</span></div></div>
          <div className={styles.documentList}>{view.documents.map((document) => {
            const local = localFiles[document.id];
            const status = local?.name ? 'selected' : document.status;
            const hintId = `upload-hint-${document.id}`;
            const errorId = `upload-error-${document.id}`;
            return <article className={styles.documentRow} key={document.id} data-document-id={document.id}>
              <span className={styles.documentIcon}><AppIcon name="file" size={25}/></span>
              <div className={styles.documentCopy}><h3>{document.title[lang]}</h3><p>{document.description[lang]}</p></div>
              <span className={styles.status} data-status={status}><AppIcon name={status === 'uploaded' ? 'check' : status === 'missing' ? 'plus' : status === 'selected' ? 'file' : 'clock'} size={17}/>{t(`status.${status}`)}</span>
              {document.status === 'uploaded' ? <div className={styles.fileDetails}><AppIcon name="file" size={23}/><div><strong title={document.uploadedFile}>{document.uploadedFile}</strong><small>{t('uploadedOn', {date: document.uploadedAt?.[lang] ?? ''})}</small></div><button type="button" aria-label={t('documentActions', {name: document.title[lang]})} aria-disabled="true" className={styles.moreAction}><AppIcon name="more" size={23}/></button></div> :
                <div className={styles.uploadArea}>{local?.name ? <div className={styles.selectedFile} role="status"><AppIcon name="file" size={18}/><span title={local.name}>{local.name}</span></div> : null}<label className={styles.uploadButton}><input type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label={t('uploadFor', {name: document.title[lang]})} aria-invalid={local?.error ? true : undefined} aria-describedby={`${hintId}${local?.error ? ` ${errorId}` : ''}`} onChange={(event) => chooseFile(event, document)}/><PortalIcon name="upload" size={22}/>{t('uploadDocument')}</label><small id={hintId}>{t('fileHint')}</small>{local?.error && <span className={styles.fileError} role="alert" id={errorId}>{local.error}</span>}</div>}
            </article>;
          })}</div>
        </section>

        <aside className={styles.afterUpload}><span className={styles.infoIcon}><AppIcon name="info" size={23}/></span><p>{t('afterUpload')}</p><div><strong>{t('questions')}</strong><a href="#portal-help">{t('seeHelp')} <AppIcon name="arrowRight" size={18}/></a></div></aside>
        {Object.values(localFiles).some((file) => file.name) && <p className={styles.localOnlyNotice} role="status">{t('localOnlyNotice')}</p>}
      </div>

      <div className={styles.sideColumn}>
        <aside className={styles.securityCard} aria-labelledby="security-title"><div className={styles.sideHeading}><span className={styles.securityHero}><AppIcon name="shield" size={29}/></span><h2 id="security-title">{t('secureUpload')}</h2></div><ul><li><span><PortalIcon name="lock"/></span>{t('securityEncrypted')}</li><li><span><AppIcon name="shield" size={21}/></span>{t('securityAccess', {company: view.requester.name})}</li><li><span><PortalIcon name="eyeOff"/></span>{t('securityPrivacy')}</li><li><span><AppIcon name="file" size={21}/></span>{t('securityGdpr')}</li></ul><div className={styles.securityWhy}><h3>{t('whyDocuments')}</h3><p>{t('whyDescription')}</p></div></aside>
        <aside className={styles.helpCard} id="portal-help" aria-labelledby="help-title"><div className={styles.helpHeading}><span><PortalIcon name="help" size={27}/></span><div><h2 id="help-title">{t('needHelp')}</h2><p>{t('helpDescription')}</p></div></div><a href={`mailto:${view.help.email}`}><PortalIcon name="mail" size={22}/>{view.help.email}</a><a href={`tel:${view.help.phone.replace(/\s/g, '')}`}><PortalIcon name="phone" size={22}/>{view.help.phone}</a><p className={styles.hours}>{t('hours')}</p></aside>
        <div className={styles.mountainArt} aria-hidden="true"><span>{t('mountainLine')}</span></div>
      </div>
    </main>

    <footer className={styles.footer}><div className={styles.footerBrand}><BrandWordmark /><span>{t('brandTagline')}</span></div><div className={styles.footerLinks}><button type="button" aria-disabled="true">{t('privacy')}</button><button type="button" aria-disabled="true">{t('terms')}</button><span>{t('copyright', {year: view.footerYear})}</span></div></footer>
  </div>;
}
