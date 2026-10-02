'use client';

import {useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {switchActiveCompany} from '@/features/companies/company-state';
import {AppIcon} from '@/components/layout/AppIcon';
import {Surface} from '@/components/ui/Surface';
import {Button} from '@/components/ui/Button';
import {ConfirmationDialog} from '@/components/ui/ConfirmationDialog';
import {deleteVendorNote, getVendorNoteThreads, saveVendorNote, useVendorState} from './created-vendors';
import {VendorDocumentActions} from './VendorDocumentActions';
import type {VendorNoteThread} from './types';
import styles from './VendorWorkspace.module.css';

export type NotesNavigation = {requestLeave: (action: () => void) => void};
type Draft = {id?: string; title: string; content: string};
export function VendorNotesPanel({companyId, vendorId, language, navigationRef}: {companyId: string; vendorId: string; language: 'ro' | 'en'; navigationRef: Ref<NotesNavigation>}) {
  const t = useTranslations('VendorWorkspace.notes');
  const router = useRouter();
  const threads = getVendorNoteThreads(useVendorState(), companyId, vendorId);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => threads[0]?.id);
  const selected = threads.find((thread) => thread.id === selectedId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [deleting, setDeleting] = useState<VendorNoteThread | null>(null);
  const [saved, setSaved] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const allowNavigation = useRef(false);
  const historyGuard = useRef<{restore: () => void; release: () => Promise<void>} | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const focusNewTitle = useRef(false);
  const dirty = Boolean(draft && (!draft.id || draft.title !== selected?.title || draft.content !== selected?.content));
  const displayed = draft ?? selected;
  const proceed = useCallback((action: () => void) => {
    const guard = historyGuard.current;
    if (!guard) {action(); return;}
    allowNavigation.current = true;
    void guard.release().then(() => {allowNavigation.current = false; action();});
  }, []);
  const requestLeave = useCallback((action: () => void) => {
    if (dirty) {pending.current = action; setConfirmDiscard(true);} else {setDraft(null); proceed(action);}
  }, [dirty, setDraft, setConfirmDiscard, proceed]);
  useImperativeHandle(navigationRef, () => ({requestLeave}), [requestLeave]);
  const continueEditing = useCallback(() => {historyGuard.current?.restore(); setConfirmDiscard(false); pending.current = null;}, [setConfirmDiscard]);
  const cancelDelete = useCallback(() => setDeleting(null), [setDeleting]);
  useEffect(() => {
    if (!focusNewTitle.current || !titleRef.current) return;
    focusNewTitle.current = false;
    titleRef.current.focus();
    titleRef.current.select();
  }, [draft]);

  // Same capture-before-navigation/confirmation pattern as Requirement editing.
  useEffect(() => {
    if (!dirty) return;
    const currentUrl = window.location.href;
    const currentState = window.history.state;
    // Chromium's Navigation API runs before popstate/Next route restoration.
    // Cancel traversal before the editor unmounts; older browsers use popstate below.
    type TraverseEvent = Event & {navigationType: string; destination: {url: string; key: string}; cancelable: boolean};
    const navigation = (window as Window & {navigation?: EventTarget & {traverseTo: (key: string) => void}}).navigation;
    // Older browsers cannot cancel traversal before Next handles popstate. A
    // same-URL guard entry keeps the first Back inside this mounted editor.
    const guardId = crypto.randomUUID();
    let releasing: Promise<void> | undefined;
    const guard = {
      restore: () => {if (!navigation && window.location.href === currentUrl && window.history.state?.debiroNotesGuard !== guardId) window.history.pushState({...currentState, debiroNotesGuard: guardId}, '', currentUrl);},
      release: () => {
        if (releasing) return releasing;
        if (navigation || window.location.href !== currentUrl || window.history.state?.debiroNotesGuard !== guardId) return Promise.resolve();
        releasing = new Promise<void>((resolve) => {window.addEventListener('popstate', () => resolve(), {once: true}); window.history.back();});
        return releasing;
      }
    };
    if (!navigation) {historyGuard.current = guard; guard.restore();}
    function traverse(raw: Event) {
      const event = raw as TraverseEvent;
      if (allowNavigation.current || event.navigationType !== 'traverse' || event.destination.url === currentUrl || !event.cancelable) return;
      event.preventDefault();
      requestLeave(() => {allowNavigation.current = true; navigation?.traverseTo(event.destination.key);});
    }
    function beforeUnload(event: BeforeUnloadEvent) {if (!allowNavigation.current) {event.preventDefault(); event.returnValue = '';}}
    function click(event: MouseEvent) {
      if (allowNavigation.current || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>('a[href], [data-company-switch-id]');
      if (!target || target.closest('[role="alertdialog"]')) return;
      const href = target.getAttribute('href');
      const companyId = target.dataset.companySwitchId;
      if (companyId && target.getAttribute('aria-pressed') === 'true') return;
      if (target.getAttribute('target') === '_blank' || target.hasAttribute('download') || href?.startsWith('mailto:') || href?.startsWith('tel:')) return;
      if (href && new URL(href, currentUrl).href === currentUrl) return;
      event.preventDefault(); event.stopImmediatePropagation();
      // Popovers close when the confirmation opens. Retain the destination, not
      // a detached button/link that can no longer dispatch its React handler.
      requestLeave(() => {
        allowNavigation.current = true;
        if (companyId) switchActiveCompany(companyId);
        else if (href) router.push(href);
      });
    }
    function back(event: PopStateEvent) {
      if (navigation || allowNavigation.current || releasing || event.state?.debiroNotesGuard === guardId) return;
      event.stopImmediatePropagation();
      guard.restore();
      requestLeave(() => {allowNavigation.current = true; window.history.back();});
    }
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', back, true);
    navigation?.addEventListener('navigate', traverse);
    document.addEventListener('click', click, true);
    return () => {window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('popstate', back, true); navigation?.removeEventListener('navigate', traverse); document.removeEventListener('click', click, true); if (historyGuard.current === guard) historyGuard.current = null; void guard.release();};
  }, [dirty, requestLeave, router]);

  function create() {requestLeave(() => {focusNewTitle.current = true; setSelectedId(undefined); setDraft({title: t('newTitle'), content: ''}); setSaved(false);});}
  function select(thread: VendorNoteThread) {if (selectedId === thread.id) return; requestLeave(() => {setSelectedId(thread.id); setDraft(null); setSaved(false);});}
  function update(patch: Partial<Draft>) {setDraft({...displayed!, ...patch}); setSaved(false);}
  function save() {
    if (!dirty || !draft?.title.trim()) return;
    const result = saveVendorNote(companyId, vendorId, draft, draft.id);
    if (result) {setSelectedId(result.id); setDraft(null); setSaved(true);}
  }
  const date = (value: string) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ro-RO', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'}).format(new Date(value));
  return <><Surface role="tabpanel" id="vendor-notes" aria-labelledby="tab-notes" className={styles.notes}>
    <aside className={styles.threadList} aria-label={t('listLabel')}><header><h2>{t('threads', {count: threads.length})}</h2><button type="button" aria-label={t('new')} onClick={create}><AppIcon name="plus" size={20}/></button></header>
      {threads.map((thread) => <div key={thread.id} className={styles.thread} data-selected={selectedId === thread.id} data-note-id={thread.id}><button type="button" onClick={() => select(thread)} aria-pressed={selectedId === thread.id}><AppIcon name="file" size={20}/><span><strong>{thread.title}</strong><small>{t('updated', {date: date(thread.updatedAt)})}</small></span></button><VendorDocumentActions name={thread.title} actionLabel={t('actionsFor', {name: thread.title})} actions={[{label: t('delete'), onClick: () => requestLeave(() => setDeleting(thread))}]}/></div>)}
    </aside>
    {displayed ? <section className={styles.editor} aria-label={t('editor')}><label htmlFor="vendor-note-title" className={styles.srOnly}>{t('titleLabel')}</label><input ref={titleRef} id="vendor-note-title" className={styles.noteTitle} value={displayed.title} onChange={(event) => update({title: event.target.value})} aria-invalid={!displayed.title.trim()} aria-describedby={!displayed.title.trim() ? 'vendor-note-title-error' : undefined}/><p>{t('description')}</p>{selected && <small>{t('updated', {date: date(selected.updatedAt)})}</small>}<label htmlFor="vendor-note-content" className={styles.srOnly}>{t('contentLabel')}</label><textarea id="vendor-note-content" value={displayed.content} onChange={(event) => update({content: event.target.value})}/>{!displayed.title.trim() && <p id="vendor-note-title-error" role="alert" className={styles.error}>{t('titleRequired')}</p>}<footer>{saved && <span role="status">{t('saved')}</span>}<Button disabled={!dirty || !displayed.title.trim()} onClick={save}>{t('save')}</Button></footer></section> : <div className={styles.notesEmpty}><AppIcon name="file" size={32}/><p>{t('empty')}</p></div>}
  </Surface>
    {confirmDiscard && <ConfirmationDialog icon="warning" title={t('discardTitle')} description={t('discardDescription')} cancelLabel={t('continue')} confirmLabel={t('discard')} onCancel={continueEditing} onConfirm={() => {setDraft(null); setConfirmDiscard(false); const action = pending.current; pending.current = null; if (action) proceed(action);}}/>}
    {deleting && <ConfirmationDialog icon="warning" title={t('deleteTitle')} description={t('deleteDescription')} cancelLabel={t('cancel')} confirmLabel={t('deleteConfirm')} onCancel={cancelDelete} onConfirm={() => {
      const index = threads.findIndex((thread) => thread.id === deleting.id);
      const next = threads[index + 1] ?? threads[index - 1];
      deleteVendorNote(companyId, vendorId, deleting.id);
      if (selectedId === deleting.id) {setSelectedId(next?.id); setDraft(null);}
      setDeleting(null); setSaved(false);
    }}/>}
  </>;
}
