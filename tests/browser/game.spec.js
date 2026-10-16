import {AUDIO_FILES} from '../../src/audio-assets.js';
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.__errors = [];
  page.on('pageerror', error => page.__errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(page.__errors).toEqual([]); });

test('Whole machines travel in inventory, reload, store and yield one bonus at the workbench',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-56.7,z:37.4});await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Разбор техники');await expect(page.locator('[data-action="salvage-take"]')).toBeEnabled();await page.locator('[data-action="salvage-take"]').click();await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.cargo.length),{timeout:25000}).toBe(1);
 expect(await page.evaluate(()=>window.__quietDistrict.world.nodes[98].group.visible)).toBe(false);await page.keyboard.press('KeyI');await page.locator('[data-action="select-item"][data-id="cargo-0"]').click();await expect(page.locator('.item-details')).toContainText('Вес: 8');await expect(page.locator('.item-details .item-icon')).toHaveCount(1);await page.keyboard.press('Escape');await page.evaluate(()=>window.__quietDistrict.save());
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await restored.locator('[data-action="start"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.cargo.length)).toBe(1);await jump(restored,-20,14.5);await restored.keyboard.press('KeyI');await restored.locator('[data-action="storage"]').click();await restored.locator('[data-action="deposit"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.storedCargo.length)).toBe(1);await restored.locator('#storage-grid [data-id="cargo-0"]').click();await restored.locator('[data-action="salvage-workbench"]').click();await restored.locator('[data-action="process-salvage"]').click();await expect.poll(()=>restored.evaluate(()=>window.__quietDistrict.state.storedCargo.length),{timeout:60000}).toBe(0);expect(await restored.evaluate(()=>window.__quietDistrict.state.stash)).toMatchObject({metal:5,wire:3,parts:2});expect(await restored.evaluate(()=>window.__quietDistrict.state.storedCargo.length)).toBe(0);await expect(restored.locator('[data-action="process-salvage"]')).toHaveCount(0);}finally{await restored.close();}
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
 const audio=await page.evaluate(async()=>{const g=window.__quietDistrict;await g.audio.loading;g.visibilityPaused=true;const source=g.audio.musicSource;g.audio.setListener(10,10);const started=g.audio.playSample('impact_metal_medium_000',.35,1,{x:14,z:10});for(let i=0;i<40;i++)g.audio.step('wood');return {buffers:g.audio.buffers.size,failed:g.audio.failed||[],loop:source.loop,voices:g.audio.voices.size,started,wood:g.world.surfaceAt(-18,15),concrete:g.world.surfaceAt(0,0),grass:g.world.surfaceAt(-24,23)};});expect(audio).toMatchObject({buffers:AUDIO_FILES.length,failed:[],loop:true,started:true,wood:'wood',concrete:'concrete',grass:'grass'});expect(audio.voices).toBeLessThanOrEqual(16);
 await page.locator('[data-action="settings"]').first().click();await expect(page.locator('#panel')).toContainText('HorrorPen');await page.locator('[data-action="music"]').click();expect(await page.evaluate(()=>window.__quietDistrict.audio.musicTarget)).toBe(0);await page.locator('#music-volume').fill('0.8');expect(await page.evaluate(()=>window.__quietDistrict.state.settings.musicVolume)).toBe(.8);await page.locator('[data-action="music"]').click();expect(await page.evaluate(()=>window.__quietDistrict.audio.musicTarget)).toBeGreaterThan(0);await page.locator('#panel [data-action="sound"]').click();expect(await page.evaluate(()=>window.__quietDistrict.audio.playSample('chop'))).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quiet-district-save-v1')).settings.musicVolume)).toBe(.8);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('High quality culls distant cover, draws each shadow once and keeps reflections and colour output',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.setViewportSize({width:960,height:600});await start(page,{x:-18,z:23,owned:['generator']});
 const result=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;w.freezeBuildCamera=true;w.cameraCenter.set(-18,0,17);w.viewSize=28;w.resize();w.setQuality('high');const roof=w.buildings[0].roofMeshes[0];let shadows=0;roof.onBeforeShadow=()=>shadows++;w.mirrors.last=-Infinity;w.renderer.info.autoReset=false;w.renderer.info.reset();w.update(.016,false,true);const first=shadows,triangles=w.renderer.info.render.triangles;let cover=0,cells=0;w.scene.traverse(m=>{if(m.userData.groundCover){cover+=m.count;cells++;}});w.update(.02,false,true);w.renderer.info.autoReset=true;return {first,next:shadows-first,triangles,cover,cells,shadow:w.sun.shadow.mapSize.x,reflection:w.mirrors.capture.getRenderTarget().width,passes:w.composer.passes.length,ready:w.mirrors.last>0};});
 expect(result.first).toBe(1);expect(result.next).toBe(1);expect(result.triangles).toBeLessThan(160000);expect(result.cover).toBe(2300);expect(result.cells).toBeGreaterThan(2);expect(result.shadow).toBe(2048);expect(result.reflection).toBe(512);expect(result.passes).toBe(3);expect(result.ready).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:'/tmp/quiet-v16-render.png'});
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
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 90000 });
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
  expect(await page.evaluate(() => window.__quietDistrict.state.equipment.weapon)).toBe('pistol');await expect(page.locator('#equipped-ammo')).toHaveText('6');
  await page.locator('[data-category="supplies"]').click();
  await page.locator('[data-action="make"][data-id="ammo"]').click();
  expect(await page.evaluate(() => window.__quietDistrict.state.ammo)).toBe(18);
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
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 90000 });
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
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 90000 });
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
  await expect(page.locator('[data-action="start"]')).toBeEnabled({ timeout: 90000 });
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
  await start(page, { x: -19, z: 15, owned: ['generator', 'bridge', 'radio'], stash: { wood: 60, metal: 80, cloth: 20, parts: 40, wire: 30, pumpmodule:1,battery:1 }, elapsed: 130,
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
  expect(await page.evaluate(() => window.__quietDistrict.state.equipment.weapon)).toBe('pistol');await expect(page.locator('#equipped-ammo')).toHaveText('6');
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
    const resident=w.buildings.filter(b=>!b.id),count=resident.length,geometries=resident.map(b=>b.roofMeshes.length);
    g.state.x=13;g.state.z=4;w.updateRoofs(.1);
    const transition=b.roofMeshes[0].material.opacity;
    for(let i=0;i<60;i++)w.updateRoofs(1/60);
    const inside=b.roofMeshes[0].material.opacity, wall=b.wallMeshes[0].material.opacity;
    g.state.x=5;g.state.z=4;for(let i=0;i<60;i++)w.updateRoofs(1/60);
    return {glazing:w.buildings.find(b=>b.x===-42).roofMeshes.find(m=>m.material.userData.baseOpacity<1).material.opacity,count,geometries,transition,inside,wall,outside:b.roofMeshes[0].material.opacity,collision:before===w.blocked(8,4)};
  });
  expect(result.glazing).toBeCloseTo(.5);expect(result.count).toBe(61); expect(result.geometries.every(n=>n>=2)).toBe(true);
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
  test.setTimeout(300000);
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
    return {spawns:w.enemies.filter(e=>w.blocked(e.originX,e.originZ,.35)).map(e=>[e.id,e.originX,e.originZ]),repaired,savedProduction,legal,noLeakedLight,outsideDepth,insideDepth,entrances,before,bank,closed,inaccessible,free,door,solid,overlap,solar,lamp,nodeCount:w.nodes.length,roofCounts:w.buildings.map(b=>b.roofMeshes.length)};
  });
  expect(audit.entrances.every(e=>e.entry&&e.wall&&e.route)).toBe(true);
  expect(audit.before).toBe(false);expect(audit.bank).toBe(true);expect(audit.closed).toBe(true);
  expect(audit.inaccessible).toEqual([]);expect(audit.spawns).toEqual([]);
  expect(audit.free).toBe(true);expect(audit.door).toBe(false);expect(audit.solid).toBe(true);expect(audit.overlap).toBe(false);
  expect(audit.solar).toBeCloseTo(-.22);expect(audit.lamp).toEqual([-18,0,10.85]);
  expect(audit.repaired).toBe(1);expect(audit.savedProduction).toBe(321);expect(audit.legal).toBe(true);
  expect(audit.noLeakedLight).toBe(true);expect(audit.outsideDepth).toBe(true);expect(audit.insideDepth).toBe(true);
  expect(audit.nodeCount).toBe(207);expect(audit.roofCounts.length).toBe(44);expect(audit.roofCounts.every(n=>n>=2)).toBe(true);
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
 expect(await page.evaluate(()=>window.__quietDistrict.state.stews)).toBe(1);expect(await page.evaluate(()=>window.__quietDistrict.state.bag.vegetables)).toBe(2);
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
 expect(audit.rainy&&audit.under&&audit.outside&&audit.shelter&&audit.exposed&&audit.fish&&audit.water).toBe(true);expect(audit.buildings).toBe(44);expect(audit.gates).toBe(6);
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
 await page.locator('[data-action="make"][data-id="fishmeal"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.fishmeals)).toBe(2);
 expect(await page.evaluate(()=>{const g=window.__quietDistrict;g.make('pistol');return g.state.owned.includes('pistol');})).toBe(false);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:800});await page.keyboard.press('Escape');
 await jump(page,-22,21.8);await page.keyboard.press('KeyE');await page.locator('[data-action="save-loadout"][data-index="0"]').click();await page.evaluate(()=>{window.__quietDistrict.state.equipment.armor='armor';});await page.locator('[data-action="save-loadout"][data-index="1"]').click();await page.locator('[data-action="apply-loadout"][data-index="0"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe(null);await page.locator('[data-action="apply-loadout"][data-index="1"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment.armor)).toBe('armor');
 const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.save(false);return {legal:g.state.placed.every((p,i)=>g.world.canPlace(p,i)),hidden:g.world.nodes.filter(n=>['campstove','toolcabinet'].includes(n.find)).every(n=>!n.group.visible)};});expect(audit).toEqual({legal:true,hidden:true});
 const context=page.context();await page.close();const restored=await context.newPage();try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>window.__quietDistrict.state.placed.map(p=>p.id))).toEqual(['campstove','toolcabinet']);expect(await restored.evaluate(()=>window.__quietDistrict.state.fishmeals)).toBe(2);expect(await restored.evaluate(()=>window.__quietDistrict.world.nodes.filter(n=>['campstove','toolcabinet'].includes(n.find)).every(n=>!n.group.visible))).toBe(true);}finally{await restored.close();}
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
 test.setTimeout(180000);await start(page,{owned:['axe','pick'],x:-29,z:16});const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const tree=g.world.nodes.find(n=>n.machine==='standingtree'),stone=g.world.nodes.find(n=>n.machine==='quarry');g.state.bag={wood:25};g.harvest(tree);g.finishJob();const falling=!!tree.falling;g.world.updateResourceAnimations(1);const partial={broken:g.state.brokenNodes.includes(tree.id),standing:tree.group.userData.standing.visible,pile:tree.group.userData.shards.visible,disabled:tree.collider.disabled,left:{...tree.loot}};g.state.bag={};g.harvest(tree);g.finishJob();const stump=tree.stump.visible;g.state.bag={};g.harvest(stone);g.finishJob();const mined=g.state.bag.stone;g.state.elapsed+=241;g.state.x=-16;g.state.z=16;g.world.syncNodes();return {partial,stump,mined,regrown:tree.group.visible&&tree.group.userData.standing.visible&&!tree.collider.disabled,count:g.world.nodes.length,falling};});expect(audit.falling).toBe(true);expect(audit.partial.broken&&audit.partial.pile&&audit.partial.disabled).toBe(true);expect(audit.partial.standing).toBe(false);expect(audit.partial.left.wood).toBeGreaterThan(0);expect(audit.stump&&audit.regrown).toBe(true);expect(audit.mined).toBeGreaterThan(0);expect(audit.count).toBe(385);
});

