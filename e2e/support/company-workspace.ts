import {expect, type Page} from '@playwright/test';

export async function createWorkspaceCompany(page: Page, name = 'Workspace B', english = false) {
  await page.goto(english ? '/en/profile/companies' : '/profile/companies');
  await page.locator('#create-company-form input').nth(0).fill(name);
  await page.locator('#create-company-form select').nth(0).selectOption('professional');
  await page.locator('#create-company-form input').nth(1).fill('RO-WORKSPACE-B');
  await page.locator('#create-company-form select').nth(1).selectOption('RO');
  await page.getByRole('button', {name: english ? 'Create company' : 'Creează compania', exact: true}).click();
  await expect(page.locator('[data-company-id^="local-company-"]')).toContainText(name);
}

export async function workspaceSection(page: Page, path: 'dashboard' | 'vendors' | 'documents' | 'requirements' | 'notifications', english = false) {
  const nav = page.getByRole('navigation', {name: english ? 'Application navigation' : 'Navigare în aplicație'});
  await nav.locator(`a[href="${english ? '/en' : ''}/${path}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${path}$`));
}

export async function switchWorkspaceCompany(page: Page, current: string, next: string, english = false) {
  await page.getByRole('button', {name: current, exact: true}).click();
  await page.getByRole('dialog', {name: english ? 'Switch company' : 'Schimbă compania'}).getByRole('button', {name: new RegExp(next)}).click();
  await expect(page.getByRole('button', {name: next, exact: true})).toBeVisible();
}
