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
  await expect(page.locator('#panel')).toContainText('Инвентарь');
  await page.locator('[data-action="storage"]').click();
  await page.locator('[data-action="deposit"]').click();
  await expect.poll(() => page.evaluate(() => window.__quietDistrict.state.stash.metal)).toBe(6);
  expect(errors).toEqual([]);
});

test('Actual station UI crafts equipment, restores power and advances story', async ({ page }) => {
  test.setTimeout(150000);
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
  test.setTimeout(150000);
  await start(page, { x: 19, z: -17, owned: ['rod'] });
  await page.keyboard.press('KeyE');
  await expect(page.locator('#fish-ui')).toContainText('Поплавок качается');
  // Handle the visible bite and all pulls in one browser poll: round trips
  // through software WebGL can consume the complete reel window.
  await page.waitForFunction(() => {
    const game = window.__quietDistrict, f = game.fish, ui = document.getElementById('fish-ui');
    window.__fishingTrace ||= [];
    if (!f) throw new Error(`Fishing ended before catch: ${JSON.stringify(window.__fishingTrace.slice(-12))}`);
    const trace = window.__fishingTrace;
    if (trace.at(-1)?.timer !== f.timer) trace.push({ phase: f.phase, timer: f.timer, needle: f.needle, target: f.target, hits: f.hits });
    if (f.phase === 'caught') return true;
    if (f.phase === 'bite' && !ui.hidden && ui.textContent.includes('Подсекай')) {
      ui.querySelector('[data-action="fish-action"]').click();
      window.__reelVisible = ui.textContent.includes('Поймай момент');
    }
    if (f.phase === 'reel' && Math.abs(f.needle - f.target) < 8) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
      return f.phase === 'caught';
    }
    return false;
  }, undefined, { timeout: 90000, polling: 16 });
  expect(await page.evaluate(() => window.__reelVisible)).toBe(true);
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
  await page.locator('[data-action="toggle-menu"]').click();
  await page.locator('.toolbar [data-action="inventory"]').click();
  await expect(page.locator('#panel')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await page.locator('#panel').boundingBox(); expect(bounds.width).toBeLessThanOrEqual(390.01); // Allow subpixel transform rounding.
  await page.locator('[data-action="close"]').click();
  await page.locator('[data-action="toggle-menu"]').click();
  await page.locator('.toolbar [data-action="map"]').click();
  await expect(page.locator('#large-map')).toBeVisible();
  expect(await page.evaluate(() => { const c = document.getElementById('large-map'); return parseFloat(c.getContext('2d').font) * c.getBoundingClientRect().width / c.width; })).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.location-list strong')).fontSize))).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: 'test-results/mobile-verified.png' });
  await context.close();
});

test('Importing a save replaces the current history without pagehide overwriting it', async ({ page }) => {
  test.setTimeout(180000);
  // Unlike the other fixtures, this scenario starts without an initialization
  // script so the imported data remains authoritative after navigation.
  await page.goto('/');
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 60000 });
  await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="settings"]').click();
  const navigation = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame(), timeout: 60000 });
  await page.locator('#import-save').setInputFiles({
    name: 'history.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, stash: { wood: 123 }, bag: {}, owned: ['generator'], tutorial: false, settings: { sound: false, quality: 'low' } })),
  });
  await expect(page.locator('#confirm-overlay')).toContainText('Загрузить другую историю');
  await page.locator('[data-action="confirm-result"][data-result="yes"]').click();
  await navigation;
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 60000 });
  await page.waitForFunction(() => window.__quietDistrict?.state?.stash.wood === 123, undefined, { timeout: 60000 });
  expect(await page.evaluate(() => window.__quietDistrict.state.owned)).toContain('generator');
});

test('HUD preserves controls; recipe search and filters explain available crafting', async ({ page }) => {
  await start(page, { stash: { wood: 20, metal: 20, cloth: 20, wire: 5, parts: 3 } });
  await page.evaluate(() => { window.__questButton = document.querySelector('[data-action="craft-objective"]'); });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__questButton === document.querySelector('[data-action="craft-objective"]'))).toBe(true);
  expect(await page.evaluate(() => Object.keys(window.__quietDistrict.world.actions))).toContain('walking_a');
  expect(await page.evaluate(() => window.__quietDistrict.world.weaponRoot.parent.name)).toBe('handslotr');
  await page.keyboard.press('KeyC');
  await page.locator('#recipe-search').fill('Удочка');
  await expect(page.locator('.recipe-card')).toHaveCount(2);
  await page.locator('[data-action="available-filter"]').click();
  await expect(page.locator('.recipe-card')).toHaveCount(1);
  await page.locator('[data-action="make"][data-id="rod"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.owned)).toContain('rod');
  await page.keyboard.press('Escape'); await expect(page.locator('#panel')).toBeHidden();
});