const furnishedAnnex=[{id:'floor',x:-18,z:20.5},{id:'floor',x:-18,z:22.5},{id:'floor',x:-16,z:22.5},{id:'floor',x:-18,z:24.5},{id:'floor',x:-16,z:24.5},{id:'wall',x:-19,z:20.5,axis:'z'},{id:'window',x:-17,z:20.5,axis:'z'},{id:'wall',x:-19,z:22.5,axis:'z'},{id:'wall',x:-16,z:21.5,axis:'x'},{id:'window',x:-15,z:22.5,axis:'z'},{id:'wall',x:-19,z:24.5,axis:'z'},{id:'door',x:-18,z:25.5,axis:'x'},{id:'window',x:-15,z:24.5,axis:'z'},{id:'wall',x:-16,z:25.5,axis:'x'}];
test('Furnished annex places precisely, lights windows, attaches shelves and restores intact',async({page})=>{
 test.setTimeout(300000);await start(page,{x:-20,z:22,construction:furnishedAnnex,owned:['generator'],stash:{wood:100,metal:100,cloth:100,wire:100,stone:100,parts:100},storedFinds:{wallshelf:1}});
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="bed"]').click();await dropAt(page,-18,23.3);expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0].z)).toBe(23.3);
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="recycler"]').click();await dropAt(page,-16,23.5);await jump(page,-16,24.7);await page.keyboard.press('KeyB');await page.locator('[data-action="station-details"][data-index="1"]').click();await page.evaluate(async()=>{const g=window.__quietDistrict,{productionInfo}=await import('/src/game.js');g.state.elapsed=g.state.placed[1].harvested+productionInfo(g.state,g.state.placed[1]).interval+1;g.ui.renderPanel();});await page.locator('[data-action="harvest-station"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag.parts)).toBe(2);await page.keyboard.press('Escape');await page.keyboard.press('KeyB');await page.locator('[data-action="pack-furniture"][data-index="1"]').click();await page.locator('[data-action="unpack-furniture"][data-index="0"]').click();await dropAt(page,-16,23.5);expect(await page.evaluate(()=>window.__quietDistrict.state.placed.at(-1).id)).toBe('recycler');

 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="lamp"]').click();await dropAt(page,-16,22);expect(await page.evaluate(()=>window.__quietDistrict.world.windowGlazing.some(p=>p.mesh.material.emissiveIntensity>0))).toBe(true);
 await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="wallshelf"]').click();await dropAt(page,-18.895,24.5);expect(await page.evaluate(()=>window.__quietDistrict.state.placed.length)).toBe(4);
 const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const bed=g.world.placedGroups[0];let meshes=0;bed.group.traverse(m=>{if(m.isMesh)meshes++;});return {legal:g.state.placed.every((p,i)=>g.world.canPlace(p,i)),height:bed.group.position.y,meshes,door:!g.world.blocked(-18,25.5),roof:g.world.constructionRoofs.length};});expect(audit.legal&&audit.door).toBe(true);expect(audit.height).toBe(.205);expect(audit.meshes).toBeLessThanOrEqual(4);expect(audit.roof).toBeGreaterThan(0);
 await page.keyboard.press('KeyB');await page.locator('[data-action="toggle-furniture"][data-index="2"]').click();expect(await page.evaluate(()=>window.__quietDistrict.world.windowGlazing.every(p=>p.mesh.material.emissiveIntensity===0))).toBe(true);await page.keyboard.press('Escape');await page.evaluate(()=>window.__quietDistrict.save(false));const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>window.__quietDistrict.state.placed.length)).toBe(4);expect(await restored.evaluate(()=>window.__quietDistrict.state.placed[0].z)).toBe(23.3);await restored.close();
});
test('Wall replacement and dismantling select the exact rendered part without extra material costs',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-20,z:22,construction:furnishedAnnex,stash:{wood:0,stone:0,metal:1,cloth:1}});await page.keyboard.press('KeyB');await page.locator('[data-action="architecture"]').click();await page.locator('[data-action="structure-select"][data-id="window"]').click();const p=await page.evaluate(()=>window.__quietDistrict.world.screenPosition(-16,1.5,25.5));await page.mouse.move(p.x,p.y);const chosen=await page.evaluate(()=>window.__quietDistrict.build.part);expect(chosen).toMatchObject({id:'window',x:-16,z:25.5,axis:'x'});await page.mouse.click(p.x,p.y);expect(await page.evaluate(()=>window.__quietDistrict.state.stash)).toMatchObject({wood:0,stone:1,metal:0,cloth:0});await page.keyboard.press('Escape');
 await page.keyboard.press('KeyB');await page.locator('[data-action="architecture"]').click();await page.locator('[data-action="structure-select"][data-id="dismantle"]').click();await page.mouse.move(p.x,p.y);expect(await page.evaluate(()=>window.__quietDistrict.build.part.id)).toBe('window');await page.mouse.click(p.x,p.y);expect(await page.evaluate(()=>window.__quietDistrict.state.construction.length)).toBe(13);expect(await page.evaluate(()=>window.__quietDistrict.world.constructionRoofs.length)).toBe(0);
});
test('Melee windup, retreat and cover produce one timed hit; effects reuse GPU buffers',async({page})=>{
 await start(page,{x:8,z:-3,owned:['spear','pistol'],ammo:3,equipment:{weapon:'spear'}});const audit=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;const e=g.world.enemies[0];e.x=8;e.z=-4;const original=e.health;g.attack(e);const windup=e.health===original;g.updateSwing(.1);const early=e.health===original;g.state.z=0;g.updateSwing(.2);const retreat=e.health===original;g.updateSwing(1);g.state.z=-3;g.attackCooldown=0;g.attack(e);const wall=g.world.collider(8,-3.5,2,.16);g.updateSwing(.3);const cover=e.health===original;wall.disabled=true;g.updateSwing(1);g.attackCooldown=0;g.attack(e);g.updateSwing(.3);const hit=e.health===original-25;const after=e.health;g.updateSwing(.3);const once=e.health===after;const geometry=g.world.debris.geometry,material=g.world.debris.material;for(let i=0;i<30;i++)g.world.enemyImpact(e,'spear');const pooled=g.world.debris.geometry===geometry&&g.world.debris.material===material&&g.world.debrisParticles.length<=128;g.world.updateHitEffects(1);return {windup,early,retreat,cover,hit,once,pooled,expired:g.world.debris.count===0};});expect(Object.values(audit).every(Boolean)).toBe(true);
});


test('Frontier quarters connect to home, expose real interiors, save exploration and zoomed map clicks stay accurate',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-84,z:16,owned:['bridge','wrench','cutter'],openedGates:['yard','salvage']});
 const audit=await page.evaluate(async()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const {QUARTERS,FRONTIER_BUILDINGS}=await import('/src/frontier.js'),{discover}=await import('/src/district.js');const quarters=QUARTERS.map(q=>{g.state.x=-18;g.state.z=23;const route=w.pathTo(q.x,q.z);g.state.x=q.x;g.state.z=q.z;discover(g.state,w.nodes);return route.length>0&&!w.blocked(q.x,q.z);});const rooms=FRONTIER_BUILDINGS.map(b=>{g.state.x=b.x;g.state.z=b.z;const room=w.buildings.find(r=>r.x===b.x&&r.z===b.z);w.updateRoofs(1);const inside=room.roofMeshes.every(m=>m.material.opacity<.04),legal=!w.blocked(b.x,b.z),wall=w.blocked(b.x-b.w/2,b.z);g.state.z=b.z+b.d/2+3;w.updateRoofs(1);return inside&&legal&&wall&&room.roofMeshes.every(m=>Math.abs(m.material.opacity-(m.material.userData.baseOpacity??1))<.01);});g.state.x=-84;g.state.z=16;g.save(false);return {quarters,rooms,visited:g.state.visited,shore:!w.blocked(104,-20),water:w.blocked(110,-20)};});expect(audit.quarters).toEqual(Array(6).fill(true));expect(audit.rooms).toEqual(Array(24).fill(true));expect(audit.shore&&audit.water).toBe(true);expect(audit.visited).toEqual(expect.arrayContaining(['railquarter','campus','portquarter','orchardquarter','village','retailquarter']));
 await page.keyboard.press('KeyM');for(const id of ['railquarter','campus','portquarter','orchardquarter','village','retailquarter'])await expect(page.locator(`[data-action="travel"][data-id="${id}"]`)).toHaveCount(1);await page.locator('[data-action="map-zoom"][data-delta=".5"]').click();expect(await page.evaluate(()=>window.__quietDistrict.ui.mapZoom)).toBe(1.5);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1280,height:800});const mapBox=await page.locator('#large-map').boundingBox();await page.locator('#large-map').click({position:{x:mapBox.width*.5,y:mapBox.height*.6}});const route=await page.evaluate(()=>{const g=window.__quietDistrict;return {length:g.path.length,last:g.path.at(-1),save:JSON.parse(localStorage.getItem('quiet-district-save-v1')).visited};});expect(route.length).toBeGreaterThan(5);expect(route.last.x).toBeCloseTo(-84);expect(route.last.z).toBeGreaterThan(25);expect(route.save).toEqual(expect.arrayContaining(audit.visited));
});

test('New station gear and storage rack craft through UI; timed dismantling cancels without consuming cargo',async({page})=>{
 test.setTimeout(240000);await start(page,{x:-20,z:14.5,owned:['generator','bag','bag2','boots'],stash:{wood:100,metal:100,cloth:100,wire:100,parts:100,battery:5},cargo:[{machine:'motor',node:'node-125',loot:{metal:3,parts:2,battery:1}}]});
 await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=true;});await page.keyboard.press('KeyC');await page.locator('[data-category="gear"]').click();await page.locator('[data-action="make"][data-id="trailpack"]').click();await page.locator('[data-action="make"][data-id="quietboots"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.equipment)).toMatchObject({bag:'trailpack',boots:'quietboots'});await page.locator('[data-category="shelter"]').click();await page.locator('[data-action="make"][data-id="precisionbench"]').click();expect(await page.evaluate(()=>window.__quietDistrict.world.precisionTool.visible)).toBe(true);
 await page.locator('[data-action="salvage-workbench"]').click();await expect(page.locator('[data-action="process-salvage"]')).toContainText('1.6');await page.locator('[data-action="process-salvage"]').click();expect(await page.evaluate(()=>window.__quietDistrict.job.type)).toBe('process-salvage');await page.keyboard.down('KeyW');await page.evaluate(()=>window.__quietDistrict.movement(.05));await page.keyboard.up('KeyW');expect(await page.evaluate(()=>window.__quietDistrict.job)).toBe(null);expect(await page.evaluate(()=>window.__quietDistrict.state.cargo.length)).toBe(1);await jump(page,-20,14.5);const before=await page.evaluate(()=>({...window.__quietDistrict.state.stash}));await page.keyboard.press('KeyC');await page.locator('[data-action="salvage-workbench"]').click();await page.locator('[data-action="process-salvage"]').click();await page.evaluate(()=>{const g=window.__quietDistrict;g.job.elapsed=g.job.duration;g.finishJob();});expect(await page.evaluate(()=>window.__quietDistrict.state.stash.parts)).toBe(before.parts+6);expect(await page.evaluate(()=>window.__quietDistrict.state.stash.battery)).toBe(before.battery+1);await expect(page.locator('[data-action="process-salvage"]')).toHaveCount(0);await page.keyboard.press('Escape');await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="cargorack"]').click();await dropAt(page,-16,12);await page.keyboard.press('KeyI');await page.locator('[data-action="storage"]').click();await expect(page.locator('#panel')).toContainText('/ 16 мест');
});

test('Distant patrols sleep without pathfinding and the harbor opens the existing fishing flow',async({page})=>{
 await start(page,{x:104,z:-20,owned:['rod'],settings:{sound:false,quality:'low'}});const audit=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const far=w.enemies.find(e=>Math.hypot(e.x-g.state.x,e.z-g.state.z)>40),before={x:far.x,z:far.z,routeAt:far.routeAt};for(let i=0;i<120;i++){g.state.elapsed+=.05;g.updateEnemies(.05);}return {slept:far.x===before.x&&far.z===before.z&&far.routeAt===before.routeAt,count:w.enemies.length};});expect(audit.slept).toBe(true);expect(audit.count).toBe(26);await page.keyboard.press('KeyE');await page.locator('[data-action="bait-menu"]').click();await expect(page.locator('#panel')).toContainText('Промышленная набережная');await page.locator('[data-action="cast-selected"]').click();expect(await page.evaluate(()=>window.__quietDistrict.fish.spot)).toBe('harbor');
});


