'use client';

import {useCallback, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Button} from '@/components/ui/Button';
import {Surface} from '@/components/ui/Surface';
import {Drawer} from '@/components/ui/Drawer';
import {Field} from '@/components/ui/Field';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {VendorDocumentActions} from './VendorDocumentActions';
import {deleteVendorContact, getVendorContacts, makeVendorContactPrimary, saveVendorContact, useVendorState, validateContact, type ContactInput} from './created-vendors';
import type {VendorContact} from './types';
import {getVendorDetailsFixture} from './detail-fixtures';
import styles from './VendorWorkspace.module.css';

function ContactDrawer({contact, contacts, onSave, onClose, triggerRef}: {contact?: VendorContact; contacts: VendorContact[]; onSave: (input: ContactInput) => boolean; onClose: () => void; triggerRef: React.RefObject<HTMLButtonElement | null>}) {
  const t = useTranslations('VendorWorkspace.contacts');
  const [values, setValues] = useState<ContactInput>({name: contact?.name ?? '', email: contact?.email ?? '', role: contact?.role ?? '', phone: contact?.phone ?? ''});
  const [submitted, setSubmitted] = useState(false);
  const errors = validateContact(contacts, values, contact?.id);
  return <Drawer phase="open" onClose={onClose} onExited={onClose} triggerRef={triggerRef} titleId="contact-drawer-title" descriptionId="contact-drawer-description" closeLabel={t('close')} contentClassName={styles.contactDrawer}>
    <span className={styles.heroIcon}><AppIcon name="userPlus" size={28}/></span><h2 id="contact-drawer-title">{t(contact ? 'edit' : 'add')}</h2><p id="contact-drawer-description">{t('drawerDescription')}</p>
    <form noValidate onSubmit={(event) => {event.preventDefault(); setSubmitted(true); if (Object.values(errors).some(Boolean)) {document.getElementById(errors.name ? 'contact-name' : 'contact-email')?.focus(); return;} if (onSave(values)) onClose();}}>
      <Field id="contact-name" label={t('name')} required controlSize="compact" value={values.name} onChange={(event) => setValues({...values, name: event.target.value})} error={submitted && errors.name ? t(errors.name) : undefined}/>
      <Field id="contact-role" label={t('role')} controlSize="compact" value={values.role} onChange={(event) => setValues({...values, role: event.target.value})}/>
      <div className={styles.formRow}><Field id="contact-email" label={t('email')} type="email" required controlSize="compact" value={values.email} onChange={(event) => setValues({...values, email: event.target.value})} error={submitted && errors.email ? t(errors.email) : undefined}/><Field id="contact-phone" label={t('phone')} type="tel" controlSize="compact" value={values.phone} onChange={(event) => setValues({...values, phone: event.target.value})}/></div>
      <div className={styles.formActions}><Button variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit">{t(contact ? 'save' : 'add')}</Button></div>
    </form>
  </Drawer>;
}

export function VendorContactsPanel({companyId, vendorId, language}: {companyId: string; vendorId: string; language: 'ro' | 'en'}) {
  const t = useTranslations('VendorWorkspace.contacts');
  const contacts = getVendorContacts(useVendorState(), companyId, vendorId);
  const fixtureRole = getVendorDetailsFixture(vendorId)?.contact.role;
  const [editing, setEditing] = useState<VendorContact | 'new' | null>(null);
  const [deleting, setDeleting] = useState<VendorContact | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setEditing(null), []);
  const cancelDelete = useCallback(() => setDeleting(null), [setDeleting]);
  return <Surface role="tabpanel" id="vendor-contacts" aria-labelledby="tab-contacts" className={styles.panel}>
    <header className={styles.heading}><div><h2><AppIcon name="file" size={22}/>{t('title', {count: contacts.length})}</h2><p>{t('description')}</p></div><Button ref={triggerRef} onClick={(event) => {triggerRef.current = event.currentTarget; setEditing('new');}}><AppIcon name="plus" size={18}/>{t('add')}</Button></header>
    <div className={styles.tableScroll} role="region" aria-label={t('tableLabel')} tabIndex={0}><table className={styles.contactsTable}><thead><tr>{(['name', 'role', 'email', 'phone', 'actions'] as const).map((field) => <th key={field} scope="col">{t(field)}</th>)}</tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id} data-contact-id={contact.id} data-primary={contact.isPrimary}>
      <td><span className={styles.person}><span className={styles.avatar}><AppIcon name="user" size={18}/></span><span>{contact.name || '—'}{contact.isPrimary && <small className={styles.primary}>{t('primary')}</small>}</span></span></td><td>{contact.role && contact.role === fixtureRole?.ro ? fixtureRole[language] : contact.role || '—'}</td><td>{contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : '—'}</td><td>{contact.phone ? <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a> : '—'}</td>
      <td><VendorDocumentActions name={contact.name ?? contact.email} actionLabel={t('actionsFor', {name: contact.name ?? contact.email})} actions={[{label: t('edit'), onClick: () => {triggerRef.current = document.activeElement as HTMLButtonElement; setEditing(contact);}}, ...(!contact.isPrimary ? [{label: t('makePrimary'), onClick: () => makeVendorContactPrimary(companyId, vendorId, contact.id)}, {label: t('delete'), onClick: () => setDeleting(contact)}] : [])]}/></td>
    </tr>)}</tbody></table></div>
    {contacts.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
    {editing && <ContactDrawer contact={editing === 'new' ? undefined : editing} contacts={contacts} triggerRef={triggerRef} onClose={close} onSave={(input) => saveVendorContact(companyId, vendorId, input, editing === 'new' ? undefined : editing.id)}/>}
    {deleting && <ConfirmationDialog title={t('deleteTitle')} description={t('deleteDescription', {name: deleting.name ?? deleting.email})} cancelLabel={t('cancel')} confirmLabel={t('delete')} onCancel={cancelDelete} onConfirm={() => {deleteVendorContact(companyId, vendorId, deleting.id); setDeleting(null);}}/>}
  </Surface>;
}
