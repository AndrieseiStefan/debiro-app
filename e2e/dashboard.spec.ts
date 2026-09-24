import {expect, test} from '@playwright/test';
import {boundaryViewports, viewports} from './support/viewports';

test('renders the canonical Romanian dashboard in the authenticated shell', async ({page}) => {
  const response = await page.goto('/dashboard');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Bun venit, Andrei!');
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Dashboard'})).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('searchbox', {name: 'Caută furnizori, documente sau cerințe'})).toBeVisible();
  await page.getByRole('searchbox').fill('Construct Pro');
  await expect(page.getByRole('searchbox')).toHaveValue('Construct Pro');
  await expect(page.getByRole('heading', {name: 'Documente care necesită atenție'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Status furnizori'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Activitate recentă'})).toBeVisible();
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(6);
  await expect(page.getByRole('button', {name: 'Adaugă furnizor'})).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('img', {name: 'Status furnizori: 24 furnizori'})).toBeVisible();
  await expect(page.getByRole('banner').getByText('DEBIRO')).toHaveCount(0);
});

test('renders English localization and switches back to Romanian', async ({page}) => {
  const response = await page.goto('/en/dashboard');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Welcome, Andrei!');
  await expect(page.getByRole('heading', {name: 'Documents needing attention'})).toBeVisible();
  await page.setViewportSize({width: 320, height: 700});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('link', {name: 'RO', exact: true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
});

test('keeps dashboard regions separated and document overflow contained', async ({page}) => {
  await page.goto('/dashboard');
  const matrix = [viewports.desktop, viewports.tablet, viewports.mobile, {width: 320, height: 700}, ...boundaryViewports];

  for (const {width, height} of matrix) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'})).toBeVisible();
      await expect(page.getByRole('searchbox')).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Documente care necesită atenție'})).toBeVisible();
      await expect(page.getByRole('heading', {name: 'Status furnizori'})).toBeVisible();

      const geometry = await page.evaluate(() => {
        const bounds = (element: Element) => {
          const {left, right, top, bottom} = element.getBoundingClientRect();
          return {left, right, top, bottom};
        };
        const sidebar = bounds(document.querySelector('aside[aria-label="Bară laterală aplicație"]')!);
        const header = bounds(document.querySelector('header')!);
        const main = bounds(document.querySelector('main')!);
        const table = document.querySelector('table')!;
        const scrollContainer = table.parentElement!;
        return {
          scrollWidth: document.documentElement.scrollWidth,
          sidebar,
          header,
          main,
          tableScrollContained: scrollContainer.scrollWidth <= scrollContainer.clientWidth || scrollContainer.scrollWidth > scrollContainer.clientWidth && scrollContainer.clientWidth <= main.right - main.left
        };
      });

      expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
      expect(geometry.tableScrollContained).toBe(true);
      if (width > 800) {
        expect(geometry.sidebar.right).toBeLessThanOrEqual(geometry.main.left + 1);
        expect(geometry.header.bottom).toBeLessThanOrEqual(geometry.main.top + 1);
      } else {
        expect(geometry.sidebar.bottom).toBeLessThanOrEqual(geometry.header.top + 1);
        expect(geometry.header.bottom).toBeLessThanOrEqual(geometry.main.top + 1);
      }
    });
  }
});

