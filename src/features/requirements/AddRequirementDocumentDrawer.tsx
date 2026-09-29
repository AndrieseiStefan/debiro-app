'use client';

import {useState, type FormEvent, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {AppearanceIcon, AppearancePicker} from './AppearancePicker';
import {defaultAppearance, type Appearance} from './appearance';
import {searchCatalog} from './catalog';
import type {ExpiryWarningDays, RequirementDocumentInput, ValidityMonths} from './types';
import styles from './AddRequirementDocumentDrawer.module.css';

type NewDocument = RequirementDocumentInput;
const alertOptions: ExpiryWarningDays[] = [7, 15, 30, 60, 90];
const validityOptions: ValidityMonths[] = [1, 3, 6, 12, 24, 36];

export function AddRequirementDocumentDrawer({phase, onClose, onExited, triggerRef, locale, onAdd}: {
  phase: DrawerPhase;
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  locale: string;
  onAdd: (document: NewDocument) => 'added' | 'duplicate' | 'invalid';
}) {
  const t = useTranslations('Requirements.drawer');
  const common = useTranslations('Requirements');
  const language = locale === 'en' ? 'en' : 'ro';
  const [mode, setMode] = useState<'suggestions' | 'custom'>('suggestions');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('tax');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [issuer, setIssuer] = useState('');
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [required, setRequired] = useState(true);
  const [alertDays, setAlertDays] = useState<ExpiryWarningDays>(30);
  const [validityMonths, setValidityMonths] = useState<ValidityMonths>(12);
  const [error, setError] = useState<'nameRequired' | 'selectSuggestion' | 'duplicate' | 'invalid' | null>(null);
  const suggestions = searchCatalog(query);
  const selected = suggestions.find((document) => document.id === selectedId) ?? null;

  function changeMode(next: 'suggestions' | 'custom') {setMode(next); setError(null);}
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'custom' && !name.trim()) {setError('nameRequired'); return;}
    if (mode === 'suggestions' && !selected) {setError('selectSuggestion'); return;}
    const document: NewDocument = mode === 'suggestions'
      ? {catalogDocumentTypeId: selectedId, required, expiryWarningDays: alertDays, validityMonths}
      : {customName: name.trim().replace(/\s+/g, ' '), customDescription: description.trim() || undefined, issuer: issuer.trim() || undefined, ...appearance, required, expiryWarningDays: alertDays, validityMonths};
    const result = onAdd(document);
    if (result === 'added') onClose();
    else setError(result);
  }

  return <Drawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} titleId="requirement-document-title" descriptionId="requirement-document-description" closeLabel={t('close')} panelClassName={styles.panel} contentClassName={styles.content}>
    <span className={styles.headingIcon}><AppIcon name="file" size={27}/></span>
    <h2 id="requirement-document-title">{common('addDocument')}</h2>
    <p id="requirement-document-description" className={styles.intro}>{mode === 'suggestions' ? t('suggestionsIntro') : t('customIntro')}</p>
    <form onSubmit={submit} noValidate className={styles.form}>
      <fieldset className={styles.sources} aria-label={t('source')}><div className={styles.sourceChoices}>
        <button type="button" className={styles.source} aria-pressed={mode === 'suggestions'} onClick={() => changeMode('suggestions')}><AppIcon name="search" size={18}/>{t('suggestions')}</button>
        <button type="button" className={styles.source} aria-pressed={mode === 'custom'} onClick={() => changeMode('custom')}><AppIcon name="file" size={18}/>{t('custom')}</button>
      </div></fieldset>

      {mode === 'suggestions' ? <div className={styles.suggestionArea}>
        <label className={styles.search}><AppIcon name="search" size={20}/><span className={styles.srOnly}>{t('searchLabel')}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')}/></label>
        {suggestions.length ? <div className={styles.suggestions}>{suggestions.map((document) => <button type="button" key={document.id} className={styles.suggestion} aria-pressed={selectedId === document.id} onClick={() => {setSelectedId(document.id); setError(null);}}>
          <AppearanceIcon appearance={document}/>
          <span><strong>{document.canonicalName[language]}</strong><small>{document.description[language]}</small></span>
          <span className={styles.radio} aria-hidden="true"/>
        </button>)}</div> : <div className={styles.noResults}><p>{t('noResults')}</p><Button type="button" variant="secondary" onClick={() => changeMode('custom')}>{t('createCustom')}</Button></div>}
        {selected && <div className={styles.selected}><h3>{t('selectedDocument')}</h3><div className={styles.selectedCard}><AppearanceIcon appearance={selected}/><span><strong>{selected.canonicalName[language]}</strong><small>{selected.description[language]}</small></span></div></div>}
      </div> : <div className={styles.customFields}>
        <AppearancePicker appearance={appearance} onChange={setAppearance} label={common('appearance.documentLabel')} size="list"/>
        <label><span>{t('documentName')} <em>*</em></span><input value={name} onChange={(event) => {setName(event.target.value); setError(null);}} placeholder={t('namePlaceholder')} aria-invalid={error === 'nameRequired' || error === 'duplicate'} aria-describedby={error ? 'requirement-document-error' : undefined}/></label>
        <label><span>{t('description')} <span className={styles.optional}>{t('optional')}</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder={t('descriptionPlaceholder')}/><small className={styles.counter}>{description.length}/200</small></label>
      </div>}

      <fieldset className={styles.rules}><legend>{t('rulesTitle')}</legend><div className={styles.rulesGrid}>
        <label className={styles.requiredField}><span>{common('mandatory')}</span><span className={styles.requiredControl}><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)}/><span className={styles.toggle} aria-hidden="true"/><span>{required ? common('mandatory') : common('optional')}</span></span></label>
        <label>{t('expiryAlert')}<select value={alertDays} onChange={(event) => setAlertDays(Number(event.target.value) as ExpiryWarningDays)}>{alertOptions.map((days) => <option key={days} value={days}>{common('days', {count: days})}</option>)}</select></label>
        <label>{t('validity')}<select value={validityMonths} onChange={(event) => setValidityMonths(Number(event.target.value) as ValidityMonths)}>{validityOptions.map((months) => <option key={months} value={months}>{common('months', {count: months})}</option>)}</select></label>
        {mode === 'custom' && <label><span>{t('issuer')} <span className={styles.optional}>{t('optional')}</span></span><input value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder={t('issuerPlaceholder')}/></label>}
      </div></fieldset>
      {error && <p id="requirement-document-error" className={styles.error} role="alert">{t(error)}</p>}
      <div className={styles.notice}><AppIcon name="info" size={21}/><p>{mode === 'suggestions' ? t('suggestionsNotice') : t('customNotice')}</p></div>
      <div className={styles.actions}><Button variant="secondary" onClick={onClose}>{common('cancel')}</Button><Button type="submit">{t('add')}</Button></div>
    </form>
  </Drawer>;
}
