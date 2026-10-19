import {expect, test, type Page} from '@playwright/test';
import {createWorkspaceCompany, switchWorkspaceCompany, workspaceSection} from './support/company-workspace';

async function createFirstVendor(page: Page, english: boolean) {
  await workspaceSection(page, 'dashboard', english);
  await page.getByRole('button', {name: english ? 'Add your first vendor' : 'Adaugă primul furnizor'}).click();
  const drawer = page.getByRole('dialog');
  await drawer.locator('#add-vendor-name').fill('B Vendor');
  await drawer.locator('#add-vendor-cui').fill('RO-B-VENDOR');
  await drawer.locator('#add-vendor-email').fill('vendor-b@example.test');
  await drawer.locator('#add-vendor-category').selectOption('construction');
  await drawer.getByRole('button', {name: english ? 'Add supplier' : 'Adaugă furnizor', exact: true}).click();
  await expect(page).toHaveURL(/\/vendors\/local-/);
  await expect(page.locator('[data-vendor-name]')).toHaveText('B Vendor');
}

for (const english of [false, true]) {
  test(`${english ? 'EN' : 'RO'} blank company exposes honest first-run pages, bell and setup actions`, async ({page}) => {
    await createWorkspaceCompany(page, 'Workspace B', english);
    for (const path of ['dashboard', 'vendors', 'documents', 'requirements', 'notifications'] as const) {
      await workspaceSection(page, path, english);
      await expect(page.getByText('Construct Pro SRL', {exact: true})).toHaveCount(0);
      if (path === 'dashboard') {
        await expect(page.getByRole('button', {name: english ? 'Add your first vendor' : 'Adaugă primul furnizor'})).toBeVisible();
        const cards = page.getByRole('region', {name: english ? 'Company overview' : 'Privire de ansamblu asupra companiei'}).locator('strong');
        await expect(cards).toHaveCount(3); expect(await cards.allTextContents()).toEqual(['0', '0', '0']);
      } else if (path === 'vendors') {
        await expect(page.getByText(english ? 'You have no vendors yet' : 'Nu ai furnizori încă')).toBeVisible();
        await expect(page.getByRole('table')).toHaveCount(0);
      } else if (path === 'documents') {
        await expect(page.getByText(english ? 'No documents yet' : 'Nu există documente încă')).toBeVisible();
        expect(await page.locator('[data-status] b').allTextContents()).toEqual(['0', '0', '0', '0']);
        await expect(page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document', exact: true})).toHaveCount(0);
      } else if (path === 'requirements') await expect(page.getByText(english ? 'No templates for this company' : 'Nu există șabloane pentru această companie')).toBeVisible();
      else {await expect(page.locator('[data-audit-id]')).toHaveCount(0); await expect(page.locator('[data-notification-id]')).toHaveCount(0);}
      await page.getByRole('button', {name: english ? 'Notifications' : 'Notificări', exact: true}).filter({visible: true}).click();
      await expect(page.getByRole('dialog')).toContainText(english ? 'No recent notifications.' : 'Nu există notificări recente.');
      await page.keyboard.press('Escape');
    }
    await switchWorkspaceCompany(page, 'Workspace B', 'Demo Company SRL', english);
    await workspaceSection(page, 'vendors', english);
    await expect(page.getByRole('link', {name: english ? 'Details for Construct Pro SRL' : 'Detalii pentru Construct Pro SRL'})).toBeVisible();
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Workspace B', english);
    await workspaceSection(page, 'vendors', english);
    await expect(page.getByText(english ? 'You have no vendors yet' : 'Nu ai furnizori încă')).toBeVisible();
  });

  test(`${english ? 'EN' : 'RO'} first vendor, template, upload and review affect only their owning workspace`, async ({page}) => {
    await createWorkspaceCompany(page, 'Workspace B', english);
    await createFirstVendor(page, english);
    const vendorPath = new URL(page.url()).pathname;
    await workspaceSection(page, 'requirements', english);
    await page.getByRole('button', {name: english ? 'New Template' : 'Șablon nou', exact: true}).click();
    await page.getByRole('button', {name: english ? 'Create new template' : 'Creează șablon nou', exact: true}).click();
    await page.locator('#requirement-template-name').fill('B Template');
    await page.locator('#requirement-template-category').selectOption('construction');
    await page.getByRole('button', {name: english ? 'Add document' : 'Adaugă document', exact: true}).click();
    const typeDrawer = page.getByRole('dialog');
    await typeDrawer.getByRole('button', {name: english ? 'Custom document' : 'Document personalizat', exact: true}).click();
    await typeDrawer.locator('input').filter({visible: true}).first().fill('B Proof');
    await typeDrawer.getByRole('button', {name: english ? 'Add document' : 'Adaugă documentul', exact: true}).click();
    await page.getByRole('button', {name: english ? 'Save template' : 'Salvează șablon', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'B Template', exact: true})).toBeVisible();
    await workspaceSection(page, 'vendors', english);
    await page.getByRole('link', {name: english ? 'Details for B Vendor' : 'Detalii pentru B Vendor'}).click();
    await page.getByRole('button', {name: english ? 'Set Documents from Template' : 'Setează documente din șablon', exact: true}).click();
    const assign = page.getByRole('dialog');
    await expect(assign.getByText('Subcontractor construcții')).toHaveCount(0);
    await assign.getByRole('checkbox', {name: /^B Template/}).check();
    await assign.getByRole('button', {name: english ? 'Apply 1 template' : 'Aplică 1 șablon'}).click();
    await page.getByRole('dialog').getByRole('button', {name: english ? 'Apply templates' : 'Aplică șabloanele', exact: true}).click();
    const requirement = page.locator('[data-requirement-id]');
    await expect(requirement).toHaveCount(1);
    await requirement.getByRole('button', {name: english ? 'Upload' : 'Încarcă', exact: true}).click();
    const upload = page.getByRole('dialog');
    await upload.locator('input[type=file]').setInputFiles({name: 'b-proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('company B private bytes')});
    await upload.getByRole('button', {name: english ? 'Upload and continue' : 'Încarcă și continuă'}).click();
    await workspaceSection(page, 'documents', english);
    await expect(page.getByRole('row', {name: /b-proof.pdf/})).toContainText('B Vendor');
    await expect(page.getByRole('button', {name: english ? 'All documents 1' : 'Toate documentele 1'})).toBeVisible();
    await page.getByRole('row', {name: /b-proof.pdf/}).locator('a').first().click();
    await expect(page).toHaveURL(/\/documents\/local-document-.*\/review$/);
    const reviewPath = new URL(page.url()).pathname;
    await page.locator('#review-expiresAt').fill('01.01.2027');
    await page.getByRole('button', {name: english ? 'Confirm and save' : 'Confirmă și salvează'}).click();
    await expect(page.locator('[data-review-state="confirmed"]')).toBeVisible();
    await switchWorkspaceCompany(page, 'Workspace B', 'Demo Company SRL', english);
    await expect(page.getByRole('textbox', {name: /B Vendor/})).toHaveCount(0);
    await expect(page.locator('#review-companyName')).toHaveCount(0);
    await workspaceSection(page, 'documents', english);
    await expect(page.getByText('b-proof.pdf')).toHaveCount(0);
    await workspaceSection(page, 'requirements', english); await expect(page.getByText('B Template', {exact: true})).toHaveCount(0);
    await switchWorkspaceCompany(page, 'Demo Company SRL', 'Workspace B', english);
    await workspaceSection(page, 'requirements', english);
    await expect(page.getByRole('heading', {name: 'B Template', exact: true})).toBeVisible();
    await workspaceSection(page, 'notifications', english);
    await expect(page.locator('[data-audit-id]')).toHaveCount(4);
    await expect(page.getByText('Construct Pro SRL', {exact: true})).toHaveCount(0);
    await workspaceSection(page, 'dashboard', english);
    await expect(page.getByRole('region', {name: english ? 'Company overview' : 'Privire de ansamblu asupra companiei'}).locator('strong').first()).toHaveText('1');
    await workspaceSection(page, 'vendors', english);
    await page.getByRole('link', {name: english ? 'Details for B Vendor' : 'Detalii pentru B Vendor'}).click();
    await expect(page).toHaveURL(new RegExp(vendorPath));
    await expect(page.locator('[data-vendor-status]')).toHaveAttribute('data-compliance', 'compliant');
    await switchWorkspaceCompany(page, 'Workspace B', 'Demo Company SRL', english);
    await expect(page.locator('[data-vendor-name]')).toHaveCount(0);
    await workspaceSection(page, 'vendors', english);
    await expect(page.getByText('B Vendor', {exact: true})).toHaveCount(0);
    expect(reviewPath).toContain('/documents/local-document-');
  });
}

test('onboarding creates only its selected construction starter and retains incomplete supplier setup', async ({page}) => {
  await page.goto('/onboarding');
  await page.locator('#company-name').fill('Onboard B'); await page.locator('#tax-id').fill('RO-ONBOARD-B');
  await page.getByRole('button', {name: 'Continuă', exact: true}).click();
  await page.getByRole('radio', {name: /^Subcontractori construcții/}).check();
  await page.getByRole('button', {name: 'Continuă', exact: true}).click();
  await page.getByRole('button', {name: 'Adaugă furnizor', exact: true}).click();
  await page.getByRole('textbox', {name: 'Numele furnizorului'}).fill('Pending B'); await page.getByRole('textbox', {name: 'Email de contact'}).fill('pending-b@example.test');
  await page.getByRole('button', {name: 'Intră în Dashboard'}).click();
  await expect(page.getByRole('button', {name: 'Onboard B', exact: true})).toBeVisible();
  await workspaceSection(page, 'requirements'); await expect(page.locator('[data-template-id]')).toHaveCount(1);
  await expect(page.getByRole('tab', {name: 'Documente necesare (3)'})).toBeVisible();
  await workspaceSection(page, 'vendors'); await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', {name: 'Adaugă furnizor', exact: true}).first().click();
  await expect(page.locator('#add-vendor-name')).toHaveValue('Pending B'); await expect(page.locator('#add-vendor-email')).toHaveValue('pending-b@example.test');
  await expect(page.locator('#add-vendor-cui')).toHaveValue(''); await expect(page.locator('#add-vendor-category')).toHaveValue('');
  await page.locator('#add-vendor-cui').fill('RO-PENDING-B'); await page.locator('#add-vendor-category').selectOption('construction');
  await page.getByRole('dialog').getByRole('button', {name: 'Adaugă furnizor', exact: true}).click();
  await expect(page.locator('[data-vendor-name]')).toHaveText('Pending B');
});

test('EN general onboarding selection waits for explicit category', async ({page}) => {
  await page.goto('/en/onboarding');
  await page.locator('#company-name').fill('General B'); await page.locator('#tax-id').fill('RO-GENERAL-B');
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByRole('radio', {name: /^General template/}).check();
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByRole('button', {name: 'Go to Dashboard'}).click();
  await workspaceSection(page, 'requirements', true);
  await expect(page.locator('#requirement-template-name')).toHaveValue('General template');
  await expect(page.locator('#requirement-template-category')).toHaveValue('');
  await expect(page.getByRole('tab', {name: 'Required documents (2)'})).toBeVisible();
  await page.locator('#requirement-template-category').selectOption('construction');
  await page.getByRole('button', {name: 'Save template', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'General template', exact: true})).toBeVisible();
  await switchWorkspaceCompany(page, 'General B', 'Demo Company SRL', true);
  await expect(page.getByText('Șablon general', {exact: true})).toHaveCount(0);
});

test('Configure later creates no templates, vendors or documents', async ({page}) => {
  await page.goto('/onboarding');
  await page.locator('#company-name').fill('Later B'); await page.locator('#tax-id').fill('RO-LATER-B');
  await page.getByRole('button', {name: 'Continuă', exact: true}).click();
  await page.getByRole('button', {name: 'Configurează mai târziu'}).click();
  await page.getByRole('button', {name: 'Intră în Dashboard'}).click();
  await expect(page.getByRole('button', {name: 'Adaugă primul furnizor'})).toBeVisible();
  await workspaceSection(page, 'requirements'); await expect(page.locator('[data-template-id]')).toHaveCount(0);
  await workspaceSection(page, 'documents'); await expect(page.getByText('Nu există documente încă')).toBeVisible();
});

test('empty workspaces and first-vendor drawer stay contained across responsive and locale navigation', async ({page}) => {
  await createWorkspaceCompany(page);
  for (const width of [1448, 1024, 758, 600, 375, 320]) {
    await page.setViewportSize({width, height: width === 1448 ? 1086 : 812});
    for (const section of ['dashboard', 'vendors', 'documents', 'requirements', 'notifications'] as const) {
      await workspaceSection(page, section);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${section} at ${width}`).toBeLessThanOrEqual(width);
    }
    await workspaceSection(page, 'dashboard');
    await page.getByRole('button', {name: 'Adaugă primul furnizor'}).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  }
  await page.getByRole('link', {name: 'EN', exact: true}).filter({visible: true}).click();
  await expect(page).toHaveURL(/\/en\/dashboard$/); await expect(page.getByRole('button', {name: 'Workspace B', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Add your first vendor'})).toBeVisible();
});
