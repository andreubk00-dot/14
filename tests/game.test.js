import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, validateSave, RECIPES, craft, craftStatus, collect, deposit, bagWeight, capacity, place, takeDamage, respawn, catchFish, useSupply, objective, CONTRACTS, deliverContract, contractStatus, productionInfo, harvestProduction, updateHelper } from '../src/game.js';

test('Crafting deducts combined stash and bag materials exactly once', () => {
  const s = freshState(); s.stash = { wood: 2, metal: 3 }; s.bag = { wood: 3, metal: 1 };
  const r = craft(s, 'axe'); assert.equal(r.ok, true);
  assert.equal(s.stash.wood, 0); assert.equal(s.bag.wood, 2);
  assert.equal(s.stash.metal, 0); assert.equal(s.bag.metal, 0);
  assert.equal(craft(s, 'axe').ok, false); assert.deepEqual(s.owned, ['axe']);
});
test('Insufficient material or missing prerequisites never consumes resources', () => {
  const s = freshState(), before = structuredClone(s);
  assert.equal(craft(s, 'carbine').ok, false); assert.deepEqual(s, before);
  assert.equal(craft(s, 'generator').ok, false); assert.deepEqual(s, before);
});
test('A full bag retains uncollected loot and never exceeds capacity', () => {
  const s = freshState(); s.bag = { wood: 25 };
  const result = collect(s, { metal: 3, wire: 2 });
  assert.deepEqual(result.received, { metal: 1 });
  assert.deepEqual(result.remaining, { metal: 2, wire: 2 });
  assert.equal(bagWeight(s), capacity(s));
});
test('Improved backpack immediately expands usable capacity', () => {
  const s = freshState(); s.stash.cloth = 7;
  assert.equal(craft(s, 'bag').ok, true); assert.equal(capacity(s), 40);
  assert.equal(collect(s, { wood: 40 }).full, false);
});
test('Depositing moves resources to permanent storage without duplication', () => {
  const s = freshState(); collect(s, { wood: 4, parts: 2 });
  assert.equal(deposit(s), 6); assert.deepEqual(s.bag, {});
  assert.equal(s.stash.wood, 7); assert.equal(s.stash.parts, 2); assert.equal(s.trips, 1);
  assert.equal(deposit(s), 0); assert.equal(s.trips, 1);
});
test('Furniture only consumes cost after valid placement, not selection', () => {
  const s = freshState(); s.stash = { wood: 40, cloth: 20 };
  const before = structuredClone(s.stash);
  assert.equal(craft(s, 'bed').placement, true); assert.deepEqual(s.stash, before);
  assert.equal(place(s, 'bed', 0, 0), false); assert.deepEqual(s.stash, before);
  assert.equal(place(s, 'bed', -18, 18), true); assert.equal(s.stash.wood, 32);
  assert.equal(place(s, 'bed', -18, 18), false); assert.equal(s.stash.wood, 32);
});
test('Armour reduces damage; respawn preserves home and recoverable bag', () => {
  const s = freshState(); s.equipment.armor = 'vest';
  takeDamage(s, 20); assert.equal(s.health, 85);
  s.bag = { metal: 8, parts: 2 }; s.x = 14; s.z = 3; s.owned = ['generator'];
  s.placed = [{ id: 'bed', x: -18, z: 18, rotation: 0 }];
  respawn(s); assert.deepEqual(s.grave.loot, { metal: 8, parts: 2 });
  assert.deepEqual(s.bag, {}); assert.equal(s.health, 65);
  assert.deepEqual(s.owned, ['generator']); assert.equal(s.placed.length, 1);
  s.bag = { wood: 3 }; respawn(s);
  assert.deepEqual(s.grave.loot, { metal: 8, parts: 2, wood: 3 });
});
test('Fish distribution includes rare items and upgraded rod improves their range', () => {
  assert.equal(catchFish(() => 0.1).name, 'Речной окунь');
  assert.equal(catchFish(() => 0.8).name, 'Лунная форель');
  assert.equal(catchFish(() => 0.95).resource, 'pearl');
  assert.equal(catchFish(() => 0.85, true).resource, 'pearl');
});
test('Recipes complete the chapter in order and unlock equipment', () => {
  const s = freshState(); s.stash = { wood: 100, metal: 100, parts: 100, wire: 100, pearl: 10 };
  assert.equal(objective(s).recipe, 'generator');
  craft(s, 'generator'); assert.equal(objective(s).recipe, 'bridge');
  craft(s, 'bridge'); assert.equal(objective(s).recipe, 'radio');
  assert.equal(craft(s, 'carbine').ok, true); assert.equal(s.equipment.weapon, 'carbine');
  craft(s, 'radio'); assert.equal(s.chapterComplete, true); assert.equal(objective(s).recipe, 'pump');
  craft(s, 'pump'); assert.equal(objective(s).recipe, 'solar');
  craft(s, 'solar'); assert.equal(objective(s).recipe, 'helper');
  s.placed.push({ id: 'bed', x: -22, z: 20, harvested: 0 });
  Object.assign(s.stash, { cloth: 6, fish: 3, water: 3 });
  assert.equal(craft(s, 'helper').ok, true); assert.equal(objective(s).recipe, undefined);
});
test('Orders exchange materials atomically and enforce cooldown and home delivery', () => {
  const s = freshState(); s.stash.wood = 16;
  const result = deliverContract(s, 'timber'); assert.equal(result.ok, true);
  assert.equal(s.stash.wood, 8); assert.equal(s.stash.wire, 1); assert.equal(s.completedOrders, 1);
  const before = structuredClone(s); assert.equal(deliverContract(s, 'timber').ok, false); assert.deepEqual(s, before);
  s.elapsed = 121; assert.equal(contractStatus(s, CONTRACTS[0]).ok, true);
  s.x = 10; assert.equal(deliverContract(s, 'timber').ok, false); assert.equal(s.stash.wood, 8);
  s.x = -16; assert.equal(deliverContract(s, 'timber').ok, true); assert.equal(s.completedOrders, 2);
});
test('Production preserves inputs and cycle when the bag is full', () => {
  const s = freshState(), machine = { id: 'recycler', harvested: 0 };
  s.elapsed = 130; s.stash.metal = 3; s.bag.wood = 26;
  const before = structuredClone(s);
  assert.equal(harvestProduction(s, machine).ok, false); assert.deepEqual(s, before); assert.equal(machine.harvested, 0);
  s.bag = {}; assert.equal(harvestProduction(s, machine).ok, true);
  assert.equal(s.stash.metal, 0); assert.equal(s.bag.parts, 2); assert.equal(s.bag.wire, 1);
  assert.equal(harvestProduction(s, machine).ok, false);
});
test('Water and solar upgrades accelerate production without resetting saved progress', () => {
  const s = freshState(), garden = { id: 'garden', harvested: 0 };
  s.elapsed = 60; assert.equal(productionInfo(s, garden).remaining, 30);
  s.owned.push('pump'); assert.equal(productionInfo(s, garden).remaining, 7.5);
  s.owned.push('solar'); assert.equal(productionInfo(s, garden).remaining, 0);
  assert.equal(harvestProduction(s, garden).ok, true); assert.equal(s.bag.herbs, 3);
});
test('Legacy saves gain new fields and new progress round-trips', () => {
  const s = freshState(); delete s.contracts; delete s.completedOrders; delete s.teas;
  const legacy = validateSave(s); assert.deepEqual(legacy.contracts, {}); assert.equal(legacy.teas, 0);
  legacy.owned.push('radio', 'pump', 'solar'); legacy.bag.water = 4; legacy.elapsed = 300; legacy.contracts.water = 200; legacy.completedOrders = 7;
  const restored = validateSave(JSON.parse(JSON.stringify(legacy)));
  assert.equal(restored.bag.water, 4); assert.equal(restored.contracts.water, 200); assert.equal(restored.completedOrders, 7); assert.ok(restored.owned.includes('solar'));
});
test('Save validation rejects incompatible saves and sanitizes unknown data', () => {
  assert.equal(validateSave({ version: 99 }), null);
  const s = freshState(); s.owned = ['generator', 'bad', 'generator'];
  s.equipment.weapon = 'carbine'; s.x = 9999; s.stash.metal = -5; s.stash.wood = Infinity;
  const clean = validateSave(s); assert.deepEqual(clean.owned, ['generator']);
  assert.equal(clean.equipment.weapon, 'pipe'); assert.equal(clean.x, 43);
  assert.equal(clean.stash.metal, undefined); assert.equal(clean.stash.wood, undefined);
});
test('Save round trip preserves development and furniture harvest time', () => {
  const s = freshState(); s.elapsed = 250; s.owned = ['generator', 'bag', 'rod']; s.equipment.bag = 'bag';
  s.placed.push({ id: 'garden', x: -19, z: 23, rotation: 1.57, harvested: 210 });
  s.fishCollection = ['Лунная форель']; s.grave = { x: 11, z: 4, loot: { metal: 5 } };
  const clean = validateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(capacity(clean), 40); assert.deepEqual(clean.placed, s.placed);
  assert.deepEqual(clean.grave, s.grave); assert.deepEqual(clean.fishCollection, s.fishCollection);
});
test('Consumables cannot be used without need or stock', () => {
  const s = freshState(); assert.equal(useSupply(s, 'medkit'), false); assert.equal(s.medkits, 1);
  s.health = 40; assert.equal(useSupply(s, 'medkit'), true); assert.equal(s.health, 85);
  assert.equal(useSupply(s, 'medkit'), false); assert.equal(s.medkits, 0);
});
test('All recipes have valid resource costs and prerequisite references', () => {
  assert.equal(new Set(RECIPES.map(r => r.id)).size, RECIPES.length);
  for (const r of RECIPES) {
    assert.ok(Object.values(r.cost).every(n => Number.isInteger(n) && n > 0));
    if (r.requires) assert.ok(RECIPES.some(other => other.id === r.requires));
    const s = freshState(); assert.equal(typeof craftStatus(s, r).ok, 'boolean');
  }
});
test('Save round trip retains partial loot, dropped rewards and defeated drones', () => {
  const s = freshState(); s.elapsed = 200;
  s.nodeLoot['node-0'] = { metal: 2, parts: 1 };
  s.droneDeaths['drone-0'] = 190;
  s.drops.push({ id: 'drop-1', x: 8, z: -4, loot: { metal: 2 } });
  const restored = validateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.nodeLoot, s.nodeLoot);
  assert.deepEqual(restored.droneDeaths, s.droneDeaths);
  assert.deepEqual(restored.drops, s.drops);
});