test('Neighbour orders, water restoration and production are playable', async ({ page }) => {
  // This scenario includes three separate UI workflows under software WebGL.
  test.setTimeout(150000);
  await start(page, { x: -19, z: 15, owned: ['generator', 'bridge', 'radio'], stash: { wood: 60, metal: 80, cloth: 20, parts: 40, wire: 30 }, elapsed: 130,
    placed: [{ id: 'recycler', x: -18, z: 14, rotation: 0, harvested: 0 }] });
  await page.keyboard.press('KeyK');
  await expect(page.locator('#panel')).toContainText('Заказы соседей');
  await page.locator('[data-action="deliver-order"][data-id="timber"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.completedOrders)).toBe(1);
  await expect(page.locator('[data-action="deliver-order"][data-id="timber"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyE');
  expect(await page.evaluate(() => window.__quietDistrict.state.bag.parts)).toBe(2);
  await page.keyboard.press('KeyC'); await page.locator('[data-category="shelter"]').click();
  await page.locator('[data-action="make"][data-id="pump"]').click();
  await expect(page.locator('#quest-card')).toContainText('Дом становится самостоятельным');
  expect(await page.evaluate(() => window.__quietDistrict.world.towerLight.intensity)).toBeGreaterThan(0);
  await page.locator('[data-action="make"][data-id="solar"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.world.solarRoof.visible)).toBe(true);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__quietDistrict.world.move(30, -31));
  await page.keyboard.press('KeyE');
  expect(await page.evaluate(() => window.__quietDistrict.state.bag.water)).toBe(3);
});

test('Expanded garden, helper assignments and smooth movement work in the playable world', async ({ page }) => {
  test.setTimeout(150000);
  await start(page, { owned: ['radio', 'generator', 'pump', 'helper'], placed: [{ id: 'bed', x: -22, z: 20, harvested: 0 }, { id: 'garden', x: -12, z: 23, harvested: 0 }], elapsed: 95 });
  await page.keyboard.press('KeyK');
  await page.locator('[data-action="helper"]').click();
  await expect(page.locator('#panel')).toContainText('Лада · садовница');
  expect(await page.evaluate(async () => {
    const g = window.__quietDistrict; let updates = 0; const original = g.world.update.bind(g.world);
    g.world.update = (...args) => { updates++; return original(...args); };
    for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
    g.world.update = original; return updates;
  })).toBeLessThanOrEqual(1);
  await page.locator('[data-action="helper-assignment"][data-id="rest"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.helper.assignment)).toBe('rest');
  await page.locator('[data-action="helper-assignment"][data-id="garden"]').click();
  await page.keyboard.press('Escape');
  const result = await page.evaluate(() => {
    const g = window.__quietDistrict;
    g.path = []; g.target = null; g.job = null; g.world.move(-34, -5); g.motion.reset();
    const start = { x: g.state.x, z: g.state.z }; g.keys.add('KeyD');
    for (let i = 0; i < 60; i++) g.movement(1 / 60);
    g.keys.clear(); const distance = Math.hypot(g.state.x - start.x, g.state.z - start.z);
    for (let i = 0; i < 30; i++) g.movement(1 / 60);
    g.tick(1 / 60); g.world.update(1 / 60, false, true);
    return { distance, stopped: Math.hypot(g.motion.x, g.motion.z), helper: g.world.helperModel.visible,
      output: g.state.stash.herbs, nodes: g.world.nodes.filter(n => n.originalLoot.seeds).length,
      nursery: !!g.world.makeFurniture('seedbed').children.length, path: g.world.pathTo(-34, -5).length };
  });
  expect(result.distance).toBeGreaterThan(3.8); expect(result.distance).toBeLessThan(4.2);
  expect(result.stopped).toBe(0); expect(result.helper).toBe(true); expect(result.output).toBeGreaterThanOrEqual(3);
  expect(result.nodes).toBe(2); expect(result.nursery).toBe(true); expect(result.path).toBeGreaterThan(0);
  await page.keyboard.press('KeyM');
  await expect(page.locator('#panel')).toContainText('Заброшенный сад');
});

test('Hotbar uses keyboard supplies, equips weapons and persists inventory assignments', async ({ page }) => {
  test.setTimeout(180000);
  await start(page, { health: 50, medkits: 2, ammo: 12, owned: ['pistol', 'carbine', 'axe', 'rod', 'lantern'],
    hotbar: ['pistol', 'axe', 'rod', 'medkit', 'meal', 'lantern'] });
  await expect(page.locator('.hotbar-slot')).toHaveCount(6);
  await expect(page.locator('#quest-card')).toHaveClass(/collapsed/);
  await expect(page.locator('.minimap')).toHaveClass(/collapsed/);
  await expect(page.locator('.toolbar')).toBeHidden();
  await page.locator('[data-action="toggle-menu"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.toolbar')).toBeHidden();
  await page.keyboard.press('Digit4');
  expect(await page.evaluate(() => window.__quietDistrict.state.health)).toBe(95);
  expect(await page.evaluate(() => window.__quietDistrict.state.medkits)).toBe(1);
  await expect(page.locator('.hotbar-slot[data-index="3"] .hotbar-count')).toHaveText('1');
  await page.keyboard.press('Digit1');
  expect(await page.evaluate(() => window.__quietDistrict.state.equipment.weapon)).toBe('pistol');
  await page.keyboard.press('Digit6');
  expect(await page.evaluate(() => window.__quietDistrict.world.playerLight.intensity)).toBe(0);
  await page.keyboard.press('Digit6');
  expect(await page.evaluate(() => window.__quietDistrict.world.playerLight.intensity)).toBeGreaterThan(0);
  await page.keyboard.press('KeyI');
  await page.locator('[data-action="inventory-tab"][data-view="hotbar"]').click();
  await page.locator('[data-action="hotbar-edit-slot"][data-index="0"]').click();
  await page.locator('[data-action="hotbar-assign"][data-id="carbine"]').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('quiet-district-save-v1')).hotbar[0])).toBe('carbine');
  await page.keyboard.press('Digit4');
  expect(await page.evaluate(() => window.__quietDistrict.state.medkits)).toBe(1);
  await page.keyboard.press('Escape'); await page.keyboard.press('Digit1');
  expect(await page.evaluate(() => window.__quietDistrict.state.equipment.weapon)).toBe('carbine');
  await page.locator('[data-action="toggle-quest"]').click();
  await expect(page.locator('#quest-card')).not.toHaveClass(/collapsed/);
  await page.locator('[data-action="toggle-minimap"]').click();
  await expect(page.locator('.minimap canvas')).toBeVisible();
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.vital-detail span')).fontSize))).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: '/workspace/artifacts/screenshots/v04-desktop.png' });
});

