import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(page.__errors).toEqual([]); });

test('Whole machines travel in inventory, reload, store and yield one bonus at the workbench',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-56.7,z:37.4});await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Разбор техники');await expect(page.locator('[data-action="salvage-take"]')).toBeEnabled();await page.locator('[data-action="salvage-take"]').click();await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.cargo.length),{timeout:25000}).toBe(1);
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes[98].group.visible)).toBe(false);await page.keyboard.press('KeyI');await page.locator('[data-action="select-item"][data-id="cargo-0"]').click();await expect(page.locator('.item-details')).toContainText('Вес: 8');await expect(page.locator('.item-details .item-icon')).toHaveCount(1);await page.keyboard.press('Escape');await page.evaluate(()=>window.__quietDistrict.save());
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await restored.locator('[data-action="start"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.cargo.length)).toBe(1);await jump(restored,-20,14.5);await restored.keyboard.press('KeyI');await restored.locator('[data-action="storage"]').click();await restored.locator('[data-action="deposit"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.storedCargo.length)).toBe(1);await restored.locator('#storage-grid [data-id="cargo-0"]').click();await restored.locator('[data-action="salvage-workbench"]').click();await restored.locator('[data-action="process-salvage"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.stash)).toMatchObject({metal:5,wire:3,parts:2});expect(await restored.evaluate(()=>window.__quietDistrict.state.storedCargo.length)).toBe(0);await expect(restored.locator('[data-action="process-salvage"]')).toHaveCount(0);}finally{await restored.close();}
});

test('Yard UI joins sections, leaves a real gate opening, rejects closing on player and packs intact',async({page})=>{
 test.setTimeout(300000);await start(page,{stash:{wood:100,stone:100,metal:100}});
 for(const [id,x,z]of [['yardgate',-20,23],['yardfence',-22,23],['yardfence',-18,23],['yardpath',-20,23]]){
  await page.keyboard.press('KeyB');await page.locator('[data-action="build-category"][data-view="yard"]').click();await page.locator(`[data-action="make"][data-id="${id}"]`).click();await page.evaluate(()=>{const w=window.__quietDistrict.world;w.cameraCenter.set(-20,0,20);w.resize();w.update(.001,false,true);});await dropAt(page,x,z);await page.keyboard.press('Escape');
 }
 await jump(page,-20,24.2);expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(-20,23))).toBe(true);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].open)).toBe(true);expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(-20,23))).toBe(false);expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(-20.82,22.18))).toBe(true);
 await jump(page,-20,23);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].open)).toBe(true);await jump(page,-20,24.2);await page.keyboard.press('KeyB');await page.locator('[data-action="pack-furniture"][data-index="0"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.packedFurniture[0].open)).toBe(true);await page.keyboard.press('Escape');await page.evaluate(()=>window.__quietDistrict.save());
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>window.__quietDistrict.state.packedFurniture[0].open)).toBe(true);expect(await restored.evaluate(()=>window.__quietDistrict.state.placed.filter(p=>p.id==='yardfence').length)).toBe(2);}finally{await restored.close();}
});

test('Ready audio decodes, music uses one loop, volume saves and mute prevents new voices',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-16,z:21.8,settings:{sound:true,quality:'low'},placed:[{id:'recordplayer',x:-16,z:23,rotation:0,harvested:0,enabled:true}]});
 const audio=await page.evaluate(async()=>{const g=window.__quietDistrict;await g.audio.loading;g.visibilityPaused=true;const source=g.audio.musicSource;const started=g.audio.playSample('impact_metal_medium_000');for(let i=0;i<40;i++)g.audio.step('wood');return {buffers:g.audio.buffers.size,failed:g.audio.failed||[],loop:source.loop,voices:g.audio.voices.size,started,wood:g.world.surfaceAt(-18,15),concrete:g.world.surfaceAt(0,0),grass:g.world.surfaceAt(-24,23)};});expect(audio).toMatchObject({buffers:27,failed:[],loop:true,started:true,wood:'wood',concrete:'concrete',grass:'grass'});expect(audio.voices).toBeLessThanOrEqual(16);
 await page.locator('[data-action="settings"]').first().click();await expect(page.locator('#panel')).toContainText('HorrorPen');await page.locator('[data-action="music"]').click();expect(await page.evaluate(()=>window.__quietDistrict.audio.musicTarget)).toBe(0);await page.locator('#music-volume').fill('0.8');expect(await page.evaluate(()=>window.__quietDistrict.state.settings.musicVolume)).toBe(.8);await page.locator('[data-action="music"]').click();expect(await page.evaluate(()=>window.__quietDistrict.audio.musicTarget)).toBeGreaterThan(0);await page.locator('#panel [data-action="sound"]').click();expect(await page.evaluate(()=>window.__quietDistrict.audio.playSample('chop'))).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quiet-district-save-v1')).settings.musicVolume)).toBe(.8);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('High quality culls distant cover, draws each shadow once and keeps reflections and colour output',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.setViewportSize({width:960,height:600});await start(page,{x:-18,z:23,owned:['generator']});
 const result=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;w.freezeBuildCamera=true;w.cameraCenter.set(-18,0,17);w.viewSize=28;w.resize();w.setQuality('high');const roof=w.buildings[0].roofMeshes[0];let shadows=0;roof.onBeforeShadow=()=>shadows++;w.mirrors.last=-Infinity;w.renderer.info.autoReset=false;w.renderer.info.reset();w.update(.016,false,true);const first=shadows,triangles=w.renderer.info.render.triangles;let cover=0,cells=0;w.scene.traverse(m=>{if(m.userData.groundCover){cover+=m.count;cells++;}});w.update(.02,false,true);w.renderer.info.autoReset=true;return {first,next:shadows-first,triangles,cover,cells,shadow:w.sun.shadow.mapSize.x,reflection:w.mirrors.capture.getRenderTarget().width,passes:w.composer.passes.length,ready:w.mirrors.last>0};});
 expect(result.first).toBe(1);expect(result.next).toBe(1);expect(result.triangles).toBeLessThan(160000);expect(result.cover).toBe(900);expect(result.cells).toBeGreaterThan(2);expect(result.shadow).toBe(2048);expect(result.reflection).toBe(512);expect(result.passes).toBe(3);expect(result.ready).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:'/tmp/quiet-v16-render.png'});
});

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
  expect(await page.evaluate(()=>window.__quietDistrict.state.owned.includes('generator'))).toBe(true);
  await expect(page.locator('#quest-card')).toHaveCount(0);
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
  test.setTimeout(240000);await page.setViewportSize({width:800,height:600});
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
    if(f.phase==='reel'&&(f.tension>.7||f.mood==='surge')&&f.timer>=(f.relaxedUntil||0)){ui.querySelector('[data-action="relax-fish"]').click();return false;}
    if (f.phase === 'reel' && Math.abs(f.needle - f.target) < 8) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
      return f.phase === 'caught';
    }
    return false;
  }, undefined, { timeout: 180000, polling: 16 });
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
  await page.evaluate(() => { window.__menuButton = document.querySelector('[data-action="toggle-menu"]'); });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__menuButton === document.querySelector('[data-action="toggle-menu"]'))).toBe(true);
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
  expect(await page.evaluate(()=>window.__quietDistrict.state.owned.includes('pump'))).toBe(true);
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
  expect(result.nodes).toBe(7); expect(result.nursery).toBe(true); expect(result.path).toBeGreaterThan(0);
  await page.keyboard.press('KeyM');
  await expect(page.locator('#panel')).toContainText('Заброшенный сад');
});

