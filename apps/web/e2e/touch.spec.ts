import { devices, expect, test } from '@playwright/test';
import { SEATS, nearestWalkable } from '@study/shared';
import { enterRoom, me, walkTo } from './helpers';

// A phone: touch and a phone-sized screen (the device's browser type is left to the config)
const { defaultBrowserType: _browser, ...PHONE } = devices['Pixel 7'];
void _browser;

test.describe('on a phone', () => {
  test.use({ ...PHONE, isMobile: false });

  test('the action button sits you down and stands you up', async ({ page }) => {
    await enterRoom(page);
    // Stand next to a chair (the nearest floor spot to it)
    const seat = SEATS[0]!;
    const spot = nearestWalkable(seat);
    await walkTo(page, spot.x, spot.z);
    await page.getByRole('button', { name: '🪑 Sit' }).tap();
    await expect.poll(async () => (await me(page)).seatId).toBe(seat.id);
    await page.getByRole('button', { name: /tap to stand up/ }).tap();
    await expect.poll(async () => (await me(page)).seatId).toBe('');
  });
});

test.describe('joystick', () => {
  test.use({ ...PHONE, isMobile: false });

  test('dragging the joystick walks, and letting go stops', async ({ page }) => {
    await enterRoom(page);
    const start = await me(page);
    const box = (await page.getByRole('application', { name: 'Movement joystick' }).boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Touch drags are pointer events with pointerType "touch"; dispatch them on the joystick
    const stick = page.getByRole('application', { name: 'Movement joystick' });
    const ev = (type: string, x: number, y: number) =>
      stick.dispatchEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 });
    await ev('pointerdown', cx, cy);
    await ev('pointermove', cx, cy - 30); // up the screen, about two thirds of the way: a walk
    await page.waitForTimeout(1200);
    await ev('pointerup', cx, cy - 30);
    await expect
      .poll(async () => {
        const m = await me(page);
        return Math.hypot(m.x - start.x, m.z - start.z);
      })
      .toBeGreaterThan(1.5);
    await page.waitForTimeout(500); // the last moves reach the server
    const stopped = await me(page);
    await page.waitForTimeout(800);
    const after = await me(page);
    expect(Math.hypot(after.x - stopped.x, after.z - stopped.z)).toBeLessThan(0.3);
  });
});
