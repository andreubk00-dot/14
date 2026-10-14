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
  assert.equal(place(s, 'bed', -16, 12), true); assert.equal(s.stash.wood, 32);
  assert.equal(place(s, 'bed', -16, 12), false); assert.equal(s.stash.wood, 32);
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
  assert.equal(clean.equipment.weapon, 'pipe'); assert.equal(clean.x, WORLD_LIMIT);
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

import { WORLD_LIMIT, LOCATIONS, discover, cycleLoot } from '../src/district.js';

test('Exploration records only places reached and nearby supplies, never sets a destination',()=>{
 const s=freshState();s.x=0;s.z=50;assert.equal(discover(s,[{id:'node-40',x:51,z:12}]),false);
 assert.deepEqual(s.visited,['home']);assert.deepEqual(s.foundNodes,[]);
 s.x=-49;s.z=32;assert.equal(discover(s,[{id:'node-36',x:-52,z:31}]),true);
 assert.ok(s.visited.includes('clinic'));assert.deepEqual(s.foundNodes,['node-36']);
 assert.equal(discover(s,[{id:'node-36',x:-52,z:31}]),false);
 const restored=validateSave({...s,visited:[...s.visited,'unknown'],foundNodes:[...s.foundNodes,'<bad>']});
 assert.deepEqual(restored.visited,s.visited);assert.deepEqual(restored.foundNodes,s.foundNodes);
});
test('Contextual loot varies between cycles, is deterministic and keeps quantities positive',()=>{
 const base={parts:6,metal:5,wire:3};assert.deepEqual(cycleLoot('node-41',base,0),base);
 const rolls=Array.from({length:8},(_,i)=>cycleLoot('node-41',base,i+1));
 assert.ok(new Set(rolls.map(JSON.stringify)).size>1);assert.deepEqual(rolls[2],cycleLoot('node-41',base,3));
 for(const roll of rolls) for(const [id,n] of Object.entries(roll)) assert.ok(n>=Math.max(1,base[id]-1)&&n<=base[id]+1);
 assert.deepEqual(base,{parts:6,metal:5,wire:3});
});
test('Precision tooling improves shared production; receiver keeps the full bag untouched and harvest atomic',()=>{
 const s=freshState();s.owned=['generator','tooling','receiver'];s.bag={wood:26};s.stash={metal:3};s.elapsed=200;
 const p={id:'recycler',harvested:0};assert.deepEqual(productionInfo(s,p).loot,{parts:3,wire:1});
 const result=harvestProduction(s,p);assert.equal(result.ok,true);assert.equal(result.toStash,true);
 assert.equal(s.bag.wood,26);assert.equal(bagWeight(s),26);assert.equal(s.stash.metal,0);assert.equal(s.stash.parts,3);assert.equal(s.stash.wire,1);
 const before=structuredClone(s);assert.equal(harvestProduction(s,p).ok,false);assert.deepEqual(s,before);
 s.elapsed=400;const t=p.harvested;assert.equal(harvestProduction(s,p).ok,false);assert.equal(p.harvested,t);
 s.owned.push('helper');s.placed=[p];s.helper.assignment='recycler';s.stash.metal=3;
 assert.equal(updateHelper(s),1);assert.equal(s.stash.parts,6);assert.equal(harvestProduction(s,p).ok,false);
});
test('Haul recap keeps the last positive delivery and expanded-world coordinates survive saving',()=>{
 const s=freshState();s.bag={wood:5,parts:3};deposit(s);assert.deepEqual(s.lastHaul,{wood:5,parts:3});
 deposit(s);assert.deepEqual(s.lastHaul,{wood:5,parts:3});
 s.x=51;s.z=12;s.grave={x:-49,z:32,loot:{cloth:4}};s.drops=[{id:'far-drop',x:-42,z:-44,loot:{seeds:2}}];
 const restored=validateSave(s);assert.equal(restored.x,51);assert.deepEqual(restored.lastHaul,s.lastHaul);
 assert.deepEqual(restored.grave,s.grave);assert.deepEqual(restored.drops,s.drops);
});

import { mapPoint } from '../src/district.js';
test('Expanded map coordinates match the drawn bounds and outskirts are not clamped to the old district',()=>{
 assert.deepEqual(mapPoint(.5,.5),{x:0,z:0});
 const p=mapPoint((-49+66)/132,(32+66)/132);assert.equal(p.x,-49);assert.equal(p.z,32);
 assert.equal(validateSave({...freshState(),x:51,z:-44}).x,51);
});

test('Small furnishings commit with the same rotated overlap check used by the preview',()=>{
 const s=freshState();s.stash={wood:10,herbs:6};
 assert.equal(place(s,'planter',-20,23),true);assert.equal(place(s,'planter',-18.8,23),true);
 const before=structuredClone(s.stash);assert.equal(place(s,'planter',-20.5,23),false);assert.deepEqual(s.stash,before);
 s.bag={wood:3,metal:0};deposit(s);assert.deepEqual(s.lastHaul,{wood:3});
});

