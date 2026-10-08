'use client';

import {useState, type FormEvent, type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon, type AppIconName} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {EmptyState} from '@/components/ui/EmptyState';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {Surface} from '@/components/ui/Surface';
import {currentUser, duplicateCompanyTaxId, getActiveCompany, getCurrentMembership, updateCompanyProfile, useCompanyState} from '@/features/companies/company-state';
import {companyCountries, companyIndustries, companySizes} from '@/features/companies/company-options';
import {companyProfileDirty, companyProfileValues, validateCompanyProfile, type CompanyProfileValues} from './company-profile';
import type {CompanySettingsViewModel} from './types';
import {useProfileNavigation} from './use-profile-navigation';
import styles from './CompanyProfilePage.module.css';

export function CompanyProfilePage({locale}: {locale: string}) {
  const t = useTranslations('CompanyProfile');
  const app = useTranslations('AppShell');
  const active = getActiveCompany(useCompanyState());
  const member = active && getCurrentMembership(active);
  return <AuthenticatedAppShell locale={locale} currentPath="/company/settings/profile" organizationName={active?.company.name ?? ''} userName={currentUser.fullName} userInitials={currentUser.initials} scope="company-aware">
    {!active || !member ? <EmptyState title={app('workspaceEmptyTitle')} description={app('workspaceEmptyDescription', {company: active?.company.name ?? app('workspaceUnknown')})}/> : <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} items={[{label: app('navigation.settings')}, {label: t('title')}]} />} title={t('title')} titleId="company-profile-title" description={t('description')}/>
      <ProfileForm key={active.company.id} company={active.company} editable={member.role === 'administrator'} language={locale === 'en' ? 'en' : 'ro'}/>
    </div>}
  </AuthenticatedAppShell>;
}

function ProfileSection({name, icon, title, description, children}: {name: string; icon: AppIconName; title: string; description: string; children: ReactNode}) {
  return <Surface className={styles.section} role="region" aria-labelledby={`profile-${name}-title`}>
    <div className={styles.sectionHeading}><span className={styles.icon}><AppIcon name={icon} size={25}/></span><div><h2 id={`profile-${name}-title`}>{title}</h2><p>{description}</p></div></div>
    <div className={styles.sectionBody}>{children}</div>
  </Surface>;
}

function ProfileForm({company, editable, language}: {company: CompanySettingsViewModel['company']; editable: boolean; language: 'ro' | 'en'}) {
  const t = useTranslations('CompanyProfile');
  const [draft, setDraft] = useState<CompanyProfileValues | null>(null);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState(false);
  const baseline = companyProfileValues(company);
  const values = draft ?? baseline;
  const dirty = editable && companyProfileDirty(values, baseline);
  const errors = validateCompanyProfile(values, duplicateCompanyTaxId(values.taxId, company.id));
  const invalid = Object.keys(errors).length > 0;
  const navigation = useProfileNavigation(dirty, () => setDraft(null));

  function update(field: keyof CompanyProfileValues, value: string) {setDraft({...values, [field]: value}); setSaved(false); setFailure(false);}
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || invalid) return;
    const result = updateCompanyProfile(company.id, values);
    if (!result.ok) {setFailure(true); return;}
    setDraft(null); setSaved(true); setFailure(false);
  }
  function field(name: keyof CompanyProfileValues, required = false, type = 'text') {
    return <Field id={`profile-${name}`} name={name} label={t(`fields.${name}`)} value={values[name]} onChange={(event) => update(name, event.target.value)} required={required} type={type} disabled={!editable} controlSize="compact" error={editable && errors[name] ? t(`validation.${errors[name]}`) : undefined}/>;
  }
  function select(name: keyof CompanyProfileValues, options: Record<string, {ro: string; en: string}>, required = false) {
    return <SelectField id={`profile-${name}`} name={name} label={t(`fields.${name}`)} value={values[name]} onChange={(event) => update(name, event.target.value)} required={required} disabled={!editable} controlSize="compact" placeholder={t('selectPlaceholder')} error={editable && errors[name] ? t(`validation.${errors[name]}`) : undefined}>
      {Object.entries(options).map(([id, text]) => <option key={id} value={id}>{text[language]}</option>)}
    </SelectField>;
  }
  return <><form className={styles.form} noValidate onSubmit={save} data-company-profile={company.id}>
    {!editable && <p className={styles.readOnly} role="status"><AppIcon name="info" size={19}/>{t('readOnly')}</p>}
    <ProfileSection name="information" icon="building" title={t('information.title')} description={t('information.description')}>
      <div className={styles.fields}>{field('name', true)}{field('website')}{field('taxId', true)}{select('industry', companyIndustries, true)}{field('registrationNumber')}{select('companySize', companySizes)}</div>
    </ProfileSection>
    <ProfileSection name="contact" icon="user" title={t('contact.title')} description={t('contact.description')}>
      <div className={styles.fields}>{field('contactEmail', false, 'email')}{field('contactPersonName')}{field('contactPhone', false, 'tel')}{field('contactPersonRole')}</div>
    </ProfileSection>
    <ProfileSection name="address" icon="mapPin" title={t('address.title')} description={t('address.description')}>
      <div className={styles.addressFields}>{field('addressLine')}{field('countyRegion')}{field('city')}<div className={styles.fields}>{field('postalCode')}{select('country', companyCountries, true)}</div></div>
    </ProfileSection>
    {failure && <p role="alert" className={styles.failure}>{t('accessDenied')}</p>}
    {editable && <footer className={styles.footer}><span role="status">{saved ? t('saved') : ''}</span><div className={styles.footerActions}>
      <Button variant="secondary" disabled={!dirty} onClick={() => {setDraft(null); setSaved(false); setFailure(false);}}>{t('cancel')}</Button>
      <Button type="submit" disabled={!dirty || invalid} data-page-primary-action>{t('save')}</Button>
    </div></footer>}
  </form>{navigation.confirmDiscard && <ConfirmationDialog icon="warning" title={t('discardTitle')} description={t('discardDescription')} cancelLabel={t('continueEditing')} confirmLabel={t('discardChanges')} onCancel={navigation.continueEditing} onConfirm={navigation.discardAndContinue}/>}</>;
}
