'use client';

import {useState, type FormEvent, type RefObject} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Drawer, type DrawerPhase} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import type {CreatedVendor} from './created-vendors';
import type {VendorCategory} from './types';
import styles from './AddVendorDrawer.module.css';

type Values = {
  name: string;
  cui: string;
  registrationCode: string;
  email: string;
  phone: string;
  contactName: string;
  category: VendorCategory | '';
  industry: string;
  address: string;
  website: string;
  notes: string;
};

type Errors = Partial<Record<'name' | 'cui' | 'email' | 'category' | 'website', string>>;
const categoryOptions: VendorCategory[] = ['construction', 'cleaning', 'software', 'materials', 'logistics', 'energy', 'food', 'medical'];
const optional = (value: string) => value.trim() || undefined;

function validWebsite(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
  } catch {return false;}
}

export function AddVendorDrawer({phase, onClose, onExited, triggerRef, onCreate}: {
  phase: DrawerPhase;
  onClose: () => void;
  onExited: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onCreate: (vendor: Omit<CreatedVendor, 'id'>) => void;
}) {
  const t = useTranslations('AddVendor');
  const vendorsT = useTranslations('Vendors');
  const [values, setValues] = useState<Values>({name: '', cui: '', registrationCode: '', email: '', phone: '', contactName: '', category: '', industry: '', address: '', website: '', notes: ''});
  const [errors, setErrors] = useState<Errors>({});

  function update<Key extends keyof Values>(key: Key, value: Values[Key]) {
    setValues((current) => ({...current, [key]: value}));
    setErrors((current) => ({...current, [key]: undefined}));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (!values.name.trim()) nextErrors.name = t('nameRequired');
    if (!values.cui.trim()) nextErrors.cui = t('cuiRequired');
    if (!values.email.trim()) nextErrors.email = t('emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = t('emailInvalid');
    if (!values.category) nextErrors.category = t('categoryRequired');
    if (values.website.trim() && !validWebsite(values.website.trim())) nextErrors.website = t('websiteInvalid');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = (['name', 'cui', 'email', 'category', 'website'] as const).find((key) => nextErrors[key]);
      if (firstInvalid) document.getElementById(`add-vendor-${firstInvalid}`)?.focus();
      return;
    }
    onCreate({
      name: values.name.trim(),
      cui: values.cui.trim(),
      category: values.category as VendorCategory,
      email: values.email.trim(),
      registrationCode: optional(values.registrationCode),
      phone: optional(values.phone),
      contactName: optional(values.contactName),
      industry: optional(values.industry),
      address: optional(values.address),
      website: optional(values.website),
      notes: optional(values.notes)
    });
  }

  return <Drawer phase={phase} onClose={onClose} onExited={onExited} triggerRef={triggerRef} titleId="add-vendor-title" descriptionId="add-vendor-description" closeLabel={t('close')} contentClassName={styles.content}>
    <span className={styles.heroIcon}><AppIcon name="users" size={29}/></span>
    <h2 id="add-vendor-title">{t('title')}</h2>
    <p id="add-vendor-description" className={styles.intro}>{t('description')}</p>
    <form id="add-vendor-form" noValidate onSubmit={submit} className={styles.form}>
      <Field id="add-vendor-name" label={t('name')} placeholder={t('namePlaceholder')} required value={values.name} onChange={(event) => update('name', event.target.value)} error={errors.name} className={styles.field}/>
      <div className={styles.row}>
        <Field id="add-vendor-cui" label={t('cui')} placeholder={t('cuiPlaceholder')} required value={values.cui} onChange={(event) => update('cui', event.target.value)} error={errors.cui} className={styles.field}/>
        <Field id="add-vendor-registrationCode" label={t('registrationCode')} placeholder={t('registrationPlaceholder')} value={values.registrationCode} onChange={(event) => update('registrationCode', event.target.value)} className={styles.field}/>
      </div>
      <div className={styles.row}>
        <Field id="add-vendor-email" label={t('email')} placeholder={t('emailPlaceholder')} type="email" required value={values.email} onChange={(event) => update('email', event.target.value)} error={errors.email} className={styles.field}/>
        <Field id="add-vendor-phone" label={t('phone')} placeholder={t('phonePlaceholder')} type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} className={styles.field}/>
      </div>
      <Field id="add-vendor-contactName" label={t('contactName')} placeholder={t('contactPlaceholder')} value={values.contactName} onChange={(event) => update('contactName', event.target.value)} className={styles.field}/>
      <div className={styles.row}>
        <div className={styles.selectField}><label htmlFor="add-vendor-category">{t('category')} <span>*</span></label><div className={styles.selectWrap}><select id="add-vendor-category" required value={values.category} onChange={(event) => update('category', event.target.value as VendorCategory | '')} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'add-vendor-category-error' : undefined}><option value="">{t('categoryPlaceholder')}</option>{categoryOptions.map((category) => <option key={category} value={category}>{vendorsT(`category.${category}`)}</option>)}</select><AppIcon name="chevronDown" size={17}/></div>{errors.category && <p id="add-vendor-category-error" className={styles.error} role="alert">{errors.category}</p>}</div>
        <Field id="add-vendor-industry" label={t('industry')} placeholder={t('industryPlaceholder')} value={values.industry} onChange={(event) => update('industry', event.target.value)} className={styles.field}/>
      </div>
      <div className={styles.textareaField}><label htmlFor="add-vendor-address">{t('address')}</label><textarea id="add-vendor-address" placeholder={t('addressPlaceholder')} value={values.address} onChange={(event) => update('address', event.target.value)}/></div>
      <Field id="add-vendor-website" label={t('website')} placeholder={t('websitePlaceholder')} type="url" value={values.website} onChange={(event) => update('website', event.target.value)} error={errors.website} className={styles.field}/>
      <div className={styles.textareaField}><label htmlFor="add-vendor-notes">{t('notes')}</label><textarea id="add-vendor-notes" placeholder={t('notesPlaceholder')} value={values.notes} onChange={(event) => update('notes', event.target.value)}/></div>
      <div className={styles.notice}><AppIcon name="info" size={22}/><p><strong>{t('noticeTitle')}</strong><span>{t('noticeDescription')}</span></p></div>
      <div className={styles.actions}><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit">{t('submit')}</Button></div>
    </form>
  </Drawer>;
}
