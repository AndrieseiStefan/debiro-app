'use client';

import {useRef, useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {RoleBadge} from '@/features/company-settings/RoleVisual';
import {createCompany, currentUser, getCurrentMembership, switchActiveCompany, useCompanyState, type CompanyIndustry} from './company-state';
import styles from './MyCompaniesPage.module.css';

type FormValues = {name: string; industry: CompanyIndustry | ''; taxId: string; country: string};
const emptyForm: FormValues = {name: '', industry: '', taxId: '', country: ''};
const industryOptions = ['professional', 'construction', 'cleaning', 'other'] as const;
const countryOptions = ['RO', 'DE', 'FR'] as const;

export function MyCompaniesPage({locale}: {locale: string}) {
  const t = useTranslations('Companies');
  const roles = useTranslations('CompanyMembers');
  const snapshot = useCompanyState();
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<'required' | 'duplicate' | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({...current, [key]: value}));
    setError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!form.name.trim() || !form.industry || !form.taxId.trim() || !form.country) {
      setError('required');
      return;
    }
    const result = createCompany({...form, industry: form.industry});
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setForm(emptyForm);
    setSubmitted(false);
    setError(null);
  }

  return <AuthenticatedAppShell locale={locale} currentPath="/profile/companies" organizationName="" userName={currentUser.fullName} userInitials={currentUser.initials} scope="global">
    <div className={styles.page}>
      <div className={styles.columns}>
        <section className={styles.mainColumn} aria-labelledby="companies-title">
          <AuthenticatedPageHeader
            context={<nav className={styles.breadcrumb} aria-label={t('breadcrumbLabel')}><span>{t('profile')}</span><AppIcon name="chevronRight" size={16}/><span aria-current="page">{t('title')}</span></nav>}
            title={t('title')} titleId="companies-title" description={t('description')}
          />
          <div className={styles.notice}><span className={styles.noticeIcon}><AppIcon name="info" size={21}/></span><div><strong>{t('noticeTitle')}</strong><p>{t('noticeDescription')}</p></div></div>
          <Surface className={styles.listPanel}>
            <div className={styles.listHeading}><h2>{t('accessible')}</h2><span>{t('count', {count: snapshot.companies.length})}</span></div>
            {snapshot.companies.length === 0 && <p className={styles.empty}>{t('noCompanies')}</p>}
            <div className={styles.companyList}>
              {snapshot.companies.map((record) => {
                const membership = getCurrentMembership(record);
                const isActive = snapshot.activeCompanyId === record.company.id;
                return <article key={record.company.id} className={styles.companyCard} data-company-id={record.company.id} data-active={isActive}>
                  <span className={styles.companyIcon} aria-hidden="true"><AppIcon name="building" size={29}/></span>
                  <div className={styles.companyInfo}>
                    <h3>{record.company.name}</h3>
                    <p>{t('taxId')}: {record.company.taxId}<span aria-hidden="true">|</span>{record.company.industry[locale === 'en' ? 'en' : 'ro']}</p>
                    <div className={styles.badges}>
                      {membership && <RoleBadge role={membership.role} label={roles(`roles.${membership.role}`)} iconSize={16}/>}
                      <span className={styles.plan}><AppIcon name="crown" size={17}/>{record.company.subscription.plan}</span>
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <button type="button" aria-disabled="true" aria-label={`${record.company.name} — ${t('accessible')}`} className={styles.more}><AppIcon name="more" size={19}/></button>
                    {isActive ? <span className={styles.active}><span aria-hidden="true"/>{t('active')}</span> : <Button variant="secondary" onClick={() => switchActiveCompany(record.company.id)}><AppIcon name="sort" size={18}/>{t('switch')}</Button>}
                  </div>
                </article>;
              })}
              <button type="button" className={styles.createTile} aria-controls="create-company-form" onClick={() => nameRef.current?.focus()}><span><AppIcon name="plus" size={29}/></span><span><strong>{t('createTile')}</strong><small>{t('createTileDescription')}</small></span><AppIcon name="chevronRight" size={20}/></button>
            </div>
          </Surface>
        </section>

        <aside className={styles.sideColumn}>
          <Surface className={styles.createPanel}>
            <h2>{t('createTitle')}</h2><p className={styles.createDescription}>{t('createDescription')}</p>
            <form id="create-company-form" noValidate onSubmit={submit}>
              <label><span className={styles.fieldLabel}>{t('name')} <em aria-hidden="true">*</em></span><input ref={nameRef} value={form.name} onChange={(event) => update('name', event.target.value)} aria-invalid={submitted && !form.name.trim()}/></label>
              <label><span className={styles.fieldLabel}>{t('industry')} <em aria-hidden="true">*</em></span><select value={form.industry} onChange={(event) => update('industry', event.target.value as CompanyIndustry | '')} aria-invalid={submitted && !form.industry}><option value="">{t('chooseIndustry')}</option>{industryOptions.map((industry) => <option key={industry} value={industry}>{t(`industries.${industry}`)}</option>)}</select></label>
              <label><span className={styles.fieldLabel}>{t('taxIdField')} <em aria-hidden="true">*</em></span><input value={form.taxId} onChange={(event) => update('taxId', event.target.value)} aria-invalid={submitted && (!form.taxId.trim() || error === 'duplicate')}/></label>
              <label><span className={styles.fieldLabel}>{t('country')} <em aria-hidden="true">*</em></span><select value={form.country} onChange={(event) => update('country', event.target.value)} aria-invalid={submitted && !form.country}><option value="">{t('chooseCountry')}</option>{countryOptions.map((country) => <option key={country} value={country}>{t(`countries.${country}`)}</option>)}</select></label>
              <label><span className={styles.fieldLabel}>{t('administrator')} <em aria-hidden="true">*</em></span><input value={currentUser.fullName} readOnly/></label>
              {error && <p className={styles.error} role="alert">{t(error)}</p>}
              <p className={styles.createNotice}><AppIcon name="info" size={18}/>{t('createNotice')}</p>
              <div className={styles.formActions}><Button variant="secondary" onClick={() => {setForm(emptyForm); setSubmitted(false); setError(null);}}>{t('cancel')}</Button><Button type="submit"><AppIcon name="plus" size={20}/>{t('create')}</Button></div>
            </form>
          </Surface>
          <Surface className={styles.howPanel}><h2>{t('howTitle')}</h2><ol>{(['one', 'two', 'three'] as const).map((step, index) => <li key={step}><span>{index + 1}</span><div><strong>{t(`steps.${step}Title`)}</strong><p>{t(`steps.${step}Description`)}</p></div></li>)}</ol></Surface>
        </aside>
      </div>
    </div>
  </AuthenticatedAppShell>;
}