test('keeps the desktop sidebar and organization in the viewport while the document scrolls', async ({page}) => {
  await page.goto('/dashboard');

  for (const height of [900, 768, 600]) {
    await test.step(`1448 × ${height}`, async () => {
      await page.setViewportSize({width: 1448, height});
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const geometry = await page.evaluate(() => {
        const sidebar = document.querySelector('aside[aria-label="Bară laterală aplicație"]')!.getBoundingClientRect();
        const navigation = document.querySelector('nav[aria-label="Navigare în aplicație"]')!;
        const navRect = navigation.getBoundingClientRect();
        const organization = document.querySelector('button[aria-label="Demo Company SRL"]')!.getBoundingClientRect();
        const main = document.querySelector('main')!.getBoundingClientRect();
        return {
          scrollY,
          sidebarTop: sidebar.top,
          sidebarHeight: sidebar.height,
          navigationBottom: navRect.bottom,
          navigationScrollable: navigation.scrollHeight > navigation.clientHeight,
          organizationTop: organization.top,
          organizationBottom: organization.bottom,
          mainRight: main.right
        };
      });

      expect(geometry.scrollY).toBeGreaterThan(0);
      expect(Math.abs(geometry.sidebarTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.sidebarHeight - height)).toBeLessThanOrEqual(1);
      expect(geometry.navigationBottom).toBeLessThanOrEqual(geometry.organizationTop + 1);
      expect(geometry.organizationBottom).toBeLessThanOrEqual(height);
      expect(geometry.mainRight).toBe(1448);
      if (height === 600) {
        expect(geometry.navigationScrollable).toBe(true);
        const lastItem = page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('button', {name: 'Setări'});
        await lastItem.scrollIntoViewIfNeeded();
        await expect(lastItem).toBeInViewport();
        await expect(page.getByRole('button', {name: 'Demo Company SRL'})).toBeInViewport();
      }
    });
  }
});

test('keeps authenticated utilities and organization in the correct responsive shell', async ({page}) => {
  await page.goto('/dashboard');
  const sidebar = page.locator('aside[aria-label="Bară laterală aplicație"]');
  const header = page.locator('header');
  const navigation = sidebar.getByRole('navigation', {name: 'Navigare în aplicație'});

  for (const {width, height} of [
    viewports.desktop,
    viewports.tablet,
    {width: 801, height: 900},
    {width: 800, height: 900},
    {width: 600, height: 800},
    viewports.mobile,
    {width: 351, height: 700},
    {width: 320, height: 700}
  ]) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      await expect(sidebar.getByText('DEBIRO')).toBeVisible();
      await expect(navigation.getByRole('link', {name: 'Dashboard'})).toBeVisible();
      await expect(header.getByRole('searchbox', {name: 'Caută furnizori, documente sau cerințe'})).toBeVisible();
      await expect(sidebar.getByRole('button', {name: 'Demo Company SRL'})).toBeVisible();

      const utilityRegion = width <= 800 ? sidebar : header;
      const otherRegion = width <= 800 ? header : sidebar;
      await expect(utilityRegion.getByRole('button', {name: 'Notificări', exact: true})).toBeVisible();
      await expect(utilityRegion.getByRole('navigation', {name: 'Limbă'}).getByRole('link', {name: 'RO'})).toHaveAttribute('aria-current', 'page');
      await expect(utilityRegion.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'})).toBeVisible();
      await expect(otherRegion.getByRole('button', {name: 'Profil utilizator: Andrei Popescu'})).toHaveCount(0);

      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const sidebar = rect('aside[aria-label="Bară laterală aplicație"]');
        const header = rect('header');
        const main = rect('main');
        const nav = document.querySelector('nav[aria-label="Navigare în aplicație"]')!;
        const navRect = nav.getBoundingClientRect();
        const itemRects = Array.from(nav.children, (item) => item.getBoundingClientRect());
        return {
          documentWidth: document.documentElement.scrollWidth,
          sidebarRight: sidebar.right,
          sidebarBottom: sidebar.bottom,
          headerTop: header.top,
          headerBottom: header.bottom,
          mainLeft: main.left,
          mainTop: main.top,
          navScrollWidth: nav.scrollWidth,
          navClientWidth: nav.clientWidth,
          navHeight: navRect.height,
          itemTopSpread: Math.max(...itemRects.map((item) => item.top)) - Math.min(...itemRects.map((item) => item.top))
        };
      });

      expect(geometry.documentWidth).toBeLessThanOrEqual(width);
      if (width > 800) {
        expect(geometry.sidebarRight).toBeLessThanOrEqual(geometry.mainLeft + 1);
      } else {
        expect(geometry.sidebarBottom).toBeLessThanOrEqual(geometry.headerTop + 1);
        expect(geometry.headerBottom).toBeLessThanOrEqual(geometry.mainTop + 1);
        expect(geometry.navScrollWidth).toBeGreaterThan(geometry.navClientWidth);
        expect(geometry.itemTopSpread).toBeLessThanOrEqual(1);
        expect(geometry.navHeight).toBeLessThan(50);
      }
    });
  }

  await page.setViewportSize({width: 375, height: 812});
  const lastItem = navigation.getByRole('button', {name: 'Setări'});
  await lastItem.focus();
  await expect(lastItem).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('lets longer KPI copy wrap without colliding with its chevron', async ({page}) => {
  await page.goto('/dashboard');
  await page.setViewportSize({width: 1200, height: 800});
  const geometry = await page.evaluate(() => {
    const card = document.querySelector('section[aria-label="Status furnizori"]')!.firstElementChild!;
    const copy = card.children[1];
    copy.querySelector('h2')!.textContent = 'Total furnizori și subcontractori cu documente';
    copy.querySelector('p')!.textContent = '+12345 față de luna trecută, cu activitate suplimentară';
    const cardRect = card.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    const arrowRect = card.children[2].getBoundingClientRect();
    const noteRect = copy.querySelector('p')!.getBoundingClientRect();
    return {
      copyRight: copyRect.right,
      arrowLeft: arrowRect.left,
      noteBottom: noteRect.bottom,
      cardBottom: cardRect.bottom,
      cardScrollWidth: card.scrollWidth,
      cardClientWidth: card.clientWidth
    };
  });

  expect(geometry.copyRight).toBeLessThanOrEqual(geometry.arrowLeft + 1);
  expect(geometry.noteBottom).toBeLessThanOrEqual(geometry.cardBottom + 1);
  expect(geometry.cardScrollWidth).toBeLessThanOrEqual(geometry.cardClientWidth + 1);
});