import { Locomotion } from '../src/movement.js';
test('Movement keeps equal travel distance at different frame rates and normalizes diagonals', () => {
  const run = (hz, dx, dz, sprint = false) => {
    const motion = new Locomotion(); let x = 0, z = 0, stamina = 100;
    for (let i = 0; i < hz * 2; i++) { const step = motion.update(1 / hz, dx, dz, stamina, sprint); x += step.x; z += step.z; stamina = step.stamina; }
    return Math.hypot(x, z);
  };
  assert.ok(Math.abs(run(60, 1, 0) - run(120, 1, 0)) < 0.025);
  assert.ok(Math.abs(run(60, 1, 1) - run(60, 1, 0)) < 0.001);
  assert.ok(run(60, 1, 0) > 7.8); assert.ok(run(60, 1, 0, true) > 12.8);
  assert.ok(run(60, 0.5, 0) < run(60, 1, 0) * 0.51);
});
test('Sprint exhaustion has recovery hysteresis and stopping is short', () => {
  const motion = new Locomotion();
  assert.equal(motion.update(1 / 60, 1, 0, 0, true).running, false);
  motion.reset();
  assert.equal(motion.update(1 / 60, 1, 0, 10, true).running, false);
  assert.equal(motion.update(1 / 60, 1, 0, 22, true).running, true);
  for (let i = 0; i < 60; i++) motion.update(1 / 60, 1, 0, 100, false);
  let distance = 0;
  for (let i = 0; i < 30; i++) distance += motion.update(1 / 60, 0, 0, 100, false).x;
  assert.ok(distance < 0.11); assert.equal(motion.x, 0);
});
test('Helper needs a furnished bed, takes recycler fees only from stash and never duplicates manual harvest', () => {
  const s = freshState(); s.owned.push('radio'); s.stash = { cloth: 20, fish: 10, water: 10 };
  const before = structuredClone(s); assert.equal(craft(s, 'helper').ok, false); assert.deepEqual(s, before);
  s.placed.push({ id: 'bed', x: -20, z: 20, harvested: 0 }); assert.equal(craft(s, 'helper').ok, true);
  s.placed.push({ id: 'recycler', x: -12, z: 20, harvested: 0 }); s.helper.assignment = 'recycler'; s.elapsed = 121; s.bag.metal = 10;
  assert.equal(updateHelper(s), 0); assert.equal(s.bag.metal, 10);
  s.stash.metal = 3; assert.equal(updateHelper(s), 1); assert.equal(s.stash.metal, 0); assert.equal(s.stash.parts, 2);
  assert.equal(updateHelper(s), 0); assert.equal(harvestProduction(s, s.placed[1]).ok, false);
  const copy = validateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(copy.helper, s.helper);
});
test('Seed nursery benefits from both upgrades and helper respects rest assignment', () => {
  const s = freshState(); s.owned = ['helper', 'pump', 'solar']; s.helper.assignment = 'seedbed';
  s.placed = [{ id: 'seedbed', x: -12, z: 20, harvested: 0 }]; s.elapsed = 68;
  assert.equal(productionInfo(s, s.placed[0]).interval, 67.5);
  assert.equal(updateHelper(s), 1); assert.equal(s.stash.herbs, 6);
  s.elapsed = 140; s.helper.assignment = 'rest'; assert.equal(updateHelper(s), 0);
  assert.equal(harvestProduction(s, s.placed[0]).ok, true); assert.equal(s.bag.herbs, 6);
});

