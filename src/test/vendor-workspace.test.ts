import {describe, expect, it} from 'vitest';
import {createLocalVendor, deleteVendorContact, deleteVendorNote, getVendorContacts, getVendorMetadata, getVendorNoteThreads, getVendorState, makeVendorContactPrimary, saveVendorContact, saveVendorNote, setVendorLifecycle, updateVendorMetadata, vendorFixtureCompanyId} from '@/features/vendors/created-vendors';
import {filterVendorActivity, vendorActivity} from '@/features/vendors/vendor-activity';
import {readLocalAuditEvents} from '@/features/notifications/local-audit';
import {applyVendorTemplates} from '@/features/vendors/vendor-requirements';
import type {LocalAuditEvent} from '@/features/notifications/local-audit';

const company = vendorFixtureCompanyId;
describe('vendor workspace contracts', () => {
  it('derives the existing contact, preserves missing fields and rejects cross-company access', () => {
    const contacts = getVendorContacts(getVendorState(), company, 'construct-pro');
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({id: 'contact:construct-pro:primary', vendorId: 'construct-pro', email: 'ion.popescu@scconstruct.ro', isPrimary: true});
    expect(getVendorContacts(getVendorState(), company, 'alpha-construction')).toHaveLength(0);
    expect(getVendorContacts(getVendorState(), 'other', 'construct-pro')).toEqual([]);
    expect(saveVendorContact('other', 'construct-pro', {name: 'Bad', email: 'bad@example.test'})).toBe(false);
  });
  it('keeps primary contacts and vendor create/edit projections synchronized with stable IDs', () => {
    const vendor = createLocalVendor({name: 'Contacts', cui: 'RO-CONT', category: 'construction', email: 'first@example.test', contactName: 'First'});
    const initial = getVendorContacts(getVendorState(), company, vendor.id)[0];
    expect(saveVendorContact(company, vendor.id, {name: ' ', email: 'bad'})).toBe(false);
    expect(saveVendorContact(company, vendor.id, {name: 'Duplicate', email: ' FIRST@EXAMPLE.TEST '})).toBe(false);
    expect(saveVendorContact(company, vendor.id, {name: ' Second ', email: 'second@example.test', role: ' Role '})).toBe(true);
    const second = getVendorContacts(getVendorState(), company, vendor.id)[1];
    expect(second).toMatchObject({name: 'Second', role: 'Role', isPrimary: false});
    expect(deleteVendorContact(company, vendor.id, initial.id)).toBe(false);
    expect(makeVendorContactPrimary(company, vendor.id, second.id)).toBe(true);
    expect(getVendorMetadata(getVendorState(), vendor.id)).toMatchObject({contactName: 'Second', email: 'second@example.test'});
    expect(getVendorContacts(getVendorState(), company, vendor.id).filter((contact) => contact.isPrimary)).toHaveLength(1);
    expect(updateVendorMetadata(company, vendor.id, {...getVendorMetadata(getVendorState(), vendor.id)!, contactName: 'Edited', email: 'edited@example.test'})).toBe('saved');
    expect(getVendorContacts(getVendorState(), company, vendor.id).find((contact) => contact.id === second.id)).toMatchObject({name: 'Edited', email: 'edited@example.test', isPrimary: true});
    expect(deleteVendorContact(company, vendor.id, initial.id)).toBe(true);
    expect(deleteVendorContact(company, vendor.id, second.id)).toBe(false);
    expect(getVendorContacts(getVendorState(), 'other', vendor.id)).toEqual([]);
  });
  it('saves/deletes only owned threads, preserves IDs and migrates legacy notes without overwriting other threads', () => {
    const vendor = createLocalVendor({name: 'Notes', cui: 'RO-NOTES', category: 'software', email: 'notes@example.test', notes: 'Initial note'});
    const original = getVendorNoteThreads(getVendorState(), company, vendor.id)[0];
    const before = getVendorState();
    expect(saveVendorNote(company, vendor.id, {title: ' ', content: 'bad'})).toBeNull();
    expect(saveVendorNote('other', vendor.id, {title: 'Bad', content: 'bad'})).toBeNull();
    expect(getVendorState()).toBe(before);
    const second = saveVendorNote(company, vendor.id, {title: 'Other thread', content: 'Private'})!;
    const edited = saveVendorNote(company, vendor.id, {title: 'General', content: 'Updated'}, original.id)!;
    expect(edited.id).toBe(original.id);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(getVendorMetadata(getVendorState(), vendor.id)?.notes).toBe('Updated');
    updateVendorMetadata(company, vendor.id, {...getVendorMetadata(getVendorState(), vendor.id)!, notes: 'Edited via vendor form'});
    expect(getVendorNoteThreads(getVendorState(), company, vendor.id).find((thread) => thread.id === second.id)?.content).toBe('Private');
    updateVendorMetadata(company, vendor.id, {...getVendorMetadata(getVendorState(), vendor.id)!, notes: undefined});
    expect(getVendorNoteThreads(getVendorState(), company, vendor.id).find((thread) => thread.id === original.id)).toMatchObject({id: original.id, content: ''});
    expect(deleteVendorNote('other', vendor.id, second.id)).toBe(false);
    expect(deleteVendorNote(company, vendor.id, original.id)).toBe(true);
    expect(getVendorMetadata(getVendorState(), vendor.id)?.notes).toBeUndefined();
    expect(deleteVendorNote(company, vendor.id, second.id)).toBe(true);
    expect(getVendorNoteThreads(getVendorState(), company, vendor.id)).toEqual([]);
  });
  it('projects existing audit concepts without duplicate notice/audit events and composes activity filters', () => {
    const events = vendorActivity(company, 'construct-pro', []);
    expect(events.every((event) => event.vendorId === 'construct-pro')).toBe(true);
    expect(events.filter((event) => event.eventType === 'reminder')).toHaveLength(1);
    expect(events).toEqual([...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id)));
    expect(vendorActivity('other', 'construct-pro', [])).toEqual([]);
    const found = filterVendorActivity(events, '  FISCAL ', {type: 'document_upload', range: 'all', actor: 'all'}, 'ro', '2026-10-02T12:00:00Z');
    expect(found).toHaveLength(1);
    expect(filterVendorActivity(events, '', {type: 'all', range: 'last7', actor: 'Andrei Popescu'}, 'ro', '2026-10-02T12:00:00Z')).toHaveLength(4);
  });
  it('records only successful local lifecycle/edit/template actions by vendor and company', () => {
    const vendor = createLocalVendor({name: 'Events', cui: 'RO-EVENTS', category: 'construction', email: 'events@example.test'});
    const before = readLocalAuditEvents().length;
    updateVendorMetadata(company, vendor.id, {...vendor, email: 'bad'});
    setVendorLifecycle(vendor.id, 'active');
    expect(readLocalAuditEvents()).toHaveLength(before);
    setVendorLifecycle(vendor.id, 'inactive');
    updateVendorMetadata(company, vendor.id, {...vendor, name: 'Changed'});
    applyVendorTemplates(company, vendor.id, ['maintenance']);
    const events = vendorActivity(company, vendor.id, readLocalAuditEvents());
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining(['vendor_inactive', 'vendor_edited', 'template_applied']));
    const afterApply = readLocalAuditEvents().length;
    applyVendorTemplates(company, vendor.id, ['maintenance']);
    expect(readLocalAuditEvents()).toHaveLength(afterApply);
    expect(events.every((event) => event.vendorId === vendor.id)).toBe(true);
    expect(vendorActivity('other', vendor.id, readLocalAuditEvents())).toEqual([]);
  });
  it('preserves distinct local actions recorded at the same timestamp', () => {
    const base: LocalAuditEvent = {id: 'first-template', companyId: company, vendorId: 'construct-pro', templateId: 'construction', eventType: 'template_applied',
      actorType: 'user', action: {ro: 'Șablon aplicat', en: 'Template applied'}, description: {ro: 'Construcții', en: 'Construction'}, occurredAt: '2026-10-02T12:00:00.000Z'};
    const local = [base, {...base, id: 'second-template', templateId: 'maintenance'}, {...base, id: 'first-edit', eventType: 'vendor_edited' as const}, {...base, id: 'second-edit', eventType: 'vendor_edited' as const}];
    const events = vendorActivity(company, 'construct-pro', local);
    expect(events.filter((event) => local.some((record) => record.id === event.id))).toHaveLength(4);
    expect(events.filter((event) => event.eventType === 'reminder')).toHaveLength(1);
  });
});
