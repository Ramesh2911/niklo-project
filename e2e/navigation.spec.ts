import { test, expect } from '@playwright/test';

const loaded = (page: import('@playwright/test').Page) =>
  expect(page.locator('#main-content').first()).toBeVisible();

test.describe('Navigation', () => {
  test('can navigate to Bus Booking page', async ({ page }) => {
    await page.goto('/buses');
    await expect(page).toHaveURL(/buses/);
    await loaded(page);
  });

  test('can navigate to Hotels page', async ({ page }) => {
    await page.goto('/hotels');
    await expect(page).toHaveURL(/hotels/);
    await loaded(page);
  });

  test('can navigate to Packages page', async ({ page }) => {
    await page.goto('/packages');
    await expect(page).toHaveURL(/packages/);
    await loaded(page);
  });

  test('can navigate to Experiences page', async ({ page }) => {
    await page.goto('/experiences');
    await expect(page).toHaveURL(/experiences/);
    await loaded(page);
  });

  test('can navigate to Login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByLabel(/mobile number/i)).toBeVisible();
  });

  test('SEO bus route page renders for known slug', async ({ page }) => {
    await page.goto('/bus/kolkata-to-siliguri');
    await expect(page).toHaveURL(/kolkata-to-siliguri/);
    await loaded(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('unknown route still renders app shell', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
