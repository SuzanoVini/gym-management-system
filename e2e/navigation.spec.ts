import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('main dashboard loads after login', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.locator('.app-shell')).toBeVisible();
  });

  test('sidebar navigation is present', async ({ page }) => {
    await expect(page.locator('aside.app-sidebar')).toBeVisible();
  });

  test('Overview tab is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
  });

  test('Insights tab is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /insights/i })).toBeVisible();
  });

  test('Intros tab is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /intros/i })).toBeVisible();
  });

  test('Sign-ups tab is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign.ups/i })).toBeVisible();
  });

  test('Cancellations tab is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /cancellations/i })).toBeVisible();
  });

  test('Holds tab is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('button', { name: /holds/i })).toBeVisible();
  });
});