import { FINDS, CROPS, dismantleInfo, machineKind, cropInfo } from '../src/homelife.js';
import { claimFind, takeStoredFind, plantCrop, recoverFinds } from '../src/game.js';
import { clockAnchor } from '../src/layout.js';
test('Rare finds preserve quantity through collection, deposit, withdrawal and successful placement only',()=>{
 const s=freshState(),n={id:'node-47',find:'armchair'};s.bag={wood:23};
 const before=structuredClone(s);assert.equal(claimFind(s,n).ok,false);assert.deepEqual(s,before);
 s.bag={wood:20};assert.equal(claimFind(s,n).ok,true);assert.equal(bagWeight(s),25);
 assert.equal(claimFind(s,n).ok,false);assert.equal(s.finds.armchair,1);
 assert.equal(place(s,'armchair',0,0),false);assert.equal(s.finds.armchair,1);
 deposit(s);assert.equal(s.storedFinds.armchair,1);assert.equal(s.finds.armchair,undefined);
 s.bag={wood:25};assert.equal(takeStoredFind(s,'armchair').ok,false);assert.equal(s.storedFinds.armchair,1);
 s.bag={};assert.equal(takeStoredFind(s,'armchair').ok,true);assert.equal(place(s,'armchair',-17,23),true);
 assert.equal(s.finds.armchair,0);assert.equal(place(s,'armchair',-20,23),false);
 const clean=validateSave(s);assert.deepEqual(clean.findClaims,['node-47']);assert.equal(clean.placed.filter(p=>p.id==='armchair').length,1);
});
test('Found furniture is recoverable after death and never duplicated on another recovery',()=>{
 const s=freshState();s.finds={recordplayer:1};s.bag={wood:22};respawn(s);assert.deepEqual(s.grave.finds,{recordplayer:1});assert.deepEqual(s.finds,{});
 s.bag={wood:25};assert.equal(recoverFinds(s,s.grave.finds),false);assert.deepEqual(s.grave.finds,{recordplayer:1});
 s.bag={};assert.equal(recoverFinds(s,s.grave.finds),true);assert.equal(s.finds.recordplayer,1);
 assert.equal(recoverFinds(s,s.grave.finds),true);assert.equal(s.finds.recordplayer,1);
});
test('Clock anchors attach to actual interior wall faces, preserve orientation and never obstruct floor furniture',()=>{
 const s=freshState();s.finds.wallclock=1;
 assert.equal(place(s,'wallclock',-18,18),false);assert.equal(s.finds.wallclock,1);
 const a=clockAnchor(-18,11);assert.deepEqual(a,{x:-18,z:10.66,rotation:0});
 assert.equal(placementAllowed({id:'wallclock',...a},[],[{id:'bed',x:-18,z:11.5}]),true);
 assert.equal(place(s,'wallclock',a.x,a.z,a.rotation),true);assert.equal(s.finds.wallclock,0);
 const west=clockAnchor(-24,15);assert.equal(west.x,-23.84);assert.equal(west.rotation,Math.PI/2);
 assert.equal(placementAllowed({id:'wallclock',...west,rotation:0},[],[]),false);
});
test('Planting and harvest are atomic, require replanting and preserve growth over saving',()=>{
 const s=freshState();s.stash={seeds:4,water:2};s.elapsed=100;const bed={id:'cropbed',x:-17,z:23,rotation:0,harvested:0,crop:null,plantedAt:null};s.placed=[bed];
 assert.equal(plantCrop(s,bed,'vegetables').ok,true);assert.equal(s.stash.seeds,2);assert.equal(s.stash.water,1);
 const before=structuredClone(s);assert.equal(plantCrop(s,bed,'flowers').ok,false);assert.deepEqual(s,before);
 s.elapsed=190;assert.equal(cropInfo(s,bed).progress,.5);const saved=validateSave(s);assert.equal(cropInfo(saved,saved.placed[0]).progress,.5);
 s.elapsed=280;s.bag={wood:26};assert.equal(harvestProduction(s,bed).ok,false);assert.equal(bed.crop,'vegetables');
 s.bag={};assert.equal(harvestProduction(s,bed).ok,true);assert.equal(s.bag.vegetables,4);assert.equal(bed.crop,null);assert.equal(harvestProduction(s,bed).ok,false);
 assert.equal(plantCrop(s,bed,'flowers').ok,true);s.owned=['pump','solar'];assert.equal(cropInfo(s,bed).interval,CROPS.flowers.interval*.75*.75);
});
test('Tools accelerate the appropriate machinery; loose scrap stays loose scrap',()=>{
 const motor={type:'scrap',name:'Разобранный мотор'},board={type:'electronics',name:'Электрощит'},pile={type:'scrap',name:'Куча металлолома'};
 assert.equal(dismantleInfo(['wrench'],motor).duration,dismantleInfo([],motor).duration/2);
 assert.equal(dismantleInfo(['cutter'],board).duration,dismantleInfo([],board).duration/2);
 assert.equal(dismantleInfo(['pick'],motor).fast,false);assert.equal(machineKind(pile),null);assert.equal(machineKind({type:'electronics',name:'Радиоприёмник'}),'radio');
});

