import { devices, expect, test } from '@playwright/test';
import { SEATS, isWalkable } from '@study/shared';
import { enterRoom, firstTappable, me } from './helpers';

// A phone: touch and a phone-sized screen (the device's browser type is left to the config)
const { defaultBrowserType: _browser, ...PHONE } = devices['Pixel 7'];
void _browser;

test.describe('on a phone', () => {
  test.use({ ...PHONE, isMobile: false });

  test('tap the floor to walk there', async ({ page }) => {
    await enterRoom(page);
    const start = await me(page);
    const around = [
      [0, 2.5],
      [-1.5, 2],
      [1.5, 2],
      [-2, 0],
      [2, 0],
    ].map(([dx, dz]) => ({ x: start.x + dx!, z: start.z + dz! }));
    const { point, screen } = await firstTappable(page, around.filter(isWalkable));
    await page.touchscreen.tap(screen.x, screen.y);
    await expect
      .poll(
        async () => {
          const m = await me(page);
          return Math.hypot(m.x - point.x, m.z - point.z);
        },
        { timeout: 10_000 },
      )
      .toBeLessThan(0.5);
  });

  test('tap a chair to walk over and sit, then tap the button to stand', async ({ page }) => {
    await enterRoom(page);
    const start = await me(page);
    const nearby = [...SEATS].sort((a, b) => Math.hypot(a.x - start.x, a.z - start.z) - Math.hypot(b.x - start.x, b.z - start.z));
    const { point: seat, screen } = await firstTappable(
      page,
      nearby.map((s) => ({ ...s, y: 0.45 })),
    );
    await page.touchscreen.tap(screen.x, screen.y);
    await expect.poll(async () => (await me(page)).seatId, { timeout: 15_000 }).toBe(seat.id);
    const button = page.getByRole('button', { name: /tap to (stand|get) up/ });
    await expect(button).toBeVisible();
    await button.tap();
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
