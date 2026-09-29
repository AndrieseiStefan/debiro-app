'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {Surface} from '@/components/ui/Surface';
import {getActiveCompany, switchActiveCompany, useCompanyState} from '@/features/companies/company-state';
import {vendorCategories, type VendorCategory} from '@/features/vendors/types';
import {AddRequirementDocumentDrawer} from './AddRequirementDocumentDrawer';
import {catalogDocument} from './catalog';
import {
  addRequirementDocument, discardExistingRequirementEdit, discardRequirementDraft, getRequirementsWorkspace,
  removeRequirementDocument, saveExistingRequirementEdit, saveRequirementDraft, selectRequirementTemplate, startRequirementDraft,
  updateCustomRequirementDocument, updateExistingRequirementTemplate, updateRequirementDocument, updateRequirementDraft,
  useRequirementsState, validateExistingRequirementEdit, validateRequirementDraft
} from './requirements-state';
import type {ExpiryWarningDays, RequirementTemplateDocument, RequirementTemplateView, RequirementsViewModel, ValidityMonths} from './types';
import type {DrawerPhase} from '@/components/ui/Drawer';
import styles from './RequirementsPage.module.css';

const alertOptions: ExpiryWarningDays[] = [7, 15, 30, 60, 90];
const validityOptions: ValidityMonths[] = [1, 3, 6, 12, 24, 36];

function TemplateIcon({kind}: {kind: RequirementTemplateView['icon']}) {
  const paths: Record<RequirementTemplateView['icon'], ReactNode> = {
    construction: <><path d="M3 18h18v2H3zM5 17v-5a7 7 0 0 1 5-6.7V4h4v1.3A7 7 0 0 1 19 12v5M12 5v12M5 14h14" /></>,
    materials: <><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10" /></>,
    maintenance: <><path d="m4 20 9-9M11 6l7 7M3 18l3 3M14 3l2 3 4-1 1 4-3 2" /></>,
    software: <><rect x="3" y="4" width="18" height="14" rx="1" /><path d="M8 22h8m-4-4v4" /></>,
    consulting: <><circle cx="8" cy="7" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M2 21v-2a6 6 0 0 1 12 0v2M15 15a5 5 0 0 1 7 4v2" /></>,
    logistics: <><path d="M2 6h12v11H2zM14 10h4l4 4v3h-8M5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></>
  };
  return <span className={styles.templateIcon} data-tone={kind} aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg></span>;
}

function ActionGlyph({kind}: {kind: 'copy' | 'trash' | 'save'}) {
  const paths = {
    copy: <><rect x="8" y="7" width="12" height="14" rx="1" /><path d="M16 7V3H4v14h4" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6" /></>,
    save: <><path d="M4 3h14l3 3v15H4V3ZM7 3v7h10V3M7 21v-8h11v8" /></>
  };
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>;
}

function RequirementIcon({tone}: {tone: 'blue' | 'green' | 'amber' | 'red' | 'purple'}) {
  const icon = tone === 'green' ? 'shield' : tone === 'amber' ? 'target' : 'file';
  return <span className={styles.ruleIcon} data-tone={tone}><AppIcon name={icon} size={22}/></span>;
}

function documentDisplay(document: RequirementTemplateDocument, language: 'ro' | 'en') {
  const catalog = document.catalogDocumentTypeId ? catalogDocument(document.catalogDocumentTypeId) : null;
  return {name: catalog?.canonicalName[language] ?? document.customName ?? '', detail: catalog?.description[language] ?? document.customDescription ?? document.issuer ?? '', tone: catalog?.tone ?? 'blue' as const};
}

