import { test } from '@playwright/test';
import path from 'path';

const OUT = path.resolve('screenshots');

// All pages that appear in the design ZIP
const pages = [
  { name: '01-get-started',       url: '/welcome' },
  { name: '02-login',             url: '/login' },
  { name: '03-signup',            url: '/signup' },
  { name: '04-homepage',          url: '/' },
  { name: '05-bus-booking',       url: '/buses' },
  { name: '06-hotels',            url: '/hotels' },
  { name: '07-packages',          url: '/packages' },
  { name: '08-experiences',       url: '/experiences' },
  { name: '09-wallet',            url: '/wallet' },
  { name: '10-my-bookings',       url: '/bookings' },
  { name: '11-profile',           url: '/profile' },
  { name: '12-ai-planner',        url: '/ai-planner' },
  { name: '13-seo-bus-route',     url: '/bus/kolkata-to-siliguri' },
  { name: '14-cab-booking',       url: '/cabs' },
  { name: '15-passenger-details', url: '/passenger-details?from=Kolkata&to=Siliguri&busId=1&busName=SRTC+Volvo+A%2FC+Semi+Sleeper&depTime=08%3A00+PM&seats=3A%2C3B&price=799' },
];

for (const { name, url } of pages) {
  test(`screenshot: ${name}`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  });
}

// Login OTP modal
test('screenshot: 02b-login-otp-modal', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/mobile number/i).fill('9999999999');
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02b-login-otp-modal.png`, fullPage: true });
});

// Seat selection modal — click first bus "Select Seat"
test('screenshot: 05b-seat-selection', async ({ page }) => {
  await page.goto('/buses');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const btn = page.getByRole('button', { name: /select seat/i }).first();
  await btn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/05b-seat-selection.png`, fullPage: true });
});

// Cab "Finding riders" state — simulate by going to cabs and clicking confirm
test('screenshot: 14b-cab-finding-riders', async ({ page }) => {
  await page.goto('/cabs');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const confirmBtn = page.getByRole('button', { name: /confirm pickup/i });
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
    await page.waitForTimeout(800);
  }
  // ponytail: clicking Confirm Pickup can auto-scroll the page (content taller
  // than viewport); reset scroll before a fullPage shot or the sticky navbar
  // renders at the stale scroll offset instead of the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/14b-cab-finding-riders.png`, fullPage: true });
});

// Cab "Ride matched" (driver assigned) state — CabBooking auto-transitions from
// 'searching' to 'assigned' 4s after Confirm Pickup (see handleConfirmPickup in
// CabBooking.tsx), so wait past that timeout.
test('screenshot: 14c-ride-matched', async ({ page }) => {
  await page.goto('/cabs');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const confirmBtn = page.getByRole('button', { name: /confirm pickup/i });
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
    await page.getByText(/driver is on the way/i).waitFor({ timeout: 6000 });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}/14c-ride-matched.png`, fullPage: true });
});
