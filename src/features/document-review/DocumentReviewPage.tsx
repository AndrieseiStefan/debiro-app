'use client';

import {useState, type FormEvent, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {Button} from '@/components/ui/Button';
import {Link} from '@/i18n/navigation';
import type {DocumentReviewViewModel, ReviewValues} from './types';
import styles from './DocumentReviewPage.module.css';

type ReviewState = 'extracted' | 'editing' | 'draft' | 'rejected' | 'confirmed';
type FieldName = keyof ReviewValues;

function parseDate(value: string): number | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? parsed.getTime() : null;
}

function ReviewField({id, label, icon, error, children}: {id: string; label: string; icon: AppIconName | 'number'; error?: string; children: ReactNode}) {
  return <div className={styles.field}>
    <label htmlFor={id}>{label} <span aria-hidden="true">*</span></label>
    <div className={styles.fieldControl} data-invalid={error ? 'true' : undefined}>
      <span className={styles.fieldIcon} aria-hidden="true">{icon === 'number' ? '#' : <AppIcon name={icon} size={19}/>}</span>
      {children}
    </div>
    {error && <p className={styles.fieldError} id={`${id}-error`} role="alert">{error}</p>}
  </div>;
}

function DocumentPreview({view, locale}: {view: DocumentReviewViewModel; locale: string}) {
  const t = useTranslations('DocumentReview');
  const [zoom, setZoom] = useState(100);
  const [expanded, setExpanded] = useState(false);
  const values = view.extraction.values;
  return <section className={`${styles.previewCard} ${expanded ? styles.expandedPreview : ''}`} aria-label={t('previewRegion')} data-review-preview>
    <div className={styles.previewToolbar}>
      <span className={styles.pdfIcon}><AppIcon name="file" size={25}/></span>
      <span className={styles.fileIdentity}><strong title={view.file.name}>{view.file.name}</strong><small>{view.file.sizeLabel}</small></span>
      <span className={styles.pageCount}>1 / {view.file.pageCount}</span>
      <div className={styles.zoomControls} aria-label={t('zoomControls')}>
        <button type="button" aria-label={t('zoomOut')} onClick={() => setZoom((current) => Math.max(75, current - 25))} disabled={zoom === 75}>−</button>
        <span>{zoom}%</span>
        <button type="button" aria-label={t('zoomIn')} onClick={() => setZoom((current) => Math.min(150, current + 25))} disabled={zoom === 150}>+</button>
      </div>
      <button className={styles.expandButton} type="button" aria-label={expanded ? t('collapsePreview') : t('expandPreview')} aria-pressed={expanded} onClick={() => setExpanded((current) => !current)}><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></svg></button>
    </div>
    <div className={styles.viewer} role="region" aria-label={t('sampleDocument')} tabIndex={0}>
      <article className={styles.paper} style={{transform: `scale(${zoom / 100})`, marginBottom: `${Math.max(0, (zoom - 100) * 6)}px`}} aria-label={t('sampleDocument')}>
        <div className={styles.paperAgency}><strong className={styles.anaf}>ANAF</strong><span>MINISTERUL FINANȚELOR<br/>Agenția Națională de Administrare Fiscală</span></div>
        <h2>CERTIFICAT DE ATESTARE FISCALĂ</h2>
        <p className={styles.paperNumber}>Nr. {values.documentNumber} / {values.issuedAt}</p>
        <p>Se certifică faptul că <strong>{values.companyName.toLocaleUpperCase(locale)}</strong>, CUI&nbsp; {view.vendor.registrationNumber}, înregistrată la Oficiul Registrului Comerțului sub nr. {view.vendor.registrationCode}, nu înregistrează obligații fiscale restante la data emiterii prezentului certificat.</p>
        <p>Prezentul certificat este valabil până la data de <strong>{values.expiresAt}</strong> și este eliberat în conformitate cu prevederile legale în vigoare.</p>
        <div className={styles.paperSignature}><span>Data emiterii:<br/>{values.issuedAt}</span><span>Agenția Națională de Administrare Fiscală<br/>Direcția Generală de Administrare a Marilor Contribuabili</span></div>
        <div className={styles.paperStamp} aria-hidden="true">ANAF</div>
      </article>
    </div>
  </section>;
}

