import type {Page} from '@playwright/test';

export async function openFilters(page: Page) {
  const trigger = page.getByRole('button', {name: /^(Filtrează|Filter)( \(\d+\))?$/});
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  return page.getByRole('dialog', {name: /^(Filtre|Filters)$/});
}