test('Hotbar uses keyboard supplies, equips weapons and persists inventory assignments', async ({ page }) => {
  test.setTimeout(180000);
  await start(page, { health: 50, medkits: 2, ammo: 12, owned: ['pistol', 'carbine', 'axe', 'rod', 'lantern'],
    hotbar: ['pistol', 'axe', 'rod', 'medkit', 'meal', 'lantern'] });
  await expect(page.locator('.hotbar-slot')).toHaveCount(6);
  await expect(page.locator('#quest-card')).toHaveCount(0);
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
  await expect(page.locator('[data-action="toggle-quest"]')).toHaveCount(0);
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
  await expect(page.locator('#quest-card')).toHaveCount(0);
  await expect(page.locator('.minimap canvas')).toBeHidden();
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
    return {glazing:w.buildings.find(b=>b.x===-42).roofMeshes.find(m=>m.material.userData.baseOpacity<1).material.opacity,count,geometries,transition,inside,wall,outside:b.roofMeshes[0].material.opacity,collision:before===w.blocked(8,4)};
  });
  expect(result.glazing).toBeCloseTo(.5);expect(result.count).toBe(20); expect(result.geometries.every(n=>n>=2)).toBe(true);
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
  await start(page,{x:-18,z:18,owned:['bridge','solar','generator'],openedGates:['yard','salvage'],placed:[]});
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
    const inaccessible=w.nodes.filter(n=>!queue.some(([x,z])=>Math.hypot(x-n.x,z-n.z)<2.1&&w.canSee(x,z,n.x,n.z,n.collider,true))).map(n=>n.name);
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
  expect(audit.nodeCount).toBe(111);expect(audit.roofCounts.length).toBe(20);expect(audit.roofCounts.every(n=>n>=2)).toBe(true);
});

test('Solid containers disappear after collection and wait for the player before restoring',async({page})=>{
 await start(page,{x:9,z:6.2,owned:['bag'],equipment:{weapon:'pipe',bag:'bag'}});
 const solid=()=>page.evaluate(()=>window.__quietDistrict.world.blocked(9,5));
 expect(await solid()).toBe(true);
 await page.keyboard.press('KeyE');
 await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.world.nodes.find(n=>n.name==='Хозяйственный ящик').group.visible),{timeout:20000}).toBe(false);
 expect(await solid()).toBe(false);
 const restore=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world,n=w.nodes.find(n=>n.name==='Хозяйственный ящик');g.visibilityPaused=true;
  g.state.x=9;g.state.z=5;g.state.elapsed+=241;w.syncNodes();
  const hidden=!n.group.visible&&!w.blocked(9,5);
  g.state.z=5.6;w.syncNodes();const nearHidden=!n.group.visible;
  g.state.z=6.2;w.syncNodes();const returned=n.group.visible&&w.blocked(9,5),loot={...n.loot};
  // A partially filled save loaded inside a restored box retains its exact stock.
  n.loot={wood:1};g.state.nodeLoot[n.id]={wood:1};g.state.z=5;w.syncNodes();g.state.z=6.2;w.syncNodes();
  return {hidden,nearHidden,returned,loot,partial:n.loot};
 });
 expect(restore.hidden&&restore.nearHidden&&restore.returned).toBe(true);
 expect(Object.values(restore.loot).some(v=>v>0)).toBe(true);
 expect(restore.partial).toEqual({wood:1});
});

test('Independent exploration reveals outskirts and supplies on the map and survives reload',async({page})=>{
 test.setTimeout(180000);await start(page,{settings:{sound:false,quality:'low',questExpanded:true}});
 await expect(page.locator('#quest-card')).toHaveCount(0);
 await page.keyboard.press('KeyM');await expect(page.locator('.location-list [data-id="clinic"]')).toHaveCount(0);
 await expect(page.locator('.location-list [data-id="workshop"]')).toHaveCount(0);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.x=-49;g.state.z=32;g.world.move(-49,32);});
 await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.visited.includes('clinic'))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.foundNodes.includes('node-36'))).toBe(true);
 await page.keyboard.press('KeyM');await expect(page.locator('.location-list [data-id="clinic"]')).toBeVisible();
 await expect(page.locator('.location-list [data-id="workshop"]')).toHaveCount(0);
 await page.waitForFunction(()=>getComputedStyle(document.getElementById('panel')).transform==='none');
 const map=await page.locator('#large-map').boundingBox();
 await page.mouse.click(map.x+(-48+66)/132*map.width,map.y+(39+66)/132*map.height);
 const destination=await page.evaluate(()=>window.__quietDistrict.world.destination.position.toArray());
 expect(destination[0]).toBeCloseTo(-48,0);expect(destination[2]).toBeCloseTo(39,0);
 expect(await page.evaluate(()=>window.__quietDistrict.path.length)).toBeGreaterThan(0);
 await page.keyboard.press('KeyJ');await expect(page.locator('.place-memories')).toContainText('Клиника на окраине');
 const saved=await page.evaluate(()=>localStorage.getItem('quiet-district-save-v1'));
 await page.context().addInitScript(value=>localStorage.setItem('quiet-district-save-v1',value),saved);
 await page.reload();await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:60000});
 expect(await page.evaluate(()=>window.__quietDistrict.state.x)).toBeLessThan(-43);
 expect(await page.evaluate(()=>window.__quietDistrict.state.visited)).toContain('clinic');
});

test('Shelter upgrades craft through station, production goes to storage and haul recap stays optional',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-19,z:15,owned:['generator'],stash:{metal:60,parts:30,wire:20,wood:40},bag:{wood:26},elapsed:200,placed:[{id:'recycler',x:-18,z:14,rotation:0,harvested:0}]});
 await page.keyboard.press('KeyC');await page.locator('[data-category="shelter"]').click();
 await page.locator('[data-action="make"][data-id="tooling"]').click();
 await page.locator('[data-action="make"][data-id="receiver"]').click();
 const before=await page.evaluate(()=>({parts:window.__quietDistrict.state.stash.parts,wire:window.__quietDistrict.state.stash.wire}));
 expect(await page.evaluate(()=>window.__quietDistrict.world.precisionTool.visible&&window.__quietDistrict.world.receiverModel.visible)).toBe(true);
 await page.keyboard.press('Escape');await page.keyboard.press('KeyE');
 expect(await page.evaluate(()=>window.__quietDistrict.state.stash.parts)).toBe(before.parts+3);
 expect(await page.evaluate(()=>window.__quietDistrict.state.stash.wire)).toBe(before.wire+1);
 expect(await page.evaluate(()=>window.__quietDistrict.state.bag.wood)).toBe(26);
 await page.keyboard.press('KeyI');await page.locator('[data-action="storage"]').click();await page.locator('[data-action="deposit"]').click();
 await expect(page.locator('.haul-summary')).not.toHaveAttribute('open','');await page.locator('.haul-summary summary').click();
 await expect(page.locator('.haul-summary')).toContainText('Дерево × 26');await expect(page.locator('.haul-summary')).toContainText('Можно создать');
});

test('Respawned supplies and partially collected loot retain their rolled contents across saves',async({page})=>{
 test.setTimeout(180000);await start(page,{elapsed:500,owned:['cutter']});
 const snapshot=await page.evaluate(()=>{
  const g=window.__quietDistrict;g.ui.open('settings');const n=g.world.nodes.find(n=>n.id==='node-41');
  n.group.visible=false;g.state.depleted[n.id]=g.state.elapsed-241;delete g.state.nodeLoot[n.id];g.world.syncNodes();
  const rolled={...n.loot};g.state.elapsed+=300;g.save(false);return {rolled,id:n.id,saved:localStorage.getItem('quiet-district-save-v1')};
 });
 await page.context().addInitScript(value=>localStorage.setItem('quiet-district-save-v1',value),snapshot.saved);
 await page.reload();await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:60000});
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes.find(n=>n.id==='node-41').loot)).toEqual(snapshot.rolled);
 await page.locator('[data-action="start"]').click();
 const partial=await page.evaluate(()=>{
  const g=window.__quietDistrict;g.ui.open('settings');const n=g.world.nodes.find(n=>n.id==='node-41');
  g.state.bag={wood:25};g.job={type:'harvest',node:n};g.finishJob();g.save(false);
  return {left:n.loot,saved:localStorage.getItem('quiet-district-save-v1')};
 });
 expect(Object.values(partial.left).reduce((n,v)=>n+v,0)).toBeGreaterThan(0);
 await page.context().addInitScript(value=>localStorage.setItem('quiet-district-save-v1',value),partial.saved);
 await page.reload();await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:60000});
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes.find(n=>n.id==='node-41').loot)).toEqual(partial.left);
});

