import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(page.__errors).toEqual([]); });

async function start(page, patch = {}) {
  await page.addInitScript(data => {
    const state = {
      version: 1, x: -19, z: 14, health: 100, stamina: 100, stash: { wood: 3, metal: 2, cloth: 2 }, bag: {}, owned: [],
      equipment: { weapon: 'pipe', armor: null, bag: null, boots: null }, ammo: 0, medkits: 1, meals: 0,
      placed: [], depleted: {}, elapsed: 0, fishCollection: [], kills: 0, trips: 0, gathered: 0,
      grave: null, settings: { sound: false, quality: 'low' }, tutorial: false, chapterComplete: false,
      ...data,
    };
    localStorage.setItem('quiet-district-save-v1', JSON.stringify(state));
  }, patch);
  await page.goto('/');
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('#hud')).toBeVisible();
}

test('Imported models load, node pickup works, and route avoids obstacles', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, { x: -7, z: 18 });
  await page.keyboard.press('KeyE');
  await expect.poll(() => page.evaluate(() => window.__quietDistrict.state.bag.metal || 0), { timeout: 20000 }).toBe(4);
  expect(await page.evaluate(() => window.__quietDistrict.state.bag.parts)).toBe(1);
  expect(await page.evaluate(() => window.__quietDistrict.world.nodes[0].group.visible)).toBe(false);
  const routing = await page.evaluate(() => {
    const g = window.__quietDistrict, path = g.world.pathTo(13, 5);
    return { length: path.length, valid: path.every(p => !g.world.blocked(p.x, p.z)), character: !!g.world.character, assets: Object.keys(g.world.assets) };
  });
  expect(routing.length).toBeGreaterThan(5); expect(routing.valid).toBe(true);
  expect(routing.character).toBe(true); expect(routing.assets.length).toBe(6);
  await page.keyboard.press('KeyI');
  await expect(page.locator('#panel')).toContainText('Рюкзак и снаряжение');
  await page.locator('[data-action="deposit"]').click();
  await expect.poll(() => page.evaluate(() => window.__quietDistrict.state.stash.metal)).toBe(6);
  expect(errors).toEqual([]);
});

test('Actual station UI crafts equipment, restores power and advances story', async ({ page }) => {
  await start(page, { stash: { wood: 60, metal: 80, cloth: 30, parts: 30, wire: 30, herbs: 10, pearl: 4 } });
  await page.keyboard.press('KeyC');
  await expect(page.locator('.station-status')).toContainText('готова к работе');
  await page.locator('[data-action="make"][data-id="axe"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.owned.includes('axe'))).toBe(true);
  await page.locator('[data-category="weapons"]').click();
  await page.locator('[data-action="make"][data-id="pistol"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.equipment.weapon)).toBe('pistol');
  await page.locator('[data-category="supplies"]').click();
  await page.locator('[data-action="make"][data-id="ammo"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.ammo)).toBe(12);
  await page.locator('[data-category="shelter"]').click();
  await page.locator('[data-action="make"][data-id="generator"]').click();
  await expect(page.locator('#quest-card')).toContainText('Открой путь в депо');
  expect(await page.evaluate(() => window.__quietDistrict.world.homeLight.intensity)).toBeGreaterThan(0);
  await page.locator('[data-action="make"][data-id="bridge"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.world.bridgeCollider.disabled)).toBe(true);
  await page.locator('[data-action="make"][data-id="radio"]').click();
  await expect(page.locator('#panel')).toContainText('Конец первой главы');
});

test('Placement through the canvas spends materials and persists across reload', async ({ page }) => {
  await start(page, { stash: { wood: 30, herbs: 8, cloth: 10 } });
  await page.keyboard.press('KeyB');
  await page.locator('[data-action="make"][data-id="garden"]').click();
  const position = await page.evaluate(() => window.__quietDistrict.world.screenPosition(-18, 0, 23));
  await page.mouse.move(position.x, position.y);
  await expect(page.locator('#build-hint')).toContainText('Нажми на землю');
  await page.mouse.click(position.x, position.y);
  expect(await page.evaluate(() => window.__quietDistrict.state.placed.length)).toBe(1);
  expect(await page.evaluate(() => window.__quietDistrict.state.stash.wood)).toBe(24);
  const before = await page.evaluate(() => window.__quietDistrict.state.placed);
  // Remove init-script fixture for the reload; existing localStorage must be the source.
  const saved = await page.evaluate(() => localStorage.getItem('quiet-district-save-v1'));
  await page.context().addInitScript(value => localStorage.setItem('quiet-district-save-v1', value), saved);
  await page.reload();
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 60000 });
  expect(await page.evaluate(() => window.__quietDistrict.state.placed)).toEqual(before);
});

test('Fishing needs timing, produces loot and updates collection', async ({ page }) => {
  await start(page, { x: 19, z: -17, owned: ['rod'] });
  await page.keyboard.press('KeyE');
  await expect(page.locator('#fish-ui')).toContainText('Поплавок качается');
  // Catch the brief bite within the browser process. Software WebGL can make
  // Playwright's multi-frame click stability checks outlast the bite window.
  await page.waitForFunction(() => {
    const f = window.__quietDistrict.fish;
    const ui = document.getElementById('fish-ui');
    if (f?.phase === 'bite' && !ui.hidden && ui.textContent.includes('Подсекай')) {
      ui.querySelector('[data-action="fish-action"]').click(); return true;
    }
    return false;
  }, undefined, { timeout: 20000 });
  await expect(page.locator('#fish-ui')).toContainText('Поймай момент');
  // Exercise real timing input: wait for the moving needle to enter the target, then dispatch E synchronously.
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => {
      const game = window.__quietDistrict, f = game.fish;
      if (f?.phase === 'reel' && Math.abs(f.needle - f.target) < 8) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true })); return true;
      }
      return false;
    }, undefined, { timeout: 15000 });
  }
  await expect(page.locator('#fish-ui')).toContainText('Ещё один заброс');
  expect(await page.evaluate(() => window.__quietDistrict.state.fishCollection.length)).toBe(1);
  expect(await page.evaluate(() => (window.__quietDistrict.state.bag.fish || 0) + (window.__quietDistrict.state.bag.pearl || 0))).toBeGreaterThan(0);
});