test('Mobile hotbar and editor have readable text, usable touch targets and no overlap', async ({ browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await start(page, { health: 40, medkits: 2 });
  const sizes = await page.evaluate(() => {
    const box = id => document.querySelector(id).getBoundingClientRect();
    const bar = box('#hotbar'), vitals = box('#vitals'), joystick = box('#joystick');
    return { width:document.documentElement.scrollWidth, viewport:innerWidth,
      target:box('.hotbar-slot').width, font:parseFloat(getComputedStyle(document.querySelector('.vital-detail span')).fontSize),
      overlaps:bar.top < vitals.bottom || bar.top < joystick.bottom };
  });
  expect(sizes.width).toBeLessThanOrEqual(sizes.viewport); expect(sizes.target).toBeGreaterThanOrEqual(44);
  expect(sizes.font).toBeGreaterThanOrEqual(16); expect(sizes.overlaps).toBe(false);
  await page.locator('[data-action="toggle-quest"]').tap();
  await expect(page.locator('.minimap')).toBeHidden();
  await page.locator('[data-action="toggle-quest"]').tap();
  await page.locator('.hotbar-slot[data-index="3"]').tap();
  expect(await page.evaluate(() => window.__quietDistrict.state.health)).toBe(85);
  await page.screenshot({path:'/workspace/artifacts/screenshots/v04-mobile.png'});
  await page.locator('#hotbar [data-action="inventory"]').tap();
  await page.locator('[data-action="inventory-tab"][data-view="hotbar"]').tap();
  await expect(page.locator('.hotbar-edit-slots button')).toHaveCount(6);
  await page.locator('[data-action="hotbar-edit-slot"][data-index="1"]').tap();
  await page.locator('[data-action="hotbar-assign"][data-id="medkit"]').tap();
  expect(await page.evaluate(() => window.__quietDistrict.state.hotbar[1])).toBe('medkit');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'/workspace/artifacts/screenshots/v04-editor-mobile.png'});
  expect(errors).toEqual([]); await context.close();
});