export function DocumentReviewPage({locale, view}: {locale: string; view: DocumentReviewViewModel}) {
  const t = useTranslations('DocumentReview');
  const app = useTranslations('AppShell');
  const [values, setValues] = useState<ReviewValues>(() => ({...view.extraction.values}));
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [reviewState, setReviewState] = useState<ReviewState>('extracted');
  const documentPath = `/documents/${view.id}/review`;
  const vendorPath = `/vendors/${view.vendor.id}`;

  function update(field: FieldName, value: string) {
    setValues((current) => ({...current, [field]: value}));
    setErrors((current) => ({...current, [field]: undefined}));
    setReviewState('editing');
  }

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<FieldName, string>> = {};
    for (const [field, value] of Object.entries(values) as [FieldName, string][]) {
      if (!value.trim()) nextErrors[field] = t('requiredError');
    }
    const issueTime = parseDate(values.issuedAt);
    const expiryTime = parseDate(values.expiresAt);
    if (values.issuedAt.trim() && issueTime === null) nextErrors.issuedAt = t('dateError');
    if (values.expiresAt.trim() && expiryTime === null) nextErrors.expiresAt = t('dateError');
    if (issueTime !== null && expiryTime !== null && expiryTime < issueTime) nextErrors.expiresAt = t('expiryError');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setReviewState('confirmed');
  }

  const control = (field: FieldName, icon: AppIconName | 'number', label: string, select = false) => {
    const id = `review-${field}`;
    const common = {id, required: true, 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${id}-error` : undefined};
    return <ReviewField id={id} icon={icon} label={label} error={errors[field]} key={field}>
      {select ? <select {...common} value={values[field]} onChange={(event) => update(field, event.target.value)}><option value="tax-certificate">{t('taxCertificate')}</option><option value="registration-certificate">{t('registrationCertificate')}</option></select> :
        <input {...common} type="text" inputMode={field === 'issuedAt' || field === 'expiresAt' ? 'numeric' : 'text'} value={values[field]} onChange={(event) => update(field, event.target.value)} />}
    </ReviewField>;
  };

  return <AuthenticatedAppShell locale={locale} currentPath={documentPath} organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
    <div className={styles.page}>
      <div className={styles.contextRow}>
        <AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.suppliers'), href: '/vendors'}, {label: view.vendor.name, href: vendorPath}, {label: app('navigation.documents')}, {label: t('breadcrumbCurrent')}]} />
        <Link href={vendorPath} className={styles.backLink}><span aria-hidden="true">←</span>{t('backToDocuments')}</Link>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeading}><div className={styles.eyebrow}><span className={styles.eyebrowIcon}><AppIcon name="file" size={22}/></span>{t('eyebrow')}</div><h1>{t('title')}</h1><p>{t('description')}</p></div>
        <div className={styles.aiCallout}><span className={styles.aiCalloutIcon} aria-hidden="true">✧</span><span><strong>{t('aiCalloutTitle')}</strong><small><AppIcon name="info" size={15}/>{t('aiCalloutDescription')}</small></span></div>
      </header>
      {reviewState !== 'extracted' && <p className={styles.reviewStatus} role="status" data-review-state={reviewState}><AppIcon name={reviewState === 'rejected' ? 'close' : reviewState === 'confirmed' ? 'check' : 'info'} size={18}/>{t(`state.${reviewState}`)}</p>}
      <div className={styles.reviewGrid}>
        <DocumentPreview view={view} locale={locale}/>
        <section className={styles.extractionCard} aria-labelledby="extraction-heading">
          <div className={styles.extractionHeading}><h2 id="extraction-heading"><AppIcon name="file" size={25}/>{t('extractionTitle')}</h2><span className={styles.confidenceBadge}><AppIcon name="check" size={17}/>{t('confidenceBadge', {confidence: view.extraction.confidencePercent})}<AppIcon name="info" size={16}/></span></div>
          <p className={styles.extractionDescription}>{t('extractionDescription')}</p>
          <form noValidate onSubmit={confirm}>
            <div className={styles.fields}>
              {control('documentType', 'file', t('documentType'), true)}
              {control('companyName', 'building', t('companyName'))}
              <div className={styles.fieldRow}>{control('documentNumber', 'number', t('documentNumber'))}{control('issuedAt', 'calendar', t('issuedAt'))}</div>
              <div className={styles.fieldRow}>{control('expiresAt', 'calendar', t('expiresAt'))}{control('issuer', 'building', t('issuer'))}</div>
            </div>
            <div className={styles.confidenceSection}><div className={styles.confidenceTitle}>{t('confidenceLabel')}</div><div className={styles.confidenceTrackRow}><div className={styles.confidenceTrack}><span style={{width: `${view.extraction.confidencePercent}%`}} /></div><strong>{view.extraction.confidencePercent}%</strong></div><p><AppIcon name="info" size={17}/>{t('confidenceExplanation')}</p></div>
            <div className={styles.editCallout}><span aria-hidden="true"><AppIcon name="file" size={22}/></span><span><strong>{t('editCalloutTitle')}</strong><small>{t('editCalloutDescription')}</small></span></div>
            <div className={styles.actions}>
              <div><Button variant="destructive" className={styles.rejectButton} onClick={() => {setErrors({}); setReviewState('rejected');}}><AppIcon name="close" size={20}/>{t('reject')}</Button><small>{t('rejectHelper')}</small></div>
              <div><Button variant="secondary" onClick={() => {setErrors({}); setReviewState('draft');}}><AppIcon name="file" size={19}/>{t('saveDraft')}</Button><small>{t('draftHelper')}</small></div>
              <div><Button type="submit" className={styles.confirmButton}><AppIcon name="check" size={20}/>{t('confirmAndSave')}</Button><small>{t('confirmHelper')}</small></div>
            </div>
          </form>
        </section>
      </div>
    </div>
  </AuthenticatedAppShell>;
}
