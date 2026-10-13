'use client';

import {useSyncExternalStore} from 'react';
import {browserSession} from '@/lib/browser-session';
import type {NotificationActivityItem} from './types';

const initialReadIds: ReadonlySet<string> = new Set();
const session = browserSession(Symbol.for('debiro.notification-session'), () => ({readIds: initialReadIds, listeners: new Set<() => void>()}));

function subscribe(listener: () => void) {
  session.listeners.add(listener);
  return () => session.listeners.delete(listener);
}

export function useNotificationItems(items: NotificationActivityItem[]) {
  const locallyReadIds = useSyncExternalStore(subscribe, () => session.readIds, () => initialReadIds);
  return items.map((item) => item.isUnread && locallyReadIds.has(`${item.companyId}:${item.id}`) ? {...item, isUnread: false} : item);
}

export function markAllNotificationsRead(items: NotificationActivityItem[]) {
  const newlyRead = items.filter((item) => item.isUnread && !session.readIds.has(`${item.companyId}:${item.id}`));
  if (newlyRead.length === 0) return;
  session.readIds = new Set([...session.readIds, ...newlyRead.map((item) => `${item.companyId}:${item.id}`)]);
  session.listeners.forEach((listener) => listener());
}