async function jump(page,x,z) {
 await page.evaluate(({x,z})=>{const g=window.__quietDistrict;if(g.world.blocked(x,z))throw Error(`Test approach blocked: ${x},${z}`);g.path=[];g.motion.reset();g.state.x=x;g.state.z=z;g.world.move(x,z);},{x,z});
}
async function dropAt(page,x,z) {
 const p=await page.evaluate(({x,z})=>window.__quietDistrict.world.screenPosition(x,0,z),{x,z});
 await page.mouse.move(p.x,p.y);await expect(page.locator('#build-hint')).toContainText('Нажми');await page.mouse.click(p.x,p.y);
}
test('Rare furniture travels through inventory and storage, installs only once and light toggles persist',async({page})=>{
 test.setTimeout(240000);await start(page,{x:-46,z:31.8});
 await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.finds.foundlamp||0),{timeout:30000}).toBe(1);
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes[46].collider.disabled)).toBe(true);
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.elapsed+=500;g.world.syncNodes();});
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes[46].group.visible)).toBe(false);
 await jump(page,-18,18);await page.keyboard.press('KeyI');await page.locator('[data-action="storage"]').click();await page.locator('[data-action="deposit"]').click();
 await page.locator('#storage-grid [data-id="foundlamp"]').click();await page.locator('[data-action="withdraw-find"]').click();
 expect(await page.evaluate(()=>window.__quietDistrict.state.storedFinds.foundlamp)).toBe(0);
 await page.locator('#panel [data-action="inventory"]').click();await page.locator('#inventory-grid [data-id="foundlamp"]').click();await page.locator('[data-action="make"][data-id="foundlamp"]').click();
 await dropAt(page,-16,23);expect(await page.evaluate(()=>window.__quietDistrict.state.finds.foundlamp)).toBe(0);
 await jump(page,-16,21.8);await page.keyboard.press('KeyE');
 expect(await page.evaluate(()=>window.__quietDistrict.world.placedGroups[0].group.userData.fixture.light.intensity)).toBe(0);
 await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.world.placedGroups[0].group.userData.fixture.light.intensity)).toBe(7);
 const saved=await page.evaluate(()=>localStorage.getItem('quiet-district-save-v1'));await page.context().addInitScript(s=>localStorage.setItem('quiet-district-save-v1',s),saved);await page.reload();
 await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:60000});
 expect(await page.evaluate(()=>window.__quietDistrict.state.placed.filter(p=>p.id==='foundlamp').length)).toBe(1);
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes[46].group.visible)).toBe(false);
});

test('Manual crops show growth, harvest once, replant and produce usable food',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-17,z:21.8,stash:{seeds:6,water:5,herbs:4},placed:[{id:'cropbed',x:-17,z:23,rotation:0,harvested:0,crop:null,plantedAt:null}]});
 await page.keyboard.press('KeyE');await page.locator('[data-action="plant-crop"][data-id="vegetables"]').click();
 expect(await page.evaluate(()=>window.__quietDistrict.state.stash.seeds)).toBe(4);
 await expect(page.locator('[data-action="harvest-bed"]')).toBeDisabled();await page.keyboard.press('Escape');
 const growth=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;g.state.elapsed=g.state.placed[0].plantedAt+90;g.world.update(.016,false,true);const root=g.world.placedGroups[0].group;return root.children.filter(m=>m.userData.cropLeaf).map(m=>({visible:m.visible,scale:m.scale.y}));});
 expect(growth.length).toBe(6);expect(growth.every(m=>m.visible&&m.scale>.4&&m.scale<.6)).toBe(true);
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.elapsed=g.state.placed[0].plantedAt+181;});
 await page.keyboard.press('KeyE');await page.locator('[data-action="harvest-bed"]').click();
 expect(await page.evaluate(()=>window.__quietDistrict.state.bag.vegetables)).toBe(4);
 await expect(page.locator('[data-action="plant-crop"][data-id="flowers"]')).toBeVisible();await page.locator('[data-action="plant-crop"][data-id="flowers"]').click();
 expect(await page.evaluate(()=>window.__quietDistrict.state.stash.seeds)).toBe(3);
 await page.keyboard.press('Escape');await jump(page,-19,14);await page.keyboard.press('KeyC');await page.locator('[data-category="supplies"]').click();await page.locator('[data-action="make"][data-id="stew"]').click();
 expect(await page.evaluate(()=>window.__quietDistrict.state.meals)).toBe(1);expect(await page.evaluate(()=>window.__quietDistrict.state.bag.vegetables)).toBe(2);
});

test('Clock mounts on the wall and record player respects distance and global sound controls',async({page})=>{
 test.setTimeout(240000);await start(page,{storedFinds:{wallclock:1,recordplayer:1}});
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="wallclock"]').click();await dropAt(page,-18,11);
 const clock=await page.evaluate(()=>window.__quietDistrict.state.placed[0]);expect(clock.id).toBe('wallclock');expect(clock.z).toBeCloseTo(10.66,3);expect(clock.rotation).toBe(0);
 expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(-18,11.5))).toBe(false);
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="recordplayer"]').click();await dropAt(page,-16,23);
 await jump(page,-16,21.8);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.state.placed[1].enabled)).toBe(true);
 await page.locator('[data-action="settings"]').click();await page.locator('#panel [data-action="sound"]').click();await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.__quietDistrict.audio.context.state==='running');
 const sound=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const source=g.audio.musicSource;g.audio.setMusic(true,.5);g.audio.record(g.state.elapsed+1,0);const near=g.audio.musicTarget;g.audio.record(g.state.elapsed+2,20);const far=g.audio.musicTarget;g.audio.setMusic(false);return {near,far,muted:g.audio.musicTarget,same:g.audio.musicSource===source};});
 expect(sound.near).toBeGreaterThan(sound.far);expect(sound.muted).toBe(0);expect(sound.same).toBe(true);
});

test('Scene notes can be read physically and remain in the journal without adding objectives',async({page})=>{
 test.setTimeout(180000);await start(page);
 for(const [id,x,z] of [['bus',10.5,36.7],['picnic',-25.8,33],['yard',52,23.2]]) {
  await jump(page,x,z);await page.keyboard.press('KeyE');await expect(page.locator('.found-note')).toBeVisible();expect(await page.evaluate(()=>window.__quietDistrict.state.notes)).toContain(id);await page.keyboard.press('Escape');
 }
 await page.keyboard.press('KeyJ');await expect(page.locator('#panel')).toContainText('Тетрадь механика');await expect(page.locator('#panel')).toContainText('Открытка у пледа');await expect(page.locator('#quest-card')).toHaveCount(0);
});

