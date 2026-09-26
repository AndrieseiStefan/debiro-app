import {expect, test} from '@playwright/test';

test('Romanian and English notifications routes render with active navigation', async ({page}) => {
  for (const [route, title, nav] of [['/notifications', 'Notificări și Activitate de Audit', 'Navigare în aplicație'], ['/en/notifications', 'Notifications and Audit Activity', 'Application navigation']]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', {level: 1, name: title})).toBeVisible();
    await expect(page.getByRole('navigation', {name: nav}).getByRole('link', {name: /Notificări|Notifications/})).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', {name: route.startsWith('/en') ? 'Audit journal' : 'Jurnal de audit'})).toBeVisible();
  }
});

test('category and date filters derive counts from fixtures without filtering audit by notification type', async ({page}) => {
  await page.goto('/notifications');
  const categories = page.getByRole('navigation', {name: 'Filtre activitate'});
  const recent = page.getByRole('region', {name: 'Activitate recentă'});
  const audit = page.getByRole('region', {name: 'Jurnal de audit'});
  await expect(categories.getByRole('button', {name: /Toate 8/})).toBeVisible();
  await expect(categories.getByRole('button', {name: /Necitite 3/})).toBeVisible();
  await categories.getByRole('button', {name: /Necitite/}).click();
  await recent.getByRole('button', {name: 'Vezi toate'}).click();
  await expect(recent.locator('tbody tr')).toHaveCount(3);
  await expect(recent.locator('tbody tr').filter({hasText: 'Necitit'})).toHaveCount(3);
  await expect(audit.locator('ol li')).toHaveCount(6);
  await categories.getByRole('button', {name: /Reminder-e/}).click();
  await expect(recent.locator('tbody tr')).toHaveCount(2);
  await categories.getByRole('button', {name: /Încărcări/}).click();
  await expect(recent.locator('tbody tr')).toHaveCount(1);
  await categories.getByRole('button', {name: /Schimbări status/}).click();
  await expect(recent.locator('tbody tr')).toHaveCount(1);
  await categories.getByRole('button', {name: /Toate/}).click();
  await audit.getByRole('button', {name: 'Vezi toate'}).click();
  await expect(audit.locator('ol li')).toHaveCount(7);
  await page.getByRole('combobox', {name: 'Perioadă activitate și audit'}).selectOption('last7');
  await expect(categories.getByRole('button', {name: /Toate 7/})).toBeVisible();
  await expect(audit.locator('ol li')).toHaveCount(6);
  await page.getByRole('combobox', {name: 'Perioadă activitate și audit'}).selectOption('all');
  await expect(categories.getByRole('button', {name: /Toate 10/})).toBeVisible();
  await expect(audit.locator('ol li')).toHaveCount(8);
  const dates = await audit.locator('ol li time').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('dateTime')));
  expect(dates).toEqual([...dates].sort().reverse());
});

test('export downloads only visible audit records as deterministic CSV', async ({page}) => {
  await page.goto('/notifications');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Exportă jurnal'}).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('jurnal-audit.csv');
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const content = Buffer.concat(chunks).toString('utf8');
  expect(content).toContain('audit-reminder-1');
  expect(content).not.toContain('notice-reminder-1');
  expect(content).not.toContain('audit-older');
});

test('responsive containment and client navigation stay stable', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1252, 833], [1024, 768], [801, 833], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/notifications');
    await page.evaluate(async () => {await document.fonts.ready;});
    const direct = await page.getByRole('region', {name: 'Jurnal de audit'}).boundingBox();
    const geometry = await page.evaluate(() => {
      const summaries = [...document.querySelectorAll('[aria-label="Rezumat activitate"] > div')];
      const summaryOverlap = summaries.some((card) => {
        const note = card.querySelector('p')!;
        const text = document.createRange();
        text.selectNodeContents(note);
        const action = card.querySelector('button')!.getBoundingClientRect();
        return [...text.getClientRects()].some((line) => line.left < action.right && line.right > action.left && line.top < action.bottom && line.bottom > action.top);
      });
      return {documentWidth: document.documentElement.scrollWidth, mainRight: document.querySelector('main')!.getBoundingClientRect().right, auditRight: document.querySelector('[aria-labelledby="audit-title"]')!.getBoundingClientRect().right, auditTop: document.querySelector('[aria-labelledby="audit-title"]')!.getBoundingClientRect().top, recentBottom: document.querySelector('#recent-section')!.getBoundingClientRect().bottom, summaryOverlap};
    });
    expect(geometry.documentWidth, `${width}px document overflow`).toBeLessThanOrEqual(width);
    expect(geometry.auditRight, `${width}px audit containment`).toBeLessThanOrEqual(geometry.mainRight + 1);
    expect(geometry.summaryOverlap, `${width}px summary note/action overlap`).toBe(false);
    if (width <= 1252) expect(geometry.auditTop, `${width}px audit stacks below activity`).toBeGreaterThanOrEqual(geometry.recentBottom);
    await page.goto('/dashboard');
    await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: /Notificări/}).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await page.evaluate(async () => {await document.fonts.ready;});
    expect(await page.getByRole('region', {name: 'Jurnal de audit'}).boundingBox(), `${width}px direct/client geometry`).toEqual(direct);
  }
});
