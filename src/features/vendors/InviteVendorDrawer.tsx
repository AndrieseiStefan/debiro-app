'use client';

import {useEffect, useRef, useState, type FormEvent, type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {Link} from '@/i18n/navigation';
import type {VendorDetailsViewModel} from './types';
import styles from './InviteVendorDrawer.module.css';

type Errors = Partial<Record<'name' | 'email' | 'validity' | 'message', string>>;
const maxMessageLength = 500;
const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function DrawerIcon({name}: {name: 'mail' | 'link' | 'copy' | 'eye' | 'lock' | 'send'}) {
  const paths = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.3 1.3M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.3-1.3"/></>,
    copy: <><rect x="8" y="7" width="12" height="14" rx="1"/><path d="M16 7V3H4v14h4"/></>,
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    send: <><path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3ZM10.3 13.7 21 3"/></>
  };
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function InviteVendorDrawer({phase, onClose, onExited, triggerRef, vendorName, contactEmail, preview, locale}: {
  phase: 'open' | 'closing';
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  vendorName: string;
  contactEmail: string;
  preview: VendorDetailsViewModel['invitationPreview'];
  locale: string;
}) {
  const t = useTranslations('InviteVendor');
  const [name, setName] = useState(vendorName);
  const [email, setEmail] = useState(contactEmail);
  const [message, setMessage] = useState(t('defaultMessage'));
  const [validityDays, setValidityDays] = useState(30);
  const [sendEmail, setSendEmail] = useState(true);
  const [notifyUpload, setNotifyUpload] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [submitNote, setSubmitNote] = useState('');
  const panelRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== 'closing') return;
    const timer = window.setTimeout(onExited, 240);
    return () => window.clearTimeout(timer);
  }, [phase, onExited]);

  useEffect(() => {
    panelRef.current?.focus();
    const background = document.querySelector<HTMLElement>('main')?.parentElement;
    const trigger = triggerRef.current;
    const previousInert = background?.inert ?? false;
    const previousHidden = background?.getAttribute('aria-hidden');
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (background) {background.inert = true; background.setAttribute('aria-hidden', 'true');}
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {event.preventDefault(); onClose(); return;}
      if (event.key !== 'Tab') return;
      const focusables = [...(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((item) => item.getClientRects().length > 0);
      if (focusables.length === 0) {event.preventDefault(); panelRef.current?.focus(); return;}
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (!panelRef.current?.contains(document.activeElement)) {event.preventDefault(); first.focus();}
      else if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (background) {
        background.inert = previousInert;
        if (previousHidden == null) background.removeAttribute('aria-hidden');
        else background.setAttribute('aria-hidden', previousHidden);
      }
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo(scrollX, scrollY);
      trigger?.focus();
    };
  }, [onClose, triggerRef]);

  const expiry = new Date(`${preview.referenceDate}T00:00:00Z`);
  expiry.setUTCDate(expiry.getUTCDate() + validityDays);
  const expiryText = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(expiry);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (!name.trim()) nextErrors.name = t('nameRequired');
    if (!email.trim()) nextErrors.email = t('emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = t('emailInvalid');
    if (![7, 14, 30, 60].includes(validityDays)) nextErrors.validity = t('validityRequired');
    if (message.length > maxMessageLength) nextErrors.message = t('messageTooLong');
    setErrors(nextErrors);
    setSubmitNote(Object.keys(nextErrors).length === 0 ? t('demoNotSent') : '');
    if (nextErrors.name) firstFieldRef.current?.focus();
    else if (nextErrors.email) document.getElementById('invite-vendor-email')?.focus();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(preview.demoUploadUrl);
      setCopyState('copied');
    } catch {setCopyState('failed');}
  }

  return createPortal(<div className={styles.backdrop} data-phase={phase} onMouseDown={(event) => {if (event.target === event.currentTarget) onClose();}}>
    <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="invite-title" aria-describedby="invite-description" tabIndex={-1} className={styles.drawer} data-phase={phase}>
      <div className={styles.content}>
        <button type="button" className={styles.close} aria-label={t('close')} onClick={onClose}><AppIcon name="close" size={23}/></button>
        <span className={styles.heroIcon}><AppIcon name="userPlus" size={29}/></span>
        <h2 id="invite-title">{t('title')}</h2>
        <p id="invite-description" className={styles.intro}>{t('description')}</p>

        <form id="invite-vendor-form" onSubmit={submit} noValidate>
          <Field id="invite-vendor-name" ref={firstFieldRef} label={t('vendorName')} required value={name} onChange={(event) => {setName(event.target.value); setErrors((current) => ({...current, name: undefined}));}} error={errors.name} />
          <Field id="invite-vendor-email" label={t('contactEmail')} required type="email" value={email} onChange={(event) => {setEmail(event.target.value); setErrors((current) => ({...current, email: undefined}));}} error={errors.email} />
          <div className={styles.messageField}><label htmlFor="invite-message">{t('personalMessage')} <span>{t('optional')}</span></label><textarea id="invite-message" maxLength={maxMessageLength} value={message} onChange={(event) => setMessage(event.target.value)} aria-invalid={errors.message ? true : undefined} aria-describedby="invite-message-counter" /><span className={styles.counter} id="invite-message-counter">{message.length}/{maxMessageLength}</span>{errors.message && <span className={styles.error} role="alert">{errors.message}</span>}</div>
          <div className={styles.validityField}><label htmlFor="invite-validity">{t('linkValidity')} <span className={styles.required}>*</span></label><div className={styles.selectWrap}><AppIcon name="calendar" size={19}/><select id="invite-validity" value={validityDays} onChange={(event) => {setValidityDays(Number(event.target.value)); setErrors((current) => ({...current, validity: undefined}));}} aria-invalid={errors.validity ? true : undefined}>{[7, 14, 30, 60].map((days) => <option key={days} value={days}>{t('days', {count: days})}</option>)}</select><AppIcon name="chevronDown" size={18}/></div><p className={styles.expiryHelp}>{t('expiresOn', {date: expiryText})}</p>{errors.validity && <span className={styles.error} role="alert">{errors.validity}</span>}</div>

          <div className={styles.options}>
            <label className={styles.option}><span className={styles.optionIcon}><DrawerIcon name="mail" /></span><span className={styles.optionCopy}><strong>{t('sendEmailNow')}</strong><small>{t('sendEmailHelp')}</small></span><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} /><span className={styles.switch} aria-hidden="true" /></label>
            <label className={styles.option}><span className={styles.optionIcon}><AppIcon name="bell" size={19}/></span><span className={styles.optionCopy}><strong>{t('notifyOnUpload')}</strong><small>{t('notifyHelp')}</small></span><input type="checkbox" checked={notifyUpload} onChange={(event) => setNotifyUpload(event.target.checked)} /><span className={styles.switch} aria-hidden="true" /></label>
          </div>

          <div className={styles.linkSection}><label htmlFor="invite-upload-link"><DrawerIcon name="link" />{t('secureLink')}</label><div className={styles.linkRow}><input id="invite-upload-link" readOnly value={preview.demoUploadUrl}/><Button variant="secondary" onClick={copyLink}><DrawerIcon name="copy" />{copyState === 'copied' ? t('copied') : t('copy')}</Button></div>{copyState === 'failed' && <span className={styles.error} role="alert">{t('copyFailed')}</span>}<Link href={preview.demoUploadPath} locale={locale === 'en' ? 'en' : undefined} target="_blank" rel="noopener noreferrer" className={styles.preview}><DrawerIcon name="eye" />{t('previewUpload')}<span aria-hidden="true">↗</span></Link></div>
          <div className={styles.actions}><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit"><DrawerIcon name="send" />{t('sendInvitation')}</Button></div>
          {submitNote && <p className={styles.demoNote} role="status">{submitNote}</p>}
        </form>
        <p className={styles.security}><DrawerIcon name="lock" />{t('securityNote')}</p>
      </div>
    </aside>
  </div>, document.body);
}