import { hotbarItem, assignHotbar, DEFAULT_HOTBAR } from '../src/hotbar.js';
import { ITEM_ICON_IDS, recipeIcon, resourceIcon } from '../src/icons.js';
test('Hotbar assignments swap existing items, preserve selection and reject invalid changes', () => {
  const s = freshState(); assert.deepEqual(s.hotbar, DEFAULT_HOTBAR);
  assert.equal(assignHotbar(s, 3, 'pipe'), true); assert.equal(s.hotbar[0], 'medkit'); assert.equal(s.hotbarSelected, 3);
  const before = structuredClone(s); assert.equal(assignHotbar(s, 7, 'axe'), false); assert.equal(assignHotbar(s, 0, 'generator'), false); assert.deepEqual(s, before);
  assert.equal(assignHotbar(s, 3, null), true); assert.equal(s.hotbarSelected, -1);
});
test('Hotbar availability and counts reflect actual supplies, ownership and ammunition', () => {
  const s = freshState(); assert.equal(hotbarItem(s, 'axe').available, false); s.owned.push('axe', 'pistol');
  assert.equal(hotbarItem(s, 'axe').available, true); assert.equal(hotbarItem(s, 'pipe').available, true);
  assert.equal(hotbarItem(s, 'medkit').count, 1); s.medkits = 0; assert.equal(hotbarItem(s, 'medkit').available, false);
  s.ammo = 12; assert.equal(hotbarItem(s, 'pistol').count, 12); assert.equal(hotbarItem(s, 'bed'), null);
});
test('Legacy saves gain a hotbar; custom layout, collapse settings and lantern survive round trip', () => {
  const s = freshState(); const old = structuredClone(s); delete old.hotbar; delete old.hotbarSelected;
  assert.deepEqual(validateSave(old).hotbar, DEFAULT_HOTBAR);
  assignHotbar(s, 0, 'tea'); s.hotbarSelected = -1; s.settings.questExpanded = true; s.settings.minimapExpanded = true; s.lanternOn = false;
  const copy = validateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(copy.hotbar, s.hotbar); assert.equal(copy.hotbarSelected, -1);
  assert.equal(copy.settings.questExpanded, true); assert.equal(copy.settings.minimapExpanded, true); assert.equal(copy.lanternOn, false);
  assert.deepEqual(validateSave({ ...s, hotbar: ['generator', 'fake', 'pipe'] }).hotbar, [null, null, 'pipe', null, null, null]);
});
test('Every recipe has a distinct item icon, and resources have explicit silhouettes', () => {
  const icons = RECIPES.map(r => { assert.ok(ITEM_ICON_IDS.includes(r.id), r.id); return recipeIcon(r.id); });
  assert.equal(new Set(icons).size, RECIPES.length);
  assert.notEqual(resourceIcon('seeds'), resourceIcon('herbs'));
  assert.notEqual(recipeIcon('pipe'), recipeIcon('spear')); assert.notEqual(recipeIcon('fish-perch'), recipeIcon('fish-trout'));
});