test('Quarter papers are physically readable, remain in the journal and save without adding objectives',async({page})=>{
 await start(page,{x:-67.3,z:1.4});await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=true;});await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Тетрадь школьного завхоза');expect(await page.evaluate(()=>window.__quietDistrict.state.notes)).toContain('frontier-campus');await page.keyboard.press('Escape');await page.keyboard.press('KeyJ');await expect(page.locator('#panel')).toContainText('Тетрадь школьного завхоза');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quiet-district-save-v1')).notes)).toContain('frontier-campus');
});

test('Discovered seeds unlock existing garden choices and each full harvest returns planting stock',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-17,z:21.8,cultivars:['herbs'],stash:{seeds:2,water:4},placed:[{id:'cropbed',x:-17,z:23,rotation:0,harvested:0,crop:null,plantedAt:null}]});
 await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=true;});await page.keyboard.press('KeyE');
 await expect(page.locator('[data-action="plant-crop"][data-id="vegetables"]')).toBeDisabled();await expect(page.locator('#panel')).toContainText('огородах и садах');await page.keyboard.press('Escape');
 const discovered=await page.evaluate(()=>{const g=window.__quietDistrict,n=g.world.nodes.find(n=>n.name==='Уцелевшие посадки');g.harvest(n);g.finishJob();return {cultivars:g.state.cultivars,seeds:g.state.bag.seeds};});expect(discovered).toEqual({cultivars:['herbs','vegetables'],seeds:2});
 await page.keyboard.press('KeyE');await page.locator('[data-action="plant-crop"][data-id="vegetables"]').click();await expect(page.locator('#panel')).toContainText('семена после сбора: 2');await page.keyboard.press('Escape');
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.elapsed=g.state.placed[0].plantedAt+181;});await page.keyboard.press('KeyE');await page.locator('[data-action="harvest-bed"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag)).toMatchObject({vegetables:4,seeds:4});
 await expect(page.locator('[data-action="plant-crop"][data-id="vegetables"]')).toBeEnabled();await expect(page.locator('[data-action="plant-crop"][data-id="flowers"]')).toBeDisabled();await page.screenshot({path:'/tmp/quiet-v18-garden.png'});
});

test('Prepared dishes cook, replace one effect, use the hotbar and retain their game-time timer after reload',async({page})=>{
 test.setTimeout(240000);await start(page,{x:-20,z:21.8,elapsed:100,stash:{fish:2,vegetables:4,wood:1,water:1,herbs:1},placed:[{id:'campstove',x:-20,z:23,rotation:0,harvested:0}]});
 await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=true;});await page.keyboard.press('KeyE');await expect(page.locator('.recipe-card')).toHaveCount(4);await expect(page.locator('#panel')).toContainText('на 30% меньше');
 await page.locator('[data-action="make"][data-id="fishmeal"]').click();await page.locator('[data-action="make"][data-id="stew"]').click();await page.keyboard.press('Escape');await page.keyboard.press('KeyI');
 await page.locator('[data-action="select-item"][data-id="fishmeal"]').click();await page.locator('[data-action="use-fishmeal"]').click();await expect(page.locator('.food-summary')).toContainText('Сытость · 8:00');await expect(page.locator('[data-action="use-fishmeal"]')).toBeDisabled();
 await page.locator('[data-action="select-item"][data-id="stew"]').click();await expect(page.locator('.item-details')).toContainText('Заменит: Сытость');await page.locator('[data-action="use-stew"]').click();await expect(page.locator('.food-summary')).toContainText('Бодрость');
 await page.locator('[data-action="inventory-tab"][data-view="hotbar"]').click();await page.locator('[data-action="hotbar-edit-slot"][data-index="4"]').click();await page.locator('[data-action="hotbar-assign"][data-id="fishmeal"]').click();await page.keyboard.press('Escape');await page.keyboard.press('Digit5');
 expect(await page.evaluate(()=>{const s=window.__quietDistrict.state;return {id:s.foodEffect.id,remaining:s.foodEffect.until-s.elapsed};})).toEqual({id:'fishmeal',remaining:480});expect(await page.evaluate(()=>window.__quietDistrict.state.fishmeals)).toBe(0);
 await expect(page.locator('.food-status')).toHaveAttribute('aria-label',/Сытость/);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/quiet-v18-mobile.png'});
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.elapsed=g.state.foodEffect.until-360;g.save();});const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});expect(await restored.evaluate(()=>{const s=window.__quietDistrict.state;return {remaining:s.foodEffect.until-s.elapsed,fishmeals:s.fishmeals,stews:s.stews,slot:s.hotbar[4]};})).toEqual({remaining:360,fishmeals:0,stews:0,slot:'fishmeal'});await restored.locator('[data-action="start"]').click();await restored.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;g.state.elapsed=g.state.foodEffect.until+1;g.ui.update();});await expect(restored.locator('.food-status')).toHaveCount(0);}finally{await restored.close();}
});

test('Orchard routes are walkable, hedge blocks patrol sight, supplies remain reachable and roofs restore',async({page})=>{
 test.setTimeout(180000);await start(page,{x:-63,z:-75,owned:['wrench'],cultivars:['herbs']});
 const audit=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;
  const {ORCHARD_ROUTES,ORCHARD_COVER}=await import('/src/orchard.js'),{FRONTIER_BUILDINGS}=await import('/src/frontier.js');
  const samples=route=>route.slice(1).flatMap((b,i)=>{const a=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);return Array.from({length:steps+1},(_,n)=>({x:a.x+(b.x-a.x)*n/steps,z:a.z+(b.z-a.z)*n/steps}));});
  const routes=Object.fromEntries(Object.entries(ORCHARD_ROUTES).map(([id,r])=>[id,samples(r).filter(p=>w.blocked(p.x,p.z,.32))]));
  const e=w.enemies.find(e=>e.id==='drone-13'),cover=!w.canSee(e.x,e.z,-80,-69.5),direct=w.canSee(e.x,e.z,-75,-75);
  const buildings=FRONTIER_BUILDINGS.filter(b=>b.style==='orchard'),rooms=buildings.map(b=>{const room=w.buildings.find(r=>r.x===b.x&&r.z===b.z);g.state.x=b.x;g.state.z=b.z;w.updateRoofs(1);const faded=room.roofMeshes.every(m=>m.material.opacity<.04);g.state.z=b.z+b.d/2+2;w.updateRoofs(1);return {name:b.sign,center:!w.blocked(b.x,b.z),faded,restored:room.roofMeshes.every(m=>Math.abs(m.material.opacity-(m.material.userData.baseOpacity??1))<.01)};});
  const loot=w.nodes.filter(n=>buildings.some(b=>Math.abs(n.x-b.x)<b.w/2&&Math.abs(n.z-b.z)<b.d/2));
  const unreachable=loot.filter(n=>{g.state.x=-63;g.state.z=-75;for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=n.x+Math.sin(a)*1.4,z=n.z+Math.cos(a)*1.4;if(w.blocked(x,z,.32)||!w.canSee(x,z,n.x,n.z,n.collider,true))continue;const route=w.pathTo(x,z);if(route.length&&Math.hypot(route.at(-1).x-n.x,route.at(-1).z-n.z)<2)return false;}return true;}).map(n=>n.name);
  return {routes,cover,direct,rooms,unreachable,loot:loot.length,backDoor:!w.blocked(-73,-67),oldIds:w.nodes[206].id,newIds:w.nodes.slice(207,210).map(n=>n.id),coverSolid:w.blocked(ORCHARD_COVER.x,ORCHARD_COVER.z)};
 });
 expect(audit.routes).toEqual({direct:[],quiet:[]});expect(audit.cover&&audit.direct&&audit.coverSolid&&audit.backDoor).toBe(true);expect(audit.rooms.every(r=>r.center&&r.faded&&r.restored)).toBe(true);expect(audit.unreachable).toEqual([]);expect(audit.loot).toBe(15);expect(audit.oldIds).toBe('node-206');expect(audit.newIds).toEqual(['node-207','node-208','node-209']);
 await jump(page,-92.3,-65.1);await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Бирка садового насоса');expect(await page.evaluate(()=>window.__quietDistrict.state.notes)).toContain('orchard-repair');await page.keyboard.press('Escape');
 await jump(page,-71.2,-60.5);await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=false;});await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>window.__quietDistrict.state.finds.desklamp||0),{timeout:30000}).toBe(1);expect(await page.evaluate(()=>window.__quietDistrict.world.nodes[207].group.visible)).toBe(false);await page.evaluate(()=>window.__quietDistrict.save());
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('quiet-district-save-v1')).findClaims)).toContain('node-207');
});

test('Garden patrol cannot see through the hedge, walks without clipping and house passage works from both sides',async({page})=>{
 await start(page,{x:-80,z:-72,elapsed:50,depleted:{'node-206':40},findClaims:['node-46']});const audit=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world,e=w.enemies.find(e=>e.id==='drone-13');const relocated=!w.blocked(g.state.x,g.state.z)&&Math.hypot(g.state.x+80,g.state.z+72)<=2;g.state.x=-80;g.state.z=-69.5;g.visibilityPaused=true;Object.assign(e,{x:e.originX,z:e.originZ,alert:0,suspicion:0,lastSeen:null,windup:0,cooldown:0,patrolIndex:0,route:null,routeAt:-Infinity,stagger:0});let clipped=false,alerted=false;for(let i=0;i<320;i++){g.state.elapsed+=.05;g.updateEnemies(.05);clipped ||=w.blocked(e.x,e.z,.34);alerted ||=e.alert>0;}const patrolMoved=Math.hypot(e.x-e.originX,e.z-e.originZ)>.5;
 g.state.x=e.x+.8;g.state.z=e.z;g.updateEnemies(.1);const streetAlert=e.alert>0;g.state.x=-80;g.state.z=-69.5;for(let i=0;i<90;i++){g.state.elapsed+=.05;g.updateEnemies(.05);}const lost=e.alert===0;
 g.state.x=-73;g.state.z=-69;const through=w.pathTo(-73,-58),backDoor=through.some(p=>p.z===-67&&Math.abs(p.x+73)<.9),frontDoor=through.some(p=>p.z===-59&&Math.abs(p.x+73)<.9),surfaces=[w.surfaceAt(-80,-69.5),w.surfaceAt(-73,-63),w.surfaceAt(-80,-75)];return {relocated,legacy:!w.nodes[206].group.visible&&g.state.findClaims.includes('node-46'),clipped,alerted,patrolMoved,streetAlert,lost,backDoor,frontDoor,surfaces};});
 expect(audit).toEqual({relocated:true,legacy:true,clipped:false,alerted:false,patrolMoved:true,streetAlert:true,lost:true,backDoor:true,frontDoor:true,surfaces:['grass','wood','concrete']});
});

