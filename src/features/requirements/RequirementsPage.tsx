'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader, AuthenticatedPagePrimaryAction} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import type {RequirementRuleView, RequirementTemplateView, RequirementsViewModel} from './types';
import styles from './RequirementsPage.module.css';

function TemplateIcon({kind}: {kind: RequirementTemplateView['icon']}) {
  const paths = {
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

function RequirementIcon({tone}: {tone: RequirementRuleView['tone']}) {
  const icon = tone === 'green' ? 'shield' : tone === 'amber' ? 'target' : 'file';
  return <span className={styles.ruleIcon} data-tone={tone}><AppIcon name={icon} size={22} /></span>;
}

export function RequirementsPage({locale, view}: {locale: string; view: RequirementsViewModel}) {
  const t = useTranslations('Requirements');
  const language = locale === 'en' ? 'en' : 'ro';
  const [selectedId, setSelectedId] = useState(view.templates[0].id);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Record<string, {mandatory: boolean; alertDays: number; validityMonths: number}>>({});
  const selected = view.templates.find((template) => template.id === selectedId) ?? view.templates[0];
  const visible = view.templates.filter((template) => `${template.title[language]} ${template.subtitle[language]}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)));

  function updateRule(rule: RequirementRuleView, change: Partial<{mandatory: boolean; alertDays: number; validityMonths: number}>) {
    const key = `${selected.id}:${rule.id}`;
    setDraft((previous) => ({...previous, [key]: {...{mandatory: rule.mandatory, alertDays: rule.alertDays, validityMonths: rule.validityMonths}, ...previous[key], ...change}}));
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/requirements" organizationName={view.organization.name} userName={view.user.fullName} userInitials={view.user.initials} notificationCount={view.notificationCount}>
    <div className={styles.page}>
      <AuthenticatedPageHeader
        context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: t('breadcrumbDocuments')}, {label: t('title')}]} />}
        title={t('title')}
        titleId="requirements-title"
        description={t('description')}
        supportingContent={<div className={styles.headerCallout}><span className={styles.headerCalloutIcon}><AppIcon name="target" size={27} /></span><span>{t('calloutOne')}<br />{t('calloutTwo')}</span></div>}
        actions={<AuthenticatedPagePrimaryAction icon="plus" aria-disabled="true">{t('newTemplate')}</AuthenticatedPagePrimaryAction>}
      />

      <div className={styles.workspace}>
        <Surface className={styles.templatePanel}>
          <h2>{t('templatesTitle')}</h2>
          <label className={styles.search}><AppIcon name="search" size={22} /><span className={styles.srOnly}>{t('searchLabel')}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} /></label>
          <div className={styles.templateList}>
            {visible.map((template) => <button type="button" key={template.id} className={styles.templateItem} data-selected={selected.id === template.id} aria-current={selected.id === template.id ? 'true' : undefined} onClick={() => setSelectedId(template.id)}>
              <TemplateIcon kind={template.icon} />
              <span className={styles.templateCopy}><strong>{template.title[language]}</strong><span>{template.subtitle[language]}</span><small>{t('documentCount', {count: template.rules.length})}</small></span>
              <AppIcon name="chevronRight" size={18} />
            </button>)}
            {visible.length === 0 && <p className={styles.noResults}>{t('noResults')}</p>}
          </div>
          <button type="button" aria-disabled="true" className={styles.addTemplate}><span className={styles.addIcon}><AppIcon name="plus" size={26} /></span><span><strong>{t('addNewTemplate')}</strong><small>{t('addNewDescription')}</small></span></button>
        </Surface>

        <Surface className={styles.editor}>
          <div className={styles.editorTop}>
            <TemplateIcon kind={selected.icon} />
            <div className={styles.editorIdentity}><h2>{selected.title[language]}</h2><p>{selected.subtitle[language]}</p></div>
            <div className={styles.editorActions}><button type="button" aria-disabled="true" className={styles.iconButton} aria-label={t('templateActions')}><AppIcon name="more" size={21} /></button><Button variant="secondary" aria-disabled="true"><ActionGlyph kind="copy" />{t('duplicateTemplate')}</Button></div>
          </div>

          <div className={styles.tabs} role="tablist" aria-label={t('tabsLabel')}>
            <button type="button" role="tab" aria-selected="true" id="documents-tab" aria-controls="documents-panel">{t('requiredDocuments', {count: selected.rules.length})}</button>
            <button type="button" role="tab" aria-selected="false" aria-disabled="true">{t('settingsTab')}</button>
            <button type="button" role="tab" aria-selected="false" aria-disabled="true">{t('previewTab')}</button>
          </div>

          <div id="documents-panel" role="tabpanel" aria-labelledby="documents-tab" className={styles.documentsPanel}>
            <div className={styles.sectionHeading}><h3>{t('documentsAndRules')}</h3><Button aria-disabled="true"><AppIcon name="plus" size={20} />{t('addDocument')}</Button></div>
            <div className={styles.tableScroll} role="region" aria-label={t('tableRegion')} tabIndex={0}>
              <table className={styles.rulesTable}>
                <thead><tr><th scope="col">{t('table.document')}</th><th scope="col">{t('table.mandatory')}</th><th scope="col">{t('table.expiryAlert')}</th><th scope="col">{t('table.validity')}</th><th scope="col">{t('table.actions')}</th></tr></thead>
                <tbody>{selected.rules.map((rule) => {
                  const current = draft[`${selected.id}:${rule.id}`] ?? rule;
                  return <tr key={rule.id}>
                    <td><div className={styles.ruleIdentity}><RequirementIcon tone={rule.tone} /><span><strong>{rule.name[language]}</strong><small>{rule.detail[language]}</small></span></div></td>
                    <td><label className={styles.mandatory}><input type="checkbox" checked={current.mandatory} onChange={(event) => updateRule(rule, {mandatory: event.target.checked})} aria-label={t('mandatoryFor', {name: rule.name[language]})} /><span className={styles.toggle} aria-hidden="true" /><span data-required={current.mandatory}>{current.mandatory ? t('mandatory') : t('optional')}</span></label></td>
                    <td><label className={styles.srOnly} htmlFor={`alert-${rule.id}`}>{t('alertFor', {name: rule.name[language]})}</label><select id={`alert-${rule.id}`} value={current.alertDays} onChange={(event) => updateRule(rule, {alertDays: Number(event.target.value)})}><option value="30">{t('days', {count: 30})}</option><option value="60">{t('days', {count: 60})}</option></select></td>
                    <td><label className={styles.srOnly} htmlFor={`validity-${rule.id}`}>{t('validityFor', {name: rule.name[language]})}</label><select id={`validity-${rule.id}`} value={current.validityMonths} onChange={(event) => updateRule(rule, {validityMonths: Number(event.target.value)})}><option value="12">{t('months', {count: 12})}</option><option value="36">{t('months', {count: 36})}</option></select></td>
                    <td><button type="button" aria-disabled="true" className={styles.rowAction} aria-label={t('rowActionsFor', {name: rule.name[language]})}><AppIcon name="more" size={20} /></button></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </div>

          <div className={styles.notice}><span><AppIcon name="info" size={20} /></span><p>{t('availability', {name: selected.title[language]})}</p></div>
          <div className={styles.footer}><Button variant="destructive" aria-disabled="true"><ActionGlyph kind="trash" />{t('deleteTemplate')}</Button><span className={styles.footerRight}><Button variant="secondary" onClick={() => setDraft({})}>{t('cancel')}</Button><Button aria-disabled="true"><ActionGlyph kind="save" />{t('saveTemplate')}</Button></span></div>
        </Surface>
      </div>
    </div>
  </AuthenticatedAppShell>;
}
