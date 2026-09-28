'use client';

import {useSyncExternalStore} from 'react';
import type {NotificationActivityItem} from './types';

const initialReadIds: ReadonlySet<string> = new Set();
let readIds: ReadonlySet<string> = initialReadIds;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNotificationItems(items: NotificationActivityItem[]) {
  const locallyReadIds = useSyncExternalStore(subscribe, () => readIds, () => initialReadIds);
  return items.map((item) => item.isUnread && locallyReadIds.has(item.id) ? {...item, isUnread: false} : item);
}

export function markAllNotificationsRead(items: NotificationActivityItem[]) {
  const newlyRead = items.filter((item) => item.isUnread && !readIds.has(item.id));
  if (newlyRead.length === 0) return;
  readIds = new Set([...readIds, ...newlyRead.map((item) => item.id)]);
  listeners.forEach((listener) => listener());
}