import {openGate,consumeBait,packFurniture,unpackFurniture,updateRainCrops} from '../src/game.js';
import {GATES,fishingProbabilities,weatherAt,gameHour} from '../src/expedition.js';
test('Access gates need a nearby player and the right permanent tool; saves retain opened doors',()=>{
 const s=freshState(),g=GATES[0];s.owned=['cutter'];assert.equal(openGate(s,g.id).ok,false);s.x=g.x;s.z=g.z;s.owned=[];assert.equal(openGate(s,g.id).ok,false);s.owned=['cutter'];assert.equal(openGate(s,g.id).ok,true);assert.equal(openGate(s,g.id).ok,false);assert.deepEqual(validateSave(s).openedGates,['yard']);assert.deepEqual(s.owned,['cutter']);
});
test('Bait uses carried stock exactly once and reusable lure never spends stock',()=>{
 const s=freshState();s.stash.herbs=20;assert.equal(consumeBait(s,'herbs'),false);s.bag.herbs=1;assert.equal(consumeBait(s,'herbs'),true);assert.equal(consumeBait(s,'herbs'),false);assert.equal(s.stash.herbs,20);assert.equal(consumeBait(s,'lure'),false);s.owned.push('lure');assert.equal(consumeBait(s,'lure'),true);assert.equal(consumeBait(s,'none'),true);assert.equal(consumeBait(s,'bogus'),false);
});
test('Fishing site, night and chosen bait change normalized probabilities without removing fish',()=>{
 const day=fishingProbabilities(false,{hour:12}),night=fishingProbabilities(false,{hour:22}),pond=fishingProbabilities(false,{spot:'pond'}),back=fishingProbabilities(false,{spot:'backwater'}),lure=fishingProbabilities(false,{hour:22,bait:'lure'});
 assert.ok(night[2]>day[2]);assert.ok(lure[2]>night[2]);assert.ok(back[1]>pond[1]);assert.ok(back[3]<pond[3]);for(const p of [day,night,pond,back,lure]){assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-9);assert.ok(p.every(n=>n>0));}
 assert.equal(gameHour(0),17.7);assert.ok(craftStatus(freshState(),RECIPES.find(r=>r.id==='fishtrophy')).reason.includes('форель'));
});
test('Furniture packing pauses crops, preserves fixture switches and never duplicates material or finds',()=>{
 const s=freshState();s.elapsed=100;s.placed=[{id:'cropbed',x:-16,z:23,rotation:0,harvested:0,crop:'herbs',plantedAt:60,rainGrowth:10}];const before=productionInfo(s,s.placed[0]).remaining;
 assert.equal(packFurniture(s,0),true);assert.equal(packFurniture(s,0),false);s.elapsed=300;const saved=validateSave(s);assert.equal(saved.packedFurniture[0].rainGrowth,10);
 assert.equal(unpackFurniture(saved,0,-18,19.5,0,[{x:-18,z:19.5,w:2,d:1}]),false);assert.equal(saved.packedFurniture.length,1);
 assert.equal(unpackFurniture(saved,0,-16,23,Math.PI/2),true);assert.equal(productionInfo(saved,saved.placed[0]).remaining,before);assert.equal(unpackFurniture(saved,0,-20,23,0),false);assert.equal(saved.packedFurniture.length,0);
 const fixture={id:'foundlamp',x:-16,z:15,rotation:0,harvested:300,enabled:false};saved.placed.push(fixture);assert.equal(packFurniture(saved,1),true);assert.equal(unpackFurniture(saved,0,-16,15,0),true);assert.equal(saved.placed[1].enabled,false);assert.deepEqual(saved.finds,{});assert.deepEqual(saved.stash,s.stash);
});
test('Rain is deterministic, grows only exposed active crops and resets on replant',()=>{
 const s=freshState();s.elapsed=200;s.placed=[{id:'cropbed',x:-16,z:23,rotation:0,harvested:100,crop:'herbs',plantedAt:150},{id:'cropbed',x:-16,z:12,rotation:0,harvested:100,crop:'herbs',plantedAt:150}];assert.equal(weatherAt(0).rain,0);assert.equal(weatherAt(200).rain,1);assert.equal(weatherAt(420).rain,0);assert.ok(weatherAt(166).rain>0&&weatherAt(166).rain<1);updateRainCrops(s,20,(_x,z)=>z<20);assert.equal(s.placed[0].rainGrowth,5);assert.equal(s.placed[1].rainGrowth,undefined);assert.equal(validateSave(s).placed[0].rainGrowth,5);s.elapsed=300;harvestProduction(s,s.placed[0]);assert.equal(s.placed[0].rainGrowth,undefined);
});