test('uses fluid app width and keeps badges and KPI content uncut', async ({page}) => {
  await page.goto('/dashboard');
  const matrix = [
    viewports.desktop,
    {width: 1625, height: 900},
    {width: 1920, height: 900},
    viewports.tablet,
    viewports.mobile,
    {width: 320, height: 700},
    ...boundaryViewports
  ];

  for (const {width, height} of matrix) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({width, height});
      const geometry = await page.evaluate(() => {
        const rect = (element: Element) => element.getBoundingClientRect();
        const main = rect(document.querySelector('main')!);
        const content = rect(document.querySelector('main > div')!);
        const cards = Array.from(document.querySelector('section[aria-label="Status furnizori"]')!.children).map((element) => {
          const card = rect(element);
          const [iconElement, copyElement, arrowElement] = Array.from(element.children);
          const icon = rect(iconElement);
          const copy = rect(copyElement);
          const arrow = rect(arrowElement);
          const note = rect(copyElement.querySelector('p')!);
          return {
            cardLeft: card.left,
            cardRight: card.right,
            cardBottom: card.bottom,
            iconRight: icon.right,
            copyLeft: copy.left,
            copyRight: copy.right,
            arrowLeft: arrow.left,
            arrowRight: arrow.right,
            noteBottom: note.bottom,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth
          };
        });
        const badges = Array.from(document.querySelectorAll('table tbody td:nth-child(3) > span')).map((element) => {
          const badge = rect(element);
          const cell = rect(element.parentElement!);
          return {
            text: element.textContent,
            right: badge.right,
            cellRight: cell.right,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth
          };
        });
        return {mainRight: main.right, contentWidth: content.width, cards, badges};
      });

      expect(Math.abs(geometry.mainRight - width)).toBeLessThanOrEqual(1);
      if (width === 1920) expect(geometry.contentWidth).toBeGreaterThan(1350);
      expect(geometry.badges.filter((badge) => badge.text?.includes('Expiră curând'))).toHaveLength(2);
      for (const badge of geometry.badges) {
        expect(badge.scrollWidth).toBeLessThanOrEqual(badge.clientWidth + 1);
        expect(badge.right).toBeLessThanOrEqual(badge.cellRight + 1);
      }
      for (const card of geometry.cards) {
        expect(card.iconRight).toBeLessThanOrEqual(card.copyLeft + 1);
        expect(card.copyRight).toBeLessThanOrEqual(card.arrowLeft + 1);
        expect(card.arrowRight).toBeLessThanOrEqual(card.cardRight + 1);
        expect(card.noteBottom).toBeLessThanOrEqual(card.cardBottom + 1);
        expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
      }
    });
  }
});