import { fishingFrameDelta } from '../src/fishing.js';
test('Reel indicator cannot jump over the input zone during a slow visible frame', () => {
  assert.equal(fishingFrameDelta(1 / 60, 'reel'), 1 / 60);
  assert.equal(fishingFrameDelta(0.5, 'wait'), 0.5); assert.equal(fishingFrameDelta(0.5, 'bite'), 0.5);
  let time = 0;
  for (let i = 0; i < 300; i++) {
    const previous = 50 + Math.sin(time * 2.6) * 46; time += fishingFrameDelta(0.5, 'reel');
    assert.ok(Math.abs(50 + Math.sin(time * 2.6) * 46 - previous) < 6);
  }
  assert.equal(fishingFrameDelta(-1, 'reel'), 0);
});

import { inventoryItems, equipItem, unequipItem, withdrawResource } from '../src/inventory.js';
import { isInsideBuilding, fadeOpacity } from '../src/roofs.js';
import { ART_IDS, itemArt } from '../src/item-art.js';
test('Cell inventory separates equipped items, carried stacks and shelter storage', () => {
  const s=freshState(); s.owned=['axe','vest']; s.equipment.armor='vest'; s.bag={wood:4};
  const items=inventoryItems(s); assert.ok(items.some(i=>i.id==='axe')); assert.ok(!items.some(i=>i.id==='vest'||i.id==='pipe'));
  assert.equal(items.find(i=>i.id==='wood').count,4); assert.deepEqual(inventoryItems(s,true).map(i=>i.kind),['resource','resource','resource']);
  unequipItem(s,'armor'); assert.ok(inventoryItems(s).some(i=>i.id==='vest')); assert.ok(s.owned.includes('vest'));
});
test('Equipment changes preserve items and forbid reducing capacity below carried weight', () => {
  const s=freshState(); s.owned=['bag2','bag','pistol']; s.equipment.bag='bag2'; s.bag={wood:45};
  const before=structuredClone(s); assert.equal(unequipItem(s,'bag').ok,false); assert.equal(equipItem(s,'bag').ok,false); assert.deepEqual(s,before);
  s.bag={wood:20}; assert.equal(unequipItem(s,'bag').ok,true); assert.equal(capacity(s),26);
  assert.equal(unequipItem(s,'weapon').ok,true); assert.equal(weaponForTest(s).id,'unarmed');
  assert.equal(validateSave(JSON.parse(JSON.stringify(s))).equipment.weapon,null);
  assert.equal(equipItem(s,'pistol').ok,true); assert.equal(equipItem(s,'armor').ok,false);
});
import { weapon as weaponForTest } from '../src/game.js';
test('Storage withdrawal is atomic, respects weight and requires being home', () => {
  const s=freshState(); s.stash.wood=10; s.bag.wood=25;
  const before=structuredClone(s); assert.equal(withdrawResource(s,'wood',2).ok,false); assert.deepEqual(s,before);
  assert.equal(withdrawResource(s,'wood',1).ok,true); assert.equal(s.bag.wood,26); assert.equal(s.stash.wood,9);
  s.x=20; assert.equal(withdrawResource(s,'wood',1).ok,false); assert.equal(s.stash.wood,9);
});
test('Roof boundaries and fades are smooth and independent of simulation frame rate', () => {
  const b={x:13,z:4,w:10,d:8}; assert.equal(isInsideBuilding(b,13,4),true); assert.equal(isInsideBuilding(b,20,4),false);
  const fade=hz=>{let value=1;for(let i=0;i<hz;i++) value=fadeOpacity(value,.035,1/hz);return value;};
  assert.ok(Math.abs(fade(30)-fade(120))<1e-9); assert.ok(fade(60)<.04); assert.ok(fadeOpacity(.035,1,.1)>.035);
});
test('Every item and crafting recipe has painted, coloured artwork', () => {
  for(const id of [...RECIPES.map(r=>r.id),'pipe','wood','metal','wire','parts','cloth','herbs','seeds','fish','pearl','water']) {
    assert.ok(ART_IDS.includes(id),id); assert.match(itemArt(id),/fill="#[a-f0-9]{6}"/);
  }
  assert.notEqual(itemArt('vest'),itemArt('armor')); assert.notEqual(itemArt('bag'),itemArt('bag2'));
});