import {gridPath} from '../src/navigation.js';
test('Long district routes avoid obstacles and diagonal corner cutting with bounded search',()=>{
 const blocked=(x,z)=>Math.abs(x)>64||Math.abs(z)>64||x===0&&z<55;
 const path=gridPath({x:51,z:-44},{x:-44,z:56},blocked,17000);assert.ok(path.length>100);assert.deepEqual(path.at(-1),{x:-44,z:56});assert.ok(path.every(p=>!blocked(p.x,p.z)));
 let previous={x:51,z:-44};for(const p of path){if(p.x!==previous.x&&p.z!==previous.z){assert.equal(blocked(previous.x,p.z),false);assert.equal(blocked(p.x,previous.z),false);}previous=p;}
 assert.deepEqual(gridPath({x:0,z:0},{x:2,z:2},(x,z)=>x===1||z===1,20),[]);
});


import {gateForPoint} from '../src/expedition.js';
test('Room access follows shared building bounds and clinic materials craft the existing healing supply',()=>{
 assert.equal(gateForPoint(-41,53),'yard');assert.equal(gateForPoint(53,-52),'salvage');assert.equal(gateForPoint(40.5,-50),undefined);const s=freshState();s.medkits=0;s.stash={medicine:2,cloth:1};assert.equal(craft(s,'dressing').ok,true);assert.equal(s.medkits,1);assert.equal(s.stash.medicine,1);assert.equal(craft(s,'dressing').ok,false);assert.equal(s.medkits,1);assert.equal(validateSave(s).stash.medicine,1);
});

test('Packed save sanitizer ignores malformed records and unknown bait without changing valid growth',()=>{
 const s=freshState();s.elapsed=100;s.fishingBait='toString';s.packedFurniture=[null,0,{id:'unknown',x:-16,z:23},{id:'cropbed',x:-16,z:23,harvested:10,rotation:0,crop:'herbs',plantedAt:20,rainGrowth:4,packedAt:50}];const clean=validateSave(s);assert.equal(clean.fishingBait,'none');assert.equal(clean.packedFurniture.length,1);assert.equal(clean.packedFurniture[0].packedAt,50);assert.equal(clean.packedFurniture[0].plantedAt,20);assert.equal(clean.packedFurniture[0].rainGrowth,4);assert.equal(consumeBait(s,'toString'),false);
});

import {startDrying,saveLoadout,applyLoadout} from '../src/game.js';
import {gearProfile,segmentHitsRect,droneSees,attackCharge} from '../src/survival.js';
test('Rain collector stores only exposed rainfall and retains water when a harvest cannot fit',()=>{
 const s=freshState();s.elapsed=200;s.placed=[{id:'raincatcher',x:-16,z:23,rotation:0,harvested:0},{id:'raincatcher',x:-16,z:12,rotation:0,harvested:0}];updateRainCrops(s,200,(_x,z)=>z<20);assert.ok(s.placed[0].rainWater>5);assert.equal(s.placed[1].rainWater,undefined);s.bag={wood:26};const amount=s.placed[0].rainWater;assert.equal(harvestProduction(s,s.placed[0]).ok,false);assert.equal(s.placed[0].rainWater,amount);s.bag={};assert.equal(harvestProduction(s,s.placed[0]).received.water,5);assert.ok(s.placed[0].rainWater<1);assert.equal(validateSave(s).placed[0].rainWater,s.placed[0].rainWater);
});
test('Dryer consumes one batch, pauses while packed and pays its food output only once',()=>{
 const s=freshState();s.stash={fish:2,herbs:1};const rack={id:'dryrack',x:-16,z:23,rotation:0,harvested:0};s.placed=[rack];assert.equal(startDrying(s,rack).ok,true);assert.equal(startDrying(s,rack).ok,false);assert.equal(s.stash.fish,0);s.elapsed=60;assert.equal(packFurniture(s,0),true);s.elapsed=260;const loaded=validateSave(s);assert.equal(unpackFurniture(loaded,0,-16,23,0),true);assert.equal(productionInfo(loaded,loaded.placed[0]).remaining,40);assert.equal(harvestProduction(loaded,loaded.placed[0]).ok,false);loaded.elapsed+=40;assert.equal(harvestProduction(loaded,loaded.placed[0]).mealOutput,2);assert.equal(loaded.meals,2);assert.equal(harvestProduction(loaded,loaded.placed[0]).ok,false);
});
test('Loadouts restore atomically and cannot discard an over-capacity bag',()=>{
 const s=freshState();s.owned=['scoutcoat','hauler','armor'];s.placed=[{id:'gearrack',x:-16,z:12,rotation:0,harvested:0}];assert.equal(saveLoadout(s,0),true);s.equipment.armor='armor';s.equipment.bag='hauler';assert.equal(saveLoadout(s,1),true);s.bag.wood=30;const before={...s.equipment};assert.equal(applyLoadout(s,0).ok,false);assert.deepEqual(s.equipment,before);s.bag={};assert.equal(applyLoadout(s,0).ok,true);assert.equal(s.equipment.bag,null);assert.equal(applyLoadout(s,1).ok,true);assert.equal(capacity(s),70);assert.deepEqual(validateSave(s).loadouts,s.loadouts);
});
test('Equipment has clear speed, protection and detection trade-offs',()=>{
 const s=freshState();s.equipment.armor='scoutcoat';assert.ok(gearProfile(s,RECIPES).speed>1);assert.equal(gearProfile(s,RECIPES).visibility,.75);s.equipment.armor='armor';s.equipment.bag='hauler';assert.ok(gearProfile(s,RECIPES).speed<.8);assert.equal(capacity(s),70);assert.equal(RECIPES.find(r=>r.id==='armor').defense,.45);
});
test('Cover intersections follow thin and rotated walls without blocking a clear doorway',()=>{
 assert.equal(segmentHitsRect(-2,0,2,0,{x:0,z:0,w:.16,d:3}),true);assert.equal(segmentHitsRect(-2,2,2,2,{x:0,z:0,w:.16,d:3}),false);assert.equal(segmentHitsRect(-2,0,2,0,{x:0,z:0,w:.16,d:3,rotation:Math.PI/4}),true);
});
test('Drone vision respects cones, distance, cover and low-visibility equipment',()=>{
 const e={x:0,z:0,kind:'guardian',facing:0,alert:0};assert.equal(droneSees(e,{x:0,z:4},true),true);assert.equal(droneSees(e,{x:0,z:-4},true),false);assert.equal(droneSees(e,{x:0,z:4},false),false);assert.equal(droneSees(e,{x:0,z:5},true,.75),false);e.kind='scout';assert.equal(droneSees(e,{x:0,z:7},true),true);
});
test('Attacks give a warning window and cancel when the player leaves range or uses cover',()=>{
 const e={kind:'guardian',cooldown:0,windup:0};assert.equal(attackCharge(e,.3,true,true),false);assert.ok(e.windup>0);assert.equal(attackCharge(e,.3,true,false),false);assert.equal(e.windup,0);assert.equal(attackCharge(e,.9,true,true),true);assert.ok(e.cooldown>1);assert.equal(attackCharge(e,1,true,true),false);
});