function UnsavedDialog({onContinue, onDiscard, title, description, continueLabel, discardLabel}: {
  onContinue: () => void; onDiscard: () => void; title: string; description: string; continueLabel: string; discardLabel: string;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = document.querySelector<HTMLElement>('main')?.parentElement;
    const previousInert = background?.inert ?? false;
    const previousHidden = background?.getAttribute('aria-hidden');
    const previousOverflow = document.body.style.overflow;
    if (background) {background.inert = true; background.setAttribute('aria-hidden', 'true');}
    document.body.style.overflow = 'hidden';
    continueRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {event.preventDefault(); onContinue();}
      if (event.key === 'Tab') {
        const dialog = continueRef.current?.closest('[role="alertdialog"]');
        const buttons = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        if (event.shiftKey && document.activeElement === buttons[0]) {event.preventDefault(); buttons.at(-1)?.focus();}
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {event.preventDefault(); buttons[0]?.focus();}
      }
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
      previousFocus?.focus({preventScroll: true});
    };
  }, [onContinue]);
  return createPortal(<div className={styles.confirmBackdrop}>
    <div role="alertdialog" aria-modal="true" aria-labelledby="requirement-discard-title" aria-describedby="requirement-discard-description" className={styles.confirmDialog}>
      <h2 id="requirement-discard-title">{title}</h2><p id="requirement-discard-description">{description}</p>
      <div><Button ref={continueRef} variant="secondary" onClick={onContinue}>{continueLabel}</Button><Button variant="destructive" onClick={onDiscard}>{discardLabel}</Button></div>
    </div>
  </div>, document.body);
}