import { overlaps, circleHitsRect, footprint, placementAllowed } from '../src/layout.js';
test('Rotated collision footprints follow visible cars and leave their empty corners walkable',()=>{
  const car={x:0,z:0,w:2,d:4,rotation:Math.PI/2};
  assert.equal(circleHitsRect(1.8,0,.1,car),true);
  assert.equal(circleHitsRect(0,1.8,.1,car),false);
  assert.equal(circleHitsRect(2.1,1.1,.1,car),false);
  assert.equal(overlaps(car,{x:1.8,z:0,w:.2,d:.2}),true);
  assert.equal(overlaps(car,{x:0,z:1.8,w:.2,d:.2}),false);
});
test('Furnishing checks rotated extents, entire boundary, walls, nearby furniture and door clearance',()=>{
  const bed={id:'bed',x:-16,z:12,rotation:Math.PI/2};
  assert.equal(placementAllowed(bed,[],[]),true);
  assert.equal(placementAllowed({...bed,x:-24.5},[],[]),false);
  assert.equal(placementAllowed(bed,[{x:-17,z:12,w:.25,d:3}],[]),false);
  assert.equal(placementAllowed(bed,[],[{id:'sofa',x:-14.5,z:12,rotation:0}]),false);
  assert.equal(placementAllowed(bed,[],[bed],0),true);
  assert.equal(placementAllowed({...bed,x:-18,z:19.5},[],[]),false);
  assert.equal(placementAllowed({...bed,x:-8.7,z:20},[],[]),false);
  assert.equal(placementAllowed(bed,[],[{...bed,id:'rug'}]),true);
  assert.equal(footprint(bed).d,2.3);
});

import { repairFurniture } from '../src/layout.js';
test('Old furnishings overlapping new walls are moved nearby without loss or resetting production',()=>{
  const objects=[{id:'bed',x:-22,z:20,rotation:0,harvested:12},{id:'garden',x:-12,z:23,rotation:0,harvested:77}];
  const walls=[{x:-22,z:19.5,w:4.8,d:.25}];
  const before=structuredClone(objects[1]);
  assert.equal(repairFurniture(walls,objects),1);
  assert.equal(objects.length,2);assert.equal(objects[0].harvested,12);
  assert.deepEqual(objects[1],before);
  objects.forEach((o,i)=>assert.equal(placementAllowed(o,walls,objects,i),true));
  assert.equal(repairFurniture(walls,objects),0);
});

import { solidFootprint } from '../src/layout.js';
test('Lamp placement reserves the fixture while walking only collides with its pole',()=>{
  const lamp={id:'lamp',x:0,z:0,rotation:0};
  assert.equal(circleHitsRect(.5,0,.2,footprint(lamp)),true);
  assert.equal(circleHitsRect(.5,0,.2,solidFootprint(lamp)),false);
  assert.equal(circleHitsRect(0,0,.2,solidFootprint(lamp)),true);
});
