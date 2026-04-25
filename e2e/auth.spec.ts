import { expect, test } from '@playwright/test';

test.describe('Auth', () => {
  test('login page loads with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email-address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
