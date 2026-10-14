import { expect, test } from '@playwright/test';
import { goToTab, login } from './helpers';

test.describe('Intros Tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Intros');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible();
  });

  test('table or list area is present', async ({ page }) => {
    // IntrosTab renders a Table component with a scrollable container
    await expect(
      page.locator('main table, main [role="table"], main .overflow-x-auto')
    ).toBeVisible();
  });

  test('Add Intro button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add intro/i })).toBeVisible();
  });
});

test.describe('Intro spam flow', () => {
  // 12 characters, so the Name cell shows it in full (names over 14 are abbreviated)
  const name = `E2E ${String(Date.now()).slice(-8)}`;

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTab(page, 'Intros');
    page.on('dialog', (d) => d.accept());
  });

  test.afterEach(async ({ page }) => {
    const search = page.getByPlaceholder(/search by name/i);
    await search.fill(name);
    const strip = page.getByLabel('Spam matches');
    if (await strip.isVisible().catch(() => false)) {
      await strip.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('button', { name: 'Not spam', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Restore' }).click();
      await expect(page.locator('tr', { hasText: name })).toBeVisible();
    }
    const row = page.locator('tr', { hasText: name });
    if ((await row.count()) > 0) {
      await row.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(row).toHaveCount(0);
    }
  });

  test('mark hides the intro, undo returns it, search finds it, Not spam restores it', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /add intro/i }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('Email').fill(`e2e-${Date.now()}@example.com`);
    await form.getByLabel('Phone').fill('555-0142');
    await form.getByLabel('Date').fill('2026-09-25');
    await form.locator('#class').selectOption({ index: 1 });
    await form.locator('#staff').selectOption({ index: 1 });
    await form.getByRole('button', { name: 'Create' }).click();

    const search = page.getByPlaceholder(/search by name/i);
    await search.fill(name);
    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();

    const markAsSpam = async () => {
      await row.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('button', { name: 'Mark as spam', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Mark as spam' }).click();
    };

    await markAsSpam();
    await expect(row).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(row).toBeVisible();

    await markAsSpam();
    await expect(row).toHaveCount(0);
    const strip = page.getByLabel('Spam matches');
    await expect(strip).toContainText(name);

    await strip.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Not spam', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Restore' }).click();
    await expect(page.locator('tr', { hasText: name })).toBeVisible();
  });
});
