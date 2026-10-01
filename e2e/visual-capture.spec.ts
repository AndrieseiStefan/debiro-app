import path from 'node:path';
import {expect, test} from '@playwright/test';
import {openFilters} from './support/filters';

const route = process.env.VISUAL_ROUTE ?? '/__dev/design-system';
const action = process.env.VISUAL_ACTION;
const viewportWidth = process.env.VISUAL_WIDTH ? Number(process.env.VISUAL_WIDTH) : undefined;
const viewportHeight = process.env.VISUAL_HEIGHT ? Number(process.env.VISUAL_HEIGHT) : undefined;

test('capture an unapproved route screenshot for manual mockup comparison', async ({page}) => {
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('..')) {
    throw new Error('VISUAL_ROUTE must be a local absolute pathname without traversal.');
  }
  if (viewportWidth !== undefined || viewportHeight !== undefined) {
    if (viewportWidth === undefined || viewportHeight === undefined || !Number.isInteger(viewportWidth) ||
        !Number.isInteger(viewportHeight) || viewportWidth < 320 || viewportHeight < 320) {
      throw new Error('VISUAL_WIDTH and VISUAL_HEIGHT must both be integers of at least 320.');
    }
    await page.setViewportSize({width: viewportWidth, height: viewportHeight});
  }

  await page.clock.setFixedTime(new Date('2025-01-15T12:00:00Z'));
  const response = await page.goto(route);
  expect(response?.status()).toBeLessThan(400);
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; });
  if (action) {
    if (action === 'filters') {
      if (!/^\/(en\/)?(vendors(\/construct-pro)?|documents)$/.test(route)) throw new Error('Filter capture requires an implemented data-view route.');
      await openFilters(page);
    } else if (action === 'vendor-sort-name-asc' || action === 'vendor-sort-expiry-desc') {
      if (route !== '/vendors' && route !== '/en/vendors') throw new Error('Vendor sort capture requires the Vendors route.');
      const english = route.startsWith('/en');
      const header = page.getByRole('columnheader', {name: action === 'vendor-sort-name-asc' ? english ? 'SUPPLIER' : 'FURNIZOR' : english ? 'NEXT EXPIRY' : 'URMĂTOAREA EXPIRARE', exact: true});
      await header.getByRole('button').click();
      if (action === 'vendor-sort-expiry-desc') await header.getByRole('button').click();
      await expect(header).toHaveAttribute('aria-sort', action === 'vendor-sort-name-asc' ? 'ascending' : 'descending');
      await page.evaluate(() => window.scrollTo(0, 0));
    } else if (action === 'vendor-inactive' || action === 'vendor-menu' || action === 'vendor-inactive-details') {
      if (route !== '/vendors' && route !== '/en/vendors') throw new Error('Vendor lifecycle capture requires the Vendors route.');
      const english = route.startsWith('/en');
      const row = page.locator('[data-vendor-id="construct-pro"]');
      await row.getByRole('button', {name: english ? 'Actions for Construct Pro SRL' : 'Acțiuni pentru Construct Pro SRL'}).click();
      if (action !== 'vendor-menu') {
        await page.getByRole('menuitem', {name: english ? 'Mark inactive' : 'Marchează ca inactiv'}).click();
        await expect(row).toHaveAttribute('data-lifecycle', 'inactive');
        await row.evaluate((element) => {element.closest('[role="region"]')!.scrollLeft = 0;});
        if (action === 'vendor-inactive-details') {
          await row.getByRole('link').click();
          await expect(page.locator('[data-vendor-lifecycle]')).toHaveText(english ? 'Inactive' : 'Inactiv');
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    } else if (action === 'invite-member') {
      if (route !== '/company/settings/members' && route !== '/en/company/settings/members') throw new Error('Invite Member capture requires the Members & Access route.');
      await page.getByRole('button', {name: route.startsWith('/en') ? 'Invite member' : 'Invită membru'}).click();
      await expect(page.getByRole('dialog', {name: route.startsWith('/en') ? 'Invite member' : 'Invită membru'})).toBeVisible();
    } else if (action === 'notification-bell') {
      await page.getByRole('button', {name: route.startsWith('/en') ? 'Notifications' : 'Notificări', exact: true}).click();
      await expect(page.getByRole('dialog', {name: route.startsWith('/en') ? 'Notifications' : 'Notificări'})).toBeVisible();
    } else if (action === 'profile-dropdown') {
      await page.getByRole('button', {name: new RegExp(route.startsWith('/en') ? '^User profile:' : '^Profil utilizator:')}).click();
      await expect(page.getByRole('dialog', {name: route.startsWith('/en') ? 'Profile menu' : 'Meniu profil'})).toBeVisible();
    } else if (action === 'company-switcher') {
      await page.getByRole('button', {name: 'Demo Company SRL'}).click();
      await expect(page.getByRole('dialog', {name: route.startsWith('/en') ? 'Switch company' : 'Schimbă compania'})).toBeVisible();
    } else if (action === 'company-reviewer') {
      if (route !== '/company/settings/members' && route !== '/en/company/settings/members') throw new Error('Reviewer capture requires the Members & Access route.');
      await page.getByRole('button', {name: 'Demo Company SRL'}).click();
      await page.getByRole('dialog', {name: route.startsWith('/en') ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: /Global Clean Services/}).click();
      await expect(page.getByRole('heading', {name: 'Global Clean Services'})).toBeVisible();
    } else if (action === 'requirement-preview' || action === 'requirement-draft' || action === 'requirement-suggestions' || action === 'requirement-custom' || action === 'requirement-edit' || action === 'requirement-appearance' || action === 'requirement-document-appearance' || action === 'requirement-duplicate' || action === 'requirement-delete-confirm') {
      if (route !== '/requirements' && route !== '/en/requirements') throw new Error('Requirement captures require the Requirements route.');
      const english = route.startsWith('/en');
      if (action === 'requirement-preview') {
        await page.getByRole('tab', {name: english ? 'Preview' : 'Previzualizare'}).click();
        await expect(page.locator('#preview-panel')).toBeVisible();
      } else if (action === 'requirement-draft') await page.getByRole('button', {name: english ? 'New template' : 'Șablon nou', exact: true}).click();
      else if (action === 'requirement-appearance') {
        await page.getByRole('button', {name: english ? 'Change icon and color' : 'Schimbă iconița și culoarea'}).click();
        await expect(page.getByRole('dialog', {name: english ? 'Choose appearance' : 'Alege aspectul'})).toBeVisible();
      } else if (action === 'requirement-document-appearance') {
        await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document'}).click();
        const drawer = page.getByRole('dialog', {name: english ? 'Add document' : 'Adaugă document'});
        await drawer.getByRole('button', {name: english ? 'Custom document' : 'Document personalizat'}).click();
        await drawer.getByRole('button', {name: english ? 'Change document icon and color' : 'Schimbă iconița și culoarea documentului'}).click();
        await expect(page.getByRole('dialog', {name: english ? 'Choose appearance' : 'Alege aspectul'})).toBeVisible();
      } else if (action === 'requirement-duplicate') {
        await page.getByRole('button', {name: english ? 'Duplicate template' : 'Duplică șablon'}).click();
        await expect(page.locator('#requirement-template-name')).toHaveValue(/copy|copie/);
      } else if (action === 'requirement-delete-confirm') {
        await page.getByRole('button', {name: english ? 'Delete template' : 'Șterge șablon'}).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
      }
      else if (action === 'requirement-edit') {
        await page.locator('#requirement-template-name').fill(english ? 'Updated construction template' : 'Șablon construcții actualizat');
        await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document'}).click();
        const drawer = page.getByRole('dialog', {name: english ? 'Add document' : 'Adaugă document'});
        await drawer.getByRole('button', {name: english ? 'Custom document' : 'Document personalizat'}).click();
        await drawer.getByRole('textbox', {name: english ? /Document name/ : /Nume document/}).fill(english ? 'Local permit' : 'Aviz local');
        await drawer.getByRole('button', {name: english ? 'Add document' : 'Adaugă documentul', exact: true}).click();
        await page.getByRole('button', {name: english ? 'Edit custom document Local permit' : 'Editează documentul personalizat Aviz local'}).click();
      }
      else {
        await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document'}).click();
        if (action === 'requirement-custom') await page.getByRole('dialog', {name: english ? 'Add document' : 'Adaugă document'}).getByRole('button', {name: english ? 'Custom document' : 'Document personalizat'}).click();
      }
    } else if (action === 'template-selector' || action === 'template-summary' || action === 'template-applied' || action === 'template-remove-association' || action === 'template-remove-uploaded') {
      if (route !== '/vendors/construct-pro' && route !== '/en/vendors/construct-pro') throw new Error('Template assignment capture requires the canonical vendor route.');
      const english = route.startsWith('/en');
      await page.getByRole('button', {name: english ? 'Set up documents from templates' : 'Setează documente din șablon', exact: true}).click();
      const selector = page.getByRole('dialog', {name: english ? 'Set up documents from templates' : 'Setează documente din șablon', exact: true});
      await selector.getByRole('checkbox', {name: english ? /^Construction subcontractor/ : /^Subcontractor construcții/}).check();
      await selector.getByRole('checkbox', {name: english ? /^Maintenance services/ : /^Servicii de mentenanță/}).check();
      if (action !== 'template-selector') {
        await selector.getByRole('button', {name: english ? 'Apply 2 templates' : 'Aplică 2 șabloane'}).click();
        const summary = page.getByRole('dialog', {name: english ? 'Apply templates' : 'Aplică șabloane', exact: true});
        if (action !== 'template-summary') {
          await summary.getByRole('button', {name: english ? 'Apply templates' : 'Aplică șabloanele'}).click();
          await expect(summary).not.toBeVisible();
          await page.locator('#vendor-documents').scrollIntoViewIfNeeded();
          if (action === 'template-remove-association') {
            await page.getByRole('button', {name: english ? 'Remove association with Construction subcontractor' : 'Elimină asocierea cu Subcontractor construcții'}).click();
            await expect(page.getByRole('alertdialog')).toBeVisible();
          } else if (action === 'template-remove-uploaded') {
            const row = page.getByRole('row').filter({hasText: english ? 'Tax certificate' : 'Certificat fiscal'});
            await row.getByRole('button', {name: english ? 'Actions for Tax certificate' : 'Acțiuni pentru Certificat fiscal'}).click();
            await page.getByRole('menuitem', {name: english ? 'Remove requirement' : 'Elimină cerința'}).click();
            await expect(page.getByRole('alertdialog')).toBeVisible();
          }
        }
      }
    } else if (action === 'edit-vendor' || action === 'edit-vendor-end' || action === 'edit-vendor-dirty' || action === 'edit-vendor-category-warning') {
      if (route !== '/vendors/construct-pro' && route !== '/en/vendors/construct-pro') throw new Error('Edit Vendor capture requires the canonical vendor route.');
      const english = route.startsWith('/en');
      await page.getByRole('button', {name: english ? 'Edit vendor' : 'Editează furnizor'}).click();
      const dialog = page.getByRole('dialog', {name: english ? 'Edit vendor' : 'Editează furnizor'});
      await expect(dialog).toBeVisible();
      if (action === 'edit-vendor-end') await dialog.evaluate((element) => {element.scrollTop = element.scrollHeight;});
      if (action === 'edit-vendor-category-warning') {await dialog.locator('#edit-vendor-category').selectOption('software'); await dialog.locator('[data-category-warning]').scrollIntoViewIfNeeded();}
      if (action === 'edit-vendor-dirty') {
        await dialog.locator('#edit-vendor-name').fill('Construct Pro Updated SRL');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('alertdialog')).toBeVisible();
      }
    } else if (action === 'invite-vendor') {
      await page.getByRole('button', {name: 'Invită furnizor'}).click();
      await expect(page.getByRole('dialog', {name: 'Invită furnizorul să încarce documentele'})).toBeVisible();
    } else if (action === 'add-document' || action === 'add-document-end' || action === 'add-document-created' || action === 'add-document-review') {
      if (route !== '/vendors/construct-pro' && route !== '/en/vendors/construct-pro') throw new Error('Add Document capture requires the canonical vendor route.');
      const english = route.startsWith('/en');
      await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document'}).click();
      const dialog = page.getByRole('dialog', {name: english ? 'Add document' : 'Adaugă document'});
      await expect(dialog).toBeVisible();
      if (action === 'add-document-end') await dialog.evaluate((element) => {element.scrollTop = element.scrollHeight;});
      if (action === 'add-document-created' || action === 'add-document-review') {
        await dialog.locator('input[type=file]').setInputFiles({name: action === 'add-document-review' ? 'Certificat_fiscal_CP_2024.pdf' : 'Document_local.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nlocal demo')});
        await dialog.getByRole('combobox', {name: english ? /Document type/ : /Tip document/}).selectOption('tax');
        if (action === 'add-document-review') await dialog.getByRole('checkbox', {name: english ? 'Try automatic data extraction' : 'Încearcă extragerea automată a datelor'}).check();
        await dialog.getByRole('button', {name: english ? 'Upload and continue' : 'Încarcă și continuă'}).click();
        await expect(dialog).not.toBeVisible();
        if (action === 'add-document-review') await expect(page).toHaveURL(/\/documents\/local-document-[a-f0-9-]+\/review$/);
        else await expect(page.getByRole('row', {name: /Certificat fiscal.*Încărcat|Tax certificate.*Uploaded/}).first()).toBeVisible();
      }
    } else if (action === 'add-vendor' || action === 'add-vendor-end' || action === 'add-vendor-created') {
      if (route !== '/vendors' && route !== '/en/vendors') throw new Error('Add Vendor capture action requires a vendors route.');
      const english = route.startsWith('/en');
      await page.getByRole('button', {name: english ? 'Add supplier' : 'Adaugă furnizor', exact: true}).click();
      const dialog = page.getByRole('dialog', {name: english ? 'Add supplier' : 'Adaugă furnizor'});
      await expect(dialog).toBeVisible();
      if (action === 'add-vendor-end') await dialog.evaluate((element) => {element.scrollTop = element.scrollHeight;});
      if (action === 'add-vendor-created') {
        await dialog.getByRole('textbox', {name: english ? /Supplier name/ : /Numele furnizorului/}).fill('Atelier Verde SRL');
        await dialog.getByRole('textbox', {name: english ? /CUI \/ Tax ID/ : /CUI \/ Cod fiscal/}).fill('RO24681357');
        await dialog.getByRole('textbox', {name: english ? /Contact email/ : /Email de contact/}).fill('contact@atelierverde.ro');
        await dialog.getByRole('combobox', {name: english ? /Category/ : /Categorie/}).selectOption('construction');
        await dialog.getByRole('button', {name: english ? 'Add supplier' : 'Adaugă furnizor', exact: true}).click();
        await expect(page.getByRole('heading', {name: 'Atelier Verde SRL', level: 1})).toBeVisible();
      }
    } else if (action === 'onboarding-step2' || action === 'onboarding-step3') {
      if (route !== '/onboarding' && route !== '/en/onboarding') throw new Error('Onboarding capture action requires an onboarding route.');
      await page.getByRole('button', {name: route.startsWith('/en') ? 'Continue' : 'Continuă'}).click();
      if (action === 'onboarding-step3') await page.getByRole('button', {name: route.startsWith('/en') ? 'Configure later' : 'Configurează mai târziu'}).click();
    } else throw new Error('Unknown VISUAL_ACTION.');
  }

  const name = route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const output = path.join(process.cwd(), 'artifacts', 'visual', `${name}${action ? `-${action}` : ''}${viewportWidth ? `-${viewportWidth}x${viewportHeight}` : ''}.png`);
  await page.screenshot({path: output, fullPage: !action || action === 'requirement-edit' || action === 'requirement-preview' || action.startsWith('vendor-'), animations: 'disabled'});
  if (action === 'vendor-menu') await page.getByRole('menu').screenshot({path: output.replace(/\.png$/, '-menu.png'), animations: 'disabled'});
  if (action === 'requirement-preview') await page.locator('#preview-panel').screenshot({path: output.replace(/\.png$/, '-section.png'), animations: 'disabled'});
  if (/^\/(en\/)?upload\//.test(route)) await page.locator('[data-supplier-requirements]').screenshot({path: output.replace(/\.png$/, '-section.png'), animations: 'disabled'});
});
