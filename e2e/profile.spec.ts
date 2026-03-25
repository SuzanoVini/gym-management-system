import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('profile page loads without error', async ({ page }) => {
    expect(page.url()).toContain('/profile');
  });

  test('full name input field is present', async ({ page }) => {
    // Profile page renders <input id="full_name" />
    await expect(page.locator('#full_name')).toBeVisible();
  });

  test('email input field is present', async ({ page }) => {
    // Profile page renders <input id="email" type="email" /> (read-only)
    await expect(page.locator('#email')).toBeVisible();
  });
});