test('Combat applies damage, drops resources, and death preserves recovery', async ({ page }) => {
  await start(page, { x: 8, z: -3, owned: ['spear'], equipment: { weapon: 'spear', armor: null, bag: null, boots: null } });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__quietDistrict.attackCooldown === 0, undefined, { timeout: 15000 });
  }
  expect(await page.evaluate(() => window.__quietDistrict.state.kills)).toBe(1);
  expect(await page.evaluate(() => window.__quietDistrict.state.bag.parts)).toBe(1);
  await page.evaluate(() => { const g = window.__quietDistrict; g.state.bag.wood = 6; g.state.health = 1; g.die(); });
  expect(await page.evaluate(() => window.__quietDistrict.state.grave.loot.wood)).toBe(6);
  expect(await page.evaluate(() => window.__quietDistrict.state.x)).toBe(-16);
  await page.keyboard.press('KeyM'); await expect(page.locator('#panel')).toContainText('оставленный рюкзак');
});

test('Mobile layout exposes touch controls, usable menus and no page overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await start(page);
  await expect(page.locator('#joystick')).toBeVisible();
  await page.locator('.toolbar [data-action="inventory"]').click();
  await expect(page.locator('#panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await page.locator('#panel').boundingBox(); expect(bounds.width).toBeLessThanOrEqual(390);
  await page.locator('[data-action="close"]').click();
  await page.locator('.toolbar [data-action="map"]').click();
  await expect(page.locator('#large-map')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-verified.png' });
  await context.close();
});

test('Importing a save replaces the current history without pagehide overwriting it', async ({ page }) => {
  // Unlike the other fixtures, this scenario starts without an initialization
  // script so the imported data remains authoritative after navigation.
  await page.goto('/');
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="settings"]').click();
  page.once('dialog', dialog => dialog.accept());
  const navigation = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame(), timeout: 60000 });
  await page.locator('#import-save').setInputFiles({
    name: 'history.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, stash: { wood: 123 }, bag: {}, owned: ['generator'], tutorial: false, settings: { sound: false, quality: 'low' } })),
  });
  await navigation;
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 60000 });
  await page.waitForFunction(() => window.__quietDistrict?.state?.stash.wood === 123, undefined, { timeout: 60000 });
  expect(await page.evaluate(() => window.__quietDistrict.state.owned)).toContain('generator');
});
