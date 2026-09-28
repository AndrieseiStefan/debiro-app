import {expect, test} from '@playwright/test';

test('company settings expands, highlights Members & Access, and keeps company context', async ({page}) => {
  await page.goto('/company/settings/members');
  await expect(page.getByRole('heading', {level: 1, name: 'Membri și acces'})).toBeVisible();
  const breadcrumbs = page.getByRole('navigation', {name: 'Navigare pe pagină'});
  await expect(breadcrumbs.getByRole('link', {name: 'Dashboard'})).toBeVisible();
  await expect(breadcrumbs.getByText('Setări companie')).toBeVisible();
  await expect(breadcrumbs.getByText('Membri și acces')).toHaveAttribute('aria-current', 'page');
  const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  const settings = navigation.getByRole('button', {name: 'Setări companie'});
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.getByRole('link', {name: 'Membri și acces'})).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('button', {name: 'Profil companie'})).toHaveAttribute('aria-disabled', 'true');
  await expect(navigation.getByRole('button', {name: 'Plan și facturare'})).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', {name: 'Demo Company SRL'})).toBeVisible();
  await settings.click();
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation.getByRole('link', {name: 'Membri și acces'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Demo Company SRL'})).toBeVisible();
  await settings.click();
  await expect(navigation.getByRole('link', {name: 'Membri și acces'})).toHaveAttribute('aria-current', 'page');
  await navigation.getByRole('link', {name: 'Dashboard'}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
  await navigation.getByRole('link', {name: 'Membri și acces'}).click();
  await expect(page).toHaveURL(/\/company\/settings\/members$/);
});

test('company settings expansion persists while the active main section changes', async ({page}) => {
  await page.goto('/dashboard');
  const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  const settings = navigation.getByRole('button', {name: 'Setări companie'});
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await settings.click();
  await expect(settings).toHaveAttribute('aria-expanded', 'true');

  for (const [label, path] of [
    ['Furnizori', '/vendors'],
    ['Documente', '/documents'],
    ['Cerințe', '/requirements'],
    ['Notificări', '/notifications'],
    ['Dashboard', '/dashboard']
  ]) {
    await navigation.getByRole('link', {name: label}).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(navigation.getByRole('link', {name: label})).toHaveAttribute('aria-current', 'page');
    await expect(settings).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation.getByRole('link', {name: 'Membri și acces'})).toBeVisible();
  }

  await expect(navigation.getByRole('button', {name: 'Rapoarte'})).toHaveAttribute('aria-disabled', 'true');
  await settings.click();
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation.getByRole('link', {name: 'Membri și acces'})).toHaveCount(0);
  await settings.click();
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
});

test('company settings trigger keeps its full rounded geometry in each disclosure state', async ({page}) => {
  for (const width of [1448, 758]) {
    await page.setViewportSize({width, height: 1086});
    await page.goto('/company/settings/members');
    const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
    const settings = navigation.getByRole('button', {name: 'Setări companie'});
    const geometry = async () => settings.evaluate((trigger) => {
      const group = trigger.parentElement!;
      const submenu = group.querySelector('#company-settings-subnav');
      return {
        height: trigger.getBoundingClientRect().height,
        radius: getComputedStyle(trigger).borderRadius,
        groupOverflow: getComputedStyle(group).overflow,
        submenuGap: submenu ? submenu.getBoundingClientRect().top - trigger.getBoundingClientRect().bottom : null
      };
    });

    await expect(settings).toHaveAttribute('aria-expanded', 'true');
    expect(await geometry()).toMatchObject({height: width > 800 ? 48 : 36, radius: '9px', groupOverflow: 'visible'});
    if (width > 800) expect((await geometry()).submenuGap).toBeGreaterThanOrEqual(4);

    await navigation.getByRole('link', {name: 'Documente'}).click();
    await expect(navigation.getByRole('link', {name: 'Documente'})).toHaveAttribute('aria-current', 'page');
    await expect(settings).toHaveAttribute('aria-expanded', 'true');
    expect(await geometry()).toMatchObject({height: width > 800 ? 48 : 36, radius: '9px', groupOverflow: 'visible'});

    await settings.click();
    await expect(settings).toHaveAttribute('aria-expanded', 'false');
    expect(await geometry()).toMatchObject({height: width > 800 ? 48 : 36, radius: '9px', groupOverflow: 'visible', submenuGap: null});
  }
});

test('company settings trigger matches the standard desktop primary item width', async ({page}) => {
  await page.setViewportSize({width: 1448, height: 1086});
  await page.goto('/company/settings/members');
  const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
  const reports = navigation.getByRole('button', {name: 'Rapoarte'});
  const settings = navigation.getByRole('button', {name: 'Setări companie'});

  async function expectMatchingGeometry() {
    const reportBounds = (await reports.boundingBox())!;
    const settingsBounds = (await settings.boundingBox())!;
    expect(settingsBounds.x).toBeCloseTo(reportBounds.x, 1);
    expect(settingsBounds.width).toBeCloseTo(reportBounds.width, 1);
    expect(settingsBounds.height).toBeCloseTo(reportBounds.height, 1);
    expect(settingsBounds.x + settingsBounds.width).toBeCloseTo(reportBounds.x + reportBounds.width, 1);
  }

  await expectMatchingGeometry();
  await navigation.getByRole('link', {name: 'Documente'}).click();
  await expect(page).toHaveURL(/\/documents$/);
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
  await expectMatchingGeometry();
  await settings.click();
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await expectMatchingGeometry();
});