import {upgradeStation} from '../src/game.js';
import {STATION_UPGRADES,collectorCapacity,dryingBatch} from '../src/upgrades.js';
test('Station upgrades are per object, require installed furniture and spend materials atomically',()=>{
 const s=freshState(),a={id:'raincatcher',x:-13,z:23,harvested:0,rainWater:5.7},b={...a};s.placed=[a,b];s.stash={pumpmodule:1,filterunit:1,metal:8};const before=structuredClone(s);assert.equal(upgradeStation(s,a).ok,false);assert.deepEqual(s,before);s.stash.filterunit=2;assert.equal(upgradeStation(s,{...a}).ok,false);assert.equal(upgradeStation(s,a).ok,true);assert.equal(a.upgrade,1);assert.equal(b.upgrade,undefined);assert.equal(a.rainWater,5.7);assert.equal(s.stash.filterunit,0);const paid=structuredClone(s);assert.equal(upgradeStation(s,a).ok,false);assert.deepEqual(s,paid);assert.equal(collectorCapacity(a),12);assert.equal(collectorCapacity(b),6);
 s.elapsed=200;updateRainCrops(s,2000,()=>false);assert.equal(a.rainWater,12);assert.equal(b.rainWater,6);const clean=validateSave(s);assert.equal(clean.placed[0].rainWater,12);assert.equal(clean.placed[0].upgrade,1);assert.equal(clean.placed[1].upgrade,0);
});
test('Upgrading an active dryer preserves its original batch and the next load uses double capacity',()=>{
 const s=freshState(),d={id:'dryrack',x:-16,z:23,harvested:0};s.placed=[d];s.stash={fish:8,herbs:4,...STATION_UPGRADES.dryrack.cost};assert.equal(startDrying(s,d).ok,true);s.elapsed=50;assert.equal(upgradeStation(s,d).ok,true);assert.equal(productionInfo(s,d).mealOutput,2);assert.equal(productionInfo(s,d).remaining,50);const saved=validateSave(s),sd=saved.placed[0];assert.equal(sd.upgrade,1);assert.equal(sd.dryingOutput,2);saved.elapsed=100;assert.equal(harvestProduction(saved,sd).mealOutput,2);assert.equal(harvestProduction(saved,sd).ok,false);assert.equal(startDrying(saved,sd).ok,true);assert.equal(sd.dryingOutput,4);assert.equal(saved.stash.fish,2);saved.elapsed=200;assert.equal(harvestProduction(saved,sd).mealOutput,4);assert.equal(saved.meals,6);
});
test('Packed upgraded stations retain capacity and pause batch age across save and unpack',()=>{
 const s=freshState();s.x=-16;s.z=22;s.elapsed=40;s.placed=[{id:'dryrack',x:-20,z:23,harvested:0,upgrade:1,dryingAt:10,dryingOutput:4}];assert.equal(packFurniture(s,0),true);s.elapsed=400;const saved=validateSave(s);assert.equal(saved.packedFurniture[0].upgrade,1);assert.equal(unpackFurniture(saved,0,-20,23,0),true);assert.equal(productionInfo(saved,saved.placed[0]).remaining,70);assert.equal(productionInfo(saved,saved.placed[0]).mealOutput,4);
});
test('Sorting module improves output once and both manual collection and helper share its cycle',()=>{
 const s=freshState(),r={id:'recycler',x:-16,z:12,harvested:0};s.placed=[r];s.stash={...STATION_UPGRADES.recycler.cost,metal:6};assert.equal(upgradeStation(s,r).ok,true);assert.deepEqual(productionInfo(s,r).loot,{parts:4,wire:2});s.owned=['tooling','helper'];s.helper.assignment='recycler';assert.equal(productionInfo(s,r).loot.parts,5);s.elapsed=90;assert.equal(updateHelper(s),1);assert.equal(s.stash.metal,3);assert.equal(s.stash.parts,5);assert.equal(harvestProduction(s,r).ok,false);assert.equal(updateHelper(s),0);s.elapsed=180;s.owned.push('receiver');assert.equal(harvestProduction(s,r).ok,true);assert.equal(s.stash.metal,0);assert.equal(s.stash.parts,10);
});
test('Legacy production and new rare resource inventory survive validation without invented upgrades',()=>{
 const s=freshState();s.stash={filterunit:2,pumpmodule:1,battery:2};s.placed=[{id:'dryrack',x:-16,z:23,harvested:0,dryingAt:0},{id:'recycler',x:-16,z:12,harvested:0,upgrade:999}];s.elapsed=25;const clean=validateSave(s);assert.deepEqual(clean.stash,s.stash);assert.equal(clean.placed[0].upgrade,0);assert.equal(clean.placed[0].dryingOutput,2);assert.equal(productionInfo(clean,clean.placed[0]).remaining,75);assert.equal(productionInfo(clean,clean.placed[1]).interval,120);assert.equal(dryingBatch(clean.placed[0]).output,2);
});
test('Shortcut gates persist without treating their open yards as locked rooms',()=>{
 const s=freshState(),gate=GATES.find(g=>g.id==='garage-path');s.x=gate.x;s.z=gate.z;s.owned=['cutter'];assert.equal(gateForPoint(-15,-48),undefined);assert.equal(openGate(s,gate.id).ok,true);assert.deepEqual(validateSave(s).openedGates,['garage-path']);assert.equal(openGate(s,gate.id).ok,false);
});

