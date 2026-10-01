'use client';

import {useState, type ChangeEvent, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {BrandWordmark} from '@/components/brand/BrandWordmark';
import {AppIcon} from '@/components/layout/AppIcon';
import {PortalContainer} from '@/components/layout/PortalContainer';
import {Link} from '@/i18n/navigation';
import {documentDisplay} from '@/features/requirements/document-presentation';
import {SupplierRequirementContext, SupplierRequirementList, UploadGlyph} from '@/features/supplier-requirements/SupplierRequirements';
import shared from '@/features/supplier-requirements/SupplierRequirements.module.css';
import type {SupplierDocument, SupplierPortalViewModel} from './types';
import styles from './SupplierUploadPortalPage.module.css';

type LocalFileState = Record<string, {name?: string; error?: string}>;
const maxFileBytes = 10 * 1024 * 1024;
const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

function PortalIcon({name, size = 21}: {name: 'lock' | 'eyeOff' | 'mail' | 'phone' | 'help'; size?: number}) {
  const paths: Record<typeof name, ReactNode> = {
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
  const documents = view.documents.map((document) => localFiles[document.id]?.name
    ? {...document, uploadedFile: localFiles[document.id].name, selectedLocally: true} : document);

  function chooseFile(event: ChangeEvent<HTMLInputElement>, document: SupplierDocument) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const error = !extension || !allowedExtensions.includes(extension) ? t('fileTypeError') : file.size > maxFileBytes ? t('fileSizeError') : undefined;
    setLocalFiles((previous) => ({...previous, [document.id]: error ? {error} : {name: file.name}}));
    event.currentTarget.value = '';
  }

  function renderUpload(document: SupplierDocument, compact = false) {
    const local = localFiles[document.id];
    const name = documentDisplay(document, lang).name;
    const hintId = `upload-hint-${document.id}`;
    const errorId = `upload-error-${document.id}`;
    return <div className={compact ? styles.fileAction : styles.uploadArea}>
      <label className={compact ? styles.replaceButton : `${shared.uploadButton} ${styles.uploadButton}`} title={t('uploadDocument')}>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" aria-label={t('uploadFor', {name})} aria-invalid={local?.error ? true : undefined} aria-describedby={`${hintId}${local?.error ? ` ${errorId}` : ''}`} onChange={(event) => chooseFile(event, document)}/>
        <UploadGlyph/>{!compact && t('uploadDocument')}
      </label>
      <small id={hintId} className={compact ? styles.srOnly : undefined}>{t('fileHint')}</small>
    </div>;
  }

  return <div className={styles.portal}>
    <header className={styles.header}>
      <PortalContainer className={styles.headerInner} data-portal-container="header">
      <div className={styles.headerBrand}><BrandWordmark className={styles.brand}/><span>{t('brandTagline')}</span></div>
      <nav className={styles.localeSwitch} aria-label={t('languageLabel')}>
        <Link href={`/upload/${view.token}`} locale="ro" aria-current={lang === 'ro' ? 'page' : undefined} className={lang === 'ro' ? styles.activeLocale : undefined}>RO</Link>
        <Link href={`/upload/${view.token}`} locale="en" aria-current={lang === 'en' ? 'page' : undefined} className={lang === 'en' ? styles.activeLocale : undefined}>EN</Link>
      </nav>
      </PortalContainer>
    </header>

    <main className={styles.main}>
      <PortalContainer className={styles.mainInner} data-portal-container="main">
      <div className={styles.contentColumn}>
        <div className={styles.intro}><p className={styles.eyebrow}>{t('eyebrow')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div>

        <SupplierRequirementContext locale={locale} requester={view.requester} supplier={view.supplier}/>
        <SupplierRequirementList locale={locale} documents={documents} renderUpload={(document) => renderUpload(document)} renderFileAction={(document) => document.status !== 'uploaded'
          ? renderUpload(document, true)
          : <button type="button" aria-label={t('documentActions', {name: documentDisplay(document, lang).name})} aria-disabled="true" className={styles.moreAction}><AppIcon name="more" size={23}/></button>}
          renderFeedback={(document) => localFiles[document.id]?.error ? <span className={styles.fileError} role="alert" id={`upload-error-${document.id}`}>{localFiles[document.id].error}</span> : null}/>

        <aside className={styles.afterUpload}><span className={styles.infoIcon}><AppIcon name="info" size={23}/></span><p>{t('afterUpload')}</p><div><strong>{t('questions')}</strong><a href="#portal-help">{t('seeHelp')} <AppIcon name="arrowRight" size={18}/></a></div></aside>
        {Object.values(localFiles).some((file) => file.name) && <p className={styles.localOnlyNotice} role="status">{t('localOnlyNotice')}</p>}
      </div>

      <div className={styles.sideColumn}>
        <aside className={styles.securityCard} aria-labelledby="security-title"><div className={styles.sideHeading}><span className={styles.securityHero}><AppIcon name="shield" size={29}/></span><h2 id="security-title">{t('secureUpload')}</h2></div><ul><li><span><PortalIcon name="lock"/></span>{t('securityEncrypted')}</li><li><span><AppIcon name="shield" size={21}/></span>{t('securityAccess', {company: view.requester.name})}</li><li><span><PortalIcon name="eyeOff"/></span>{t('securityPrivacy')}</li><li><span><AppIcon name="file" size={21}/></span>{t('securityGdpr')}</li></ul><div className={styles.securityWhy}><h3>{t('whyDocuments')}</h3><p>{t('whyDescription')}</p></div></aside>
        <aside className={styles.helpCard} id="portal-help" aria-labelledby="help-title"><div className={styles.helpHeading}><span><PortalIcon name="help" size={27}/></span><div><h2 id="help-title">{t('needHelp')}</h2><p>{t('helpDescription')}</p></div></div><a href={`mailto:${view.help.email}`}><PortalIcon name="mail" size={22}/>{view.help.email}</a><a href={`tel:${view.help.phone.replace(/\s/g, '')}`}><PortalIcon name="phone" size={22}/>{view.help.phone}</a><p className={styles.hours}>{t('hours')}</p></aside>
        <div className={styles.mountainArt} aria-hidden="true"><span>{t('mountainLine')}</span></div>
      </div>
      </PortalContainer>
    </main>

    <footer className={styles.footer}><PortalContainer className={styles.footerInner} data-portal-container="footer"><div className={styles.footerBrand}><BrandWordmark /><span>{t('brandTagline')}</span></div><div className={styles.footerLinks}><button type="button" aria-disabled="true">{t('privacy')}</button><button type="button" aria-disabled="true">{t('terms')}</button><span>{t('copyright', {year: view.footerYear})}</span></div></PortalContainer></footer>
  </div>;
}
