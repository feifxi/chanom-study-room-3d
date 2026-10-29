import { expect, test } from '@playwright/test';
import { GACHA_MACHINE, NPC_SPAWN } from '@study/shared';
import { enterRoom, walkTo } from './helpers';

const npcCount = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __study: { room: { state: { npcs: Map<string, unknown> } } } }).__study.room.state.npcs.size);

test('summon a cat at the Buddy Machine, then say goodbye', async ({ page }) => {
  await enterRoom(page);
  await walkTo(page, NPC_SPAWN.x + 0.3, NPC_SPAWN.z + 0.6);
  await expect(page.getByText('Press E to open the Buddy Machine')).toBeVisible();
  await page.keyboard.press('e');

  const panel = page.getByRole('complementary', { name: 'Buddy Machine' });
  await expect(panel).toBeVisible();
  const before = await npcCount(page);

  await panel.getByRole('button', { name: /Library cat/ }).click();
  await expect(panel.getByText('A capsule is rolling out…')).toBeVisible();
  await expect(panel.getByText(/the .*cat is here/)).toBeVisible();
  await expect.poll(() => npcCount(page)).toBe(before + 1);
  await expect(page.getByRole('region', { name: 'Chat' }).getByText(/summoned an? .*cat/)).toBeVisible();

  // Nothing to customise: residents only have a goodbye button
  const residents = panel.getByRole('listitem');
  await expect(residents.last().getByRole('textbox')).toHaveCount(0);
  await residents
    .last()
    .getByRole('button', { name: /Goodbye/ })
    .click();
  await expect.poll(() => npcCount(page), { timeout: 20_000 }).toBe(before);
});

test('walking away closes the Buddy Machine', async ({ page }) => {
  await enterRoom(page);
  await walkTo(page, NPC_SPAWN.x + 0.3, NPC_SPAWN.z + 0.6);
  await expect(page.getByText('Press E to open the Buddy Machine')).toBeVisible();
  await page.keyboard.press('e');
  const panel = page.getByRole('complementary', { name: 'Buddy Machine' });
  await expect(panel).toBeVisible();
  await walkTo(page, GACHA_MACHINE.x + 5, GACHA_MACHINE.z);
  await expect(panel).toBeHidden();
});