import {SpatialIndex} from '../src/spatial.js';
import {chooseInteraction,interactionKey} from '../src/interactions.js';
import {reelMood,advanceReel,reelInput} from '../src/fishing.js';
test('Spatial broad phase retains every exact hit across rotated rectangles, negative cells and disabled doors',()=>{
 let seed=9;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const index=new SpatialIndex(8),rects=Array.from({length:180},()=>({x:rnd()*128-64,z:rnd()*128-64,w:.1+rnd()*12,d:.1+rnd()*6,rotation:rnd()*6.28,disabled:rnd()<.2}));rects.forEach(r=>index.add(r));
 for(let i=0;i<5000;i++){const x=rnd()*130-65,z=rnd()*130-65,r=.15+rnd()*.5,candidates=[...index.query(x-r,z-r,x+r,z+r)];assert.equal(candidates.some(q=>!q.disabled&&circleHitsRect(x,z,r,q)),rects.some(q=>!q.disabled&&circleHitsRect(x,z,r,q)));}
 const gate=index.add({x:-8,z:0,w:2,d:.2,disabled:false});assert.ok(index.query(-8,-.3,-8,.3).has(gate));gate.disabled=true;assert.ok(index.query(-8,0).has(gate));
});
test('Indexed cover rays preserve exact thin-wall and rotated cover results',()=>{
 const index=new SpatialIndex(),rects=[{x:-8,z:0,w:3,d:.08},{x:2,z:3,w:6,d:.12,rotation:.8},{x:10,z:-5,w:1,d:2}];rects.forEach(r=>index.add(r));for(let i=0;i<1500;i++){const ax=Math.sin(i)*20,az=Math.cos(i*.7)*20,bx=Math.cos(i*.4)*20,bz=Math.sin(i*.3)*20;assert.equal([...index.query(Math.min(ax,bx),Math.min(az,bz),Math.max(ax,bx),Math.max(az,bz))].some(r=>segmentHitsRect(ax,az,bx,bz,r)),rects.some(r=>segmentHitsRect(ax,az,bx,bz,r)));}
});
test('Overlapping interactions resist tiny distance changes and an explicit selection stays usable until leaving range',()=>{
 const a={type:'node',x:1,z:0,entity:{id:'node-1'},distance:1},b={type:'note',x:0,z:1,entity:{id:'paper'},distance:1.1};const first=chooseInteraction([a,b]);assert.equal(interactionKey(first),interactionKey(a));assert.equal(chooseInteraction([{...a,distance:1.25},b],interactionKey(a)).entity.id,'node-1');assert.equal(chooseInteraction([{...a,distance:1.7},b],interactionKey(a)).entity.id,'paper');assert.equal(chooseInteraction([a,b],interactionKey(b),true).entity.id,'paper');assert.equal(chooseInteraction([a],interactionKey(b),true).entity.id,'node-1');assert.equal(chooseInteraction([],interactionKey(a)),null);
});
test('Debris clears permanently, rewards once, needs the correct tool and never loses materials to a full bag',()=>{
 const s=freshState(),gate=GATES.find(g=>g.kind==='boards');s.x=gate.x;s.z=gate.z;s.owned=['wrench'];assert.equal(openGate(s,gate.id).ok,false);s.owned=['axe'];s.bag={wood:24};const before=structuredClone(s);assert.equal(openGate(s,gate.id).ok,false);assert.deepEqual(s,before);s.bag={};assert.deepEqual(openGate(s,gate.id).received,{wood:5});assert.equal(openGate(s,gate.id).ok,false);assert.equal(s.bag.wood,5);assert.ok(validateSave(s).openedGates.includes(gate.id));
});
test('New finds remain unique, retain switches through storage and fit the actual wall with suitable spacing',()=>{
 const s=freshState();for(const [i,id]of ['desklamp','homeradio','wallshelf'].entries()){const n={id:'node-'+(84+i),find:id};assert.equal(claimFind(s,n).ok,true);assert.equal(claimFind(s,n).ok,false);}s.x=-16;s.z=18;assert.equal(place(s,'desklamp',-16,12),true);assert.equal(place(s,'homeradio',-18,12),true);const anchor=clockAnchor(-23.4,10.66,'wallshelf');assert.ok(anchor.x>=-23.1);assert.equal(place(s,'wallshelf',anchor.x,anchor.z,anchor.rotation),true);assert.equal(placementAllowed({id:'wallclock',...clockAnchor(anchor.x+.7,10.66)},[],s.placed),false);s.placed[0].enabled=false;s.placed[1].enabled=true;const clean=validateSave(s);assert.equal(clean.placed[0].enabled,false);assert.equal(clean.placed[1].enabled,true);assert.equal(packFurniture(clean,1),true);assert.equal(clean.packedFurniture[0].enabled,true);assert.equal(unpackFurniture(clean,0,-18,12,0),true);assert.equal(clean.placed.at(-1).enabled,true);
});
test('Reel tension makes surge pulls risky, release creates recovery time and repeated clicks do not grant free hits',()=>{
 const f={phase:'reel',timer:3.4,totalTime:3.4,tension:.7,needle:50,target:50,hits:0,misses:0};assert.equal(reelMood(f.timer),'surge');assert.equal(reelInput(f,'pull'),'escape');f.tension=.8;assert.equal(reelInput(f,'relax'),'relax');assert.equal(f.tension,.4);assert.equal(reelInput(f,'pull'),'hold');f.timer=4.3;f.tension=.3;assert.equal(reelInput(f,'pull'),'hit');assert.equal(f.hits,1);assert.equal(reelInput(f,'pull'),'hold');assert.equal(f.hits,1);f.timer=5;const prior=f.tension;assert.equal(advanceReel(f,.05),false);assert.ok(f.tension<prior);assert.equal(f.mood,'slack');f.timer=6;f.totalTime=23;assert.equal(advanceReel(f,.05),true);
});