test('Forest expansion connects every clearing and cabin, keeps all loot reachable and lake water blocks off-dock movement',async({page})=>{
 test.setTimeout(240000);await start(page,{owned:['bridge','axe','pick','wrench','cutter','rod'],openedGates:['yard','salvage','garage-path','pump-path']});
 const audit=await page.evaluate(async()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const {OUTLAND_PLACES,OUTLAND_BUILDINGS,OUTLAND_PATHS,OUTLAND_SUPPLIES,OUTLAND_RESOURCE_SITES,OUTLAND_FINDS,FOREST_LAKE}=await import('/src/outlands.js');
  const route=(x,z)=>{g.state.x=-18;g.state.z=23;const r=w.pathTo(x,z);return r.length>0&&r.every(p=>!w.blocked(p.x,p.z));};
  const clearings=OUTLAND_PLACES.map(l=>({id:l.id,route:route(l.x,l.z)}));
  const houses=OUTLAND_BUILDINGS.map(b=>{const room=w.buildings.find(r=>r.x===b.x&&r.z===b.z);const reachable=route(b.x,b.z);g.state.x=b.x;g.state.z=b.z;w.updateRoofs(1);const faded=room.roofMeshes.every(m=>m.material.opacity<.04);g.state.z=b.z+b.d/2+3;w.updateRoofs(1);return {id:b.id,reachable,faded,restored:room.roofMeshes.every(m=>Math.abs(m.material.opacity-(m.material.userData.baseOpacity??1))<.01)};});
  const nodes=w.nodes.slice(210,370),unreachable=nodes.filter(n=>{g.state.x=-18;g.state.z=23;for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=n.x+Math.sin(a)*1.5,z=n.z+Math.cos(a)*1.5;if(w.blocked(x,z)||!w.canSee(x,z,n.x,n.z,n.collider,true))continue;const r=w.pathTo(x,z);if(r.length&&Math.hypot(r.at(-1).x-n.x,r.at(-1).z-n.z)<2.1)return false;}return true;}).map(n=>n.name);
  const {overlaps}=await import('/src/layout.js');const findClips=nodes.filter(n=>n.find&&w.colliders.some(c=>c!==n.collider&&!c.disabled&&overlaps(n.collider,c,-.03))).map(n=>n.name);
  const roadClips=OUTLAND_PATHS.filter(p=>w.buildings.some(b=>Math.abs(p.x-b.x)<(p.w+b.w)/2+.17&&Math.abs(p.z-b.z)<(p.d+b.d)/2+.17));
  const dock=Array.from({length:11},(_,i)=>!w.blocked(94+i,164)),water=w.blocked(115,164)&&w.blocked(104,168)&&w.blocked(132,160);
  return {clearings,houses,unreachable,findClips,roadClips,dock,water,nodeCount:w.nodes.length,resources:OUTLAND_RESOURCE_SITES.length,old:w.nodes[209].id,patrols:w.enemies.length,grass:w.scene.children.filter(m=>m.userData.groundCover).reduce((n,m)=>n+m.count,0)};
 });expect(audit.clearings.every(l=>l.route)).toBe(true);expect(audit.houses.every(b=>b.reachable&&b.faded&&b.restored)).toBe(true);expect(audit.unreachable).toEqual([]);expect(audit.findClips).toEqual([]);expect(audit.roadClips).toEqual([]);expect(audit.dock.every(Boolean)&&audit.water).toBe(true);expect(audit.nodeCount).toBe(385);expect(audit.resources).toBe(121);expect(audit.old).toBe('node-209');expect(audit.patrols).toBe(26);expect(audit.grass).toBe(2300);
 await jump(page,104,164);await page.keyboard.press('KeyE');await page.locator('[data-action="bait-menu"]').click();await expect(page.locator('#panel')).toContainText('Лесное озеро');await page.keyboard.press('Escape');await jump(page,-24,118.7);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.job.type)).toBe('gate');const opening=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world,before=w.blocked(-24,120);g.finishJob();return {before,after:w.blocked(-24,120),wing:w.blocked(-29,120),saved:JSON.parse(localStorage.getItem('quiet-district-save-v1')).openedGates.includes('forest-cut')};});expect(opening).toEqual({before:true,after:false,wing:true,saved:true});
});

test('Settled roofs stop material writes and still react to interiors, separate canopies and new roof pieces',async({page})=>{
 await start(page);const audit=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;g.state.x=-73;g.state.z=-75;w.updateRoofs(3);const b=w.buildings.find(b=>b.x===-73&&b.z===-87),canopy=b.roofMeshes.find(m=>m.userData.canopyBounds),m=b.roofMeshes.find(m=>!m.userData.canopyBounds).material;let writes=0,opacity=m.opacity;Object.defineProperty(m,'opacity',{get:()=>opacity,set:v=>{writes++;opacity=v;},configurable:true});for(let i=0;i<20;i++)w.updateRoofs(.016);const skipped=writes===0;g.state.x=-73;g.state.z=-80.8;w.updateRoofs(2);const awning=canopy.material.opacity===.035&&m.opacity===1;g.state.z=-87;w.updateRoofs(2);const inside=m.opacity===.035&&m.transparent;g.state.z=-75;w.updateRoofs(2);const added=w.cutawayDetail(w.box(b.x,b.h+.1,b.z,.2,.2,.2,'#a09873'),b,true);added.material.opacity=.3;w.updateRoofs(2);return {appended:added.material.opacity===1&&!added.material.transparent,skipped,awning,inside,restored:m.opacity===1&&!m.transparent,emptyTrees:w.scene.children.filter(g=>g.userData.staticTree&&!g.children.length).length};});expect(audit).toEqual({appended:true,skipped:true,awning:true,inside:true,restored:true,emptyTrees:0});
});

test('Forest supplies travel home, upgrade the collector and dryer, and nursery flowers can be planted',async({page})=>{
 test.setTimeout(180000);
 await start(page,{stash:{metal:14,cloth:4},cultivars:['herbs'],placed:[{id:'raincatcher',x:-13,z:23,harvested:0,rainWater:0},{id:'dryrack',x:-17,z:23,harvested:0},{id:'cropbed',x:-21,z:23,crop:null,plantedAt:null,harvested:0}]});
 for(const name of ['аккумулятор и ремонтные детали','запасной насос и детали','фильтры поливной системы','семена цветов']){
  const approach=await page.evaluate(name=>{const g=window.__quietDistrict,w=g.world,n=w.nodes.find(n=>n.name.endsWith(name));if(!n)throw Error(name);g.path=[];g.motion.reset();
   for(let a=0;a<Math.PI*2;a+=Math.PI/12){const x=n.x+Math.sin(a)*1.3,z=n.z+Math.cos(a)*1.3;if(w.blocked(x,z)||!w.canSee(x,z,n.x,n.z,n.collider,true))continue;g.state.x=x;g.state.z=z;w.move(x,z);if(g.nearestInteraction()?.entity===n)return n.id;}throw Error('Unreachable '+name);
  },name);
  await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(id=>window.__quietDistrict.state.depleted[id]!==undefined,approach),{timeout:15000}).toBe(true);
 }
 expect(await page.evaluate(()=>window.__quietDistrict.state.cultivars)).toEqual(['herbs','flowers']);
 await jump(page,-18,18);await page.keyboard.press('KeyI');await page.locator('[data-action="storage"]').click();await page.locator('[data-action="deposit"]').click();await page.keyboard.press('Escape');
 for(const index of [0,1]){
  await jump(page,index===0?-13:-17,21.7);await page.keyboard.press('KeyB');await page.locator(`[data-action="station-details"][data-index="${index}"]`).click();
  await page.locator(`[data-action="upgrade-station"][data-index="${index}"]`).click();await expect(page.locator('#panel')).toContainText('установлено');await page.keyboard.press('Escape');
 }
 await jump(page,-21,21.7);await page.keyboard.press('KeyE');await page.locator('[data-action="plant-crop"][data-id="flowers"]').click();await expect(page.locator('#panel')).toContainText('Полевые цветы');
 const saved=await page.evaluate(()=>{const g=window.__quietDistrict;g.save();const s=JSON.parse(localStorage.getItem('quiet-district-save-v1'));return {upgrades:s.placed.slice(0,2).map(p=>p.upgrade),crop:s.placed[2].crop,cultivars:s.cultivars,battery:s.stash.battery,pump:s.stash.pumpmodule,filters:s.stash.filterunit};});
 expect(saved).toEqual({upgrades:[1,1],crop:'flowers',cultivars:['herbs','flowers'],battery:0,pump:0,filters:0});
});

test('Static scenery skips world matrix products with identical transforms and moving actors stay live',async({page})=>{
 await start(page,{x:-80,z:-72});
 const audit=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const meshes=[];w.scene.traverse(m=>{if(m.userData.staticBatch)meshes.push(m);});let products=0;const originals=meshes.map(m=>m.matrixWorld.multiplyMatrices),matrices=meshes.map(m=>m.matrixWorld.toArray());
  meshes.forEach((m,i)=>{m.matrixWorld.multiplyMatrices=function(...args){products++;return originals[i].apply(this,args);};});
  const count=enabled=>{meshes.forEach(m=>m.matrixWorldAutoUpdate=enabled);products=0;w.scene.updateMatrixWorld(true);return products;};
  const baselineProducts=count(true),frozenProducts=count(false);const same=meshes.every((m,i)=>m.matrixWorld.toArray().every((v,j)=>v===matrices[i][j]));meshes.forEach((m,i)=>m.matrixWorld.multiplyMatrices=originals[i]);
  // Timings exclude instrumentation, shader work and pixel rendering.
  const measure=enabled=>{meshes.forEach(m=>m.matrixWorldAutoUpdate=enabled);for(let i=0;i<20;i++)w.scene.updateMatrixWorld(true);const samples=[];for(let j=0;j<7;j++){const t=performance.now();for(let i=0;i<50;i++)w.scene.updateMatrixWorld(true);samples.push((performance.now()-t)/50);}return samples.sort((a,b)=>a-b)[3];};
  const baseline={products:baselineProducts,median:measure(true)},frozen={products:frozenProducts,median:measure(false)};
  const enemy=w.enemies[0],before=enemy.group.matrixWorld.elements[12];enemy.x+=1;w.update(.016,false,true);w.scene.updateMatrixWorld(true);
  return {meshes:meshes.length,baseline,frozen,same,actorMoves:enemy.group.matrixWorld.elements[12]!==before,shadow:w.sun.shadow.mapSize.x,reflection:w.mirrors.capture.getRenderTarget().width};
 });console.log('Static transform comparison',JSON.stringify(audit));expect(audit.meshes).toBeGreaterThan(0); // Nonempty coverage; batching intentionally reduces the object count.
 expect(audit.baseline.products).toBe(audit.meshes);expect(audit.frozen.products).toBe(0);expect(audit.same&&audit.actorMoves).toBe(true);
});

test('Placement explains a blocked doorway and furniture moves at ten centimetres with rotation',async({page})=>{
 test.setTimeout(180000);await start(page,{stash:{wood:30,herbs:10}});await page.keyboard.press('KeyB');await page.locator('[data-action="make"][data-id="planter"]').click();
 const aim=async(x,z)=>{const p=await page.evaluate(({x,z})=>window.__quietDistrict.world.screenPosition(x,0,z),{x,z});await page.mouse.move(p.x,p.y);};
 await aim(-18,19.5);await expect(page.locator('#build-hint')).toContainText('дверь');const before=await page.evaluate(()=>({...window.__quietDistrict.state.stash}));await page.mouse.down();await page.mouse.up();
 expect(await page.evaluate(()=>window.__quietDistrict.state.placed.length)).toBe(0);expect(await page.evaluate(()=>window.__quietDistrict.state.stash)).toEqual(before);
 await aim(-16.3,12.2);await expect(page.locator('#build-hint')).toContainText('Нажми');await page.keyboard.press('KeyR');expect(await page.evaluate(()=>window.__quietDistrict.build.rotation)).toBeCloseTo(Math.PI/2);
 const point=await page.evaluate(()=>({x:window.__quietDistrict.build.x,z:window.__quietDistrict.build.z}));expect(point).toEqual({x:-16.3,z:12.2});await aim(-16.3,12.2);await page.mouse.down();await page.mouse.up();
 const item=await page.evaluate(()=>window.__quietDistrict.state.placed.at(-1));expect(item).toMatchObject({id:'planter',x:-16.3,z:12.2,rotation:Math.PI/2});expect(await page.evaluate(()=>window.__quietDistrict.world.canPlace(window.__quietDistrict.state.placed[0],0))).toBe(true);
 await page.keyboard.press('KeyB');await page.locator('[data-action="move-furniture"][data-index="0"]').click();await aim(-16.1,12.4);await expect(page.locator('#build-hint')).toContainText('Нажми');await page.mouse.down();await page.mouse.up();expect(await page.evaluate(()=>window.__quietDistrict.state.placed[0])).toMatchObject({x:-16.1,z:12.4});
});