test('Expansion doors use physical tools, open playable rooms and persist across reload',async({page})=>{
 test.setTimeout(240000);await start(page,{x:-44,z:62,owned:['cutter','wrench']});
 expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(-44,61))).toBe(true);
 const locked=await page.evaluate(()=>{const g=window.__quietDistrict,n=g.world.nodes.find(n=>n.name==='Шкаф с инструментами');g.harvest(n);return g.job===null&&!g.state.depleted[n.id];});expect(locked).toBe(true);
 await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.openedGates.includes('yard')),{timeout:25000}).toBe(true);
 expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(-44,61))).toBe(false);
 await jump(page,51,-43.8);await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.openedGates.includes('salvage')),{timeout:25000}).toBe(true);
 const result=await page.evaluate(()=>{const g=window.__quietDistrict;g.save(false);return {visible:g.world.gates.some(g=>g.group.visible),paths:[g.world.pathTo(51,-50).length,g.world.pathTo(-44,56).length],save:localStorage.getItem('quiet-district-save-v1')};});
 expect(result.visible).toBe(false);expect(result.paths.every(n=>n>0)).toBe(true);
 await page.context().addInitScript(s=>localStorage.setItem('quiet-district-save-v1',s),result.save);await page.reload();await expect(page.locator('[data-action="start"]')).toBeEnabled({timeout:60000});
 expect(await page.evaluate(()=>window.__quietDistrict.world.gates.every(g=>!g.group.visible&&g.collider.disabled))).toBe(true);
});
test('Shelter furniture packs through UI, survives cancelled placement and restores growing crops',async({page})=>{
 test.setTimeout(180000);await start(page,{elapsed:100,placed:[{id:'cropbed',x:-16,z:23,rotation:0,harvested:0,crop:'herbs',plantedAt:60,rainGrowth:5}]});
 await page.keyboard.press('KeyB');const progress=await page.evaluate(()=>{const g=window.__quietDistrict;return g.state.elapsed-g.state.placed[0].plantedAt;});
 await page.locator('[data-action="pack-furniture"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.placed.length)).toBe(0);expect(await page.evaluate(()=>window.__quietDistrict.world.placedGroups.length)).toBe(0);
 await page.locator('[data-action="unpack-furniture"]').click();await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__quietDistrict.state.packedFurniture.length)).toBe(1);
 await page.evaluate(()=>window.__quietDistrict.state.elapsed+=250);await page.keyboard.press('KeyB');await page.locator('[data-action="unpack-furniture"]').click();await dropAt(page,-16,23);
 const restored=await page.evaluate(()=>{const g=window.__quietDistrict,p=g.state.placed[0];return {packed:g.state.packedFurniture.length,age:g.state.elapsed-p.plantedAt,rain:p.rainGrowth,crop:p.crop,groups:g.world.placedGroups.length};});
 expect(restored.packed).toBe(0);expect(Math.abs(restored.age-progress)).toBeLessThan(5);expect(restored.rain).toBe(5);expect(restored.crop).toBe('herbs');expect(restored.groups).toBe(1);
});
test('Backwater fishing selects carried bait and reusable lure through the actual window',async({page})=>{
 test.setTimeout(150000);await start(page,{x:28,z:55.2,owned:['rod','lure'],bag:{vegetables:2}});await page.keyboard.press('KeyE');await page.locator('[data-action="bait-menu"]').click();
 await expect(page.locator('#panel')).toContainText('Тихая заводь');await page.locator('[data-action="select-bait"][data-id="vegetables"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag.vegetables)).toBe(2);
 await page.locator('[data-action="cast-selected"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag.vegetables)).toBe(1);expect(await page.evaluate(()=>window.__quietDistrict.fish.spot)).toBe('backwater');
 await page.locator('[data-action="bait-menu"]').click();await page.locator('[data-action="select-bait"][data-id="lure"]').click();await page.locator('[data-action="cast-selected"]').click();expect(await page.evaluate(()=>window.__quietDistrict.fish.bait)).toBe('lure');expect(await page.evaluate(()=>window.__quietDistrict.state.owned.includes('lure'))).toBe(true);expect(await page.evaluate(()=>window.__quietDistrict.state.bag.vegetables)).toBe(1);
});
test('Rain and distinct architecture preserve sheltered interiors, canopy cutaways and fishing access',async({page})=>{
 await start(page,{elapsed:200,openedGates:['yard','salvage']});
 const audit=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;
  w.update(.1,false,true);const rainy=w.rain.visible&&w.rain.material.opacity>.1&&w.rainRipples.visible;
  g.state.x=27;g.state.z=54.8;w.updateRoofs(1);const canopy=w.buildings.find(b=>b.x===27).roofMeshes.find(m=>m.userData.canopyBounds),under=canopy.material.opacity<.1&&!canopy.material.depthWrite;
  g.state.x=34;g.state.z=53;w.updateRoofs(1);const outside=canopy.material.opacity>.98;
  return {rainy,under,outside,shelter:w.sheltered(27,54.8),exposed:!w.sheltered(28,57),fish:!w.blocked(28,55.2),water:w.blocked(30,59),buildings:w.buildings.length,gates:w.gates.length};
 });
 expect(audit.rainy&&audit.under&&audit.outside&&audit.shelter&&audit.exposed&&audit.fish&&audit.water).toBe(true);expect(audit.buildings).toBe(20);expect(audit.gates).toBe(6);
});


test('Clinic materials make a usable medkit through the station and retain their inventory artwork',async({page})=>{
 await start(page,{x:-19,z:14,health:50,medkits:0,stash:{medicine:1,cloth:1}});await page.keyboard.press('KeyC');await page.locator('[data-category="supplies"]').click();await page.locator('[data-action="make"][data-id="dressing"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.medkits)).toBe(1);expect(await page.evaluate(()=>window.__quietDistrict.state.stash.medicine)).toBe(0);await page.keyboard.press('Escape');await page.keyboard.press('KeyQ');expect(await page.evaluate(()=>window.__quietDistrict.state.health)).toBe(95);
});


test('Legacy positions in newly locked rooms recover outside without losing equipment or resources',async({page})=>{
 await start(page,{x:51,z:-50,bag:{wood:3},owned:['axe']});const recovered=await page.evaluate(()=>{const g=window.__quietDistrict;return {x:g.state.x,z:g.state.z,blocked:g.world.blocked(g.state.x,g.state.z),wood:g.state.bag.wood,axe:g.state.owned.includes('axe'),opened:g.state.openedGates};});expect(recovered.x).toBe(51);expect(recovered.z).toBeCloseTo(-43.8);expect(recovered.blocked).toBe(false);expect(recovered.wood).toBe(3);expect(recovered.axe).toBe(true);expect(recovered.opened).toEqual([]);
});


test('Map routes to the accessible entrance of a discovered locked building',async({page})=>{
 await start(page,{visited:['home','salvage']});await page.keyboard.press('KeyM');await page.locator('.location-list [data-id="salvage"]').click();const route=await page.evaluate(()=>{const g=window.__quietDistrict;return {length:g.path.length,last:g.path.at(-1),valid:g.path.every(p=>!g.world.blocked(p.x,p.z)),opened:g.state.openedGates};});expect(route.length).toBeGreaterThan(0);expect(route.last).toEqual({x:51,z:-44});expect(route.valid).toBe(true);expect(route.opened).toEqual([]);
});

test('Rain collector and dryer work through real interactions and preserve their saved batches',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-17,z:21.8,elapsed:200,stash:{fish:2,herbs:1},placed:[{id:'dryrack',x:-17,z:23,rotation:0,harvested:0,dryingAt:null},{id:'raincatcher',x:-13,z:23,rotation:0,harvested:0,rainWater:3.4}]});
 await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Сушилка для улова');await page.locator('[data-action="load-dryer"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.stash.fish)).toBe(0);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.elapsed=g.state.placed[0].dryingAt+101;});await page.keyboard.press('KeyE');await page.locator('[data-action="harvest-dryer"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.meals)).toBe(2);await page.keyboard.press('Escape');
 await jump(page,-13,21.8);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.state.bag.water)).toBe(3);expect(await page.evaluate(()=>window.__quietDistrict.state.placed[1].rainWater)).toBeLessThan(1);
});
test('Loadout station restores equipment atomically and rejects a smaller bag while carrying loot',async({page})=>{
 test.setTimeout(150000);await start(page,{x:-16,z:13,owned:['hauler','scoutcoat','armor'],placed:[{id:'gearrack',x:-16,z:12,rotation:0,harvested:0}]});
 await page.keyboard.press('KeyE');await page.locator('[data-action="save-loadout"][data-index="0"]').click();
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.equipment.armor='scoutcoat';g.state.equipment.bag='hauler';});await page.locator('[data-action="save-loadout"][data-index="1"]').click();
 await page.evaluate(()=>window.__quietDistrict.state.bag.wood=30);await page.locator('[data-action="apply-loadout"][data-index="0"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.bag)).toBe('hauler');
 await page.evaluate(()=>window.__quietDistrict.state.bag={});await page.locator('[data-action="apply-loadout"][data-index="0"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe(null);await page.locator('[data-action="apply-loadout"][data-index="1"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe('scoutcoat');
});
test('Drone warnings can be escaped and cover prevents both attack directions',async({page})=>{
 await start(page,{x:8,z:-3,owned:['pistol'],equipment:{weapon:'pistol',armor:null,bag:null,boots:null},ammo:10});
 expect(await page.evaluate(()=>window.__quietDistrict.world.weaponRoot.children.length)).toBeGreaterThan(0);
 const result=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const e=g.world.enemies[0];e.x=8;e.z=-4;e.alert=3;e.cooldown=0;e.windup=0;e.lastSeen={x:8,z:-3};const health=g.state.health;g.updateEnemies(.2);const warned=e.windup>0&&g.state.health===health;g.state.z=-1;g.updateEnemies(.2);const escaped=e.windup===0;g.state.x=8;g.state.z=-3;e.x=8;e.z=-4;const wall=g.world.collider(8,-3.5,2,.16);const ammo=g.state.ammo,enemyHealth=e.health;g.attackCooldown=0;g.attack(e);g.updateEnemies(1);const cover=g.state.ammo===ammo&&e.health===enemyHealth&&g.state.health===health;wall.disabled=true;return {warned,escaped,cover};});
 expect(result.warned&&result.escaped&&result.cover).toBe(true);
});