import {buildStructure,dismantleStructure} from '../src/game.js';
import {buildAllowed,closedRooms,dismantleAllowed,structureColliders,cleanConstruction} from '../src/construction.js';
const annexState=()=>{const s=freshState();s.stash={wood:100,stone:100,metal:100,cloth:100};return s;};
test('Annex placement spends only valid costs and keeps the home passage open',()=>{
 const s=annexState(),before=structuredClone(s.stash);assert.equal(buildStructure(s,{id:'floor',x:-16,z:20.5}).ok,false);assert.deepEqual(s.stash,before);
 assert.equal(buildStructure(s,{id:'floor',x:-18,z:20.5}).ok,true);assert.equal(s.stash.wood,96);assert.equal(s.stash.stone,98);
 assert.equal(buildStructure(s,{id:'wall',x:-18,z:19.5,axis:'x'}).ok,false);
 assert.equal(buildStructure(s,{id:'floor',x:-18,z:22.5}).ok,true);
 assert.equal(buildStructure(s,{id:'wall',x:-18,z:21.5,axis:'x'}).ok,false);assert.equal(buildStructure(s,{id:'door',x:-18,z:21.5,axis:'x'}).ok,true);
});
test('Closed annex gets a roof, wall removal opens it, refund cannot repeat',()=>{
 const s=annexState();buildStructure(s,{id:'floor',x:-18,z:20.5});
 for(const p of [{id:'wall',x:-19,z:20.5,axis:'z'},{id:'window',x:-17,z:20.5,axis:'z'},{id:'door',x:-18,z:21.5,axis:'x'}])assert.equal(buildStructure(s,p).ok,true);
 assert.equal(closedRooms(s.construction).length,1);assert.deepEqual(cleanConstruction(s.construction),s.construction);
 assert.equal(validateSave(JSON.parse(JSON.stringify(s))).construction.length,4);
 const wall=s.construction[1],before=s.stash.wood;assert.equal(dismantleStructure(s,wall).ok,true);assert.equal(s.stash.wood,before+3);assert.equal(closedRooms(s.construction).length,0);assert.equal(dismantleStructure(s,wall).ok,false);
});
test('Construction protects players, furniture, roots and old saves',()=>{
 const s=annexState();s.construction=[{id:'floor',x:-18,z:20.5},{id:'floor',x:-18,z:22.5}];
 assert.equal(dismantleAllowed(s,s.construction[0]).ok,false);s.placed=[{id:'bed',x:-18,z:22.5,rotation:0}];assert.equal(dismantleAllowed(s,s.construction[1]).ok,false);
 s.x=-19;s.z=20.5;assert.equal(buildAllowed(s,{id:'wall',x:-19,z:20.5,axis:'z'}).ok,false);
 assert.deepEqual(validateSave({...freshState(),construction:undefined}).construction,[]);assert.deepEqual(cleanConstruction([{id:'wall',x:0,z:0,axis:'x'}]),[]);
 assert.equal(structureColliders({id:'door',x:0,z:0,axis:'x'}).length,2);
});
test('Navigation checks fractional walls between free grid points',()=>{
 const blocked=(x,z)=>Math.abs(x)>2||Math.abs(z)>2;
 assert.deepEqual(gridPath({x:0,z:0},{x:0,z:1},blocked,100,(ax,az,bx,bz)=>az<=.5&&bz>.5||bz<=.5&&az>.5),[]);
});
test('An unfinished extension keeps a closed neighbouring room roof and leaves outdoor rain collection available',()=>{
 const s=annexState();s.construction=[{id:'floor',x:-18,z:20.5},{id:'floor',x:-18,z:22.5},{id:'wall',x:-19,z:20.5,axis:'z'},{id:'window',x:-17,z:20.5,axis:'z'},{id:'door',x:-18,z:21.5,axis:'x'}];
 const rooms=closedRooms(s.construction);assert.equal(rooms.length,1);assert.equal(rooms[0].tiles.length,1);
 s.placed=[{id:'raincatcher',x:-18,z:22.5,rotation:0}];assert.equal(buildAllowed(s,{id:'wall',x:-17,z:22.5,axis:'z'}).ok,true);
 s.placed[0].z=20.5;s.construction.pop();assert.equal(buildAllowed(s,{id:'door',x:-18,z:21.5,axis:'x'}).ok,false);
});