test('invitation validates fields, rejects same-company duplicates, and survives client navigation', async ({page}) => {
  await page.goto('/company/settings/members');
  await page.getByRole('button', {name: 'Invită membru'}).click();
  const dialog = page.getByRole('dialog', {name: 'Invită membru'});
  await expect(dialog.getByRole('textbox', {name: /Companie/})).toHaveValue('Demo Company SRL');
  await expect(dialog.getByRole('textbox', {name: /Companie/})).toHaveAttribute('readonly', '');
  await expect(dialog.getByText('Demonstrație locală: nu se trimite niciun email și nu se creează un cont.')).toBeVisible();
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog.getByText('Introdu numele complet.')).toBeVisible();
  await expect(dialog.getByText('Introdu adresa de email.')).toBeVisible();
  await expect(dialog.getByText('Selectează un rol.')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Nume complet/}).fill('  Radu Ionescu  ');
  await dialog.getByRole('textbox', {name: /Adresă de email/}).fill('invalid');
  await dialog.getByRole('radio', {name: /Reviewer/}).check();
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog.getByText('Introdu o adresă de email validă.')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Adresă de email/}).fill(' IOANA.RADU@DEMO.RO ');
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog.getByText('Această adresă de email are deja un membru sau o invitație în compania activă.')).toBeVisible();
  await dialog.getByRole('textbox', {name: /Adresă de email/}).fill('radu.ionescu@demo.ro');
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog).not.toBeVisible();
  const row = page.getByRole('row', {name: /Radu Ionescu/});
  await expect(row).toContainText('Reviewer');
  await expect(row).toContainText('Invitație trimisă');
  await expect(page.getByText('2 utilizatori activi din 5 disponibili. 2 invitații în așteptare.')).toBeVisible();
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Furnizori'}).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('button', {name: 'Setări companie'})).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('navigation', {name: 'Navigare în aplicație'}).getByRole('link', {name: 'Membri și acces'}).click();
  await expect(page.getByRole('row', {name: /Radu Ionescu/})).toContainText('Invitație trimisă');
  await page.getByRole('button', {name: 'Invită membru'}).click();
  await dialog.getByRole('textbox', {name: /Nume complet/}).fill('Radu Again');
  await dialog.getByRole('textbox', {name: /Adresă de email/}).fill('RADU.IONESCU@DEMO.RO');
  await dialog.getByRole('radio', {name: /Viewer/}).check();
  await dialog.getByRole('button', {name: 'Trimite invitația'}).click();
  await expect(dialog.getByText('Această adresă de email are deja un membru sau o invitație în compania activă.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', {name: 'Invită membru'})).toBeFocused();
});

test('English route preserves company membership semantics', async ({page}) => {
  await page.goto('/en/company/settings/members');
  await expect(page.getByRole('heading', {level: 1, name: 'Members & access'})).toBeVisible();
  const navigation = page.getByRole('navigation', {name: 'Application navigation'});
  await expect(navigation.getByRole('link', {name: 'Members & access'})).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', {name: 'Invite member'}).click();
  const dialog = page.getByRole('dialog', {name: 'Invite member'});
  await expect(dialog.getByRole('textbox', {name: /Company/})).toHaveAttribute('readonly', '');
  await dialog.getByRole('textbox', {name: /Full name/}).fill('Jane Doe');
  await dialog.getByRole('textbox', {name: /Email address/}).fill('jane.doe@demo.ro');
  await dialog.getByRole('radio', {name: /Viewer/}).check();
  await dialog.getByRole('button', {name: 'Send invitation'}).click();
  await expect(page.getByRole('row', {name: /Jane Doe/})).toContainText('Invitation sent');
});

test('Members page and shared drawer remain contained at required widths', async ({page}) => {
  for (const [width, height] of [[1448, 1086], [1024, 768], [758, 833], [600, 800], [375, 812], [320, 700]]) {
    await page.setViewportSize({width, height});
    await page.goto('/company/settings/members');
    await page.evaluate(async () => {await document.fonts.ready;});
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px page overflow`).toBeLessThanOrEqual(width);
    if (width <= 800) {
      const navigation = page.getByRole('navigation', {name: 'Navigare în aplicație'});
      await expect(navigation.getByRole('button', {name: 'Setări companie'})).toBeInViewport();
      await expect(navigation.getByRole('link', {name: 'Membri și acces'})).toBeInViewport();
    }
    await page.getByRole('button', {name: 'Invită membru'}).click();
    const dialog = page.getByRole('dialog', {name: 'Invită membru'});
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x, `${width}px drawer left`).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width, `${width}px drawer right`).toBeLessThanOrEqual(width + 1);
    await dialog.evaluate((element) => {element.scrollTop = element.scrollHeight;});
    await expect(dialog.getByRole('button', {name: 'Trimite invitația'})).toBeInViewport();
    await dialog.getByRole('button', {name: 'Anulează'}).click();
    await expect(dialog).not.toBeVisible();
  }
});