test('Expedition finds install through UI, cook only food, save loadouts and reload without duplicating',async({page})=>{
 test.setTimeout(240000);await start(page,{stash:{fish:2,vegetables:2,wood:20,metal:20,parts:20,cloth:20},owned:['armor']});
 const claims=await page.evaluate(()=>{const g=window.__quietDistrict;for(const id of ['campstove','toolcabinet']){const n=g.world.nodes.find(n=>n.find===id);g.harvest(n);g.finishJob();}return {...g.state.finds};});expect(claims).toEqual({campstove:1,toolcabinet:1});
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="campstove"]').click();await dropAt(page,-16,23);await page.keyboard.press('Escape');
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="toolcabinet"]').click();await dropAt(page,-22,23);await page.keyboard.press('Escape');
 await jump(page,-16,21.8);await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Кухонная печь');await expect(page.locator('.recipe-card')).toHaveCount(4);await expect(page.locator('.recipe-icon svg')).toHaveCount(4);await expect(page.locator('[data-id="pistol"]')).toHaveCount(0);
 await page.locator('[data-action="make"][data-id="fishmeal"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.meals)).toBe(2);
 expect(await page.evaluate(()=>{const g=window.__quietDistrict;g.make('pistol');return g.state.owned.includes('pistol');})).toBe(false);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:800});await page.keyboard.press('Escape');
 await jump(page,-22,21.8);await page.keyboard.press('KeyE');await page.locator('[data-action="save-loadout"][data-index="0"]').click();await page.evaluate(()=>{window.__quietDistrict.state.equipment.armor='armor';});await page.locator('[data-action="save-loadout"][data-index="1"]').click();await page.locator('[data-action="apply-loadout"][data-index="0"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe(null);await page.locator('[data-action="apply-loadout"][data-index="1"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe('armor');
 const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.save(false);return {legal:g.state.placed.every((p,i)=>g.world.canPlace(p,i)),hidden:g.world.nodes.filter(n=>['campstove','toolcabinet'].includes(n.find)).every(n=>!n.group.visible)};});expect(audit).toEqual({legal:true,hidden:true});
 const context=page.context();await page.close();const restored=await context.newPage();try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>window.__quietDistrict.state.placed.map(p=>p.id))).toEqual(['campstove','toolcabinet']);expect(await restored.evaluate(()=>window.__quietDistrict.state.meals)).toBe(2);expect(await restored.evaluate(()=>window.__quietDistrict.world.nodes.filter(n=>['campstove','toolcabinet'].includes(n.find)).every(n=>!n.group.visible))).toBe(true);}finally{await restored.close();}
});

test('Drone detours avoid thin walls, reuse routes and show suspicion before pursuing',async({page})=>{
 await start(page,{x:0,z:1});const audit=await page.evaluate(async()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const e=w.enemies[0];for(const other of w.enemies)if(other!==e)other.health=0;Object.assign(e,{x:0,z:-5,originX:0,originZ:-5,route:null,courseAt:undefined,alert:3,lastSeen:{x:0,z:1},facing:0});const wall=w.collider(0,-2,3,.16),first=w.enemyWaypoint(e,e.lastSeen,10),detour=!!first&&first!==e.lastSeen,routeAt=e.routeAt;w.enemyWaypoint(e,e.lastSeen,10.1);const reused=e.routeAt===routeAt;let crossed=false,wide=false;for(let i=0;i<140;i++){g.state.elapsed=10+i*.05;e.alert=3;g.updateEnemies(.05);crossed ||= w.blocked(e.x,e.z,.35);wide ||= Math.abs(e.x)>1.7;}const arrived=e.z>-.5;wall.disabled=true;Object.assign(e,{x:0,z:-5,alert:0,suspicion:0,facing:0,patrolIndex:0,windup:0,cooldown:0,route:null,courseAt:undefined});g.state.z=0;g.updateEnemies(.2);w.update(.016,false,true);const warned=e.suspicion>0&&e.alert===0&&e.signal.visible;g.updateEnemies(.5);const pursuing=e.alert>0;const {reactToHit}=await import('/src/survival.js');reactToHit(e,g.state);const before={x:e.x,z:e.z};g.updateEnemies(.1);const stagger=e.x===before.x&&e.z===before.z&&e.windup===0;return {detour,reused,crossed,wide,arrived,warned,pursuing,stagger};});
 expect(audit.crossed).toBe(false);expect(audit).toMatchObject({detour:true,reused:true,wide:true,arrived:true,warned:true,pursuing:true,stagger:true});
});

