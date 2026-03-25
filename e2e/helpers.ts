import type { Page } from '@playwright/test';

export const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
export const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

export async function login(page: Page): Promise<void> {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD env vars must be set for e2e tests');
  }
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  // Wait for redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

export async function goToTab(page: Page, tabName: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(tabName, 'i') }).click();
  await page.waitForLoadState('domcontentloaded');
  // Wait for the main content area to be visible after navigation
  await page.locator('main').waitFor({ state: 'visible' });
}
