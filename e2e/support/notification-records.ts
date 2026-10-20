import type {Page} from '@playwright/test';
import type {NotificationActivityItem} from '../../src/features/notifications/types';

/** Isolated records enter the existing page prop via client navigation, never a
 * production fixture, store, endpoint or application test hook. SSR stays intact. */
export async function notificationRecords(page: Page, records: NotificationActivityItem[]) {
  await page.route(/\/(?:en\/|ro\/)?notifications(?:\?.*)?$/, async (route) => {
    if (route.request().headers().rsc !== '1') return route.continue();
    const response = await route.fetch();
    let replaced = false;
    function visit(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const object = value as Record<string, unknown>;
      const view = object.view as {notifications?: unknown; originalNotificationRecords?: unknown} | undefined;
      if (view && Array.isArray(view.notifications)) {
        // Flight may share audit title/description references with the original
        // notices. Retain those values under a test-only prop and retarget paths.
        view.originalNotificationRecords = view.notifications;
        view.notifications = records; replaced = true;
      }
      Object.values(object).forEach(visit);
    }
    const original = await response.text();
    const body = original.split('\n').map((line) => {
      const record = /^([a-f\d]+:)([\[{].*)$/.exec(line);
      if (!record) return line;
      try {const data: unknown = JSON.parse(record[2]); visit(data); return record[1] + JSON.stringify(data);} catch {return line;}
    }).join('\n').replaceAll(':view:notifications:', ':view:originalNotificationRecords:');
    // Tree/layout prefetches contain no page props and must pass through intact.
    if (original.includes('"view"') && !replaced) throw new Error('Expected the existing Notifications page view prop in the client-navigation response');
    await route.fulfill({response, body});
  });
}
