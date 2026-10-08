'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {switchActiveCompany} from '@/features/companies/company-state';

/** Existing editable-flow contract: capture before navigation, shared confirmation, retained destination. */
export function useProfileNavigation(dirty: boolean, discard: () => void) {
  const router = useRouter();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const allowed = useRef(false);
  const historyGuard = useRef<{restore: () => void; release: () => Promise<void>} | null>(null);
  const proceed = useCallback((action: () => void) => {
    allowed.current = true;
    void (historyGuard.current?.release() ?? Promise.resolve()).then(action);
  }, []);
  const requestLeave = useCallback((action: () => void) => {pending.current = action; setConfirmDiscard(true);}, [setConfirmDiscard]);
  const continueEditing = useCallback(() => {historyGuard.current?.restore(); pending.current = null; setConfirmDiscard(false);}, [setConfirmDiscard]);
  function discardAndContinue() {discard(); setConfirmDiscard(false); const action = pending.current; pending.current = null; if (action) proceed(action);}

  useEffect(() => {
    if (!dirty) return;
    allowed.current = false;
    const currentUrl = window.location.href, currentState = window.history.state, guardId = crypto.randomUUID();
    type TraverseEvent = Event & {navigationType: string; destination: {url: string; key: string}};
    const navigation = (window as Window & {navigation?: EventTarget & {traverseTo: (key: string) => void}}).navigation;
    let releasing: Promise<void> | undefined;
    const guard = {
      restore: () => {if (!navigation && window.location.href === currentUrl && window.history.state?.debiroProfileGuard !== guardId) window.history.pushState({...currentState, debiroProfileGuard: guardId}, '', currentUrl);},
      release: () => {
        if (releasing) return releasing;
        if (navigation || window.location.href !== currentUrl || window.history.state?.debiroProfileGuard !== guardId) return Promise.resolve();
        releasing = new Promise<void>((resolve) => {window.addEventListener('popstate', () => resolve(), {once: true}); window.history.back();});
        return releasing;
      }
    };
    if (!navigation) {historyGuard.current = guard; guard.restore();}
    function traverse(raw: Event) {
      const event = raw as TraverseEvent;
      if (allowed.current || event.navigationType !== 'traverse' || event.destination.url === currentUrl || !event.cancelable) return;
      event.preventDefault(); requestLeave(() => navigation?.traverseTo(event.destination.key));
    }
    function click(event: MouseEvent) {
      if (allowed.current || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>('a[href], [data-company-switch-id]');
      if (!target || target.closest('[role="alertdialog"]') || target.getAttribute('target') === '_blank' || target.hasAttribute('download')) return;
      const href = target.getAttribute('href'), companyId = target.dataset.companySwitchId;
      if (companyId && target.getAttribute('aria-pressed') === 'true' || href && (new URL(href, currentUrl).href === currentUrl || !href.startsWith('/'))) return;
      event.preventDefault(); event.stopImmediatePropagation();
      requestLeave(() => {if (companyId) switchActiveCompany(companyId); else if (href) router.push(href);});
    }
    function unload(event: BeforeUnloadEvent) {if (!allowed.current) {event.preventDefault(); event.returnValue = '';}}
    function back(event: PopStateEvent) {
      if (navigation || allowed.current || releasing || event.state?.debiroProfileGuard === guardId) return;
      event.stopImmediatePropagation(); guard.restore(); requestLeave(() => window.history.back());
    }
    document.addEventListener('click', click, true); window.addEventListener('beforeunload', unload); window.addEventListener('popstate', back, true); navigation?.addEventListener('navigate', traverse);
    return () => {
      document.removeEventListener('click', click, true); window.removeEventListener('beforeunload', unload); window.removeEventListener('popstate', back, true); navigation?.removeEventListener('navigate', traverse);
      if (historyGuard.current === guard) historyGuard.current = null;
      void guard.release();
    };
  }, [dirty, requestLeave, router]);
  return {confirmDiscard, continueEditing, discardAndContinue};
}
