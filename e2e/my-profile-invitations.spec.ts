import {expect, test, type Page} from '@playwright/test';

async function menu(page: Page, english = false) {
  await page.getByRole('button', {name: new RegExp(english ? '^User profile:' : '^Profil utilizator:')}).click();
  return page.getByRole('dialog', {name: english ? 'Profile menu' : 'Meniu profil'});
}
for (const english of [false, true]) {
  const prefix = english ? '/en' : '';
  test(`global profile edits, preferences, live identity and Company Profile independence ${english ? 'EN' : 'RO'}`, async ({page}) => {
    await page.goto(`${prefix}/vendors`);
    await (await menu(page, english)).getByRole('link', {name: english ? 'My profile' : 'Profilul meu', exact: true}).click();
    await expect(page).toHaveURL(`${prefix}/profile`);
    const save = page.getByRole('button', {name: english ? 'Save changes' : 'Salvează modificările'});
    await expect(save).toBeDisabled();
    await expect(page.locator('#user-email')).toHaveAttribute('readonly');
    await page.locator('#user-firstName').fill(' '); await expect(save).toBeDisabled();
    await page.locator('#user-firstName').fill('Elena');
    await page.getByRole('button', {name: english ? 'Cancel' : 'Anulează', exact: true}).click();
    await expect(page.locator('#user-firstName')).toHaveValue('Andrei');
    await page.locator('#user-firstName').fill('Elena'); await page.locator('#user-lastName').fill('Ionescu'); await page.locator('#user-phone').fill('extension 4'); await save.click();
    await expect(page.getByRole('status')).toContainText(english ? 'Changes saved.' : 'Modificările au fost salvate.');
    await expect(page.getByRole('button', {name: `${english ? 'User profile' : 'Profil utilizator'}: Elena Ionescu`})).toBeVisible();
    const profile = await menu(page, english);
    await expect(profile).toContainText('Elena Ionescu'); await expect(profile).toContainText('EI'); await expect(profile.getByRole('link', {name: english ? 'My profile' : 'Profilul meu', exact: true})).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');
    await page.getByRole('switch', {name: english ? /^Reports and summaries/ : /^Rapoarte și rezumate/}).check();
    await page.locator('#user-language').selectOption(english ? 'ro' : 'en');
    await expect(page).toHaveURL(english ? '/profile' : '/en/profile');
    await expect(page.locator('#user-language')).toHaveValue(english ? 'ro' : 'en'); await expect(page.locator('#user-firstName')).toHaveValue('Elena');
    await page.getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).click();
    await expect(page).toHaveURL(`${prefix}/profile`); await expect(page.locator('#user-language')).toHaveValue(english ? 'en' : 'ro');
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
    await expect(page).toHaveURL(`${prefix}/profile`); await expect(page.locator('#user-firstName')).toHaveValue('Elena');
    const switched = await menu(page, english); await expect(switched).toContainText('Reviewer'); await expect(switched).toContainText('Elena Ionescu');
    await switched.getByRole('link', {name: english ? 'My profile' : 'Profilul meu', exact: true}).click();
    await expect(page.locator('#user-phone')).toHaveValue('extension 4'); await expect(page.getByRole('switch', {name: english ? /^Reports and summaries/ : /^Rapoarte și rezumate/})).toBeChecked();
    await (await menu(page, english)).getByRole('link', {name: english ? 'My companies 2' : 'Companiile mele 2'}).click();
    await expect(page.locator('#create-company-form input[readonly]')).toHaveValue('Elena Ionescu');
    await page.getByRole('button', {name: english ? 'Company settings' : 'Setări companie', exact: true}).click();
    await page.getByRole('link', {name: english ? 'Members & access' : 'Membri și acces', exact: true}).click();
    await expect(page.locator('[data-member-id="membership-andrei-global-clean"]')).toContainText('Elena Ionescu');
    await page.getByRole('link', {name: english ? 'Company profile' : 'Profil companie', exact: true}).click(); await expect(page.locator('#profile-name')).toHaveValue('Global Clean Services');
  });

  test(`accept invitation adds shared membership, keeps workspace, updates history/badge ${english ? 'EN' : 'RO'}`, async ({page}) => {
    await page.goto(`${prefix}/vendors`);
    await (await menu(page, english)).getByRole('link', {name: english ? 'My invitations 1' : 'Invitațiile mele 1'}).click();
    await expect(page).toHaveURL(`${prefix}/invitations`);
    const active = page.locator('[data-invitation-id="invitation-construct-group"]');
    await expect(page.locator('[data-invitation-id="invitation-pro-build"]')).toHaveAttribute('data-status', 'expired');
    await expect(page.locator('[data-invitation-id="invitation-pro-build"]').getByRole('button')).toHaveCount(0);
    await active.getByRole('button', {name: english ? 'Accept' : 'Acceptă', exact: true}).click();
    await expect(active).toHaveAttribute('data-status', 'accepted'); await expect(active.getByRole('button')).toHaveCount(0); await expect(page).toHaveURL(`${prefix}/invitations`);
    await expect(page.getByRole('button', {name: 'Demo Company SRL', exact: true})).toBeVisible();
    const profile = await menu(page, english);
    const invitations = profile.getByRole('link', {name: english ? 'My invitations' : 'Invitațiile mele', exact: true});
    await expect(invitations).toHaveAttribute('aria-current', 'page'); await expect(invitations.locator('span')).toHaveCount(1);
    await profile.getByRole('link', {name: english ? 'My companies 3' : 'Companiile mele 3'}).click();
    await expect(page.locator('[data-company-id="construct-group"]')).toContainText('Construct Group SRL');
    await page.getByRole('button', {name: 'Demo Company SRL', exact: true}).click();
    await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Construct Group SRL/}).click();
    await expect(page).toHaveURL(`${prefix}/profile/companies`); await expect(page.getByRole('button', {name: 'Construct Group SRL', exact: true})).toBeVisible();
    await (await menu(page, english)).getByRole('link', {name: english ? 'My invitations' : 'Invitațiile mele', exact: true}).click();
    await expect(page.locator('[data-invitation-id="invitation-construct-group"]')).toHaveAttribute('data-status', 'accepted');
    await page.locator('#invitation-filter').selectOption('pending'); await expect(page.getByText(english ? 'No invitations match the selected filter.' : 'Nu există invitații pentru filtrul selectat.')).toBeVisible();
    await page.locator('#invitation-filter').selectOption('accepted'); await expect(page.locator('[data-invitation-id]')).toHaveCount(2);
    await page.getByRole('link', {name: english ? 'EN' : 'RO', exact: true}).click(); await expect(page.locator('[data-invitation-id="invitation-construct-group"]')).toHaveAttribute('data-status', 'accepted');
  });

  test(`reject confirmation retains historical record and does not grant access ${english ? 'EN' : 'RO'}`, async ({page}) => {
    await page.goto(`${prefix}/invitations`);
    const reject = page.locator('[data-invitation-id="invitation-construct-group"]').getByRole('button', {name: english ? 'Reject' : 'Refuză'});
    await reject.click(); await page.keyboard.press('Escape'); await expect(reject).toBeFocused();
    await reject.click(); const confirmation = page.getByRole('alertdialog'); await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {name: english ? 'Reject' : 'Refuză'}).click();
    await expect(page.locator('[data-invitation-id="invitation-construct-group"]')).toHaveAttribute('data-status', 'rejected');
    await page.locator('#invitation-filter').selectOption('rejected'); await expect(page.locator('[data-invitation-id]')).toHaveCount(1);
    const profile = await menu(page, english); await expect(profile.getByRole('link', {name: english ? 'My companies 2' : 'Companiile mele 2'})).toBeVisible(); await expect(profile.getByRole('link', {name: english ? 'My invitations' : 'Invitațiile mele', exact: true})).toBeVisible();
  });
}

