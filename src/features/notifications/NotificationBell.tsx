'use client';

import {useId, useLayoutEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AppIcon} from '@/components/layout/AppIcon';
import {Link} from '@/i18n/navigation';
import {getDocumentReviewFixture} from '@/features/document-review/fixtures';
import {markAllNotificationsRead} from './local-state';
import {activityIcons, activityTones} from './presentation';
import type {NotificationActivityItem} from './types';
import styles from './NotificationBell.module.css';

const PREVIEW_LIMIT = 6;

function relativeTime(value: string, referenceTime: string, locale: string, minutesAgo: (count: number) => string, hoursAgo: (count: number) => string, yesterday: (time: string) => string) {
  const minutes = Math.max(0, Math.floor((Date.parse(referenceTime) - Date.parse(value)) / 60_000));
  if (minutes < 60) return minutesAgo(minutes);
  if (minutes < 24 * 60) return hoursAgo(Math.floor(minutes / 60));
  const event = new Date(value);
  const time = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'}).format(event);
  if (minutes < 48 * 60) return yesterday(time);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {day: '2-digit', month: 'short', timeZone: 'UTC'}).format(event);
}

export function NotificationBell({locale, items, referenceTime, compact = false}: {
  locale: string;
  items: NotificationActivityItem[];
  referenceTime: string;
  compact?: boolean;
}) {
  const t = useTranslations('NotificationCenter');
  const app = useTranslations('AppShell');
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({left: 0, top: 0, width: 0, maxHeight: 0});
  const unreadCount = items.filter((item) => item.isUnread).length;
  const recent = [...items].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, PREVIEW_LIMIT);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const gutter = window.innerWidth <= 600 ? 12 : 16;
      const width = Math.min(528, window.innerWidth - 2 * gutter);
      const left = Math.max(gutter, Math.min(bounds.right - width, window.innerWidth - gutter - width));
      const compactHeaderBottom = compact ? triggerRef.current?.closest('aside')?.getBoundingClientRect().bottom ?? 0 : 0;
      const top = Math.max(bounds.bottom, compactHeaderBottom) + 9;
      setPosition({left, top, width, maxHeight: Math.max(0, window.innerHeight - top - gutter)});
    }
    function closeFromOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus({preventScroll: true}));
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({preventScroll: true});
    }
    place();
    firstActionRef.current?.focus({preventScroll: true});
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, compact]);

  return <div className={styles.anchor}>
    <button ref={triggerRef} type="button" className={styles.trigger} data-compact={compact} aria-label={app('notificationLabel')} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((current) => !current)}>
      <AppIcon name="bell" size={23} />
      {unreadCount > 0 && <span className={styles.badge} aria-label={t('unreadCount', {count: unreadCount})}>{unreadCount}</span>}
    </button>
    {open && <div ref={panelRef} id={panelId} role="dialog" aria-labelledby={`${panelId}-title`} className={styles.panel} style={{left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight}}>
      <div className={styles.heading}>
        <h2 id={`${panelId}-title`}>{t('title')}</h2>
        <button ref={firstActionRef} type="button" aria-disabled={unreadCount === 0} onClick={() => {if (unreadCount > 0) markAllNotificationsRead(items);}}>{t('markAllRead')}</button>
      </div>
      {recent.length === 0 ? <p className={styles.empty}>{t('empty')}</p> : <ol className={styles.list}>
        {recent.map((item) => {
          const destination = item.documentId && getDocumentReviewFixture(item.documentId) ? `/documents/${item.documentId}/review` : null;
          const content = <>
            <span className={styles.unreadSlot}>{item.isUnread && <span className={styles.unreadDot} role="img" aria-label={t('unread')} />}</span>
            <span className={styles.icon} data-tone={activityTones[item.type]}><AppIcon name={activityIcons[item.type]} size={23} /></span>
            <span className={styles.copy}><strong>{item.title[locale === 'en' ? 'en' : 'ro']}</strong><span>{item.description[locale === 'en' ? 'en' : 'ro']}</span></span>
            <time dateTime={item.occurredAt}>{relativeTime(item.occurredAt, referenceTime, locale, (count) => t('minutesAgo', {count}), (count) => t('hoursAgo', {count}), (time) => t('yesterday', {time}))}</time>
          </>;
          return <li key={item.id} data-notification-id={item.id} data-unread={item.isUnread} className={styles.item}>{destination ? <Link href={destination} onClick={() => setOpen(false)} className={styles.itemContent}>{content}</Link> : <div className={styles.itemContent}>{content}</div>}</li>;
        })}
      </ol>}
      <Link href="/notifications" onClick={() => setOpen(false)} className={styles.footer}>{t('viewAll')} <AppIcon name="arrowRight" size={17} /></Link>
    </div>}
  </div>;
}