export function RequirementsPage({locale, view}: {locale: string; view: RequirementsViewModel}) {
  const t = useTranslations('Requirements');
  const app = useTranslations('AppShell');
  const vendors = useTranslations('Vendors');
  const language = locale === 'en' ? 'en' : 'ro';
  const company = getActiveCompany(useCompanyState());
  const companyId = company?.company.id ?? '';
  const workspace = getRequirementsWorkspace(useRequirementsState(), companyId);
  const draft = workspace.draft;
  const selected = workspace.templates.find((template) => template.id === workspace.selectedId) ?? workspace.templates[0] ?? null;
  const editDraft = workspace.editDraft?.templateId === selected?.id ? workspace.editDraft : null;
  const documents = draft?.documents ?? editDraft?.documents ?? selected?.documents ?? [];
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState<ReturnType<typeof validateRequirementDraft>>(null);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [drawerPhase, setDrawerPhase] = useState<DrawerPhase | null>(null);
  const addDocumentRef = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const allowNavigation = useRef(false);
  const visible = workspace.templates.filter((template) => (template.title[language] + ' ' + template.subtitle[language]).toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));
  const draftValidation = draft ? validateRequirementDraft(workspace) : null;
  const editValidation = editDraft ? validateExistingRequirementEdit(workspace) : null;
  const activeValidation = draft ? draftValidation : editValidation;
  const customDocument = documents.find((document) => document.id === editingCustomId && document.customName !== undefined);
  const isDirty = Boolean(draft?.isDirty || editDraft?.isDirty);

  function requestDiscard(action: () => void) {
    if (isDirty) {pendingAction.current = action; setConfirmDiscard(true);}
    else {if (draft) discardRequirementDraft(companyId); if (editDraft) discardExistingRequirementEdit(companyId); setEditingCustomId(null); action();}
  }
  function discardAndContinue() {
    discardRequirementDraft(companyId);
    discardExistingRequirementEdit(companyId);
    setConfirmDiscard(false);
    setValidation(null);
    setEditingCustomId(null);
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }
  function startNew() {requestDiscard(() => {startRequirementDraft(companyId); setValidation(null);});}
  function selectTemplate(id: string) {if (!draft && selected?.id === id) return; requestDiscard(() => {selectRequirementTemplate(companyId, id); setValidation(null);});}
  function saveNew() {
    const result = saveRequirementDraft(companyId);
    if (result === 'saved') setValidation(null);
    else setValidation(result);
  }
  function saveExisting() {
    if (!editDraft?.isDirty) return;
    const result = saveExistingRequirementEdit(companyId);
    if (result === 'saved') {setValidation(null); setEditingCustomId(null);}
    else setValidation(result);
  }

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {event.preventDefault(); event.returnValue = '';}
    function onClick(event: MouseEvent) {
      if (allowNavigation.current || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>('a[href], [data-company-switch-id]');
      if (!target) return;
      const href = target.getAttribute('href');
      if (href && new URL(href, window.location.href).href === window.location.href) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const nextCompanyId = target.getAttribute('data-company-switch-id');
      pendingAction.current = nextCompanyId
        ? () => switchActiveCompany(nextCompanyId)
        : () => {allowNavigation.current = true; target.click(); allowNavigation.current = false;};
      setConfirmDiscard(true);
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {window.removeEventListener('beforeunload', onBeforeUnload); document.removeEventListener('click', onClick, true);};
  }, [isDirty]);

  function renderRow(document: RequirementTemplateDocument) {
    const display = documentDisplay(document, language);
    const current = document;
    return <tr key={document.id} data-document-id={document.id}>
      <td><div className={styles.ruleIdentity}><RequirementIcon tone={display.tone}/><span><strong>{display.name}</strong><small>{display.detail}</small></span></div></td>
      <td><label className={styles.mandatory}><input type="checkbox" checked={current.required} onChange={(event) => updateRequirementDocument(companyId, document.id, {required: event.target.checked}, language)} aria-label={t('mandatoryFor', {name: display.name})}/><span className={styles.toggle} aria-hidden="true"/><span data-required={current.required}>{current.required ? t('mandatory') : t('optional')}</span></label></td>
      <td><label className={styles.srOnly} htmlFor={'alert-' + document.id}>{t('alertFor', {name: display.name})}</label><select id={'alert-' + document.id} value={current.expiryWarningDays} onChange={(event) => updateRequirementDocument(companyId, document.id, {expiryWarningDays: Number(event.target.value) as ExpiryWarningDays}, language)}>{alertOptions.map((days) => <option key={days} value={days}>{t('days', {count: days})}</option>)}</select></td>
      <td><label className={styles.srOnly} htmlFor={'validity-' + document.id}>{t('validityFor', {name: display.name})}</label><select id={'validity-' + document.id} value={current.validityMonths} onChange={(event) => updateRequirementDocument(companyId, document.id, {validityMonths: Number(event.target.value) as ValidityMonths}, language)}>{validityOptions.map((months) => <option key={months} value={months}>{t('months', {count: months})}</option>)}</select></td>
      <td>{draft ? <button type="button" aria-disabled="true" className={styles.rowAction} aria-label={t('rowActionsFor', {name: display.name})}><AppIcon name="more" size={20}/></button>
        : <span className={styles.rowActions}>{document.customName !== undefined && <button type="button" className={styles.rowAction} aria-label={t('editCustomDocument', {name: display.name})} onClick={() => setEditingCustomId(document.id)}><AppIcon name="edit" size={18}/></button>}<button type="button" className={styles.rowAction} aria-label={t('removeDocument', {name: display.name})} onClick={() => {removeRequirementDocument(companyId, document.id, language); if (editingCustomId === document.id) setEditingCustomId(null); setValidation(null);}}><ActionGlyph kind="trash"/></button></span>}</td>
    </tr>;
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/requirements" organizationName={company?.company.name ?? view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount} scope="company-aware">
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.requirements')}]} />} title={t('title')} titleId="requirements-title" description={t('description')}
        supportingContent={<div className={styles.headerCallout}><span className={styles.headerCalloutIcon}><AppIcon name="target" size={27}/></span><span>{t('calloutOne')}<br/>{t('calloutTwo')}</span></div>}
        actions={<AuthenticatedPagePrimaryAction icon="plus" onClick={startNew}>{t('newTemplate')}</AuthenticatedPagePrimaryAction>}/>

      <div className={styles.workspace}>
        <Surface className={styles.templatePanel}>
          <h2>{t('templatesTitle')}</h2>
          <label className={styles.search}><AppIcon name="search" size={22}/><span className={styles.srOnly}>{t('searchLabel')}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')}/></label>
          <div className={styles.templateList}>
            {draft && <div className={styles.templateItem} data-selected="true" data-template-id={draft.id}><span className={styles.addIcon}><AppIcon name="plus" size={26}/></span><span className={styles.templateCopy}><strong>{t('creation.draftListTitle')}</strong><span>{t('creation.draftListDescription')}</span><small>{t('documentCount', {count: draft.documents.length})}</small></span><AppIcon name="chevronRight" size={18}/></div>}
            {visible.map((template) => <button type="button" key={template.id} className={styles.templateItem} data-template-id={template.id} data-selected={!draft && selected?.id === template.id} aria-current={!draft && selected?.id === template.id ? 'true' : undefined} onClick={() => selectTemplate(template.id)}>
              <TemplateIcon kind={template.icon}/><span className={styles.templateCopy}><strong>{template.title[language]}</strong><span>{template.subtitle[language] || vendors(('category.' + template.categoryId) as 'category.construction')}</span><small>{t('documentCount', {count: template.documents.length})}</small></span><AppIcon name="chevronRight" size={18}/>
            </button>)}
            {!draft && visible.length === 0 && <p className={styles.noResults}>{workspace.templates.length ? t('noResults') : t('creation.emptyCompanyDescription')}</p>}
          </div>
          <button type="button" className={styles.addTemplate} onClick={startNew}><span className={styles.addIcon}><AppIcon name="plus" size={26}/></span><span><strong>{t('addNewTemplate')}</strong><small>{t('addNewDescription')}</small></span></button>
        </Surface>

        <Surface className={styles.editor}>
          {draft ? <div className={styles.editorTop}><span className={styles.addIcon}><AppIcon name="file" size={29}/></span><div className={styles.editorIdentity}><h2>{t('creation.title')}</h2><p>{t('creation.subtitle')}</p></div></div>
            : selected ? <div className={styles.editorTop}><TemplateIcon kind={selected.icon}/><div className={styles.editorIdentity}><h2>{selected.title[language]}</h2><p>{selected.subtitle[language] || vendors(('category.' + selected.categoryId) as 'category.construction')}</p></div><div className={styles.editorActions}><button type="button" aria-disabled="true" className={styles.iconButton} aria-label={t('templateActions')}><AppIcon name="more" size={21}/></button><Button variant="secondary" aria-disabled="true"><ActionGlyph kind="copy"/>{t('duplicateTemplate')}</Button></div></div>
            : <div className={styles.editorTop}><span className={styles.addIcon}><AppIcon name="file" size={29}/></span><div className={styles.editorIdentity}><h2>{t('creation.emptyCompanyTitle')}</h2><p>{t('creation.emptyCompanyDescription')}</p></div></div>}

          {(draft || selected) && <>
            <div className={styles.draftFields}>
              <Field id="requirement-template-name" label={t('creation.name')} placeholder={t('creation.namePlaceholder')} required value={draft?.name ?? editDraft?.name ?? selected!.title[language]}
                onChange={(event) => {if (draft) updateRequirementDraft(companyId, {name: event.target.value}); else updateExistingRequirementTemplate(companyId, language, {name: event.target.value}); setValidation(null);}}
                error={validation === 'name' || (!draft && editValidation === 'name') ? t('creation.nameRequired') : validation === 'duplicateName' || activeValidation === 'duplicateName' ? t('creation.duplicateName') : undefined} controlSize="compact"/>
              <SelectField id="requirement-template-category" label={t('creation.category')} placeholder={t('creation.categoryPlaceholder')} required value={draft?.categoryId ?? editDraft?.categoryId ?? selected!.categoryId}
                onChange={(event) => {if (draft) updateRequirementDraft(companyId, {categoryId: event.target.value as VendorCategory | ''}); else updateExistingRequirementTemplate(companyId, language, {categoryId: event.target.value as VendorCategory | ''}); setValidation(null);}}
                error={validation === 'category' || (!draft && editValidation === 'category') ? t('creation.categoryRequired') : undefined} controlSize="compact">{vendorCategories.map((category) => <option key={category} value={category}>{vendors(('category.' + category) as 'category.construction')}</option>)}</SelectField>
              <label className={styles.draftDescription}>{t('creation.description')}<textarea value={draft?.description ?? editDraft?.description ?? selected!.subtitle[language]}
                onChange={(event) => {if (draft) updateRequirementDraft(companyId, {description: event.target.value}); else updateExistingRequirementTemplate(companyId, language, {description: event.target.value}); setValidation(null);}} placeholder={t('creation.descriptionPlaceholder')}/></label>
            </div>
            <div className={styles.tabs} role="tablist" aria-label={t('tabsLabel')}><button type="button" role="tab" aria-selected="true" id="documents-tab" aria-controls="documents-panel">{t('requiredDocuments', {count: documents.length})}</button><button type="button" role="tab" aria-selected="false" aria-disabled="true">{t('previewTab')}</button></div>
            <div id="documents-panel" role="tabpanel" aria-labelledby="documents-tab" className={styles.documentsPanel}>
              <div className={styles.sectionHeading}><h3>{t('documentsAndRules')}</h3><Button ref={addDocumentRef} onClick={() => setDrawerPhase('open')}><AppIcon name="plus" size={20}/>{t('addDocument')}</Button></div>
              {documents.length === 0 ? <div className={styles.documentEmpty}><AppIcon name="file" size={27}/><h4>{t('creation.emptyTitle')}</h4><p>{t('creation.emptyDescription')}</p></div>
                : <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}><table className={styles.rulesTable}><thead><tr><th scope="col">{t('table.document')}</th><th scope="col">{t('table.mandatory')}</th><th scope="col">{t('table.expiryAlert')}</th><th scope="col">{t('table.validity')}</th><th scope="col">{t('table.actions')}</th></tr></thead><tbody>{documents.map(renderRow)}</tbody></table></div>}
              {customDocument && !draft && <div className={styles.customEditor}>
                <div className={styles.customEditorHeading}><h4>{t('editCustomDocumentTitle')}</h4><button type="button" onClick={() => setEditingCustomId(null)} aria-label={t('closeCustomEditor')}><AppIcon name="close" size={18}/></button></div>
                <div className={styles.customEditorFields}>
                  <Field id="requirement-custom-name" label={t('drawer.documentName')} required value={customDocument.customName ?? ''} controlSize="compact" onChange={(event) => {updateCustomRequirementDocument(companyId, customDocument.id, {customName: event.target.value}, language); setValidation(null);}}
                    error={editValidation === 'duplicateDocument' ? t('drawer.duplicate') : editValidation === 'invalidDocument' ? t('drawer.nameRequired') : undefined}/>
                  <Field id="requirement-custom-issuer" label={t('drawer.issuer')} value={customDocument.issuer ?? ''} controlSize="compact" onChange={(event) => updateCustomRequirementDocument(companyId, customDocument.id, {issuer: event.target.value}, language)}/>
                  <label className={styles.draftDescription}>{t('drawer.description')}<textarea value={customDocument.customDescription ?? ''} maxLength={200} onChange={(event) => updateCustomRequirementDocument(companyId, customDocument.id, {customDescription: event.target.value}, language)}/></label>
                </div>
              </div>}
              {(validation === 'documents' || activeValidation === 'documents') && <p className={styles.draftError} role="alert">{t('creation.documentsRequired')}</p>}
              {(validation === 'invalidDocument' || activeValidation === 'invalidDocument') && <p className={styles.draftError} role="alert">{t('creation.invalidDocument')}</p>}
              {(validation === 'duplicateDocument' || activeValidation === 'duplicateDocument') && <p className={styles.draftError} role="alert">{t('drawer.duplicate')}</p>}
            </div>
            <div className={styles.notice}><span><AppIcon name="info" size={20}/></span><p>{draft ? t('creation.draftNotice') : t('availability', {name: vendors(('category.' + (editDraft?.categoryId || selected!.categoryId)) as 'category.construction')})}</p></div>
            <div className={styles.footer}>{!draft && <Button variant="destructive" aria-disabled="true"><ActionGlyph kind="trash"/>{t('deleteTemplate')}</Button>}<span className={styles.footerRight}><Button variant="secondary" onClick={() => {if (draft) requestDiscard(() => {}); else {discardExistingRequirementEdit(companyId); setEditingCustomId(null); setValidation(null);}}}>{t('cancel')}</Button><Button aria-disabled={draft ? Boolean(draftValidation) : !editDraft?.isDirty || Boolean(editValidation)} onClick={() => draft ? saveNew() : saveExisting()}><ActionGlyph kind="save"/>{t('saveTemplate')}</Button></span></div>
          </>}
        </Surface>
      </div>
    </div>
    {drawerPhase && <AddRequirementDocumentDrawer phase={drawerPhase} onClose={() => setDrawerPhase('closing')} onExited={() => setDrawerPhase(null)} triggerRef={addDocumentRef} locale={locale} onAdd={(document) => addRequirementDocument(companyId, document, language)}/>}
    {confirmDiscard && <UnsavedDialog title={t('creation.discardTitle')} description={draft ? t('creation.discardDescription') : t('editDiscardDescription')} continueLabel={t('creation.continueEditing')} discardLabel={t('creation.discardChanges')} onContinue={() => {setConfirmDiscard(false); pendingAction.current = null;}} onDiscard={discardAndContinue}/>}
  </AuthenticatedAppShell>;
}
