'use client';

import {useCallback, useEffect, useRef, useState, type FormEvent, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {SelectField} from '@/components/ui/SelectField';
import {useCompanyState} from '@/features/companies/company-state';
import {hasDuplicateVendorCui, useVendorState, type NewVendorInput} from './created-vendors';
import {normalizeVendorValues, validateVendorValues, vendorDraftDirty, vendorFormValues, type VendorFormValues, type VendorMetadata} from './vendor-form';
import {vendorCategories, type VendorCategory} from './types';
import styles from './AddVendorDrawer.module.css';

type DrawerProps = {
  phase: DrawerPhase;
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export function AddVendorDrawer({onCreate, ...props}: DrawerProps & {onCreate: (vendor: NewVendorInput) => void}) {
  const companyId = useCompanyState().activeCompanyId ?? '';
  return <VendorFormDrawer {...props} mode="create" companyId={companyId} onSubmit={onCreate}/>;
}

export function VendorFormDrawer({phase, onClose, onExited, triggerRef, mode, initialValues, companyId, vendorId, onSubmit}: DrawerProps & {
  mode: 'create' | 'edit';
  initialValues?: VendorMetadata;
  companyId: string;
  vendorId?: string;
  onSubmit: (vendor: VendorMetadata) => void | 'saved' | 'invalid' | 'duplicate' | 'missing';
}) {
  const t = useTranslations('AddVendor');
  const actionT = useTranslations(mode === 'edit' ? 'EditVendor' : 'AddVendor');
  const vendorsT = useTranslations('Vendors');
  const vendorState = useVendorState();
  const [initial] = useState(() => vendorFormValues(initialValues));
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof VendorFormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = vendorDraftDirty(values, initial);
  const dirtyRef = useRef(dirty);
  useEffect(() => {dirtyRef.current = dirty;}, [dirty]);
  const requestClose = useCallback(() => {
    if (mode === 'edit' && dirtyRef.current) setConfirmDiscard(true);
    else onClose();
  }, [mode, onClose]);
  const continueEditing = useCallback(() => setConfirmDiscard(false), []);
  const prefix = mode === 'edit' ? 'edit-vendor' : 'add-vendor';
  const errors = validateVendorValues(values, hasDuplicateVendorCui(vendorState, companyId, values.cui, vendorId));
  const error = (key: keyof typeof errors) => (submitted || touched[key]) && errors[key] ? t(errors[key]) : undefined;

  function update<Key extends keyof VendorFormValues>(key: Key, value: VendorFormValues[Key]) {
    setValues((current) => ({...current, [key]: value}));
    setTouched((current) => ({...current, [key]: true}));
    setSaveError(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = (['name', 'cui', 'email', 'category', 'website'] as const).find((key) => errors[key]);
      if (firstInvalid) document.getElementById(`${prefix}-${firstInvalid}`)?.focus();
      return;
    }
    if (mode === 'edit' && !dirty) return;
    const result = onSubmit(normalizeVendorValues(values));
    if (result && result !== 'saved') setSaveError(true);
  }

  return <><Drawer phase={phase} onClose={requestClose} onExited={onExited} triggerRef={triggerRef} titleId={`${prefix}-title`} descriptionId={`${prefix}-description`} closeLabel={actionT('close')} contentClassName={styles.content}>
    <span className={styles.heroIcon}><AppIcon name="users" size={29}/></span>
    <h2 id={`${prefix}-title`}>{actionT('title')}</h2>
    <p id={`${prefix}-description`} className={styles.intro}>{actionT('description')}</p>
    <form id={`${prefix}-form`} noValidate onSubmit={submit} className={styles.form}>
      <Field id={`${prefix}-name`} label={t('name')} placeholder={t('namePlaceholder')} required value={values.name} onChange={(event) => update('name', event.target.value)} error={error('name')} controlSize="compact" className={styles.field}/>
      <div className={styles.row}>
        <Field id={`${prefix}-cui`} label={t('cui')} placeholder={t('cuiPlaceholder')} required value={values.cui} onChange={(event) => update('cui', event.target.value)} error={error('cui')} controlSize="compact" className={styles.field}/>
        <Field id={`${prefix}-registrationCode`} label={t('registrationCode')} placeholder={t('registrationPlaceholder')} value={values.registrationCode} onChange={(event) => update('registrationCode', event.target.value)} controlSize="compact" className={styles.field}/>
      </div>
      <div className={styles.row}>
        <Field id={`${prefix}-email`} label={t('email')} placeholder={t('emailPlaceholder')} type="email" required value={values.email} onChange={(event) => update('email', event.target.value)} error={error('email')} controlSize="compact" className={styles.field}/>
        <Field id={`${prefix}-phone`} label={t('phone')} placeholder={t('phonePlaceholder')} type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} controlSize="compact" className={styles.field}/>
      </div>
      <Field id={`${prefix}-contactName`} label={t('contactName')} placeholder={t('contactPlaceholder')} value={values.contactName} onChange={(event) => update('contactName', event.target.value)} controlSize="compact" className={styles.field}/>
      <div className={styles.row}>
        <SelectField id={`${prefix}-category`} label={t('category')} placeholder={t('categoryPlaceholder')} required value={values.category} onChange={(event) => update('category', event.target.value as VendorCategory | '')} error={error('category')} controlSize="compact" className={styles.field}>{vendorCategories.map((category) => <option key={category} value={category}>{vendorsT(`category.${category}`)}</option>)}</SelectField>
        <Field id={`${prefix}-industry`} label={t('industry')} placeholder={t('industryPlaceholder')} value={values.industry} onChange={(event) => update('industry', event.target.value)} controlSize="compact" className={styles.field}/>
      </div>
      {mode === 'edit' && values.category !== initial.category && <div className={`${styles.notice} ${styles.categoryWarning}`} data-category-warning><AppIcon name="warning" size={22}/><p><strong>{actionT('categoryWarningTitle')}</strong><span>{actionT('categoryWarningDescription')}</span></p></div>}
      <div className={styles.textareaField}><label htmlFor={`${prefix}-address`}>{t('address')}</label><textarea id={`${prefix}-address`} placeholder={t('addressPlaceholder')} value={values.address} onChange={(event) => update('address', event.target.value)}/></div>
      <Field id={`${prefix}-website`} label={t('website')} placeholder={t('websitePlaceholder')} type="url" value={values.website} onChange={(event) => update('website', event.target.value)} error={error('website')} controlSize="compact" className={styles.field}/>
      <div className={styles.textareaField}><label htmlFor={`${prefix}-notes`}>{t('notes')}</label><textarea id={`${prefix}-notes`} placeholder={t('notesPlaceholder')} value={values.notes} onChange={(event) => update('notes', event.target.value)}/></div>
      <div className={styles.notice} data-add-vendor-notice={mode === 'create' || undefined} data-edit-vendor-notice={mode === 'edit' || undefined}><AppIcon name="info" size={22}/><p><strong>{actionT('noticeTitle')}</strong><span>{actionT('noticeDescription')}</span></p></div>
      {saveError && <p role="alert" className={styles.error}>{actionT('saveFailure')}</p>}
      <div className={styles.actions} data-add-vendor-actions={mode === 'create' || undefined} data-edit-vendor-actions={mode === 'edit' || undefined}><Button variant="secondary" onClick={requestClose}>{t('cancel')}</Button><Button type="submit" disabled={mode === 'edit' && (!dirty || Object.keys(errors).length > 0)}>{actionT('submit')}</Button></div>
    </form>
  </Drawer>
    {confirmDiscard && <ConfirmationDialog title={actionT('discardTitle')} description={actionT('discardDescription')} cancelLabel={actionT('continueEditing')} confirmLabel={actionT('discardChanges')} onCancel={continueEditing} onConfirm={() => {setConfirmDiscard(false); onClose();}} backgroundSelector={`[role="dialog"][aria-labelledby="${prefix}-title"]`}/>}
  </>;
}