test('New rooms cut away roofs, retain walls, reveal on map and preserve recurring partial loot',async({page})=>{
 await start(page,{owned:['wrench','cutter']});const audit=await page.evaluate(async()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const {discover,expeditionLoot}=await import('/src/district.js');const rooms=w.buildings.slice(-2).map(b=>{g.state.x=b.x;g.state.z=b.z;w.updateRoofs(1);discover(g.state,w.nodes);return {inside:b.roofMeshes.every(m=>m.material.opacity<.04),entry:!w.blocked(b.x,b.z+b.d/2),wall:w.blocked(b.x-b.w/2,b.z)};});const n=w.nodes[103];g.state.bag={wood:25};g.harvest(n);g.finishJob();const leftover={...n.loot};g.world.syncNodes();const partial=Object.keys(leftover).length>0&&JSON.stringify(n.loot)===JSON.stringify(leftover);g.state.bag={};g.harvest(n);g.finishJob();g.state.elapsed+=241;g.state.x=-18;g.state.z=18;w.syncNodes();const cycle=Math.floor(g.state.elapsed/n.respawnTime),renewed=JSON.stringify(n.loot)===JSON.stringify(expeditionLoot(n,cycle));g.save(false);return {rooms,partial,renewed,cycle,visited:g.state.visited,loot:n.loot,save:localStorage.getItem('quiet-district-save-v1')};});
 expect(audit.rooms.every(r=>r.inside&&r.entry&&r.wall)).toBe(true);expect(audit.partial&&audit.renewed).toBe(true);expect(audit.cycle).toBe(1);expect(audit.visited).toEqual(expect.arrayContaining(['laundry','dispatch']));
 const context=page.context();await page.close();const restored=await context.newPage();try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>window.__quietDistrict.world.nodes[103].loot)).toEqual(audit.loot);await restored.locator('[data-action="start"]').click();await restored.keyboard.press('KeyM');await expect(restored.locator('[data-action="travel"][data-id="laundry"]')).toBeVisible();await expect(restored.locator('[data-action="travel"][data-id="dispatch"]')).toBeVisible();}finally{await restored.close();}
});
test('High quality reflections share a live target, update with the camera and throttle extra renders',async({page})=>{
 test.setTimeout(150000);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await start(page,{x:0,z:17,owned:['generator']});
 const result=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;w.setQuality('high');let captures=0;const original=w.mirrors.capture.onBeforeRender;w.mirrors.capture.onBeforeRender=(...args)=>{captures++;return original.apply(w.mirrors.capture,args);};w.update(.016,false,true);const first=[...w.mirrors.projection.elements],one=captures;w.update(.02,false,true);const throttled=captures===one;w.cameraCenter.x+=2;w.update(.2,false,true);const changed=w.mirrors.projection.elements.some((n,i)=>Math.abs(n-first[i])>1e-6);const shared=w.mirrors.surfaces.every(m=>m.material.uniforms.reflection.value===w.mirrors.capture.getRenderTarget().texture);w.setQuality('low');w.update(.2,false,true);return {one,throttled,changed,shared,surfaces:w.mirrors.surfaces.length,disabled:w.mirrors.surfaces.every(m=>m.material.uniforms.strength.value===0),hidden:!w.mirrors.capture.visible};});
 expect(result.one).toBe(1);expect(result.throttled&&result.changed&&result.shared&&result.disabled&&result.hidden).toBe(true);expect(result.surfaces).toBeGreaterThan(20);expect(errors).toEqual([]);
});

test('Station upgrades install through the real window, preserve active batches and reload their models',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-20,z:23,elapsed:50,stash:{battery:3,pumpmodule:2,filterunit:2,metal:40,cloth:12,parts:10,fish:4,herbs:2},placed:[{id:'dryrack',x:-20,z:23,rotation:0,harvested:0,dryingAt:10},{id:'raincatcher',x:-13,z:23,rotation:0,harvested:0,rainWater:5},{id:'recycler',x:-16,z:12,rotation:0,harvested:0}]});
 await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('До готовности');await page.locator('[data-action="upgrade-station"]').click();await expect(page.locator('#panel')).toContainText('установлено');expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].dryingOutput)).toBe(2);
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.elapsed=g.state.placed[0].dryingAt+100;g.ui.renderPanel();});await page.locator('[data-action="harvest-dryer"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.meals)).toBe(2);await page.locator('[data-action="load-dryer"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].dryingOutput)).toBe(4);
 await page.keyboard.press('Escape');await page.keyboard.press('KeyB');await page.locator('[data-action="station-details"][data-index="1"]').click();await page.locator('[data-action="upgrade-station"]').click();await expect(page.locator('#panel')).toContainText('/ 12');await page.keyboard.press('Escape');await page.keyboard.press('KeyB');await page.locator('[data-action="station-details"][data-index="2"]').click();await page.locator('[data-action="upgrade-station"]').click();await expect(page.locator('#panel')).toContainText('4 детали и 2 провода');
 await page.evaluate(()=>window.__quietDistrict.save(false));const context=page.context();await page.close();const restored=await context.newPage(),errors=[];restored.on('pageerror',e=>errors.push(e.message));await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:60000});expect(await restored.evaluate(()=>{const g=window.__quietDistrict;return g.state.placed.every(p=>p.upgrade===1)&&g.world.placedGroups.every(e=>e.group.userData.stationUpgrade===1)&&g.state.placed[0].dryingOutput===4;})).toBe(true);expect(errors).toEqual([]);await restored.close();
});
test('New districts have reachable rare supplies, shortcut gates open physically and reeds stay instanced',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-15,z:-35.7,owned:['cutter','wrench']});
 const before=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const w=g.world,gate=w.gates.find(g=>g.id==='garage-path');return {closed:w.blocked(-15,-37),walkAround:w.pathTo(-15,-48).length>0,first72:w.nodes[71].name,rare:w.nodes.slice(72).filter(n=>Object.keys(n.originalLoot).some(id=>['battery','pumpmodule','filterunit'].includes(id))).length,reeds:w.reedStems.isInstancedMesh&&w.reedStems.parent===w.scene&&w.reedStems.count>0};});
 expect(before.closed&&before.walkAround&&before.reeds).toBe(true);expect(before.rare).toBe(6);expect(before.first72).toBe('Ящик ремонтной бригады');await page.keyboard.press('KeyE');await page.evaluate(()=>{const g=window.__quietDistrict;g.job.elapsed=g.job.duration;g.finishJob();});expect(await page.evaluate(()=>!window.__quietDistrict.world.blocked(-15,-37))).toBe(true);
 await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.state.x=48;g.state.z=-23;w.cameraCenter.set(48,0,-23);w.update(.1,false);g.ui.context(g.nearestInteraction());});await page.keyboard.press('KeyE');await page.evaluate(()=>{const g=window.__quietDistrict;g.job.elapsed=g.job.duration;g.finishJob();});expect(await page.evaluate(()=>window.__quietDistrict.state.bag.filterunit)).toBe(2);
 const sounds=await page.evaluate(()=>{const g=window.__quietDistrict;g.audio.toggle(true);g.audio.environment('water',true,10);const water=g.audio.roomKind;g.audio.toggle(false);g.audio.environment('metal',true,20);return {water,muted:g.audio.roomKind===water};});expect(sounds).toEqual({water:'water:true',muted:true});
});
test('Mobile station windows show rare part artwork and usable upgrade controls without horizontal overflow',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();await start(page,{x:-20,z:23,stash:{battery:1,metal:6,cloth:4},placed:[{id:'dryrack',x:-20,z:23,rotation:0,harvested:0}]});await page.getByRole('button',{name:'Взаимодействовать',exact:true}).click();const button=page.locator('[data-action="upgrade-station"]');await expect(button).toBeEnabled();const box=await button.boundingBox();expect(box.width).toBeGreaterThan(180);expect(box.height).toBeGreaterThanOrEqual(40);expect(await page.locator('#panel .recipe-card .costs .item-icon').count()).toBe(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await button.click();await expect(page.locator('#panel')).toContainText('установлено');await context.close();
});

