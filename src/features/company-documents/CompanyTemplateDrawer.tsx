'use client';

import {useCallback, useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, DrawerHeader} from '@/components/ui/Drawer';
import {SelectField} from '@/components/ui/SelectField';
import {Button, ButtonLink} from '@/components/ui/Button';
import {getRequirementsWorkspace, useRequirementsState} from '@/features/requirements/requirements-state';
import {templateAppliesToTarget} from '@/features/requirements/template-scope';
import {companyDocumentAdapter, type DocumentManagementAdapter} from './document-adapter';
import {templateDocumentType} from '@/features/requirements/document-types';
import preview from '@/features/vendors/ApplyTemplatesDrawer.module.css';
import styles from '@/features/documents/AddDocumentDrawer.module.css';

/** The existing company-template application flow, separate from file upload. */
export function CompanyTemplateDrawer({companyId, locale, onClose, adapter = companyDocumentAdapter}: {adapter?: DocumentManagementAdapter; companyId: string; locale: 'ro' | 'en'; onClose: () => void}) {
  const t = useTranslations('CompanyDocumentManagement'), common = useTranslations('DocumentManagement'), templatesT = useTranslations('VendorTemplates'), requirementsT = useTranslations('Requirements');
  const templates = getRequirementsWorkspace(useRequirementsState(), companyId).templates.filter((item) => templateAppliesToTarget(item, adapter.scope));
  const owner = useTranslations(adapter.scope === 'employee' ? 'EmployeeDocuments' : 'CompanyDocumentManagement');
  const triggerRef = useRef<HTMLElement | null>(typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const [phase, setPhase] = useState<'open' | 'closing'>('open');
  const [templateId, setTemplateId] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
  const close = useCallback(() => setPhase('closing'), []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = adapter.applyCompanyTemplate(companyId, templateId);
    if (!result.ok) {setError(t(`errors.${result.reason}`)); setMessage('');}
    else {setError(''); setMessage(t('templateApplied', {count: result.added}));}
  }
  return <Drawer phase={phase} onClose={close} onExited={onClose} triggerRef={triggerRef} titleId="company-template-title" descriptionId="company-template-description" closeLabel={common('close')} contentClassName={styles.content}>
    <DrawerHeader titleId="company-template-title" title={templatesT('title')}/>
    <p id="company-template-description" className={styles.intro}>{owner('templateDescription')}</p>
    <form noValidate onSubmit={submit} className={styles.form}>
      {templates.length ? <SelectField controlSize="compact" id="company-template" label={t('template')} placeholder={t('chooseTemplate')} value={templateId} onChange={(event) => {setTemplateId(event.target.value); setMessage(''); setError('');}}>{templates.map((template) => <option key={template.id} value={template.id}>{template.title[locale]}</option>)}</SelectField> : <><p>{owner('noTemplates')}</p>{adapter.access(companyId).replace && <ButtonLink variant="secondary" href="/requirements">{templatesT('openRequirements')}</ButtonLink>}</>}
      {adapter.scope === 'employee' && templates.find((item) => item.id === templateId) && <details className={preview.details}><summary>{templatesT('showDocuments')}</summary><ul>{templates.find((item) => item.id === templateId)!.documents.map((rule) => <li key={rule.id}>{templateDocumentType(rule)?.name[locale]} — {requirementsT(rule.required ? 'mandatory' : 'optional')}</li>)}</ul></details>}
      {message && <p role="status">{message}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><Button variant="secondary" onClick={close}>{common('cancel')}</Button><Button type="submit" disabled={!templateId || !adapter.access(companyId).replace}>{t('applyTemplate')}</Button></div>
    </form>
  </Drawer>;
}
