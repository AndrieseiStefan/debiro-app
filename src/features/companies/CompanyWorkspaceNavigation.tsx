'use client';

import {Fragment, useLayoutEffect, useState, type ReactNode} from 'react';
import {usePathname, useRouter} from '@/i18n/navigation';
import {readCompanyState, subscribeCompanyState} from './company-state';

/** One workspace-entry contract for every existing active-company mutation. */
export function CompanyWorkspaceNavigation({children}: {children: ReactNode}) {
  const pathname = usePathname().replace(/^\/(?:en|ro)(?=\/|$)/, '') || '/';
  const router = useRouter();
  const workspaceRoute = /^\/(dashboard|vendors|documents|requirements|notifications|company\/settings|profile|invitations)(\/|$)/.test(pathname);
  const [entry, setEntry] = useState<{companyId: string | null; epoch: number}>({companyId: null, epoch: 0});
  // A route commit completes entry; keep its page key without an effect cascade.
  if (entry.companyId && pathname === '/dashboard') setEntry({...entry, companyId: null});

  useLayoutEffect(() => {
    // Observe only changes after mounting, not hydration/locale reinitialization.
    let previousId = readCompanyState().activeCompanyId;
    return subscribeCompanyState(() => {
      const nextId = readCompanyState().activeCompanyId;
      if (nextId === previousId) return;
      previousId = nextId;
      if (workspaceRoute && nextId) setEntry((current) => ({companyId: nextId, epoch: current.epoch + 1}));
    });
  }, [workspaceRoute]);

  useLayoutEffect(() => {
    if (!entry.companyId) return;
    // The old page/portals have unmounted before post-switch navigation starts.
    if (pathname !== '/dashboard') router.push('/dashboard');
  }, [entry.companyId, pathname, router]);

  if (entry.companyId && pathname !== '/dashboard') return null;
  // Also reset Dashboard-local overlays when switching from Dashboard itself.
  // Domain and user-global session stores remain outside this page lifetime.
  return <Fragment key={entry.epoch}>{children}</Fragment>;
}
