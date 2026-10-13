'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {AuthenticatedAppShell} from '@/components/layout/AuthenticatedAppShell';
import {AuthenticatedBreadcrumbs} from '@/components/layout/AuthenticatedBreadcrumbs';
import {AuthenticatedPageHeader} from '@/components/layout/AuthenticatedPageHeader';
import {AppIcon} from '@/components/layout/AppIcon';
import {Avatar} from '@/components/ui/Avatar';
import {Button} from '@/components/ui/Button';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {Surface} from '@/components/ui/Surface';
import {Switch} from '@/components/ui/Switch';
import {useProfileNavigation} from '@/features/company-settings/use-profile-navigation';
import {setUserPreference, updateUserProfile, userProfileDirty, userProfileValues, useUserProfile, validateUserProfile, type UserProfileValues} from './user-profile-state';
import styles from './MyProfilePage.module.css';

export function MyProfilePage({locale}: {locale: string}) {
  const t = useTranslations('MyProfile');
  const common = useTranslations('CompanyProfile');
  const profile = useTranslations('Companies');
  const user = useUserProfile();
  const router = useRouter();
  const [draft, setDraft] = useState<UserProfileValues | null>(null);
  const [saved, setSaved] = useState(false);
  const values = draft ?? userProfileValues(user);
  const dirty = userProfileDirty(values, user);
  const errors = validateUserProfile(values, user.email);
  const invalid = Object.values(errors).some(Boolean);
  const navigation = useProfileNavigation(dirty, () => setDraft(null), 'global');
  function update(key: keyof UserProfileValues, value: string) {setDraft({...values, [key]: value}); setSaved(false);}
  function save(event: FormEvent) {event.preventDefault(); if (dirty && !invalid && updateUserProfile(values)) {setDraft(null); setSaved(true);}}

  return <AuthenticatedAppShell locale={locale} currentPath="/profile" organizationName="" userName={user.fullName} userInitials={user.initials} scope="global">
    <div className={styles.page}>
      <AuthenticatedPageHeader context={<AuthenticatedBreadcrumbs label={t('breadcrumbLabel')} root={{label: profile('profile')}} items={[]} />} title={t('title')} titleId="my-profile-title" description={t('description')}/>
      <Surface className={styles.section} role="region" aria-labelledby="personal-title">
        <div className={styles.heading}><AppIcon name="user" size={25}/><div><h2 id="personal-title">{t('personalTitle')}</h2><p>{t('personalDescription')}</p></div></div>
        <form noValidate onSubmit={save}>
          <div className={styles.personal}><Avatar initials={user.initials} size="large"/><div className={styles.fields}>
            <Field id="user-firstName" label={t('firstName')} required autoComplete="given-name" value={values.firstName} onChange={(event) => update('firstName', event.target.value)} controlSize="compact" error={errors.firstName ? t('required') : undefined}/>
            <Field id="user-lastName" label={t('lastName')} required autoComplete="family-name" value={values.lastName} onChange={(event) => update('lastName', event.target.value)} controlSize="compact" error={errors.lastName ? t('required') : undefined}/>
            <Field id="user-email" label={t('email')} required type="email" autoComplete="email" value={user.email} readOnly controlSize="compact" error={errors.email ? t('invalidEmail') : undefined}/>
            <Field id="user-phone" label={t('phone')} type="tel" autoComplete="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} controlSize="compact"/>
          </div></div>
          <div className={styles.actions}><span role="status">{saved ? t('saved') : ''}</span><Button variant="secondary" disabled={!dirty} onClick={() => {setDraft(null); setSaved(false);}}>{common('cancel')}</Button><Button type="submit" disabled={!dirty || invalid}>{t('save')}</Button></div>
        </form>
      </Surface>
      <Surface className={styles.section} role="region" aria-labelledby="preferences-title">
        <div className={styles.heading}><AppIcon name="settings" size={25}/><div><h2 id="preferences-title">{t('preferencesTitle')}</h2><p>{t('preferencesDescription')}</p></div></div>
        <div className={styles.preferences}>
          <div className={styles.preference}><span className={styles.preferenceIcon}><AppIcon name="globe" size={23}/></span><div className={styles.preferenceCopy}><strong>{t('language')}</strong><p>{t('languageDescription')}</p></div><SelectField id="user-language" className={styles.languageSelect} label={t('language')} value={locale} onChange={(event) => {const nextLocale = event.target.value; navigation.requestNavigation(() => router.replace('/profile', {locale: nextLocale}));}} controlSize="compact"><option value="ro">Română</option><option value="en">English</option></SelectField></div>
          {(['emailNotificationsEnabled', 'periodicSummaryEnabled'] as const).map((key) => <label className={styles.preference} key={key}><span className={styles.preferenceIcon}><AppIcon name={key === 'emailNotificationsEnabled' ? 'bell' : 'file'} size={23}/></span><span className={styles.preferenceCopy}><strong>{t(key)}</strong><span>{t(`${key}Description`)}</span></span><Switch checked={user[key]} onChange={(event) => setUserPreference(key, event.target.checked)}/></label>)}
        </div>
      </Surface>
    </div>
    {navigation.confirmDiscard && <ConfirmationDialog icon="warning" title={common('discardTitle')} description={common('discardDescription')} cancelLabel={common('continueEditing')} confirmLabel={common('discardChanges')} onCancel={navigation.continueEditing} onConfirm={navigation.discardAndContinue}/>}
  </AuthenticatedAppShell>;
}