test('Inventory cells equip and remove gear, storage transfers stacks and coloured artwork is present', async ({ page }) => {
  test.setTimeout(180000);
  await start(page,{owned:['pistol','vest','bag','bag2','boots','axe'],bag:{wood:45},equipment:{weapon:'pipe',armor:'vest',bag:'bag2',boots:null},ammo:12});
  await page.keyboard.press('KeyI');
  await expect(page.locator('.equipment-slot')).toHaveCount(4);
  await expect(page.locator('#inventory-grid .item-cell')).toHaveCount(24);
  await expect(page.locator('#inventory-grid [data-id="wood"] b')).toHaveText('45');
  await page.locator('.equipment-slot[data-id="bag2"]').click();
  await page.locator('[data-action="unequip"][data-slot="bag"]').click();
  expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.bag)).toBe('bag2');
  await page.locator('[data-action="storage"]').click();
  await page.locator('[data-action="deposit"]').click();
  await page.locator('#storage-grid [data-id="wood"]').click();
  await page.locator('[data-action="withdraw"][data-count="1"]').click();
  expect(await page.evaluate(()=>window.__quietDistrict.state.bag.wood)).toBe(1);
  await page.locator('.storage-actions [data-action="inventory"]').click();
  await page.locator('#inventory-grid [data-id="pistol"]').click();
  await page.locator('[data-action="equip"][data-id="pistol"]').click();
  expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.weapon)).toBe('pistol');
  await page.locator('[data-action="unequip"][data-slot="weapon"]').click();
  expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.weapon)).toBe(null);
  expect(await page.evaluate(()=>window.__quietDistrict.world.weaponRoot.children.length)).toBe(0);
  await page.locator('#inventory-grid [data-id="pipe"]').click();
  await page.locator('[data-action="equip"][data-id="pipe"]').click();
  await page.locator('#inventory-grid [data-id="boots"]').click();
  await page.locator('[data-action="equip"][data-id="boots"]').click();
  expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.boots)).toBe('boots');
  expect(await page.locator('#inventory-grid .item-icon [fill]').count()).toBeGreaterThan(8);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quiet-district-save-v1')).equipment.boots)).toBe('boots');
  await page.screenshot({path:'/workspace/artifacts/screenshots/v05-inventory.png'});
});

test('Roofs fade on entering each building and restore outside without changing collisions', async ({ page }) => {
  test.setTimeout(150000);
  await start(page);
  const result=await page.evaluate(()=>{
    const g=window.__quietDistrict,w=g.world,b=w.buildings.find(b=>b.x===13);
    const before=w.blocked(8,4); g.ui.open('settings');
    const count=w.buildings.length, geometries=w.buildings.map(b=>b.roofMeshes.length);
    g.state.x=13;g.state.z=4;w.updateRoofs(.1);
    const transition=b.roofMeshes[0].material.opacity;
    for(let i=0;i<60;i++)w.updateRoofs(1/60);
    const inside=b.roofMeshes[0].material.opacity, wall=b.wallMeshes[0].material.opacity;
    g.state.x=5;g.state.z=4;for(let i=0;i<60;i++)w.updateRoofs(1/60);
    return {count,geometries,transition,inside,wall,outside:b.roofMeshes[0].material.opacity,collision:before===w.blocked(8,4)};
  });
  expect(result.count).toBe(5); expect(result.geometries.every(n=>n===2)).toBe(true);
  expect(result.transition).toBeGreaterThan(.035); expect(result.transition).toBeLessThan(1);
  expect(result.inside).toBeLessThan(.04);expect(result.wall).toBeLessThan(.14);expect(result.outside).toBeGreaterThan(.99);expect(result.collision).toBe(true);
});

test('Mobile cell inventory supports item selection and equipment with usable touch targets', async ({browser})=>{
  test.setTimeout(150000);
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await start(page,{owned:['boots','vest'],bag:{metal:6,cloth:3}});
  await page.keyboard.press('KeyI');
  await expect(page.locator('.equipment-slot')).toHaveCount(4);
  await page.locator('#inventory-grid [data-id="boots"]').tap();
  await expect(page.locator('.item-details')).toContainText('Походные ботинки');
  await page.locator('[data-action="equip"][data-id="boots"]').tap();
  expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.boots)).toBe('boots');
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,
    cell:document.querySelector('#inventory-grid .item-cell').getBoundingClientRect().width,
    slot:document.querySelector('.equipment-slot').getBoundingClientRect().width}));
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);expect(layout.cell).toBeGreaterThanOrEqual(44);expect(layout.slot).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:'/workspace/artifacts/screenshots/v05-mobile-inventory.png'});
  expect(errors).toEqual([]);await context.close();
});