import {swingProfile,swingCanHit,advanceSwing} from '../src/combat.js';
import {replacementPlan} from '../src/construction.js';
test('Replacing a wall pays only the delta and refunds unused materials atomically',()=>{
 const s=annexState();buildStructure(s,{id:'floor',x:-18,z:20.5});buildStructure(s,{id:'wall',x:-19,z:20.5,axis:'z'});
 s.stash={wood:0,stone:0,metal:1,cloth:1};const wall=s.construction[1],window={...wall,id:'window'};
 const plan=replacementPlan(s,window);assert.deepEqual(plan.cost,{metal:1,cloth:1});assert.deepEqual(plan.refund,{stone:1});assert.equal(buildStructure(s,window).ok,true);assert.equal(s.construction.length,2);assert.deepEqual(s.stash,{wood:0,stone:1,metal:0,cloth:0});
 const before=structuredClone(s);assert.equal(buildStructure(s,{...window,id:'door'}).ok,false);assert.deepEqual(s,before);
 s.placed=[{id:'wallshelf',x:-18.895,z:20.5,rotation:Math.PI/2}];assert.equal(dismantleAllowed(s,s.construction[1]).ok,false);
});
test('New walls support attached furniture, openings stay usable and save keeps coordinates',()=>{
 const s=annexState();s.construction=[{id:'floor',x:-18,z:20.5},{id:'floor',x:-18,z:22.5},{id:'wall',x:-19,z:22.5,axis:'z'},{id:'door',x:-18,z:23.5,axis:'x'}];s.storedFinds.wallshelf=1;
 const anchor=clockAnchor(-18.8,22.5,'wallshelf',s.construction);assert.equal(anchor.x,-18.895);assert.equal(place(s,'wallshelf',anchor.x,anchor.z,anchor.rotation),true);
 assert.equal(placementAllowed({id:'chest',x:-18,z:23.5,rotation:0},[],[], -1,s.construction),false);
 assert.equal(validateSave(structuredClone(s)).placed[0].x,-18.895);
});
test('Melee damage resolves once at impact and respects retreat, angle, cover and death',()=>{
 const swing={elapsed:0,resolved:false,weapon:{id:'spear',range:2.8},profile:swingProfile('spear'),facing:0},player={x:0,z:0},enemy={x:0,z:2,health:50};
 assert.equal(advanceSwing(swing,.1),false);assert.equal(advanceSwing(swing,.2),true);assert.equal(advanceSwing(swing,1),false);assert.equal(swingCanHit(swing,player,enemy,true),true);
 assert.equal(swingCanHit(swing,player,{...enemy,z:4},true),false);assert.equal(swingCanHit(swing,player,{...enemy,x:2,z:0},true),false);assert.equal(swingCanHit(swing,player,enemy,false),false);assert.equal(swingCanHit(swing,player,{...enemy,health:0},true),false);
});