test('Harvest contacts finish on the last strike, piles collect without chopping and cancellation gives no stone',async({page})=>{
 test.setTimeout(180000);await start(page,{owned:['axe','pick'],x:-29,z:16,bag:{wood:25},settings:{sound:true,quality:'low'}});
 const decoded=await page.evaluate(async()=>{const g=window.__quietDistrict;g.visibilityPaused=true;await g.audio.loadSamples();g.harvestLog=[];const hit=g.audio.resourceHit.bind(g.audio);g.audio.resourceHit=(kind,x,z,final)=>{g.harvestLog.push({kind,final:!!final,time:g.job?.elapsed});return hit(kind,x,z,final);};return {failed:g.audio.failed||[],durations:['impact_wood_heavy_000','impact_wood_heavy_001','impact_mining_003','impact_mining_004'].map(id=>g.audio.buffers.get(id)?.duration)};});expect(decoded.failed).toEqual([]);expect(decoded.durations.every(d=>d>0)).toBe(true);
 await page.keyboard.press('KeyE');const tree=await page.evaluate(()=>{const g=window.__quietDistrict,j=g.job,n=j.node;g.visibilityPaused=false;while(g.job&&j.elapsed+.05<j.duration)g.tick(.05);const before={wood:g.state.bag.wood,final:g.harvestLog.filter(h=>h.final).length,visible:n.group.visible};g.tick(.051);g.visibilityPaused=true;const after={broken:g.state.brokenNodes.includes(n.id),final:g.harvestLog.filter(h=>h.final).length,time:g.harvestLog.at(-1).time,duration:j.duration};g.state.bag={};g.harvest(n);const pile={work:g.job.resourceWork,duration:g.job.duration};g.visibilityPaused=false;g.tick(.66);g.visibilityPaused=true;g.world.updateResourceAnimations(1);return {before,after,pile,finals:g.harvestLog.filter(h=>h.final).length,wood:g.state.bag.wood};});
 expect(tree.before).toEqual({wood:25,final:0,visible:true});expect(tree.after.broken).toBe(true);expect(tree.after.final).toBe(1);expect(tree.after.time).toBeGreaterThanOrEqual(tree.after.duration);expect(tree.pile).toEqual({work:false,duration:.65});expect(tree.finals).toBe(1);expect(tree.wood).toBeGreaterThan(0);
 await jump(page,-31,7.5);await page.evaluate(()=>{window.__quietDistrict.state.bag={};});await page.keyboard.press('KeyE');const stone=await page.evaluate(()=>{const g=window.__quietDistrict,n=g.job.node;g.visibilityPaused=false;g.tick(.3);g.cancelAction();const canceled={loot:g.state.bag.stone||0,visible:n.group.visible,final:g.harvestLog.filter(h=>h.kind==='quarry'&&h.final).length};g.harvest(n);while(g.job)g.tick(.05);g.visibilityPaused=true;return {canceled,loot:g.state.bag.stone,final:g.harvestLog.filter(h=>h.kind==='quarry'&&h.final).length};});expect(stone.canceled).toEqual({loot:0,visible:true,final:0});expect(stone.loot).toBeGreaterThan(0);expect(stone.final).toBe(1);
});

test('Static shadow batches reduce garden draws with matching pixels and independent roofs and resources',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:960,height:600});await start(page,{x:-80,z:-72});
 const result=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;w.freezeBuildCamera=true;w.setQuality('high');w.cameraCenter.set(-78,0,-74);w.viewSize=36;w.resize();w.updateRoofs(3);const gl=w.renderer.getContext();w.renderer.info.autoReset=false;
  const render=enabled=>{for(const b of w.staticShadows){b.mesh.castShadow=enabled;b.sources.forEach(m=>m.castShadow=!enabled);}w.mirrors.last=-Infinity;w.renderer.info.reset();w.update(0,false,true);gl.finish();const pixels=new Uint8Array(960*600*4);gl.readPixels(0,0,960,600,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return {calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,pixels};};
  render(false);const baseline=render(false);render(true);const optimized=render(true);let sum=0,changed=0;for(let i=0;i<optimized.pixels.length;i++){const d=Math.abs(optimized.pixels[i]-baseline.pixels[i]);sum+=d;if(d)changed++;}const sources=new Set(w.staticShadows.flatMap(b=>b.sources));return {baseline:{calls:baseline.calls,triangles:baseline.triangles},optimized:{calls:optimized.calls,triangles:optimized.triangles},meanDifference:sum/optimized.pixels.length,changed,batches:w.staticShadows.length,sources:sources.size,independent:w.buildings.every(b=>[...b.roofMeshes,...b.wallMeshes].every(m=>!sources.has(m)))&&w.nodes.every(n=>!sources.has(n.group)),shadow:w.sun.shadow.mapSize.x,reflection:w.mirrors.capture.getRenderTarget().width};
 });console.log('Garden shadow comparison',JSON.stringify(result));expect(result.batches).toBeGreaterThan(0);expect(result.baseline.calls-result.optimized.calls).toBeGreaterThan(100);expect(result.meanDifference).toBeLessThan(.25);expect(result.independent).toBe(true);expect(result.shadow).toBe(2048);expect(result.reflection).toBe(512);await page.screenshot({path:'/tmp/quiet-v202-garden.png'});
});

test('Manual map notes and retained resources work through UI, save and distant routes remain clear',async({page})=>{
 test.setTimeout(240000);
 await start(page,{bag:{wood:3,metal:4},meals:2,medkits:3,owned:['axe','pick','bridge'],openedGates:['yard','salvage','garage-path','pump-path']});
 await page.keyboard.press('KeyI');await page.locator('#inventory-grid [data-id="wood"]').click();
 await page.locator('[data-action="keep-resource"]').click();await expect(page.locator('[data-action="keep-resource"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="storage"]').click();await page.locator('[data-action="deposit"]').click();
 expect(await page.evaluate(()=>{const s=window.__quietDistrict.state;return {bag:s.bag,meals:s.meals,medkits:s.medkits};})).toEqual({bag:{wood:3},meals:2,medkits:3});
 await page.keyboard.press('Escape');await page.keyboard.press('KeyM');await page.locator('[data-action="map-mark-mode"]').click();
 await page.locator('#map-mark-label').fill('Запас у озера <дом>');
 const canvas=page.locator('#large-map'),rect=await canvas.boundingBox();
 await canvas.click({position:{x:rect.width*(104/420+.5),y:rect.height*(164/420+.5)}});
 await expect(page.locator('[data-action="map-go"]')).toContainText('Запас у озера <дом>');await expect(page.locator('#map-mark-label')).toHaveCount(0);
 await page.locator('[data-action="map-mark-mode"]').click();await page.locator('#map-mark-label').fill('Лишняя');await canvas.click({position:{x:rect.width*.3,y:rect.height*.4}});
 await page.locator('[data-action="map-remove"]').last().click();await expect(page.locator('[data-action="map-go"]')).toHaveCount(1);
 const saved=await page.evaluate(()=>{const g=window.__quietDistrict;g.save();return JSON.parse(localStorage.getItem('quiet-district-save-v1'));});
 expect(saved.keepResources).toEqual(['wood']);expect(saved.mapMarks).toHaveLength(1);expect(saved.mapMarks[0].x).toBeCloseTo(104,0);expect(saved.mapMarks[0].z).toBeCloseTo(164,0);
 await page.locator('[data-action="map-go"]').click();await expect(page.locator('#panel')).toBeHidden();expect(await page.evaluate(()=>window.__quietDistrict.path.length)).toBeGreaterThan(0);
 const audit=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;g.path=[];g.motion.reset();
  const {OUTLAND_WAYMARKS,OUTLAND_PATHS,OUTLAND_PLACES}=await import('/src/outlands.js');
  const legs=[];
  const walk=(x,z)=>{
   g.navigate(x,z,false);if(!g.path.length)throw Error('Route unavailable');let steps=0;
   while(g.path.length&&steps<20000){g.movement(1/60);steps++;}
   if(g.path.length||Math.hypot(g.state.x-x,g.state.z-z)>1)throw Error('Route stopped before arrival '+JSON.stringify({x:g.state.x,z:g.state.z,to:{x,z}}));
   legs.push(steps);g.motion.reset();
  };
  walk(104,164);const supply=w.nodes.find(n=>n.name.startsWith('дом у озера')&&n.loot.fish);
  walk(supply.x,supply.z+1.3);g.beginNode(supply);if(!g.job)throw Error('Cannot collect lake supplies');g.finishJob();
  walk(-18,23);g.action('deposit',{});const {craft}=await import('/src/game.js');const cooked=craft(g.state,'meal').ok;g.save();
  const signs=OUTLAND_WAYMARKS.map(s=>({post:w.blocked(s.x,s.z),offRoad:!OUTLAND_PATHS.some(r=>Math.abs(s.x-r.x)<r.w/2+.4&&Math.abs(s.z-r.z)<r.d/2+.4)}));
  const routes=OUTLAND_PLACES.map(p=>{g.state.x=-18;g.state.z=23;const path=w.pathTo(p.x,p.z);return {id:p.id,clear:path.length>0&&path.every(n=>!w.blocked(n.x,n.z))};});
  return {signs,routes,legs,cooked};
 });expect(audit.cooked).toBe(true);expect(audit.legs).toHaveLength(3);expect(audit.signs.every(s=>s.post&&s.offRoad)).toBe(true);expect(audit.routes.every(r=>r.clear)).toBe(true);
 // A new page has no start() init script: restore the real saved progress.
 const context=page.context();await page.close();const restored=await context.newPage();await restored.goto('/');
 await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:60000});await restored.locator('[data-action="start"]').click();
 expect(await restored.evaluate(()=>window.__quietDistrict.state.mapMarks)).toEqual(saved.mapMarks);
 expect(await restored.evaluate(()=>window.__quietDistrict.state.keepResources)).toEqual(['wood']);
 await restored.keyboard.press('KeyM');await expect(restored.locator('[data-action="map-go"]')).toContainText('Запас у озера <дом>');
 await restored.setViewportSize({width:390,height:844});await expect(restored.locator('[data-action="map-remove"]')).toBeVisible();
 expect(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await restored.close();
});

test('Ready robot enemies telegraph distinct attacks, respect cover, sleep at distance and retain death records',async({page})=>{
 test.setTimeout(240000);await start(page,{owned:['axe','pick'],elapsed:20});
 const audit=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;
  const roles=['runner','warden','gunner'].map(kind=>({kind,count:w.enemies.filter(e=>e.kind===kind).length}));
  const models=Object.keys(w.assets),far=w.enemies.filter(e=>['runner','warden','gunner'].includes(e.kind));let animations=0,pathCalls=0;
  const oldWaypoint=w.enemyWaypoint;w.enemyWaypoint=function(...args){pathCalls++;return oldWaypoint.apply(this,args);};
  const oldMixers=far.filter(e=>e.mixer).map(e=>[e.mixer,e.mixer.update]);for(const [m,update] of oldMixers)m.update=function(...args){animations++;return update.apply(this,args);};
  for(let i=0;i<10;i++)g.updateEnemies(1/60);w.update(.016,false,true);
  for(const [m,update] of oldMixers)m.update=update;w.enemyWaypoint=oldWaypoint;
  const slept=far.every(e=>e.x===e.originX&&e.z===e.originZ)&&animations===0;
  const inside=w.enemies.find(e=>e.kind==='warden');g.state.x=-170;g.state.z=8;Object.assign(inside,{x:-170,z:8,windup:.4,attack:{x:-170,z:8,kind:'slam',phase:'windup'}});w.update(.016,false,true);const warningAboveFloor=inside.warning.visible&&inside.warning.position.y>.19;inside.attack=null;inside.windup=0;
  for(const e of w.enemies){e.health=0;e.deadAt=g.state.elapsed;}
  const reset=(kind,z)=>{for(const b of g.enemyBolts||[])w.scene.remove(b.mesh);g.enemyBolts=[];for(const e of w.enemies)e.health=0;
   const e=w.enemies.find(e=>e.kind===kind);Object.assign(e,{x:0,z:0,originX:0,originZ:0,health:e.maxHealth,facing:0,alert:3,suspicion:1,cooldown:0,windup:0,attack:null,stagger:0,lastSeen:{x:0,z},route:null,routeAt:-Infinity,courseAt:undefined});
   g.state.x=0;g.state.z=z;g.state.health=100;g.state.stamina=100;g.keys.clear();g.motion.reset();g.path=[];return e;};
  const steps=(n,move=false)=>{for(let i=0;i<n;i++){g.state.elapsed+=1/60;if(move)g.movement(1/60);g.updateEnemies(1/60);}};
  let e=reset('warden',2);steps(20);const aim={x:e.attack.x,z:e.attack.z};g.keys.add('KeyD');steps(60,true);g.keys.clear();const slamDodge=g.state.health===100&&Math.hypot(g.state.x-aim.x,g.state.z-aim.z)>1.35;
  e=reset('warden',2);steps(75);const slamHit=g.state.health===81;
  e=reset('warden',2);steps(20);g.damageEnemy(e,{id:'pipe',damage:13});const interrupt=e.attack===null&&e.windup===0;
  e=reset('runner',2.4);steps(80);const dashHit=g.state.health===90;
  e=reset('runner',2.4);steps(20);const wall=w.collider(0,1.1,3,.2);steps(65);const dashWall=g.state.health===100&&e.z<.8;wall.disabled=true;
  e=reset('gunner',6);steps(65);const fired=g.enemyBolts.length===1;g.keys.add('KeyD');steps(58,true);g.keys.clear();const shotDodge=g.state.health===100;
  e=reset('gunner',6);steps(65);steps(35);const shotHit=g.state.health===88;
  e=reset('gunner',6);steps(30);const cover=w.collider(0,3,3,.2);steps(80);const shotWall=g.state.health===100;cover.disabled=true;
  e=reset('warden',2);g.state.bag={wood:26};g.damageEnemy(e,{id:'pistol',damage:1000});const dead=e.id;
  g.save();return {roles,models,slept,animations,warningAboveFloor,slamDodge,slamHit,interrupt,dashHit,dashWall,fired,shotDodge,shotHit,shotWall,dead,drop:g.state.drops.at(-1),death:g.state.droneDeaths[dead],time:g.state.elapsed};
 });
 console.log('New enemy audit',JSON.stringify(audit));expect(audit.roles).toEqual([{kind:'runner',count:3},{kind:'warden',count:2},{kind:'gunner',count:3}]);expect(audit.models).toEqual(expect.arrayContaining(['runner','warden']));
 for(const id of ['slept','warningAboveFloor','slamDodge','slamHit','interrupt','dashHit','dashWall','fired','shotDodge','shotHit','shotWall'])expect(audit[id],id).toBe(true);
 expect(audit.drop.loot).toEqual({metal:4,parts:2});expect(audit.death).toBe(audit.time);
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));await restored.goto('/');
 await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:60000});await restored.locator('[data-action="start"]').click();
 expect(await restored.evaluate(id=>window.__quietDistrict.world.enemies.find(e=>e.id===id).health,audit.dead)).toBe(0);
 expect(await restored.evaluate(()=>window.__quietDistrict.state.drops.at(-1).loot)).toEqual({metal:4,parts:2});await restored.close();
});

