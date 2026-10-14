'use client';

import {useCallback, useEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {Drawer, DrawerHeader, type DrawerPhase} from '@/components/ui/Drawer';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {companyCountries} from '@/features/companies/company-options';
import {duplicateCompanyTaxId, replaceCompanyDemoPayment, updateCompanyBillingDetails} from '@/features/companies/company-state';
import {billingCompanyFields, billingDetailsValues, normalizedBillingDetails, validDemoPayment, validateBillingDetails, type DemoPaymentValues} from './billing-details';
import type {CompanySettingsViewModel} from './types';
import {useProfileNavigation} from './use-profile-navigation';
import styles from './BillingEditors.module.css';

type EditorProps = {company: CompanySettingsViewModel['company']; phase: DrawerPhase; onClose: () => void; onExited: () => void; triggerRef: RefObject<HTMLButtonElement | null>; onSaved: () => void; locale: string};
function BillingEditorFrame({id, title, description, dirty, children, onSubmit, saveDisabled, ...drawer}: Omit<EditorProps, 'company' | 'onSaved' | 'locale'> & {id: string; title: string; description: string; dirty: boolean; children: ReactNode; onSubmit: () => void; saveDisabled: boolean}) {
  const t = useTranslations('CompanyBilling');
  const profile = useTranslations('CompanyProfile');
  const navigation = useProfileNavigation(dirty, () => {});
  const navigationRef = useRef(navigation.requestNavigation);
  useEffect(() => {navigationRef.current = navigation.requestNavigation;}, [navigation.requestNavigation]);
  const requestClose = useCallback(() => navigationRef.current(drawer.onClose), [drawer.onClose]);
  return <Drawer {...drawer} onClose={requestClose} titleId={`${id}-title`} descriptionId={`${id}-description`} closeLabel={t('editor.close')} contentClassName={styles.content}>
    <DrawerHeader title={title} titleId={`${id}-title`}/><p id={`${id}-description`} className={styles.description}>{description}</p>
    <form className={styles.form} noValidate onSubmit={(event) => {event.preventDefault(); onSubmit();}}>{children}
      <div className={styles.actions}><Button variant="secondary" onClick={requestClose}>{profile('cancel')}</Button><Button type="submit" disabled={saveDisabled}>{profile('save')}</Button></div>
    </form>
    {navigation.confirmDiscard && <ConfirmationDialog icon="warning" title={profile('discardTitle')} description={t('editor.discardDescription')} cancelLabel={profile('continueEditing')} confirmLabel={profile('discardChanges')} onCancel={navigation.continueEditing} onConfirm={navigation.discardAndContinue} backgroundSelector={`[role="dialog"][aria-labelledby="${id}-title"]`}/>}
  </Drawer>;
}

export function BillingDetailsDrawer({company, onSaved, locale, ...drawer}: EditorProps) {
  const t = useTranslations('CompanyBilling');
  const profile = useTranslations('CompanyProfile');
  const [values, setValues] = useState(() => billingDetailsValues(company));
  const [failure, setFailure] = useState(false);
  const errors = validateBillingDetails(company, values, duplicateCompanyTaxId(values.taxId, company.id));
  const dirty = JSON.stringify(normalizedBillingDetails(company, values)) !== JSON.stringify(billingDetailsValues(company));
  return <BillingEditorFrame {...drawer} id="billing-details" title={t('billing.title')} description={t('editor.billingDescription')} dirty={dirty} saveDisabled={!dirty || Object.keys(errors).length > 0} onSubmit={() => {if (!dirty || Object.keys(errors).length) return; const result = updateCompanyBillingDetails(company.id, values); if (result.ok) onSaved(); else setFailure(true);}}>
    {billingCompanyFields.map((key) => key === 'country' ? <SelectField key={key} id={`billing-${key}`} label={profile(`fields.${key}`)} value={values[key]} onChange={(event) => {setValues({...values, [key]: event.target.value}); setFailure(false);}} controlSize="compact" required error={errors[key] ? profile(`validation.${errors[key]}` as 'validation.countryRequired') : undefined}>
      {Object.entries(companyCountries).map(([id, text]) => <option key={id} value={id}>{text[locale === 'en' ? 'en' : 'ro']}</option>)}
    </SelectField> : <Field key={key} id={`billing-${key}`} label={profile(`fields.${key}`)} value={values[key]} onChange={(event) => {setValues({...values, [key]: event.target.value}); setFailure(false);}} controlSize="compact" required={key === 'name' || key === 'taxId'} error={errors[key] ? profile(`validation.${errors[key]}` as 'validation.nameRequired') : undefined}/>)}
    <Field id="billing-email" type="email" label={t('billing.email')} value={values.billingEmail} onChange={(event) => {setValues({...values, billingEmail: event.target.value}); setFailure(false);}} controlSize="compact" error={errors.billingEmail ? profile('validation.invalidEmail') : undefined}/>
    {failure && <p role="alert" className={styles.failure}>{t('editor.failure')}</p>}
  </BillingEditorFrame>;
}

export function DemoPaymentDrawer({company, onSaved, ...drawer}: EditorProps) {
  const t = useTranslations('CompanyBilling');
  const existing = company.subscription.paymentMethod;
  const baseline: DemoPaymentValues = {brand: existing?.brand ?? 'Visa', lastFour: existing?.lastFour ?? '', cardholderName: existing?.cardholderName ?? '', expiryMonth: existing?.expiryMonth ?? 1, expiryYear: existing?.expiryYear ?? 2029};
  const [values, setValues] = useState(baseline);
  const [failure, setFailure] = useState(false);
  const dirty = !existing || JSON.stringify(values) !== JSON.stringify(baseline);
  const valid = validDemoPayment(values);
  const update = (patch: Partial<DemoPaymentValues>) => {setValues({...values, ...patch}); setFailure(false);};
  return <BillingEditorFrame {...drawer} id="billing-payment" title={t('editor.paymentTitle')} description={t('editor.paymentDescription')} dirty={dirty && JSON.stringify(values) !== JSON.stringify(baseline)} saveDisabled={!dirty || !valid} onSubmit={() => {if (!dirty || !valid) return; const result = replaceCompanyDemoPayment(company.id, values); if (result.ok) onSaved(); else setFailure(true);}}>
    <p className={styles.notice}>{t('editor.paymentSafety')}</p>
    <SelectField id="payment-brand" label={t('editor.brand')} value={values.brand} onChange={(event) => update({brand: event.target.value as DemoPaymentValues['brand']})} controlSize="compact"><option>Visa</option><option>Mastercard</option></SelectField>
    <Field id="payment-name" label={t('editor.cardholderName')} value={values.cardholderName} onChange={(event) => update({cardholderName: event.target.value})} maxLength={120} required controlSize="compact"/>
    <Field id="payment-last-four" label={t('editor.lastFour')} value={values.lastFour} onChange={(event) => update({lastFour: event.target.value})} inputMode="numeric" maxLength={4} pattern="[0-9]{4}" required helperText={t('editor.lastFourHelp')} controlSize="compact"/>
    <div className={styles.pair}><SelectField id="payment-month" label={t('editor.expiryMonth')} value={String(values.expiryMonth)} onChange={(event) => update({expiryMonth: Number(event.target.value)})} controlSize="compact">{Array.from({length: 12}, (_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, '0')}</option>)}</SelectField>
      <Field id="payment-year" label={t('editor.expiryYear')} type="number" value={values.expiryYear} onChange={(event) => update({expiryYear: Number(event.target.value)})} required controlSize="compact"/>
    </div>
    {!valid && <p className={styles.failure}>{t('editor.paymentInvalid')}</p>}{failure && <p role="alert" className={styles.failure}>{t('editor.failure')}</p>}
  </BillingEditorFrame>;
}