test('District audit: entrances, solid walls, repaired bridge, loot access and safe furnishing', async ({page})=>{
  test.setTimeout(180000);
  await start(page,{x:-18,z:18,owned:['bridge','solar','generator'],placed:[]});
  const audit=await page.evaluate(()=>{
    const g=window.__quietDistrict,w=g.world;
    g.visibilityPaused=true;
    const entrances=w.buildings.map(b=>({
      entry:!w.blocked(b.x,b.z+b.d/2),
      wall:w.blocked(b.x-b.w/2,b.z),
      route:w.pathTo(b.x,b.z).length>0,
    }));
    const before=w.blocked(-17,-11),bank=w.blocked(-23,-11);
    g.state.owned=g.state.owned.filter(id=>id!=='bridge');w.applyProgress();
    const closed=w.blocked(-17,-11);g.state.owned.push('bridge');w.applyProgress();
    // Flood walkable half-metre centres to verify at least one reachable collection approach.
    const step=.5, key=(x,z)=>`${x},${z}`, queue=[[-18,18]],seen=new Set([key(-18,18)]);
    for(let i=0;i<queue.length;i++) {
      const [x,z]=queue[i];
      for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]) {
        const nx=x+dx,nz=z+dz,k=key(nx,nz);
        if(!seen.has(k)&&!w.blocked(nx,nz)) {seen.add(k);queue.push([nx,nz]);}
      }
    }
    const inaccessible=w.nodes.filter(n=>!queue.some(([x,z])=>Math.hypot(x-n.x,z-n.z)<2.1)).map(n=>n.name);
    const furniture={id:'bed',x:-16,z:12,rotation:Math.PI/2};
    const free=w.canPlace(furniture),door=w.canPlace({...furniture,x:-18,z:19.5});
    g.state.placed.push(furniture);w.addPlaced(furniture);
    const solid=w.blocked(-16,12),overlap=w.canPlace({...furniture,id:'sofa',x:-15,z:12});
    const solar=w.solarRoof.rotation.x, lamp=w.homeLamp.group.position.toArray();
    const old={id:'bed',x:-22,z:20,rotation:0,harvested:321};g.state.placed.push(old);
    const repaired=w.repairFurniture(),savedProduction=old.harvested,legal=w.canPlace(old,g.state.placed.length-1);
    const lightCount=w.lights.length;w.createGhost('lamp');w.removeGhost();
    const noLeakedLight=w.lights.length===lightCount;
    g.world.move(-18,23);w.updateRoofs(1);
    const outsideDepth=w.buildings[0].roofMeshes.every(m=>m.material.depthWrite);
    g.world.move(-18,15);w.updateRoofs(1);
    const insideDepth=w.buildings[0].roofMeshes.every(m=>!m.material.depthWrite);
    return {repaired,savedProduction,legal,noLeakedLight,outsideDepth,insideDepth,entrances,before,bank,closed,inaccessible,free,door,solid,overlap,solar,lamp,nodeCount:w.nodes.length,roofCounts:w.buildings.map(b=>b.roofMeshes.length)};
  });
  expect(audit.entrances.every(e=>e.entry&&e.wall&&e.route)).toBe(true);
  expect(audit.before).toBe(false);expect(audit.bank).toBe(true);expect(audit.closed).toBe(true);
  expect(audit.inaccessible).toEqual([]);
  expect(audit.free).toBe(true);expect(audit.door).toBe(false);expect(audit.solid).toBe(true);expect(audit.overlap).toBe(false);
  expect(audit.solar).toBeCloseTo(-.22);expect(audit.lamp).toEqual([-18,0,10.85]);
  expect(audit.repaired).toBe(1);expect(audit.savedProduction).toBe(321);expect(audit.legal).toBe(true);
  expect(audit.noLeakedLight).toBe(true);expect(audit.outsideDepth).toBe(true);expect(audit.insideDepth).toBe(true);
  expect(audit.nodeCount).toBe(36);expect(audit.roofCounts).toEqual([2,2,2,2,2]);
});