test('Developed forestry, quarry and dacha bypasses support a full expedition and useful home upgrades',async({page})=>{
 test.setTimeout(240000);await start(page,{owned:['axe','pick'],stash:{metal:2,cloth:4},placed:[{id:'dryrack',x:-17,z:23,harvested:0}]});
 const audit=await page.evaluate(async()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const legs=[],collected=[];let steps=0,minHealth=100;
  const walk=(x,z)=>{g.navigate(x,z,false);if(!g.path.length&&Math.hypot(g.state.x-x,g.state.z-z)>1)throw Error('No path');let n=0;
   while(g.path.length&&n<20000){g.state.elapsed+=1/60;g.movement(1/60);g.updateEnemies(1/60);minHealth=Math.min(minHealth,g.state.health);n++;}
   if(g.path.length||Math.hypot(g.state.x-x,g.state.z-z)>1)throw Error('Expedition stopped '+JSON.stringify({x:g.state.x,z:g.state.z,to:{x,z}}));
   legs.push({x,z,steps:n});steps+=n;g.motion.reset();};
  const visit=(points)=>points.forEach(([x,z])=>walk(x,z));
  const take=(name)=>{const node=w.nodes.find(n=>n.name===name);if(!node)throw Error(name);
   let stand;for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=node.x+Math.sin(a)*1.3,z=node.z+Math.cos(a)*1.3;if(!w.blocked(x,z)&&w.canSee(x,z,node.x,node.z,node.collider,true)){stand={x,z};break;}}
   if(!stand)throw Error('No approach');walk(stand.x,stand.z);g.beginNode(node);if(!g.job)throw Error('Cannot gather '+name);
   for(let i=0;i<Math.ceil(g.job.duration*60);i++){g.state.elapsed+=1/60;g.updateEnemies(1/60);}g.finishJob();collected.push(node.name);
  };
  visit([[-155,6],[-155,-4],[-184,-4],[-184,40]]);take('дровяной сарай · кладовая');
  visit([[-184,52],[-155,104],[-184,104],[-184,126],[-174,126]]);take('ремонт инструмента · аккумулятор и ремонтные детали');
  visit([[-184,126],[-184,156],[-148,156],[-78,138],[-78,156],[-62,160]]);take('дом с синими рамами · кладовая');
  visit([[-78,166],[-78,194],[-35,194],[-35,185]]);take('дачная кухня · кладовая');
  const loot={...g.state.bag};visit([[-35,194],[-78,194],[-78,138],[-21,23],[-19.5,14]]);g.action('deposit',{});g.make('bag');
  const {upgradeStation}=await import('/src/game.js');walk(-17,21.7);const upgrade=upgradeStation(g.state,g.state.placed[0]);g.save();
  const {capacity}=await import('/src/game.js');return {steps,seconds:g.state.elapsed,minHealth,dead:!!g.state.grave,legs:legs.length,collected,loot,bag:g.state.equipment.bag,capacity:capacity(g.state),upgrade:upgrade.ok,dryer:g.state.placed[0].upgrade};
 });console.log('Three region expedition',JSON.stringify(audit));expect(audit.dead).toBe(false);expect(audit.minHealth).toBeGreaterThan(0);expect(audit.collected).toHaveLength(4);expect(audit.bag).toBe('bag');expect(audit.capacity).toBe(40);expect(audit.upgrade).toBe(true);expect(audit.dryer).toBe(1);expect(audit.loot.battery).toBe(1);expect(audit.loot.cloth).toBe(8);
});

test('Melee contact can be intercepted, hits once, and gives a temporary body reaction',async({page})=>{
 await start(page,{x:8,z:-3});
 const result=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;
  for(const e of w.enemies)e.health=0;
  const [original,other]=w.enemies;Object.assign(original,{x:8,z:-5,health:100});
  g.attack(original);Object.assign(other,{x:8.1,z:-4,health:100});g.updateSwing(.21);
  const intercepted=original.health===100&&other.health===87;
  other.facing=Math.PI/2;w.facing=0;w.update(.04,false,true);const lean=w.cameraCenter.clone().set(0,1,0).applyQuaternion(other.group.quaternion),length=Math.hypot(lean.x,lean.z);const aligned=(lean.x*Math.sin(other.hitBearing)+lean.z*Math.cos(other.hitBearing))/length>.999;const facing=Math.cos(w.playerVisual.rotation.y-Math.PI)>.999;const reacted=Math.abs(other.group.rotation.x)+Math.abs(other.group.rotation.z)>.01;
  g.updateSwing(1);const once=other.health===87;w.update(.3,false,true);
  const settled=Math.abs(other.group.rotation.x)+Math.abs(other.group.rotation.z)<1e-8;
  original.health=0;other.health=0;g.attackCooldown=0;w.facing=Math.PI;g.attack();
  Object.assign(other,{x:8,z:-4,health:100});g.updateSwing(.21);const entered=other.health===87;
  return {intercepted,reacted,once,settled,entered,facing,aligned};
 });expect(result).toEqual({intercepted:true,reacted:true,once:true,settled:true,entered:true,facing:true,aligned:true});
});

test('Reflection scissors preserve every final pixel and never clip the main image',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:960,height:600});await start(page,{x:0,z:17,elapsed:210});
 const results=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;w.freezeBuildCamera=true;w.setQuality('high');
  const gl=w.renderer.getContext(),target=w.mirrors.capture.getRenderTarget(),set=target.scissor.set,results=[];
  for(const [x,z,zoom]of [[0,17,28],[104,164,28],[-80,-72,28],[0,17,52]]){
   g.state.x=x;g.state.z=z;w.cameraCenter.set(x,0,z);w.viewSize=zoom;w.resize();
   const render=full=>{target.scissor.set=full?function(){return set.call(this,0,0,target.width,target.height);}:set;w.mirrors.last=-Infinity;w.update(0,false,true);const pixels=new Uint8Array(960*600*4);gl.readPixels(0,0,960,600,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
   render(true);const a=render(true);render(false);const b=render(false);let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
   results.push({changed,area:target.scissor.z*target.scissor.w/(512*512),mainScissor:gl.isEnabled(gl.SCISSOR_TEST),shadow:w.sun.shadow.mapSize.x,reflection:target.width});
  }
  target.scissor.set=set;return results;
 });for(const r of results){expect(r.changed).toBe(0);expect(r.mainScissor).toBe(false);expect(r.shadow).toBe(2048);expect(r.reflection).toBe(512);}expect(results[0].area).toBeLessThan(.9);
});

test('Rain shelter cache preserves drop positions and refreshes after movement or a new roof index',async({page})=>{
 await start(page,{elapsed:210});const result=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const shelter=w.sheltered;let calls=0;w.sheltered=function(...args){calls++;return shelter.apply(this,args);};
  const update=()=>w.updateRain(0,{rain:1});w.rainShelterX=NaN;update();const first=calls;const positions=Array.from(w.rain.geometry.attributes.position.array);update();const stationary=calls===first;const same=positions.every((n,i)=>n===w.rain.geometry.attributes.position.array[i]);
  g.state.x+=.25;update();const moved=calls===first*2;const index=w.rainShelterMask.findIndex(n=>!n),[dx,dz]=w.rainSeeds[index];
  const replacement=new w.shelterIndex.constructor();for(const rect of new Set([...w.shelterIndex.cells.values()].flat()))replacement.add(rect,.25);replacement.add({x:g.state.x+dx,z:g.state.z+dz,w:2,d:2});w.shelterIndex=replacement;update();const rebuilt=calls===first*3;
  const p=w.rain.geometry.attributes.position,hidden=p.getX(index*2)===p.getX(index*2+1)&&p.getY(index*2)===p.getY(index*2+1)&&p.getZ(index*2)===p.getZ(index*2+1);
  const cached=Array.from(p.array);w.rainShelterX=NaN;update();const equivalent=cached.every((n,i)=>n===p.array[i]);w.sheltered=shelter;
  return {first,stationary,same,moved,rebuilt,hidden,equivalent};
 });expect(result).toEqual({first:240,stationary:true,same:true,moved:true,rebuilt:true,hidden:true,equivalent:true});
});