test('Debris uses real tools, clears collisions once and preserves permanent openings',async({page})=>{
 test.setTimeout(180000);await start(page,{x:15,z:26.7,owned:['axe','wrench']});await page.keyboard.press('KeyE');await page.evaluate(()=>{const g=window.__quietDistrict;if(g.job?.type!=='gate')throw Error('Debris interaction missing');g.job.elapsed=g.job.duration;g.finishJob();});expect(await page.evaluate(()=>{const g=window.__quietDistrict;return g.state.bag.wood===5&&g.state.openedGates.includes('housing-debris')&&!g.world.blocked(15,25.5);})).toBe(true);
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.x=41;g.state.z=19.4;g.ui.context(g.nearestInteraction());});await page.keyboard.press('KeyE');await page.evaluate(()=>{const g=window.__quietDistrict;g.job.elapsed=g.job.duration;g.finishJob();});expect(await page.evaluate(()=>window.__quietDistrict.state.bag.metal)).toBe(3);await page.evaluate(()=>window.__quietDistrict.save(false));const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('quiet-district-save-v1')));expect(saved.openedGates).toEqual(expect.arrayContaining(['housing-debris','workshop-debris']));
});
test('New home finds have distinct models, toggle locally, pack intact and a wall shelf stays out of walking collisions',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-16,z:13,findClaims:['node-84','node-85','node-86'],placed:[{id:'desklamp',x:-16,z:12,rotation:0,harvested:0,enabled:true},{id:'homeradio',x:-18,z:12,rotation:0,harvested:0,enabled:false},{id:'wallshelf',x:-20,z:10.66,rotation:0,harvested:0}]});
 expect(await page.evaluate(()=>window.__quietDistrict.world.placedGroups[0].group.userData.fixture.light.intensity)).toBeGreaterThan(0);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].enabled)).toBe(false);await page.keyboard.press('KeyB');await page.locator('[data-action="toggle-furniture"][data-index="1"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.placed[1].enabled)).toBe(true);await page.locator('[data-action="pack-furniture"][data-index="1"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.packedFurniture[0].enabled)).toBe(true);
 const result=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const wallFree=!g.world.blocked(-20,11.4);g.audio.toggle(true);let tones=0;g.audio.playSample=()=>tones++;g.audio.radio(100,8);const distant=tones;g.audio.radio(100,1);g.audio.toggle(false);g.audio.radio(200,1);return {wallFree,distant,tones,claimed:g.world.nodes.slice(84,87).every(n=>!n.group.visible)};});expect(result).toEqual({wallFree:true,distant:0,tones:1,claimed:true});
});
test('Mobile nearby interaction selector cycles targets without losing the chosen item or overflowing the HUD',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});try{const page=await context.newPage();await start(page,{x:-19,z:22,placed:[{id:'desklamp',x:-20,z:23,rotation:0,harvested:0,enabled:true},{id:'homeradio',x:-18,z:23,rotation:0,harvested:0,enabled:false}]});const select=page.getByRole('button',{name:'Выбрать другой предмет рядом',exact:true});await expect(select).toBeVisible();await select.click();await expect(page.locator('#context')).toContainText('приёмник');await page.locator('#context [data-action="interact"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.placed[1].enabled)).toBe(true);const box=await select.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);const bounds=await page.locator('#context').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}finally{await context.close();}
});
test('Indexed world queries exactly match linear collision and cover while dry rain skips buffer uploads',async({page})=>{
 test.setTimeout(180000);await start(page);const result=await page.evaluate(async()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const {circleHitsRect}=await import('/src/layout.js'),{segmentHitsRect}=await import('/src/survival.js');let seed=31,mismatches=0,total=0;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<4000;i++){const x=rnd()*128-64,z=rnd()*128-64,r=.3,c=[...w.collisionIndex.query(x-r,z-r,x+r,z+r)];total+=c.length;if(c.some(q=>!q.disabled&&circleHitsRect(x,z,r,q))!==w.colliders.some(q=>!q.disabled&&circleHitsRect(x,z,r,q)))mismatches++;const bx=x+rnd()*12-6,bz=z+rnd()*12-6;if([...w.collisionIndex.query(Math.min(x,bx),Math.min(z,bz),Math.max(x,bx),Math.max(z,bz))].some(q=>!q.disabled&&(q.w>.45||q.d>.45)&&segmentHitsRect(x,z,bx,bz,q))!==w.colliders.some(q=>!q.disabled&&(q.w>.45||q.d>.45)&&segmentHitsRect(x,z,bx,bz,q)))mismatches++;}const p=w.rain.geometry.attributes.position,v=p.version;w.updateRain(.1,{rain:0});const dry=p.version===v&&!w.rain.visible;w.updateRain(.1,{rain:1});const wet=p.version>v&&w.rain.visible;w.setQuality('high');return {mismatches,ratio:total/4000/w.colliders.length,dry,wet,shadow:w.sun.shadow.mapSize.x,mirror:w.mirrors.capture.getRenderTarget().width,high:w.renderer.shadowMap.enabled};});expect(result.mismatches).toBe(0);expect(result.ratio).toBeLessThan(.2);expect(result.dry&&result.wet&&result.high).toBe(true);expect(result.shadow).toBe(2048);expect(result.mirror).toBe(512);
});
test('Fishing shows a surge warning, release relieves tension and repeated clicks cannot skip reel timing',async({page})=>{
 await start(page,{x:19,z:-17,owned:['rod']});await page.keyboard.press('KeyE');await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;g.fish.phase='bite';g.fishAction();g.fish.timer=3.4;g.fish.totalTime=3.4;g.fish.tension=.8;g.updateFishing(.01);});await expect(page.locator('#fish-ui')).toContainText('Рывок');await page.locator('[data-action="relax-fish"]').click();expect(await page.evaluate(()=>window.__quietDistrict.fish.tension)).toBeLessThan(.5);await page.locator('[data-action="fish-action"]').click();expect(await page.evaluate(()=>window.__quietDistrict.fish.hits)).toBe(0);expect(await page.locator('.line-tension').isVisible()).toBe(true);
});

test('Annex actual placement, roof cutaway, collision and save reload',async({page})=>{
 test.setTimeout(180000);await start(page,{stash:{wood:100,stone:100,metal:100,cloth:100}});
 await page.keyboard.press('KeyB');await page.locator('[data-action="architecture"]').click();await expect(page.locator('[data-action="structure-select"]')).toHaveCount(5);await page.locator('[data-action="structure-select"][data-id="floor"]').click();
 const point=await page.evaluate(()=>window.__quietDistrict.world.screenPosition(-18,0,20.5));await page.mouse.click(point.x,point.y);
 await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.construction.length)).toBe(1);await page.keyboard.press('Escape');
 const audit=await page.evaluate(async()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const {buildStructure}=await import('/src/game.js');const result=[];for(const p of [{id:'wall',x:-19,z:20.5,axis:'z'},{id:'window',x:-17,z:20.5,axis:'z'},{id:'door',x:-18,z:21.5,axis:'x'}])result.push(buildStructure(g.state,p,g.world.colliders));g.world.rebuildConstruction();const roof=g.world.constructionRoofs.length,covered=g.world.sheltered(-18,20.5),blocked=g.world.blocked(-19,20.5),door=!g.world.blocked(-18,21.5),route=g.world.pathTo(-18,23);g.state.x=-18;g.state.z=20.5;g.world.updateConstructionRoofs(1);const alpha=g.world.constructionRoofs[0]?.material.opacity;g.save(false);return {result,roof,covered,blocked,door,alpha,route:route.length};});
 expect(audit.result.every(r=>r.ok)).toBe(true);expect(audit.roof).toBeGreaterThan(0);expect(audit.covered&&audit.blocked&&audit.door).toBe(true);expect(audit.alpha).toBeLessThan(.04);expect(audit.route).toBeGreaterThan(0);
 await page.screenshot({path:'/tmp/quiet-v13-annex.png'});const restored=await page.context().newPage();await restored.goto('/');await restored.locator('[data-action="start"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.construction.length)).toBe(4);await restored.close();
});
test('Tree and stone tools, partial resource piles and regeneration',async({page})=>{
 test.setTimeout(180000);await start(page,{owned:['axe','pick'],x:-29,z:16});const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const tree=g.world.nodes.find(n=>n.machine==='standingtree'),stone=g.world.nodes.find(n=>n.machine==='quarry');g.state.bag={wood:25};g.harvest(tree);g.finishJob();const falling=!!tree.falling;g.world.updateResourceAnimations(1);const partial={broken:g.state.brokenNodes.includes(tree.id),standing:tree.group.userData.standing.visible,pile:tree.group.userData.shards.visible,disabled:tree.collider.disabled,left:{...tree.loot}};g.state.bag={};g.harvest(tree);g.finishJob();const stump=tree.stump.visible;g.state.bag={};g.harvest(stone);g.finishJob();const mined=g.state.bag.stone;g.state.elapsed+=241;g.state.x=-16;g.state.z=16;g.world.syncNodes();return {partial,stump,mined,regrown:tree.group.visible&&tree.group.userData.standing.visible&&!tree.collider.disabled,count:g.world.nodes.length,falling};});expect(audit.falling).toBe(true);expect(audit.partial.broken&&audit.partial.pile&&audit.partial.disabled).toBe(true);expect(audit.partial.standing).toBe(false);expect(audit.partial.left.wood).toBeGreaterThan(0);expect(audit.stump&&audit.regrown).toBe(true);expect(audit.mined).toBeGreaterThan(0);expect(audit.count).toBe(111);
});

