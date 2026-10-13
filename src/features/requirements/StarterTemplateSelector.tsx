'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {SearchInput} from '@/components/ui/SearchInput';
import {EmptyState} from '@/components/ui/EmptyState';
import {AppearanceIcon} from './AppearancePicker';
import {catalogDocument} from './catalog';
import {searchStarterTemplates, starterRequirementTemplates} from './starter-templates';
import type {RequirementTemplate} from './types';
import type {VendorCategory} from '@/features/vendors/types';
import styles from './RequirementsPage.module.css';

export function StarterTemplateSelector({locale, templates, canCreate, onCustom, onUse, onExisting, onBack}: {
  locale: string; templates: RequirementTemplate[]; canCreate: boolean; onCustom: () => void;
  onUse: (id: string) => boolean; onExisting: (id: string) => void; onBack: () => void;
}) {
  const t = useTranslations('Requirements');
  const vendors = useTranslations('Vendors');
  const language = locale === 'en' ? 'en' : 'ro';
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const previewTitle = useRef<HTMLHeadingElement>(null);
  const selectorRef = useRef<HTMLElement>(null);
  const categoryLabel = (category: VendorCategory) => vendors(('category.' + category) as 'category.construction');
  const visible = searchStarterTemplates(query, language, categoryLabel);
  const selected = starterRequirementTemplates.find((source) => source.id === selectedId);
  const existing = selected && templates.find((template) => template.starterTemplateId === selected.id);
  useEffect(() => {if (selectedId) previewTitle.current?.focus();}, [selectedId]);

  return <section ref={selectorRef} className={styles.starterSelector} aria-label={t('starters.title')} data-starter-selector>
    <div className={styles.starterHeading}><div><h2>{t('starters.title')}</h2><p>{t('starters.description')}</p></div><Button variant="secondary" onClick={onBack}>{t('starters.backToCompany')}</Button></div>
    {selected ? <>
      <Button variant="secondary" onClick={() => {setSelectedId(null); setFailed(false); requestAnimationFrame(() => selectorRef.current?.querySelector<HTMLButtonElement>(`[data-starter-id="${selected.id}"]`)?.focus());}}>{t('starters.backToSuggestions')}</Button>
      <div className={styles.starterPreview} data-starter-preview={selected.id}>
        <div className={styles.editorTop}><AppearanceIcon appearance={selected}/><div className={styles.editorIdentity}><h3 ref={previewTitle} tabIndex={-1}>{selected.title[language]}</h3><p>{selected.subtitle[language]}</p><small>{categoryLabel(selected.categoryId)}</small></div></div>
        <p className={styles.starterReadOnly}>{t('starters.readOnly')}</p>
        <ul className={styles.starterDocuments}>{selected.documents.map((document) => {
          const type = catalogDocument(document.catalogDocumentTypeId)!;
          return <li key={type.id}><AppearanceIcon appearance={type} size="list"/><span><strong>{type.canonicalName[language]}</strong><small>{document.required ? t('mandatory') : t('optional')} · {t('days', {count: document.expiryWarningDays})} · {t('months', {count: document.validityMonths})}</small></span></li>;
        })}</ul>
        <div className={styles.starterUse}>
          {existing ? <><p role="status">{t('starters.alreadyAdded')}</p><Button onClick={() => onExisting(existing.id)}>{t('starters.openExisting')}</Button></>
            : <Button disabled={!canCreate} onClick={() => setFailed(!onUse(selected.id))}><AppIcon name="plus" size={20}/>{t('starters.use')}</Button>}
          {!canCreate && <p>{t('starters.readOnlyRole')}</p>}
          {failed && <p role="alert">{t('starters.failed')}</p>}
        </div>
      </div>
    </> : <>
      <SearchInput label={t('starters.searchLabel')} placeholder={t('searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)}/>
      <div className={styles.starterGrid}>{visible.map((source) => <button type="button" key={source.id} className={styles.templateItem} data-starter-id={source.id} onClick={() => {setSelectedId(source.id); setFailed(false);}}>
        <AppearanceIcon appearance={source} size="list"/><span className={styles.templateCopy}><strong>{source.title[language]}</strong><span>{source.subtitle[language]}</span><small>{categoryLabel(source.categoryId)}</small><small>{t('documentCount', {count: source.documents.length})} · {t('starters.requiredCount', {count: source.documents.filter((document) => document.required).length})}</small></span><AppIcon name="chevronRight" size={18}/>
      </button>)}</div>
      {visible.length === 0 && <EmptyState title={t('noResults')}/>}
      <div className={styles.starterUse}><Button variant="secondary" disabled={!canCreate} onClick={onCustom}><AppIcon name="plus" size={20}/>{t('starters.custom')}</Button>{!canCreate && <p>{t('starters.readOnlyRole')}</p>}</div>
    </>}
  </section>;
}