test('Workshop expedition supplies post-radio utilities and a faster dryer through walking, real loot and station UI',async({page})=>{
 test.setTimeout(240000);await start(page,{x:-19,z:14,owned:['generator','bridge','radio','axe','pick','wrench','spear','bag','bag2'],equipment:{weapon:'spear',bag:'bag2'},medkits:3,stash:{wood:30,metal:60,parts:30,wire:30,cloth:20,fish:4,herbs:2},placed:[{id:'garden',x:-12,z:23,harvested:0},{id:'dryrack',x:-20,z:23,harvested:0}]});
 const trip=await page.evaluate(async()=>{
  const {productionInfo}=await import('/src/game.js');
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=false;let ticks=0,legs=0;const gathered=[];
  const step=()=>{if(g.state.health<55&&g.state.medkits)g.action('use-medkit');const e=w.enemies.find(e=>e.health>0&&e.alert>0&&Math.hypot(e.x-g.state.x,e.z-g.state.z)<2.8&&w.canSee(g.state.x,g.state.z,e.x,e.z));if(e&&!g.job)g.attack(e);g.tick(1/60);ticks++;if(g.state.grave)throw Error('Expedition died');};
  const go=(x,z)=>{g.target=null;g.navigate(x,z,false);if(!g.path.length&&Math.hypot(g.state.x-x,g.state.z-z)>1.5)throw Error('No route '+x+','+z);let n=0;while(g.path.length&&n++<50000)step();if(g.path.length||Math.hypot(g.state.x-x,g.state.z-z)>1.5)throw Error('Blocked leg '+x+','+z);g.motion.reset();legs++;};
  const take=(x,z,special)=>{const node=w.nodes.find(n=>Math.abs(n.x-x)<5&&Math.abs(n.z-z)<3&&n.originalLoot[special]);if(!node)throw Error('Missing component');let point;
   for(let a=0;a<Math.PI*2;a+=Math.PI/8){const px=Math.round(node.x+Math.sin(a)*1.5),pz=Math.round(node.z+Math.cos(a)*1.5);if(!w.blocked(px,pz)&&w.canSee(px,pz,node.x,node.z,node.collider,true)&&w.pathTo(px,pz).length){point={x:px,z:pz};break;}}
   if(!point)throw Error('No access to '+node.name);go(point.x,point.z);g.beginNode(node);if(g.ui.panel==='salvage')g.action('salvage-quick');if(!g.job)throw Error('No harvest '+node.name);let n=0;while(g.job&&n++<3000)step();if(g.job)throw Error('Job did not finish');gathered.push(node.name);
  };
  for(const [x,z]of [[-24,-120],[-16,-168],[12,-168]])go(x,z);take(12,-177,'battery');
  for(const [x,z]of [[12,-168],[80,-168],[167,-168],[167,-56],[167,58],[160,58]])go(x,z);take(153,48,'pumpmodule');
  for(const [x,z]of [[160,58],[167,-56],[86,-62],[75,-24]])go(x,z);take(75,-32,'battery');
  for(const [x,z]of [[75,-24],[62,-14],[62,49],[0,59],[-24,59],[-19,14]])go(x,z);
  g.action('deposit');g.make('pump');g.make('solar');const dryer=g.state.placed[1];let approach;
  for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=Math.round(dryer.x+Math.sin(a)*1.8),z=Math.round(dryer.z+Math.cos(a)*1.8);if(!w.blocked(x,z)&&Math.hypot(x-dryer.x,z-dryer.z)<2.8&&w.pathTo(x,z).length){approach={x,z};break;}}
  if(!approach)throw Error('No approach to installed dryer');go(approach.x,approach.z);g.visibilityPaused=true;
  return {legs,ticks,gathered,health:g.state.health,grave:!!g.state.grave,pump:g.state.owned.includes('pump'),solar:g.state.owned.includes('solar'),battery:g.state.stash.battery,pumpmodule:g.state.stash.pumpmodule,stationDistance:Math.hypot(g.state.x-dryer.x,g.state.z-dryer.z),gardenInterval:productionInfo(g.state,g.state.placed[0]).interval,lights:w.towerLight.intensity,roof:w.solarRoof.visible};
 });console.log('Post-radio expedition',JSON.stringify(trip));expect(trip.pump&&trip.solar&&trip.roof).toBe(true);expect(trip.grave).toBe(false);expect(trip.gathered).toHaveLength(3);expect(trip.battery).toBe(1);expect(trip.pumpmodule).toBe(0);expect(trip.lights).toBeGreaterThan(0);expect(trip.gardenInterval).toBe(50.625);expect(trip.stationDistance).toBeLessThan(3);
 await page.evaluate(()=>window.__quietDistrict.action('station-details',{index:1}));await page.locator('[data-action="upgrade-station"]').click();await expect(page.locator('#panel')).toContainText('75 секунд');await expect(page.locator('[data-action="load-dryer"]')).toBeEnabled();await page.locator('[data-action="load-dryer"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.placed[1].dryingDuration)).toBe(75);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<4501;i++)g.tick(1/60);g.visibilityPaused=true;g.action('station-details',{index:1});});await page.locator('[data-action="harvest-dryer"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.meals)).toBe(4);await page.keyboard.press('Escape');await page.evaluate(()=>window.__quietDistrict.save(false));
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:180000});const saved=await restored.evaluate(()=>window.__quietDistrict.state);expect(saved.owned).toEqual(expect.arrayContaining(['pump','solar']));expect(saved.placed[1].upgrade).toBe(1);expect(saved.meals).toBe(4);}finally{await restored.close();}
});

test('Static colour batches reduce city submissions while preserving roofs, all surfaces and reflections',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:960,height:600});await start(page,{x:0,z:17,elapsed:210,owned:['generator']});
 const result=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;w.freezeBuildCamera=true;w.setQuality('high');w.renderer.info.autoReset=false;const gl=w.renderer.getContext(),out=[];
  for(const [x,z]of [[0,17],[-19,17],[-160,120],[-170,8]]){
   g.state.x=x;g.state.z=z;w.cameraCenter.set(x,0,z);w.viewSize=28;w.resize();w.updateRoofs(3);
   const render=legacy=>{w.setLegacyStaticColours(legacy);w.mirrors.last=-Infinity;w.renderer.info.reset();w.update(0,false,true);const pixels=new Uint8Array(960*600*4);gl.readPixels(0,0,960,600,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return {pixels,calls:w.renderer.info.render.calls};};
   render(true);const a=render(true);render(false);const b=render(false);let changed=0,max=0;for(let i=0;i<a.pixels.length;i++){const d=Math.abs(a.pixels[i]-b.pixels[i]);if(d)changed++;max=Math.max(max,d);}
   out.push({changed,max,calls:[a.calls,b.calls],shadow:w.sun.shadow.mapSize.x,reflection:w.mirrors.capture.getRenderTarget().width});
  }return out;
 });console.log('Static colour render audit',JSON.stringify(result));for(const r of result){expect(r.max).toBeLessThanOrEqual(1);expect(r.changed).toBeLessThan(240);expect(r.shadow).toBe(2048);expect(r.reflection).toBe(512);}expect(result[0].calls[1]).toBeLessThan(result[0].calls[0]);expect(result[1].calls[1]).toBeLessThan(result[1].calls[0]);
});

test('Flood expedition repairs the boat, rows every channel, develops a local camp and restores a voyage',async({page})=>{
 test.setTimeout(420000);await start(page,{x:167,z:78,health:73,owned:['rod','axe','pick','carbine','bag2'],ammo:60,equipment:{weapon:'carbine',armor:null,bag:'bag2',boots:null},medkits:3});
 await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;g.__voyage={legs:0,steps:0};});
 const walk=async(x,z)=>{
  const result=await page.evaluate(({x,z})=>{const g=window.__quietDistrict;g.visibilityPaused=false;g.world.flood.update(true);g.navigate(x,z,false);let steps=0,hadRoute=g.path.length>0;
   for(;steps<14000&&g.path.length;steps++){if(!g.state.boat.aboard){if(g.state.health<45)g.action('use-medkit');const enemy=g.world.enemies.find(e=>e.health>0&&Math.hypot(e.x-g.state.x,e.z-g.state.z)<9&&g.world.canSee(g.state.x,g.state.z,e.x,e.z));if(enemy)g.attack(enemy);}g.tick(1/60);}
   g.visibilityPaused=true;g.world.flood.update(true);g.__voyage.legs++;g.__voyage.steps+=steps;return {hadRoute,steps,x:g.state.x,z:g.state.z,health:g.state.health,distance:Math.hypot(g.state.x-x,g.state.z-z),boat:g.state.boat.aboard,context:g.nearestInteraction()?.type};},{x,z});expect(result.hadRoute,JSON.stringify({goal:{x,z},result})).toBe(true);expect(result.distance).toBeLessThan(.6);expect(result.steps).toBeLessThan(14000);return result;
 };
 const loot=async(name,x,z)=>{await walk(x,z);const before=await page.evaluate(name=>{const g=window.__quietDistrict,n=g.world.nodes.find(n=>n.name===name);g.preferredInteraction='node:'+n.id;g.interactionLocked=true;return {id:n.id,nearest:g.nearestInteraction()?.entity?.id};},name);expect(before.nearest).toBe(before.id);await page.keyboard.press('KeyE');const result=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;let steps=0;for(;g.job&&steps<1500;steps++)g.tick(1/60);g.visibilityPaused=true;return {steps,bag:g.state.bag};});expect(result.steps).toBeGreaterThan(0);return result;};
 await loot('Доски и обшивка лодочной',213.5,65);await walk(234.8,78);await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Гребная лодка');await page.locator('[data-action="field-repair"][data-id="boat"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.boat.repaired)).toBe(true);await page.keyboard.press('Escape');await page.keyboard.press('KeyE');
 expect(await page.evaluate(()=>window.__quietDistrict.state.boat.aboard)).toBe(true);await expect(page.locator('#hotbar')).toContainText('Гребная лодка');
 // Actual keyboard steering and deceleration, with all water/bank collision checks active.
 const keyboard=await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;const x=g.state.x,z=g.state.z;g.keys.add('KeyD');for(let i=0;i<45;i++)g.tick(1/60);g.keys.clear();for(let i=0;i<60;i++)g.tick(1/60);g.visibilityPaused=true;return {distance:Math.hypot(g.state.x-x,g.state.z-z),boat:g.state.boat};});expect(keyboard.distance).toBeGreaterThan(1);
 await walk(254.4,70);await page.keyboard.press('KeyE');expect(await page.evaluate(()=>window.__quietDistrict.state.boat.aboard)).toBe(false);await loot('Сухие запасы стоянки',285.4,57);await loot('Провизия под навесом',290.6,57);await walk(288,59);await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Камышовая стоянка');await page.locator('[data-action="field-repair"][data-id="camp"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.camp.ready)).toBe(true);
 for(const id of ['wood','water','fish','herbs'])await page.locator(`[data-action="camp-transfer"][data-direction="deposit"][data-id="${id}"]`).click();
 const stocked=await page.evaluate(()=>{const g=window.__quietDistrict;return {camp:{...g.state.camp.store},stash:{...g.state.stash}};});expect(stocked.camp).toMatchObject({wood:3,water:3,fish:2,herbs:2});expect(stocked.stash).toEqual({wood:3,metal:2,cloth:2});
 for(const id of ['wood','fish','herbs'])await page.locator(`[data-action="camp-transfer"][data-direction="withdraw"][data-id="${id}"]`).click();await page.locator('[data-action="camp-cook"][data-id="meal"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.meals)).toBe(1);await page.locator('[data-action="camp-rest"]').click();await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<181;i++)g.tick(1/60);g.visibilityPaused=true;});expect(await page.evaluate(()=>window.__quietDistrict.state.health)).toBeGreaterThanOrEqual(80);
 await walk(257.2,70);await page.keyboard.press('KeyE');await walk(284,-21.4);await page.keyboard.press('KeyE');await loot('Ремонтный запас водоузла',277.4,-61);await walk(284,-24.2);await page.keyboard.press('KeyE');await walk(309.4,24);await page.keyboard.press('KeyE');await loot('Посылки на почте',335.4,5);await walk(312.2,24);await page.keyboard.press('KeyE');await walk(343,61.4);await page.keyboard.press('KeyE');await loot('Семена из теплицы',355.4,86);
 // Entered rooms retain real walls; their roof fades while scenery can unload/reload.
 const roof=await page.evaluate(()=>{const g=window.__quietDistrict,b=g.world.buildings.find(b=>b.id==='glasshouse');g.world.updateRoofs(1);return {inside:b.inside,roof:b.roofMeshes.map(m=>m.material.opacity),blocked:g.world.blocked(b.x-b.w/2,b.z),pump:g.state.bag.pumpmodule,visited:g.state.visited,chunks:g.world.flood.chunks.map(c=>[c.place.id,!!c.group])};});expect(roof.inside).toBe(true);expect(roof.roof.every(n=>n<.1)).toBe(true);expect(roof.blocked).toBe(true);expect(roof.pump).toBe(1);
 await walk(343,64.2);await page.keyboard.press('KeyE');await walk(310,59);const saved=await page.evaluate(()=>{const g=window.__quietDistrict;g.save();return {boat:g.state.boat,bag:g.state.bag,camp:g.state.camp,voyage:g.__voyage};});
 const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{
  await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await restored.locator('[data-action="start"]').click();const persisted=await restored.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;return {boat:g.state.boat,x:g.state.x,z:g.state.z,bag:g.state.bag,camp:g.state.camp};});expect(persisted.boat.aboard).toBe(true);expect(persisted.x).toBeCloseTo(saved.boat.x,3);expect(persisted.bag).toEqual(saved.bag);expect(persisted.camp).toEqual({ready:saved.camp.ready,store:Object.fromEntries(Object.entries(saved.camp.store).filter(([,n])=>n>0))});
  await restored.keyboard.press('KeyM');await restored.locator('[data-action="travel"][data-id="floodshore"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.path.length)).toBeGreaterThan(0);
  const returned=await restored.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;let steps=0;for(;steps<10000&&g.path.length;steps++)g.tick(1/60);g.landBoat();g.visibilityPaused=true;g.world.flood.update(true);return {steps,aboard:g.state.boat.aboard,x:g.state.x,z:g.state.z,blocked:g.world.blocked(g.state.x,g.state.z),chunks:g.world.flood.chunks.map(c=>[c.place.id,!!c.group])};});expect(returned.aboard).toBe(false);expect(returned.x).toBe(234.8);expect(returned.blocked).toBe(false);
  await restored.setViewportSize({width:390,height:844});await restored.keyboard.press('KeyM');expect(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(restored.locator('#panel')).toContainText('Камышовая стоянка');console.log('Flood voyage',JSON.stringify({saved,returned,roof,keyboard}));
 }finally{await restored.close();}
});