test('dirty profile navigation uses existing confirmation and does not discard preferences', async ({page}) => {
  await page.goto('/profile'); await page.locator('#user-firstName').fill('Unsaved');
  await page.locator('#user-language').selectOption('en'); await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', {name: 'Continuă editarea'}).click(); await expect(page).toHaveURL('/profile'); await expect(page.locator('#user-firstName')).toHaveValue('Unsaved');
  await page.getByRole('link', {name: 'Furnizori', exact: true}).click(); await page.getByRole('alertdialog').getByRole('button', {name: 'Renunță la modificări'}).click(); await expect(page).toHaveURL('/vendors');
  await (await menu(page)).getByRole('link', {name: 'Profilul meu', exact: true}).click(); await expect(page.locator('#user-firstName')).toHaveValue('Andrei');
});

test('global pages and controls remain contained at every required responsive width', async ({page}) => {
  for (const width of [1448, 1200, 1024, 768, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: 900});
    for (const route of ['/profile', '/invitations', '/en/profile', '/en/invitations']) {
      await page.goto(route); await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}`).toBeLessThanOrEqual(width);
      for (const control of await page.locator('main input, main select, main button').all()) {
        const box = await control.boundingBox(); if (box && box.width > 1) {expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);}
      }
      for (const invitation of await page.locator('[data-invitation-id]').all()) {
        const roleIcon = await invitation.locator('[data-role] svg').boundingBox();
        expect(roleIcon?.width, `${route} ${width}px role icon must not shrink`).toBeGreaterThanOrEqual(13);
        const fields = await invitation.evaluate((card) => [...card.querySelectorAll('[class*="__detail"]')].map((field) => {
          const rect = field.getBoundingClientRect();
          return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, children: [...field.children].map((child) => {const box = child.getBoundingClientRect(); return {left: box.left, right: box.right};})};
        }));
        expect(fields).toHaveLength(4);
        for (const field of fields) for (const child of field.children) {
          expect(child.left, `${route} ${width}px field left`).toBeGreaterThanOrEqual(field.left - 1);
          expect(child.right, `${route} ${width}px field right`).toBeLessThanOrEqual(field.right + 1);
        }
        for (let index = 0; index < fields.length; index++) for (const other of fields.slice(index + 1)) {
          const field = fields[index];
          expect(field.right <= other.left + 1 || other.right <= field.left + 1 || field.bottom <= other.top + 1 || other.bottom <= field.top + 1, `${route} ${width}px fields collide`).toBe(true);
        }
      }
    }
  }
});
