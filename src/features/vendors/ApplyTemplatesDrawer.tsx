'use client';

import {useState, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {SearchInput} from '@/components/ui/SearchInput';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {AppearanceIcon} from '@/features/requirements/AppearancePicker';
import {templateDocumentType} from '@/features/requirements/document-types';
import type {RequirementTemplate} from '@/features/requirements/types';
import {assignmentSummary, type VendorRequirement} from './vendor-requirements';
import type {VendorCategory} from './types';
import styles from './ApplyTemplatesDrawer.module.css';

export function ApplyTemplatesDrawer({phase, onClose, onExited, triggerRef, templates, requirements, category, language, onApply}: {
  phase: DrawerPhase; onClose: () => void; onExited: () => void; triggerRef: RefObject<HTMLButtonElement | null>;
  templates: RequirementTemplate[]; requirements: VendorRequirement[]; category: VendorCategory; language: 'ro' | 'en'; onApply: (ids: string[]) => boolean;
}) {
  const t = useTranslations('VendorTemplates');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const chosen = templates.filter((template) => selected.includes(template.id) && template.categoryId === category);
  const summary = assignmentSummary(chosen, requirements);
  const compatible = templates.some((template) => template.categoryId === category);
  const visible = templates.filter((template) => `${template.title[language]} ${template.subtitle[language]}`.toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language)))
    .toSorted((a, b) => Number(b.categoryId === category) - Number(a.categoryId === category));

  return <Drawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} titleId="apply-template-title" descriptionId="apply-template-description" closeLabel={t('close')} panelClassName={styles.panel} contentClassName={styles.content}>
    <header className={styles.heading}><span className={styles.heroIcon}><AppIcon name="layers" size={25}/></span><h2 id="apply-template-title">{t(confirming ? 'confirmTitle' : 'title')}</h2></header>
    <p id="apply-template-description" className={styles.description}>{t(confirming ? 'confirmDescription' : 'description')}</p>
    {!confirming ? <>
      <SearchInput label={t('search')} placeholder={t('search')} value={query} onChange={(event) => setQuery(event.target.value)}/>
      {!compatible && <div className={styles.empty}><p>{t('noCompatible')}</p><Link href="/requirements">{t('openRequirements')}</Link></div>}
      <div className={styles.list}>{visible.map((template) => {
        const eligible = template.categoryId === category;
        const counts = assignmentSummary([template], requirements)[0]!;
        return <div key={template.id} className={styles.template} data-selected={selected.includes(template.id)} data-disabled={!eligible}>
          <label className={styles.choice}><input type="checkbox" disabled={!eligible} checked={selected.includes(template.id)} onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, template.id] : ids.filter((id) => id !== template.id))}/><AppearanceIcon appearance={template} size="normal"/><span className={styles.templateText}><strong>{template.title[language]}</strong><small>{eligible ? t('counts', {total: template.documents.length, added: counts.added.length, existing: counts.existingCount}) : t('incompatible')}</small></span></label>
          {eligible && counts.added.length === 0 && <p className={styles.already}>{t('allExisting')}</p>}
          {eligible && <details className={styles.details}><summary>{t('showDocuments')}</summary><ul>{template.documents.map((document) => <li key={document.id}>{templateDocumentType(document)?.name[language]}</li>)}</ul></details>}
        </div>;
      })}</div>
      {compatible && visible.length === 0 && <p className={styles.empty}>{t('noResults')}</p>}
    </> : <div className={styles.list}>{summary.map(({template, added, existingCount}) => <section key={template.id} className={styles.summary}>
      <div className={styles.summaryHeading}><AppearanceIcon appearance={template} size="normal"/><h3>{template.title[language]}</h3><span className={styles.newCount}>{t('newCount', {count: added.length})}</span></div>
      <ul>{added.map((document) => <li key={document.id}><AppIcon name="plus" size={17}/><span>{templateDocumentType(document)?.name[language]}</span><small>{t('new')}</small></li>)}</ul>
      {existingCount > 0 && <p className={styles.existing}>{t('existingCount', {count: existingCount})}</p>}
      {added.length === 0 && <p className={styles.already}>{t('allExisting')}</p>}
    </section>)}</div>}
    {error && <p role="alert" className={styles.error}>{t('applyError')}</p>}
    <div className={styles.actions}><Button variant="secondary" onClick={confirming ? () => {setConfirming(false); setError(false);} : onClose}>{t(confirming ? 'back' : 'cancel')}</Button><Button disabled={chosen.length === 0} onClick={() => {if (!confirming) setConfirming(true); else if (!onApply(chosen.map((template) => template.id))) setError(true);}}>{confirming ? t('apply') : t('continue', {count: chosen.length})}</Button></div>
  </Drawer>;
}