test('Flood streaming keeps collisions stable, releases island detail and retains high quality reflections',async({page})=>{
 test.setTimeout(300000);await start(page,{settings:{sound:false,quality:'high'}});await page.evaluate(()=>{window.__quietDistrict.visibilityPaused=true;});
 const streaming=await page.evaluate(()=>{
  const g=window.__quietDistrict,w=g.world,counts=()=>({colliders:w.colliders.length,buildings:w.buildings.length,index:[...w.collisionIndex.cells.values()].reduce((n,v)=>n+v.length,0),shelters:[...w.shelterIndex.cells.values()].reduce((n,v)=>n+v.length,0)}),base=counts();
  const channelUV=w.flood.waterSurface.geometry.attributes.uv,uvRange=Array.from(channelUV.array).every(n=>n>=0&&n<=1);w.flood.syncBoat(0,false);const waterTime=w.flood.waterSurface.material.uniforms.time.value===w.time;
  const homeChunks=w.flood.chunks.filter(c=>c.group).length,shared={materials:0,textures:0};w.assets['grass-small'].scene.traverse(m=>{if(!m.isMesh)return;m.material.addEventListener('dispose',()=>shared.materials++);m.material.map?.addEventListener('dispose',()=>shared.textures++);});
  const shellBefore=w.blocked(331,5),unreachable=w.pathTo(337,11),shellQueries=[...w.collisionIndex.query(330,4,332,6)].length;
  g.state.x=351;g.state.z=30;const frameSteps=[];for(let n=0;n<30;n++){const at=performance.now();w.flood.update();frameSteps.push(performance.now()-at);if(!w.flood.pending?.length)break;}const staged=w.flood.chunks.filter(c=>c.group).length;g.state.x=-19;g.state.z=14;w.flood.update(true);
  const times=[];for(let n=0;n<6;n++){g.state.x=351;g.state.z=30;let at=performance.now();w.flood.update(true);times.push(performance.now()-at);g.state.x=-19;g.state.z=14;w.flood.update(true);}
  const empty=w.flood.chunks.every(c=>!c.group),after=counts();
  g.state.x=288;g.state.z=59;w.player.position.set(288,.18,59);w.flood.update(true);w.updateRoofs(1);const room=w.buildings.find(b=>b.id==='camp'),inside=room.inside,roof=room.roofMeshes.map(m=>m.material.opacity),shellAfter=w.blocked(331,5);
  g.state.camp.ready=true;w.cameraCenter.set(288,0,59);w.freezeBuildCamera=true;w.renderer.info.autoReset=false;w.renderer.info.reset();w.update(1/60,false,true);w.renderer.info.autoReset=true;
  return {base,after,homeChunks,empty,shared,uvRange,waterTime,staged,stages:frameSteps.length,maxStepMs:Math.max(...frameSteps),unreachable:unreachable.length,shellBefore,shellAfter,shellQueries,inside,roof,loads:w.flood.loads,unloads:w.flood.unloads,maxLoadMs:Math.max(...times),shadow:w.sun.shadow.mapSize.x,reflection:w.reflection.getRenderTarget().width,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,models:Object.keys(w.assets),liveChunks:w.flood.chunks.filter(c=>c.group).map(c=>c.place.id)};
 });
 expect(streaming.uvRange&&streaming.waterTime).toBe(true);expect(streaming.staged).toBeGreaterThan(0);expect(streaming.stages).toBeGreaterThan(streaming.staged);expect(streaming.homeChunks).toBe(0);expect(streaming.empty).toBe(true);expect(streaming.after).toEqual(streaming.base);expect(streaming.shared).toEqual({materials:0,textures:0});expect(streaming.unreachable).toBe(0);expect(streaming.shellBefore&&streaming.shellAfter).toBe(true);expect(streaming.shellQueries).toBeGreaterThan(0);expect(streaming.inside).toBe(true);expect(streaming.roof.every(n=>n<.1)).toBe(true);expect(streaming.shadow).toBe(2048);expect(streaming.reflection).toBe(512);
 await page.screenshot({path:'/tmp/quiet-v230-camp.png'});
 await page.evaluate(()=>{const g=window.__quietDistrict;g.state.x=340;g.state.z=28;g.world.player.position.set(340,.18,28);g.world.flood.update(true);g.world.cameraCenter.set(345,0,15);g.world.update(1,false,true);});await page.screenshot({path:'/tmp/quiet-v230-homes.png'});
 await page.evaluate(()=>{const g=window.__quietDistrict;g.ui.open('camp');});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/quiet-v230-camp-mobile.png'});console.log('Flood streaming',JSON.stringify(streaming));
});

test('Island shore clicks reject disconnected walking routes before searching the old district',async({page})=>{
 test.setTimeout(150000);await start(page);const audit=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;g.visibilityPaused=true;const blocked=w.blocked;let probes=0;w.blocked=function(...args){probes++;return blocked.apply(this,args);};const path=w.pathTo(264,64);w.blocked=blocked;const boat=w.boatPathTo(286,64);return {probes,path:path.length,boat:boat.length,landing:boat.at(-1)};});expect(audit.path).toBe(0);expect(audit.probes).toBeLessThan(200);expect(audit.boat).toBeGreaterThan(0);expect(audit.landing).toEqual({x:254,z:70});console.log('Island route work',JSON.stringify(audit));
});

test('Restored crossings and drained hall agree with paths, collisions, loot and native saves',async({page})=>{
 test.setTimeout(300000);await start(page,{x:325,z:35,owned:['wrench','bag'],equipment:{weapon:'pipe',armor:null,bag:'bag',boots:null},bag:{wood:20,metal:6,parts:6,wire:6,pumpmodule:1},boat:{repaired:true,aboard:false,x:309.4,z:24,heading:0,lastDock:'floodhomes'}});
 await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=true;g.world.flood.update(true);});
 const audit=await page.evaluate(async()=>{const g=window.__quietDistrict,w=g.world,{ROADS,ROAD_SURFACES}=await import('/src/district.js'),{FLOOD_STREETS}=await import('/src/floodplain.js');const overlaps=[];for(const r of [...ROADS,...FLOOD_STREETS])for(const b of w.buildings.filter(b=>!b.roofOnly))if(Math.min(r.x+r.w/2,b.x+b.w/2)-Math.max(r.x-r.w/2,b.x-b.w/2)>.05&&Math.min(r.z+r.d/2,b.z+b.d/2)-Math.max(r.z-r.d/2,b.z-b.d/2)>.05)overlaps.push({r,b:{x:b.x,z:b.z}});return {overlaps,nodes:w.nodes.length,locked:w.nodes.slice(382).every(n=>!n.group.visible&&n.collider.disabled),water:w.blocked(301,40),foot:w.pathTo(301,49).length,surfaces:ROAD_SURFACES.length};});
 expect(audit.overlaps).toEqual([]);expect(audit.nodes).toBe(385);expect(audit.locked).toBe(true);expect(audit.water).toBe(true);expect(audit.foot).toBe(0);
 await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Мостки к стоянке');await expect(page.locator('#panel')).toContainText('Гаечный ключ'.toLowerCase());
 await page.locator('[data-action="start-restoration"]').click();expect(await page.evaluate(()=>window.__quietDistrict.state.bag.wood)).toBe(20);
 // Moving cancels without consuming the repair supplies.
 await page.evaluate(()=>{const g=window.__quietDistrict;g.keys.add('KeyS');g.movement(1/60);g.keys.clear();});expect(await page.evaluate(()=>window.__quietDistrict.job)).toBe(null);expect(await page.evaluate(()=>window.__quietDistrict.state.bag.wood)).toBe(20);
 await jump(page,325,35);await page.keyboard.press('KeyE');await page.locator('[data-action="start-restoration"]').click();await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<302;i++)g.tick(1/60);g.visibilityPaused=true;});expect(await page.evaluate(()=>window.__quietDistrict.state.restoredRoutes)).toEqual(['camp-crossing']);
 const walk=async(x,z)=>page.evaluate(({x,z})=>{const g=window.__quietDistrict;g.path=g.world.pathTo(x,z);if(!g.path.length)throw Error(`No path to ${x},${z}`);let ticks=0;while(g.path.length&&ticks++<15000)g.movement(1/60);if(Math.hypot(g.state.x-x,g.state.z-z)>1.5)throw Error(`Stuck at ${g.state.x},${g.state.z}`);g.world.flood.update(true);return {x:g.state.x,z:g.state.z};},{x,z});
 await walk(301,49);await walk(325,35);await jump(page,358,76);await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Мостки к садам');await page.locator('[data-action="start-restoration"]').click();await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<302;i++)g.tick(1/60);g.visibilityPaused=true;});await walk(358,41);await walk(358,76);
 await jump(page,278,-55.8);await page.evaluate(()=>window.__quietDistrict.world.flood.update(true));expect(await page.evaluate(()=>window.__quietDistrict.world.blocked(280,-71))).toBe(true);await page.keyboard.press('KeyE');await expect(page.locator('#panel')).toContainText('Осушить ремонтный зал');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'/tmp/v240-repair-mobile.png'});await page.setViewportSize({width:1280,height:800});
 await page.locator('[data-action="start-restoration"]').click();await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<482;i++)g.tick(1/60);g.visibilityPaused=true;});expect(await page.evaluate(()=>window.__quietDistrict.world.nodes.slice(382).every(n=>n.group.visible&&!n.collider.disabled))).toBe(true);await walk(280,-78);await walk(280,-71);await page.evaluate(()=>{const g=window.__quietDistrict;g.world.cameraCenter.set(280,0,-71);g.world.freezeBuildCamera=true;g.world.viewSize=23;g.world.resize();g.world.update(.016,false,true);});await page.screenshot({path:'/tmp/v240-workshop.png'});
 const roofs=await page.evaluate(()=>{const g=window.__quietDistrict,w=g.world;w.updateRoofs(1);return w.buildings.filter(b=>['servicehall','works-passage'].includes(b.id)).map(b=>({id:b.id,roof:b.roofMeshes.length,inside:b.inside}));});expect(roofs.find(r=>r.id==='servicehall')).toMatchObject({inside:true});expect(roofs.every(r=>r.roof>0)).toBe(true);
 await jump(page,277,-71.4);await page.keyboard.press('KeyE');await page.evaluate(()=>{const g=window.__quietDistrict;g.visibilityPaused=false;for(let i=0;i<302&&g.job;i++)g.tick(1/60);g.visibilityPaused=true;});expect(await page.evaluate(()=>window.__quietDistrict.state.bag.battery)).toBe(1);
 await page.evaluate(()=>window.__quietDistrict.save());const context=page.context();await page.close();const restored=await context.newPage();restored.on('pageerror',e=>page.__errors.push(e.message));try{await restored.goto('/');await expect(restored.locator('[data-action="start"]')).toBeEnabled({timeout:90000});await restored.locator('[data-action="start"]').click();expect(await restored.evaluate(()=>window.__quietDistrict.state.restoredRoutes)).toEqual(['camp-crossing','garden-crossing','drain-works']);expect(await restored.evaluate(()=>window.__quietDistrict.world.blocked(280,-68))).toBe(false);expect(await restored.evaluate(()=>window.__quietDistrict.state.bag.battery)).toBe(1);}finally{await restored.close();}
});