const furnishedAnnex=[{id:'floor',x:-18,z:20.5},{id:'floor',x:-18,z:22.5},{id:'floor',x:-16,z:22.5},{id:'floor',x:-18,z:24.5},{id:'floor',x:-16,z:24.5},{id:'wall',x:-19,z:20.5,axis:'z'},{id:'window',x:-17,z:20.5,axis:'z'},{id:'wall',x:-19,z:22.5,axis:'z'},{id:'wall',x:-16,z:21.5,axis:'x'},{id:'window',x:-15,z:22.5,axis:'z'},{id:'wall',x:-19,z:24.5,axis:'z'},{id:'door',x:-18,z:25.5,axis:'x'},{id:'window',x:-15,z:24.5,axis:'z'},{id:'wall',x:-16,z:25.5,axis:'x'}];
test('Furnished annex places precisely, lights windows, attaches shelves and restores intact',async({page})=>{
 test.setTimeout(300000);await start(page,{x:-20,z:22,construction:furnishedAnnex,owned:['generator'],stash:{wood:100,metal:100,cloth:100,wire:100,stone:100,parts:100},storedFinds:{wallshelf:1}});
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="bed"]').click();await dropAt(page,-18,23.25);expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].z)).toBe(23.25);
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="recycler"]').click();await dropAt(page,-16,23.5);await jump(page,-16,24.7);await page.keyboard.press('KeyB');await page.locator('[data-action="station-details"][data-index="1"]').click();await page.evaluate(async()=>{const g=window.__quietDistrict,{productionInfo}=await import('/src/game.js');g.state.elapsed=g.state.placed[1].harvested+productionInfo(g.state,g.state.placed[1]).interval+1;g.ui.renderPanel();});await page.locator('[data-action="harvest-station"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag.parts)).toBe(2);await page.keyboard.press('Escape');await page.keyboard.press('KeyB');await page.locator('[data-action="pack-furniture"][data-index="1"]').click();await page.locator('[data-action="unpack-furniture"][data-index="0"]').click();await dropAt(page,-16,23.5);expect(await page.evaluate(()=>window.__quietDistrict.state.placed.at(-1).id)).toBe('recycler');

 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="lamp"]').click();await dropAt(page,-16,22);expect(await page.evaluate(()=>window.__quietDistrict.world.windowGlazing.some(p=>p.mesh.material.emissiveIntensity>0))).toBe(true);
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="wallshelf"]').click();await dropAt(page,-18.895,24.5);expect(await page.evaluate(()=>window.__quietDistrict.state.placed.length)).toBe(4);
 const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const bed=g.world.placedGroups[0];let meshes=0;bed.group.traverse(m=>{if(m.isMesh)meshes++;});return {legal:g.state.placed.every((p,i)=>g.world.canPlace(p,i)),height:bed.group.position.y,meshes,door:!g.world.blocked(-18,25.5),roof:g.world.constructionRoofs.length};});expect(audit.legal&&audit.door).toBe(true);expect(audit.height).toBe(.205);expect(audit.meshes).toBeLessThanOrEqual(4);expect(audit.roof).toBeGreaterThan(0);
 await page.keyboard.press('KeyB');await page.locator('[data-action="toggle-furniture"][data-index="2"]').click();expect(await page.evaluate(()=>window.__quietDistrict.world.windowGlazing.every(p=>p.mesh.material.emissiveIntensity===0))).toBe(true);await page.keyboard.press('Escape');await page.evaluate(()=>window.__quietDistrict.save(false));const context=page.context();await page.close();const restored=await context.newPage();await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>window.__quietDistrict.state.placed.length)).toBe(4);expect(await restored.evaluate(()=>window.__quietDistrict.state.placed[0].z)).toBe(23.25);await restored.close();
});
test('Wall replacement and dismantling select the exact rendered part without extra material costs',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-20,z:22,construction:furnishedAnnex,stash:{wood:0,stone:0,metal:1,cloth:1}});await page.keyboard.press('KeyB');await page.locator('[data-action="architecture"]').click();await page.locator('[data-action="structure-select"][data-id="window"]').click();const p=await page.evaluate(()=>window.__quietDistrict.world.screenPosition(-16,1.5,25.5));await page.mouse.move(p.x,p.y);const chosen=await page.evaluate(()=>window.__quietDistrict.build.part);expect(chosen).toMatchObject({id:'window',x:-16,z:25.5,axis:'x'});await page.mouse.click(p.x,p.y);expect(await page.evaluate(()=>window.__quietDistrict.state.stash)).toMatchObject({wood:0,stone:1,metal:0,cloth:0});await page.keyboard.press('Escape');
 await page.keyboard.press('KeyB');await page.locator('[data-action="architecture"]').click();await page.locator('[data-action="structure-select"][data-id="dismantle"]').click();await page.mouse.move(p.x,p.y);expect(await page.evaluate(()=>window.__quietDistrict.build.part.id)).toBe('window');await page.mouse.click(p.x,p.y);expect(await page.evaluate(()=>window.__quietDistrict.state.construction.length)).toBe(13);expect(await page.evaluate(()=>window.__quietDistrict.world.constructionRoofs.length)).toBe(0);
});
test('Melee windup, retreat and cover produce one timed hit; effects reuse GPU buffers',async({page})=>{
 await start(page,{x:8,z:-3,owned:['spear','pistol'],ammo:3,equipment:{weapon:'spear'}});const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const e=g.world.enemies[0];e.x=8;e.z=-4;const original=e.health;g.attack(e);const windup=e.health===original;g.updateSwing(.1);const early=e.health===original;g.state.z=0;g.updateSwing(.2);const retreat=e.health===original;g.updateSwing(1);g.state.z=-3;g.attackCooldown=0;g.attack(e);const wall=g.world.collider(8,-3.5,2,.16);g.updateSwing(.3);const cover=e.health===original;wall.disabled=true;g.updateSwing(1);g.attackCooldown=0;g.attack(e);g.updateSwing(.3);const hit=e.health===original-25;const after=e.health;g.updateSwing(.3);const once=e.health===after;const geometry=g.world.debris.geometry,material=g.world.debris.material;for(let i=0;i<30;i++)g.world.enemyImpact(e,'spear');const pooled=g.world.debris.geometry===geometry&&g.world.debris.material===material&&g.world.debrisParticles.length<=128;g.world.updateHitEffects(1);return {windup,early,retreat,cover,hit,once,pooled,expired:g.world.debris.count===0};});expect(Object.values(audit).every(Boolean)).toBe(true);
});
