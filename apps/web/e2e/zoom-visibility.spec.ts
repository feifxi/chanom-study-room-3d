import { devices, expect, test } from '@playwright/test';

// Zoom buttons are for mice: touch screens pinch, and small screens have no room for them
import { enterRoom } from './helpers';
const { defaultBrowserType: _b, ...PHONE } = devices['Pixel 7'];
void _b;
test.describe('phone', () => {
  test.use({ ...PHONE, isMobile: false });
  test('no zoom buttons', async ({ page }) => {
    await enterRoom(page);
    await expect(page.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  });
});
test.describe('tablet (touch, big screen)', () => {
  test.use({ viewport: { width: 1024, height: 1366 }, hasTouch: true });
  test('no zoom buttons', async ({ page }) => {
    await enterRoom(page);
    await expect(page.getByRole('button', { name: 'Zoom in' })).toHaveCount(0);
  });
});
test('desktop keeps them', async ({ page }) => {
  await enterRoom(page);
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
});
