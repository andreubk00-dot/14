import {WORLD_BOUNDS,FLOOD_DOCKS,FLOOD_ISLANDS,FLOOD_BUILDINGS,FLOOD_SUPPLIES,CAMP,BOAT_REPAIR,inWorld,inFloodWater,boatWater,cleanBoat,rowBoat} from '../src/floodplain.js';
import {repairField,transferCamp,campWeight,cookCamp} from '../src/game.js';
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
  const s = freshState(); s.stash = { wood: 100, metal: 100, parts: 100, wire: 100, pearl: 10, pumpmodule:1, battery:1 };
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
  assert.equal(clean.equipment.weapon, 'pipe'); assert.equal(clean.x, WORLD_BOUNDS.maxX);
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
 assert.deepEqual(mapPoint(.5,.5),{x:(WORLD_BOUNDS.minX+WORLD_BOUNDS.maxX)/2,z:0});
 const p=mapPoint((-49-WORLD_BOUNDS.minX+2)/(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX+4),(32-WORLD_BOUNDS.minZ+2)/(WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ+4));assert.ok(Math.abs(p.x+49)<1e-9);assert.ok(Math.abs(p.z-32)<1e-9);
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
 const s=freshState();s.cultivars=Object.keys(CROPS);s.stash={seeds:4,water:2};s.elapsed=100;const bed={id:'cropbed',x:-17,z:23,rotation:0,harvested:0,crop:null,plantedAt:null};s.placed=[bed];
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
import {GATES,FISHING_SPOTS,fishingProbabilities,weatherAt,gameHour} from '../src/expedition.js';
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
import {DRONE_TYPES,gearProfile,segmentHitsRect,droneSees,attackCharge} from '../src/survival.js';
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

import {swingProfile,swingCanHit,selectMeleeTarget,advanceSwing} from '../src/combat.js';
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

import {expeditionLoot} from '../src/district.js';
import {updateAwareness,reactToHit} from '../src/survival.js';
import {atCookingStove,COOKING_RECIPES} from '../src/game.js';
import {takeSalvage,processSalvage,recoverCargo,salvageStatus,toggleYardGate} from '../src/game.js';
import {furnitureColliders,yardRouteClear} from '../src/layout.js';
test('Whole salvage respects capacity, partial dismantling, duplicate pickup, station distance and storage',()=>{
 const s=freshState(),n={id:'node-98',machine:'appliance',loot:{metal:3,wire:2},group:{visible:true},respawnTime:240};
 s.bag={wood:20};assert.equal(takeSalvage(s,n).ok,false);s.bag={};assert.equal(takeSalvage(s,n).ok,true);assert.equal(bagWeight(s),8);assert.equal(takeSalvage(s,n).ok,false);
 const before={...s.stash};s.x=0;s.z=0;assert.equal(processSalvage(s,0).ok,false);assert.deepEqual(s.stash,before);
 s.x=-20;s.z=14;assert.equal(deposit(s),1);assert.equal(s.cargo.length,0);assert.equal(s.storedCargo.length,1);
 const saved=validateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(saved.storedCargo,s.storedCargo);
 assert.deepEqual(processSalvage(saved,0,true).received,{metal:3,wire:3,parts:2});assert.equal(processSalvage(saved,0,true).ok,false);
 s.elapsed=241;s.strippedNodes=[n.id];assert.equal(salvageStatus(s,n).ok,false);s.strippedNodes=[];n.accessGate='salvage';assert.equal(salvageStatus(s,n).ok,false);
});
test('Whole cargo survives death, save validation and partial recovery without splitting its reward',()=>{
 const s=freshState(),n={id:'node-50',machine:'motor',loot:{metal:6,parts:3},group:{visible:true}};
 takeSalvage(s,n);respawn(s);assert.equal(s.cargo.length,0);assert.equal(s.grave.cargo.length,1);
 const restored=validateSave(JSON.parse(JSON.stringify(s)));s.bag={wood:20};assert.equal(recoverCargo(s,s.grave.cargo),false);assert.equal(s.grave.cargo.length,1);
 s.bag={};assert.equal(recoverCargo(s,s.grave.cargo),true);assert.equal(bagWeight(s),10);assert.deepEqual(restored.grave.cargo,s.cargo);
 const broken=validateSave({...s,cargo:[{machine:'bad',node:'node-1',loot:{wood:4}},{machine:'motor',node:'node-1',loot:{wood:-5}}]});assert.equal(broken.cargo.length,0);
});
test('Yard sections meet without gaps, gate leaves stay solid and unsafe closing is rejected',()=>{
 const s=freshState();s.stash={wood:100,stone:100,metal:100};s.x=-18;s.z=18;
 assert.equal(place(s,'yardgate',-20,23),true);assert.equal(place(s,'yardfence',-22,23),true);assert.equal(place(s,'yardfence',-18,23),true);assert.equal(place(s,'yardpath',-20,23),true);
 const gate=s.placed[0];s.x=-20;s.z=24.2;assert.equal(toggleYardGate(s,gate).ok,true);assert.equal(gate.open,true);
 assert.equal(furnitureColliders(gate).some(r=>circleHitsRect(-20,23,.3,r)),false);assert.equal(furnitureColliders(gate).some(r=>circleHitsRect(-20.82,22.18,.3,r)),true);
 s.x=-20;s.z=23;assert.equal(toggleYardGate(s,gate).ok,false);s.z=24.2;assert.equal(toggleYardGate(s,gate).ok,true);assert.equal(gate.open,false);
 const restored=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.placed[0].open,false);
 const wall={id:'yardfence',x:-18,z:23,rotation:0};assert.equal(yardRouteClear({...s,x:-18,z:23},wall,[]),false);
 assert.equal(place(s,'yardpath',-18,15),false);
});
test('Repeat expeditions preserve initial loot and deterministic district supplies without multiplying rare filters',()=>{
 const pantry={id:'node-107',type:'crate',x:26,z:36,originalLoot:{vegetables:4,filterunit:1}};
 assert.deepEqual(expeditionLoot(pantry,0),pantry.originalLoot);assert.deepEqual(expeditionLoot(pantry,3),expeditionLoot(pantry,3));assert.equal(expeditionLoot(pantry,3).filterunit,1);
 const cycles=[1,2,3].map(i=>expeditionLoot(pantry,i));assert.ok(cycles.some(l=>l.herbs||l.water));assert.ok(cycles.every(l=>!l.battery&&!l.pumpmodule&&!l.metal));
 const textiles=expeditionLoot({...pantry,x:29,z:6,originalLoot:{cloth:3}},2);assert.ok(Object.keys(textiles).every(k=>['cloth','wire'].includes(k)));
});
test('New useful finds follow normal unique claims, capacity, placement and loadout storage',()=>{
 const s=freshState();s.storedFinds={campstove:1,toolcabinet:1};s.x=-20;s.z=23;
 assert.equal(place(s,'campstove',-20,23),true);assert.equal(atCookingStove(s),true);assert.deepEqual(COOKING_RECIPES,['meal','fishmeal','stew','tea']);assert.equal(place(s,'campstove',-16,23),false);
 assert.equal(place(s,'toolcabinet',-16,23),true);assert.equal(saveLoadout(s,0),true);assert.equal(validateSave(structuredClone(s)).placed.length,2);
 s.x=-16;s.z=14;assert.equal(atCookingStove(s),false);
});
test('Detection gives a warning, decays behind cover and close contact or a hit triggers a bounded search',()=>{
 const e={originX:0,originZ:0,windup:.5},s={x:0,z:5};assert.equal(updateAwareness(e,.2,true,s,5),false);assert.ok(e.suspicion>0&&e.suspicion<1);updateAwareness(e,.6,false,s,5);assert.equal(e.suspicion,0);
 updateAwareness(e,.7,true,s,5);assert.equal(e.alert,3);assert.deepEqual(e.lastSeen,s);updateAwareness(e,4,false,s,5);assert.equal(e.alert,0);
 updateAwareness(e,.01,true,s,1);assert.equal(e.suspicion,1);reactToHit(e,{x:100,z:100});assert.ok(Math.hypot(e.lastSeen.x,e.lastSeen.z)<=8.5+.001);assert.equal(e.windup,0);assert.equal(e.stagger,.18);
});


import {cargoStorageCapacity,salvageDuration} from '../src/salvage.js';

import {QUARTERS,FRONTIER_BUILDINGS,FRONTIER_NODES} from '../src/frontier.js';
import {DistrictAudio} from '../src/audio.js';
test('Cargo storage overflow keeps whole machines in the bag and a placed rack expands it without losing old saves',()=>{
 const s=freshState(),c={machine:'motor',node:'node-125',loot:{parts:2,metal:3}};s.cargo=Array.from({length:6},()=>structuredClone(c));assert.equal(cargoStorageCapacity(s),4);deposit(s);assert.equal(s.cargo.length,2);assert.equal(s.storedCargo.length,4);s.placed.push({id:'cargorack',x:-16,z:12,rotation:0});assert.equal(cargoStorageCapacity(s),16);deposit(s);assert.equal(s.cargo.length,0);assert.equal(s.storedCargo.length,6);assert.equal(validateSave(JSON.parse(JSON.stringify(s))).storedCargo.length,6);
});
test('Station upgrade improves common salvage yield and duration while preserving rare components and distant rejection',()=>{
 const s=freshState();s.x=-20;s.z=14;s.cargo=[{machine:'motor',node:'node-125',loot:{metal:3,battery:1,pumpmodule:1}}];assert.equal(salvageDuration(s),3.2);s.owned.push('precisionbench');assert.equal(salvageDuration(s),1.6);assert.equal(processSalvage(s,0).ok,true);assert.deepEqual(s.stash,{wood:3,metal:5,cloth:2,parts:4,wire:1,battery:1,pumpmodule:1});assert.equal(processSalvage(s,0).ok,false);
});
test('Long expedition gear trades materials for capacity and stealth, with independent save slots',()=>{
 const s=freshState();s.owned=['bag','bag2','boots'];s.stash={cloth:40,metal:20,parts:20,battery:2};assert.equal(craft(s,'trailpack').ok,true);assert.equal(capacity(s),80);assert.equal(craft(s,'quietboots').ok,true);const p=gearProfile(s,RECIPES);assert.equal(p.speed,1.12);assert.equal(p.visibility,.85);assert.equal(validateSave(JSON.parse(JSON.stringify(s))).equipment.bag,'trailpack');
});
test('Expanded places remain within map bounds and regenerated medicine never multiplies',()=>{
 assert.equal(QUARTERS.length,6);assert.equal(FRONTIER_BUILDINGS.length,24);assert.equal(FRONTIER_NODES.length,72);for(const [type,name,x,z,originalLoot]of FRONTIER_NODES){assert.ok(Math.abs(x)<WORLD_LIMIT&&Math.abs(z)<WORLD_LIMIT);if(originalLoot.medicine)assert.equal(expeditionLoot({id:'node-180',type,x,z,originalLoot},3).medicine,originalLoot.medicine);}
});
test('Recorded positional effects fade with distance and pan toward their source',()=>{const a=new DistrictAudio();a.setListener(10,10);assert.deepEqual(a.spatial(10,10),{gain:1,pan:0});assert.ok(a.spatial(20,10).gain<a.spatial(12,10).gain);assert.ok(a.spatial(20,10).pan>0);assert.ok(a.spatial(0,10).pan<0);});

import {ROADS} from '../src/district.js';
test('New streets do not intersect any new foundation or exterior wall',()=>{for(const b of FRONTIER_BUILDINGS){assert.ok(Math.abs(b.x)+b.w/2+.17<WORLD_LIMIT&&Math.abs(b.z)+b.d/2+.17<WORLD_LIMIT);for(const r of ROADS)assert.equal(overlaps(b,r,.17),false,`${b.sign}: road ${r.x},${r.z}`);}});
test('Regenerated frontier supplies stay tied to room contents instead of adding medicine to libraries',()=>{const b=FRONTIER_BUILDINGS.find(b=>b.style==='school'&&b.index===1),n=FRONTIER_NODES.find(n=>n[2]===b.x-b.w/4);for(let cycle=1;cycle<8;cycle++){const loot=expeditionLoot({id:'node-115',type:n[0],x:n[2],z:n[3],originalLoot:n[4],regionProfile:n[8]},cycle);assert.ok(Object.keys(loot).every(id=>Object.hasOwn(n[4],id)));}});

test('Large cargo warehouses stop at the save limit and overflow remains carried',()=>{const s=freshState(),c={machine:'motor',node:'node-125',loot:{metal:3}};s.placed=Array.from({length:20},()=>({id:'cargorack'}));assert.equal(cargoStorageCapacity(s),200);s.storedCargo=Array.from({length:199},()=>structuredClone(c));s.cargo=[structuredClone(c),structuredClone(c)];deposit(s);assert.equal(s.storedCargo.length,200);assert.equal(s.cargo.length,1);assert.equal(validateSave(JSON.parse(JSON.stringify(s))).storedCargo.length,200);});

import {activeFood,FOOD_EFFECTS} from '../src/food.js';
import {discoverCultivar} from '../src/homelife.js';
test('Harvest returns exactly the next planting seeds and remains atomic when only vegetables fit',()=>{
 const s=freshState();s.cultivars.push('vegetables');s.stash={seeds:2,water:2};const bed={id:'cropbed',x:-17,z:23,crop:null};s.placed=[bed];
 assert.equal(plantCrop(s,bed,'vegetables').ok,true);s.elapsed=181;s.bag={wood:24};const before=structuredClone(s);
 assert.equal(harvestProduction(s,bed).ok,false);assert.deepEqual(s,before);
 s.bag={};assert.equal(harvestProduction(s,bed).ok,true);assert.deepEqual(s.bag,{vegetables:4,seeds:2});assert.equal(harvestProduction(s,bed).ok,false);
 assert.equal(plantCrop(s,bed,'vegetables').ok,true);assert.equal(s.bag.seeds,0);
});
test('Seed discoveries need an actual seed pickup and cannot be duplicated or gained from ordinary trees',()=>{
 const s=freshState(),bed={id:'cropbed',x:-17,z:23,crop:null};s.placed=[bed];s.stash={seeds:10,water:10};
 assert.equal(plantCrop(s,bed,'vegetables').ok,false);assert.equal(discoverCultivar(s,{seedCrop:'vegetables'},{}),null);
 assert.equal(discoverCultivar(s,{machine:'standingtree'},{seeds:1}),null);
 assert.equal(discoverCultivar(s,{seedCrop:'vegetables'},{seeds:1}).name,CROPS.vegetables.name);
 assert.equal(discoverCultivar(s,{seedCrop:'vegetables'},{seeds:1}),null);assert.equal(plantCrop(s,bed,'vegetables').ok,true);
 assert.deepEqual(validateSave(s).cultivars,['herbs','vegetables']);
});
test('Legacy crop access and ordinary food survive migration while new stories discover varieties',()=>{
 const legacy=freshState();delete legacy.cultivars;legacy.meals=7;assert.deepEqual(validateSave(legacy).cultivars,Object.keys(CROPS));assert.equal(validateSave(legacy).meals,7);
 assert.deepEqual(validateSave(freshState()).cultivars,['herbs']);
 const planted=freshState();planted.placed=[{id:'cropbed',x:-17,z:23,crop:'flowers',plantedAt:0}];assert.ok(validateSave(planted).cultivars.includes('flowers'));
});
test('Cooking produces distinct portable dishes that inventory and hotbar can use',()=>{
 const s=freshState();s.stash={fish:2,vegetables:4,wood:1,water:1,herbs:1};assert.equal(craft(s,'fishmeal').ok,true);assert.equal(craft(s,'stew').ok,true);
 assert.equal(s.meals,0);assert.equal(s.fishmeals,2);assert.equal(s.stews,1);
 assert.equal(inventoryItems(s).find(i=>i.id==='fishmeal').count,2);assert.equal(hotbarItem(s,'stew').available,true);
 assert.equal(assignHotbar(s,4,'fishmeal'),true);assert.equal(validateSave(s).hotbar[4],'fishmeal');
});
test('One preparation effect replaces another, works at full health and does not waste identical food',()=>{
 const s=freshState();s.fishmeals=2;s.stews=1;s.meals=1;s.teas=1;
 assert.equal(useSupply(s,'fishmeal'),true);assert.equal(s.fishmeals,1);const until=s.foodEffect.until;
 s.elapsed=10;assert.equal(useSupply(s,'fishmeal'),false);assert.equal(s.foodEffect.until,until);assert.equal(s.fishmeals,1);
 assert.equal(useSupply(s,'stew'),true);assert.equal(activeFood(s).id,'stew');assert.equal(activeFood(s).sprintCost,1);
 s.health=50;assert.equal(useSupply(s,'meal'),true);assert.equal(activeFood(s).id,'stew');assert.equal(useSupply(s,'tea'),true);assert.equal(activeFood(s).id,'stew');
 respawn(s);assert.equal(activeFood(s),null);
});
test('Food timing expires in game time, reload preserves remaining time and corrupt effects are bounded',()=>{
 const s=freshState();s.elapsed=100;s.fishmeals=1;useSupply(s,'fishmeal');s.elapsed=200;const saved=validateSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeFood(saved).remaining,380);saved.elapsed=580;assert.equal(activeFood(saved),null);
 for(const effect of [{id:'toString',until:1000},{id:'stew',until:NaN},{id:'stew',until:100}])assert.equal(validateSave({...s,foodEffect:effect}).foodEffect,null);
 assert.equal(activeFood(validateSave({...s,foodEffect:{id:'stew',until:1e20}})).remaining,480);
 assert.doesNotThrow(()=>validateSave({...s,placed:{},packedFurniture:7,cultivars:['toString','flowers','flowers']}));
});
test('Prepared meals change actual stamina drain and recovery without changing movement distance',()=>{
 const normal=new Locomotion(),fed=new Locomotion();const a=normal.update(1,1,0,100,true),b=fed.update(1,1,0,100,true,false,FOOD_EFFECTS.fishmeal);
 assert.equal(a.stamina,84);assert.equal(b.stamina,88.8);assert.equal(a.x,b.x);
 const rest=new Locomotion().update(1,0,0,40,false,false,FOOD_EFFECTS.stew);assert.equal(rest.stamina,58.2);
 const expired=freshState();expired.foodEffect={id:'fishmeal',until:0};assert.equal(new Locomotion().update(1,1,0,100,true,false,activeFood(expired)).stamina,84);
});
test('Orchard seed discoveries belong to stocked agricultural rooms',()=>{
 const discoveries=FRONTIER_NODES.filter(n=>n[9]);assert.equal(discoveries.length,4);assert.ok(discoveries.some(n=>n[9]==='flowers'));
 for(const n of discoveries){assert.ok(n[4].seeds>0);assert.ok(n[2]<-60&&n[3]<-50);}
});

import {ORCHARD_ROUTES,ORCHARD_COVER,ORCHARD_PATHS,ORCHARD_PATROL,ORCHARD_FINDS,ORCHARD_MEMORIES} from '../src/orchard.js';
test('Quiet garden detour stays out of patrol sight throughout its full patrol circle',()=>{
 for(let phase=0;phase<Math.PI*2;phase+=.1){
  const e={x:ORCHARD_PATROL.x+Math.sin(phase)*2.2,z:ORCHARD_PATROL.z+Math.cos(phase)*2.2};
  for(let i=1;i<ORCHARD_ROUTES.quiet.length;i++){
   const a=ORCHARD_ROUTES.quiet[i-1],b=ORCHARD_ROUTES.quiet[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);
   for(let n=0;n<=steps;n++){const x=a.x+(b.x-a.x)*n/steps,z=a.z+(b.z-a.z)*n/steps;if(Math.hypot(e.x-x,e.z-z)<=DRONE_TYPES.guardian.vision)assert.equal(segmentHitsRect(e.x,e.z,x,z,ORCHARD_COVER),true,`${phase}: ${x},${z}`);}
  }
 }
 const length=route=>route.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);
 assert.ok(length(ORCHARD_ROUTES.quiet)>length(ORCHARD_ROUTES.direct)*1.3);
 assert.deepEqual(ORCHARD_ROUTES.quiet.at(-1),ORCHARD_ROUTES.direct.at(-1));
 for(const path of ORCHARD_PATHS){assert.equal(path.garden,true);for(const b of FRONTIER_BUILDINGS)assert.equal(overlaps(path,b,.17),false);}
});
test('Orchard room contents differ by purpose and reusable loot remains tied to the same room',()=>{
 const rooms=FRONTIER_BUILDINGS.filter(b=>b.style==='orchard');const roomNodes=b=>FRONTIER_NODES.filter(n=>Math.abs(n[2]-b.x)<b.w/2&&Math.abs(n[3]-b.z)<b.d/2);
 assert.ok(roomNodes(rooms[0]).filter(n=>n[4].seeds).length>=2);assert.ok(roomNodes(rooms[1]).some(n=>n[4].flowers));assert.ok(roomNodes(rooms[2]).some(n=>n[4].cloth));assert.ok(roomNodes(rooms[3]).some(n=>n[4].metal));assert.ok(roomNodes(rooms[3]).some(n=>n[4].parts));
 for(const b of rooms)for(const n of roomNodes(b))for(const cycle of [1,4,9]){const loot=expeditionLoot({id:'node-170',type:n[0],x:n[2],z:n[3],originalLoot:n[4],regionProfile:n[8]},cycle);assert.ok(Object.keys(loot).every(id=>Object.hasOwn(n[4],id)));}
});
test('Appended garden finds and memories use existing save, claim and recovery systems',()=>{
 const s=freshState();for(let i=0;i<2;i++){const n=ORCHARD_FINDS[i];assert.equal(claimFind(s,{id:`node-${207+i}`,find:n[6]}).ok,true);assert.equal(claimFind(s,{id:`node-${207+i}`,find:n[6]}).ok,false);}
 s.notes=ORCHARD_MEMORIES.map(n=>n.id);const saved=validateSave(s);assert.deepEqual(saved.finds,{desklamp:1,wallshelf:1});assert.deepEqual(saved.notes,s.notes);assert.deepEqual(saved.findClaims,['node-207','node-208']);
 const old=freshState();old.depleted={'node-206':50};old.elapsed=80;assert.equal(validateSave(old).depleted['node-206'],50);
});

import {OUTLAND_LIMIT,OUTLAND_PLACES,OUTLAND_BUILDINGS,OUTLAND_PATHS,OUTLAND_RESOURCE_SITES,OUTLAND_RESOURCES,OUTLAND_SUPPLIES,OUTLAND_FINDS,OUTLAND_MEMORIES,FOREST_LAKE,inForestWater,forestTrees} from '../src/outlands.js';
test('Expanded world has substantial new land, inhabited clearings and reusable resource sites',()=>{
 assert.ok((WORLD_LIMIT/112)**2>3);assert.equal(WORLD_LIMIT,OUTLAND_LIMIT);assert.equal(OUTLAND_PLACES.length,9);assert.equal(OUTLAND_BUILDINGS.length,17);assert.ok(OUTLAND_RESOURCE_SITES.length>100);
 for(const b of OUTLAND_BUILDINGS){assert.ok(Math.abs(b.x)+b.w/2<WORLD_LIMIT-2&&Math.abs(b.z)+b.d/2<WORLD_LIMIT-2);for(const p of OUTLAND_PATHS)assert.equal(overlaps(b,p,.17),false,b.id);}
 for(const [type,,x,z,items,tool,,machine]of OUTLAND_RESOURCES){assert.ok(Math.abs(x)>112||Math.abs(z)>112);assert.equal(machine,type==='tree'?'standingtree':'quarry');assert.equal(tool,type==='tree'?'axe':'pick');assert.ok(type==='tree'?items.wood>=8:items.stone>=6);}
});
test('New forest covers all sides, avoids houses and leaves the pier free of trees',()=>{
 const trees=forestTrees();assert.ok(trees.length>=1000);assert.deepEqual(forestTrees(),trees);
 for(const direction of [p=>p.x<-116,p=>p.x>116,p=>p.z<-116,p=>p.z>116])assert.ok(trees.filter(direction).length>150);
 for(const p of trees){assert.ok(Math.abs(p.x)>116||Math.abs(p.z)>116);assert.ok(!inForestWater(p.x,p.z));assert.ok(Math.abs(p.x-100)>8||Math.abs(p.z-164)>3);for(const b of OUTLAND_BUILDINGS)assert.ok(Math.abs(p.x-b.x)>b.w/2+1||Math.abs(p.z-b.z)>b.d/2+1);}
});
test('Forest lake blocks the shore conservatively while the full fishing approach stays on the deck',()=>{
 for(let x=94;x<=105;x+=.25)assert.equal(inForestWater(x,164,.3),false);
 for(const [x,z]of [[120,164],[104,168],[132,160],[105,166]])assert.equal(inForestWater(x,z,.3),true);
 assert.equal(inForestWater(92,164,.3),false);assert.ok(FISHING_SPOTS.some(p=>p.id==='forestlake'&&p.x===104&&p.z===164));
 assert.ok(fishingProbabilities(false,{spot:'forestlake',hour:22})[2]>fishingProbabilities(false,{spot:'forestlake',hour:12})[2]);
});
test('Distant positions, graves, new finds and forest notes persist alongside older claims',()=>{
 const s=freshState();s.x=190;s.z=-185;s.elapsed=200;s.findClaims=['node-209'];s.grave={x:-195,z:198,loot:{wood:7},finds:{armchair:1}};
 const first=210+OUTLAND_SUPPLIES.length+OUTLAND_RESOURCES.length;assert.equal(claimFind(s,{id:`node-${first}`,find:OUTLAND_FINDS[0][6]}).ok,true);s.notes=OUTLAND_MEMORIES.map(n=>n.id);s.visited.push('forestlake','dachas');
 const clean=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(clean.x,190);assert.equal(clean.z,-185);assert.equal(clean.grave.x,-195);assert.equal(clean.grave.z,198);assert.ok(clean.findClaims.includes('node-209'));assert.ok(clean.findClaims.includes(`node-${first}`));assert.deepEqual(clean.notes,s.notes);assert.ok(clean.visited.includes('forestlake'));
});
test('Forest shortcut uses the existing axe and opening state without blocking access to the whole region',()=>{
 const gate=GATES.find(g=>g.id==='forest-cut'),s=freshState();s.x=gate.x;s.z=gate.z;assert.equal(openGate(s,gate.id).ok,false);s.owned=['axe'];assert.equal(openGate(s,gate.id).ok,true);assert.ok(validateSave(s).openedGates.includes(gate.id));assert.equal(openGate(s,gate.id).ok,false);
});

// The expanded map should supply existing home improvements, without another currency.
test('Forest workshops and nursery supply existing station upgrades with bounded special parts',()=>{
 const stock=(id,i)=>OUTLAND_SUPPLIES[OUTLAND_BUILDINGS.findIndex(b=>b.id===id)*2+i];
 assert.equal(OUTLAND_SUPPLIES.length,34);
 const battery=stock('quarryshop',0),pump=stock('eastshop',0),filters=stock('nursery',1);
 assert.equal(battery[4].battery,1);assert.equal(pump[4].pumpmodule,1);assert.equal(filters[4].filterunit,2);
 for(const n of [battery,pump,filters])for(const cycle of [0,1,5,100]){
  const items=expeditionLoot({id:'node-230',type:n[0],x:n[2],z:n[3],originalLoot:n[4],regionProfile:n[8]},cycle);
  for(const id of ['battery','pumpmodule','filterunit'])assert.equal(items[id],n[4][id]);
  assert.ok(Object.keys(items).every(id=>Object.hasOwn(n[4],id)));
 }
 const s=freshState();s.stash={metal:14,cloth:4};
 for(const n of [battery,pump,filters]){assert.equal(collect(s,n[4]).full,false);deposit(s);}
 s.placed=[{id:'raincatcher',x:-13,z:23},{id:'dryrack',x:-17,z:23}];
 for(const item of s.placed)assert.equal(upgradeStation(s,item).ok,true);
 assert.equal(s.stash.battery,0);assert.equal(s.stash.pumpmodule,0);assert.equal(s.stash.filterunit,0);
 const restored=validateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored.placed.every(p=>p.upgrade===1));
});
test('Nursery seeds unlock flowers while dacha seeds retain the vegetable route',()=>{
 for(const [id,crop] of [['nursery','flowers'],['gardenhouse','vegetables']]){
  const n=OUTLAND_SUPPLIES[OUTLAND_BUILDINGS.findIndex(b=>b.id===id)*2],s=freshState();
  const received=collect(s,n[4]).received;assert.equal(discoverCultivar(s,{seedCrop:n[9]},received).name,CROPS[crop].name);
  const bed={id:'cropbed',x:-17,z:23,crop:null};s.placed=[bed];s.stash.water=1;
  assert.equal(plantCrop(s,bed,crop).ok,true);s.elapsed=CROPS[crop].interval;
  assert.equal(harvestProduction(s,bed).ok,true);assert.ok(s.bag[crop]>0);
  assert.ok(validateSave(s).cultivars.includes(crop));
 }
});

import {placementStatus,furniturePoint} from '../src/layout.js';
import {snapStructure} from '../src/construction.js';
import {harvestTimeline,advanceHarvest} from '../src/harvesting.js';
import {updateCutawayMaterial} from '../src/roofs.js';
test('Placement explains bounds, blocked approaches, occupied furniture and rain cover',()=>{
 const cases=[
  [{id:'sofa',x:-24.8,z:13},[],[],/целиком/],
  [{id:'planter',x:-18,z:19.5},[],[],/дверь/],
  [{id:'planter',x:-16,z:12},[{x:-16,z:12,w:1,d:1}],[],/стена/],
  [{id:'planter',x:-16,z:12},[],[{id:'sofa',x:-16,z:12}],/мебель/],
  [{id:'raincatcher',x:-16,z:12},[],[],/открытый/],
 ];
 for(const [item,obstacles,placed,reason]of cases){assert.match(placementStatus(item,obstacles,placed).reason,reason);assert.equal(placementAllowed(item,obstacles,placed),false);}
 assert.deepEqual(placementStatus({id:'planter',x:-16.3,z:12.2},[],[]),{ok:true});
 const shelf={id:'wallshelf',...clockAnchor(-18,10.66,'wallshelf')};assert.match(placementStatus(shelf,[],[shelf]).reason,/занят/);assert.equal(placementStatus(shelf,[],[shelf],0).ok,true);
});
test('Furniture uses small increments while structural floors and edges still join exactly',()=>{
 assert.deepEqual(furniturePoint(-16.31,12.24),{x:-16.3,z:12.2});assert.deepEqual(furniturePoint(-16.3,12.2),{x:-16.3,z:12.2});
 const root=snapStructure('floor',-18.12,20.73,[]);assert.deepEqual(root,{id:'floor',x:-18,z:20.5});
 assert.deepEqual(snapStructure('floor',-16.1,20.6,[root]),{id:'floor',x:-16,z:20.5});
 assert.deepEqual(snapStructure('wall',-19.1,20.7,[root]),{id:'wall',x:-19,z:20.5,axis:'z'});
});
test('Harvesting has exactly one final contact at completion and repeated updates cannot replay beats',()=>{
 for(const duration of [2,2.25,4,4.5]){
  const beats=harvestTimeline(duration),strikes=beats.filter(b=>b.type==='strike');assert.equal(strikes.at(-1).time,duration);assert.equal(strikes.filter(b=>b.final).length,1);
  for(const hit of strikes)assert.ok(beats.some(b=>b.type==='swing'&&Math.abs(hit.time-b.time-.2)<1e-8));
  const job={beats,elapsed:duration-.001},early=advanceHarvest(job);assert.ok(early.every(b=>!b.final));assert.deepEqual(advanceHarvest(job),[]);
  job.elapsed=duration;assert.deepEqual(advanceHarvest(job),[{type:'strike',time:duration,final:true}]);assert.deepEqual(advanceHarvest(job),[]);
 }
 assert.deepEqual(harvestTimeline(0),[]);
});
test('Harvest swishes use slice recordings and final contacts use the downloaded heavier samples',()=>{
 const a=new DistrictAudio(),played=[];a.playSample=(id,volume,rate,pos)=>{played.push({id,pos});return true;};
 a.swing('axe');a.swing('pick');assert.ok(played.every(p=>p.id==='knife_slice_2'));played.length=0;
 a.resourceHit('standingtree',5,7);assert.match(played.at(-1).id,/^impact_wood_medium_00[01]$/);
 a.resourceHit('standingtree',5,7,true);assert.match(played.at(-1).id,/^impact_wood_heavy_00[01]$/);
 a.resourceHit('quarry',5,7,true);assert.match(played.at(-1).id,/^impact_mining_00[34]$/);assert.deepEqual(played.at(-1).pos,{x:5,z:7});
});
test('Restored cutaways return to the opaque pass, fading reopens blending and glazing stays translucent',()=>{
 let version=0;const m={opacity:.035,transparent:true,set needsUpdate(v){if(v)version++;}};
 assert.equal(updateCutawayMaterial(m,1,2),true);assert.equal(m.opacity,1);assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.equal(version,1);
 updateCutawayMaterial(m,1,.016);assert.equal(version,1);
 assert.equal(updateCutawayMaterial(m,.035,.1),false);assert.equal(m.transparent,true);assert.equal(m.depthWrite,false);assert.equal(version,2);
 updateCutawayMaterial(m,.035,2);assert.equal(m.opacity,.035);updateCutawayMaterial(m,.38,2);assert.equal(m.opacity,.38);assert.equal(m.transparent,true);assert.equal(version,2);
});

import * as THREE from 'three';
import {staticShadowBatches} from '../src/shadow-batches.js';
test('Static shadow batches keep every solid triangle and leave moving or cutaway meshes independent',()=>{
 const scene=new THREE.Scene(),make=(x,color,tag=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial({color}));m.position.x=x;m.castShadow=true;m.userData.staticBatch=tag;scene.add(m);return m;};
 const a=make(2,'#889977'),b=make(4,'#776655'),moving=make(5,'#ffffff',false),roof=make(6,'#ff0000');roof.userData.cutaway=true;scene.updateMatrixWorld(true);
 const shadowFrustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().makeOrthographic(-10,10,10,-10,-10,10));const result=staticShadowBatches(scene,[a,b,moving,roof],shadowFrustum);assert.equal(result.length,1);assert.equal(a.castShadow,false);assert.equal(b.castShadow,false);assert.equal(moving.castShadow,true);assert.equal(roof.castShadow,true);
 const proxy=result[0].mesh;assert.equal(proxy.geometry.attributes.position.count,72);assert.equal(proxy.geometry.boundingSphere.center.x,3);assert.equal(proxy.material.colorWrite,false);assert.equal(proxy.material.depthWrite,false);assert.equal(proxy.intersectsFrustum(shadowFrustum),true);assert.equal(proxy.intersectsFrustum(new THREE.Frustum()),false);
});

test('Existing quarter-metre furniture coordinates survive saving without being snapped to the new preview grid',()=>{
 const s=freshState();s.placed=[{id:'bed',x:-18,z:23.25,rotation:0,harvested:0}];assert.equal(validateSave(JSON.parse(JSON.stringify(s))).placed[0].z,23.25);
});

test('Manual map notes survive old saves, reject corrupt coordinates and cap imported notes', async () => {
 const {cleanMapMarks,addMapMark,MAX_MAP_MARKS}=await import('../src/map-marks.js');
 const s=freshState();assert.equal(addMapMark(s,167,70,'  Запас дерева  '),true);
 assert.equal(addMapMark(s,Infinity,70,'wrong'),false);assert.equal(addMapMark(s,WORLD_BOUNDS.maxX+1,0,'wrong'),false);
 assert.deepEqual(validateSave(s).mapMarks,[{id:1,x:167,z:70,label:'Запас дерева'}]);
 assert.deepEqual(cleanMapMarks([null,{id:1,x:0,z:0,label:'\u0000  '},{id:1,x:10,z:0},{id:2,x:'10',z:0}]),[{id:1,x:0,z:0,label:'Метка'}]);
 for(let i=1;i<MAX_MAP_MARKS;i++)assert.equal(addMapMark(s,i,0,'x'.repeat(60)),true);
 assert.equal(addMapMark(s,0,0,'overflow'),false);assert.equal(s.mapMarks[1].label.length,32);
 assert.equal(cleanMapMarks([...s.mapMarks,{id:99,x:0,z:0}]).length,MAX_MAP_MARKS);
 delete s.mapMarks;delete s.keepResources;assert.deepEqual(validateSave(s).mapMarks,[]);assert.deepEqual(validateSave(s).keepResources,[]);
});

test('Deposit preserves selected materials and equipment without duplicating haul or trips', () => {
 const s=freshState();s.bag={wood:4,metal:5,water:2};s.keepResources=['wood','water'];s.medkits=3;s.meals=2;s.ammo=12;
 const gear=structuredClone(s.equipment);assert.equal(deposit(s),5);
 assert.deepEqual(s.bag,{wood:4,water:2});assert.deepEqual(s.lastHaul,{metal:5});assert.equal(s.stash.metal,7);
 assert.equal(deposit(s),0);assert.equal(s.trips,1);assert.equal(s.medkits,3);assert.equal(s.meals,2);assert.equal(s.ammo,12);assert.deepEqual(s.equipment,gear);
 const loaded=validateSave({...s,keepResources:['wood','wood','__proto__','fake','water']});assert.deepEqual(loaded.keepResources,['wood','water']);
 loaded.keepResources=[];assert.equal(deposit(loaded),6);assert.deepEqual(loaded.bag,{});
});

import {beginEnemyAttack,advanceEnemyAttack,segmentDistance} from '../src/enemy-combat.js';
import {DRONE_TYPES as HOSTILES,reactToHit as interruptHostile} from '../src/survival.js';
const hostile=(kind)=>({kind,x:0,z:0,originX:0,originZ:0,alert:3,cooldown:0,stagger:0});
test('Heavy attacks lock a visible aim point, allow dodging and recover before the next attack',()=>{
 const e=hostile('warden'),p={x:0,z:2};assert.equal(beginEnemyAttack(e,p,false),false);assert.equal(beginEnemyAttack(e,{x:0,z:3},true),false);
 assert.equal(beginEnemyAttack(e,p,true),true);p.x=5;assert.equal(advanceEnemyAttack(e,.8,()=>false),null);
 const hit=advanceEnemyAttack(e,.35,()=>false);assert.equal(hit.kind,'slam');assert.deepEqual([hit.x,hit.z],[0,2]);assert.ok(Math.hypot(p.x-hit.x,p.z-hit.z)>hit.radius);
 assert.equal(beginEnemyAttack(e,{x:0,z:1},true),false);e.cooldown=0;assert.equal(beginEnemyAttack(e,{x:0,z:1},true),true);
 interruptHostile(e,{x:0,z:1});assert.equal(e.attack,null);assert.equal(e.windup,0);
});
test('Runner telegraphs, charges at the original target, stops on obstacles and hits only once',()=>{
 const e=hostile('runner');beginEnemyAttack(e,{x:0,z:2},true);assert.equal(advanceEnemyAttack(e,.5,()=>false),null);assert.equal(e.z,0);
 advanceEnemyAttack(e,.15,()=>false);const first=advanceEnemyAttack(e,.1,()=>false);assert.equal(first.kind,'dash');assert.ok(first.bz>0);first.attack.hit=true;
 const next=advanceEnemyAttack(e,.1,()=>false);assert.equal(next.damage,0);advanceEnemyAttack(e,.1,()=>true);assert.equal(e.attack,null);assert.ok(e.z<2);
});
test('Gunner emits a single locked shot, and swept projectile distance catches crossing hits',()=>{
 const e=hostile('gunner');beginEnemyAttack(e,{x:6,z:0},true);assert.equal(advanceEnemyAttack(e,1,()=>false),null);
 const shot=advanceEnemyAttack(e,.05,()=>false);assert.equal(shot.kind,'shot');assert.equal(shot.x,6);assert.equal(advanceEnemyAttack(e,.5,()=>false),null);
 assert.equal(segmentDistance(1,0,0,0,3,0),0);assert.equal(segmentDistance(1,2,0,0,3,0),2);assert.equal(segmentDistance(4,0,0,0,3,0),1);
 for(const kind of ['warden','runner','gunner'])assert.ok(HOSTILES[kind].health>0&&HOSTILES[kind].windup>=.6&&HOSTILES[kind].loot);
});

test('Downloaded enemy models retain their pinned CC0 source bytes and local dependencies',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{MODEL_FILES}=await import('../src/model-assets.js');
 for(const [id,hash] of Object.entries({runner:'7112f6a08400914f9da546f3e6029e947cc9eab2b4a6da5eb99776111289efb1',warden:'047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319'})){
  const data=await readFile(new URL('../public/assets/models/'+MODEL_FILES[id],import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),hash);
  const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));assert.ok(json.animations.length>0);
  for(const image of json.images||[])if(image.uri)assert.ok((await readFile(new URL('../public/assets/models/enemies/'+image.uri,import.meta.url))).length>0);
 }
 const license=await readFile(new URL('../public/assets/models/enemies/WARDEN-README.md',import.meta.url),'utf8');assert.match(license,/CC0 1.0/);
});

test('Animated downloaded warden fits its real height after cloning, with feet on the floor',async()=>{
 const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{clone}=await import('three/addons/utils/SkeletonUtils.js'),{Box3,Vector3,AnimationMixer}=await import('three'),{fitEnemyModel}=await import('../src/enemy-models.js');
 const data=await readFile(new URL('../public/assets/models/enemies/warden.glb',import.meta.url));const asset=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const model=clone(asset.scene),mixer=new AnimationMixer(model);mixer.clipAction(asset.animations.find(c=>c.name==='Idle')).play();mixer.update(0);fitEnemyModel(model,1.8);
 const b=new Box3().setFromObject(model,true),size=b.getSize(new Vector3());assert.ok(Math.abs(size.y-1.8)<.001);assert.ok(Math.abs(b.min.y)<.001);assert.ok(size.x<1.5);
 mixer.update(.5);model.updateMatrixWorld(true);const animated=new Box3().setFromObject(model,true);assert.ok(animated.min.y>-.05&&animated.max.y<2);
});


test('A committed swing hits the nearest visible actor entering its arc, never a crowd or a covered actor',()=>{
 const player={x:0,z:0},swing={weapon:{range:2.8},profile:swingProfile('pipe'),facing:0};
 const original={x:0,z:2.5,health:50},interceptor={x:.2,z:1.5,health:38},behind={x:0,z:-1,health:50},dead={x:0,z:.5,health:0};
 assert.equal(selectMeleeTarget(swing,player,[original,interceptor,behind,dead],()=>true),interceptor);
 assert.equal(selectMeleeTarget(swing,player,[original,interceptor],e=>e!==interceptor),original);
 assert.equal(selectMeleeTarget(swing,player,[original,interceptor],()=>false),null);
 assert.equal(selectMeleeTarget(swing,player,[behind,dead],()=>true),null);
 interceptor.z=4;assert.equal(selectMeleeTarget(swing,player,[original,interceptor],()=>true),original);
});
test('New firearms include their stated charges exactly once and failed crafts or save loads never refill them',()=>{
 const s=freshState();assert.equal(craft(s,'pistol').ok,false);assert.equal(s.ammo,0);
 s.stash={metal:100,parts:100,wire:100,pearl:2};s.ammo=3;
 assert.equal(craft(s,'pistol').ok,true);assert.equal(s.ammo,9);
 const spent=structuredClone(s.stash);assert.equal(craft(s,'pistol').ok,false);assert.equal(s.ammo,9);assert.deepEqual(s.stash,spent);
 assert.equal(craft(s,'carbine').ok,false);assert.equal(s.ammo,9);
 s.owned.push('generator');assert.equal(craft(s,'carbine').ok,true);assert.equal(s.ammo,21);
 s.ammo=0;assert.equal(validateSave(JSON.parse(JSON.stringify(s))).ammo,0);
 assert.equal(craft(s,'ammo').ok,true);assert.equal(s.ammo,12);
});


import {reflectionScissor} from '../src/reflections.js';
test('Reflection cropping contains every visible water vertex, ignores hidden water and skips empty views',()=>{
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,50);camera.position.set(0,10,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,48));mesh.rotation.x=-Math.PI/2;mesh.scale.set(2,1,1);mesh.updateMatrixWorld(true);
 const target={width:512,height:512,scissor:new THREE.Vector4()},point=new THREE.Vector3();
 assert.equal(reflectionScissor([mesh],camera,target),true);assert.ok(target.scissor.z*target.scissor.w<512*512/4);
 const pos=mesh.geometry.attributes.position;
 for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld).project(camera);const x=(point.x+1)*256,y=(point.y+1)*256;assert.ok(x>=target.scissor.x&&x<=target.scissor.x+target.scissor.z&&y>=target.scissor.y&&y<=target.scissor.y+target.scissor.w);}
 mesh.visible=false;assert.equal(reflectionScissor([mesh],camera,target),false);
 mesh.visible=true;mesh.position.x=30;mesh.updateMatrixWorld(true);assert.equal(reflectionScissor([mesh],camera,target),false);
 mesh.geometry.dispose();mesh.material.dispose();
});

test('Post-radio utilities use workshop components and reduce farm cycles without invalidating owned upgrades',()=>{
 const s=freshState();s.owned=['generator','radio'];s.stash={metal:100,wire:100,parts:100};const before=structuredClone(s.stash);
 assert.equal(craft(s,'pump').ok,false);assert.deepEqual(s.stash,before);
 const east=OUTLAND_SUPPLIES[OUTLAND_BUILDINGS.findIndex(b=>b.id==='eastshop')*2];collect(s,east[4]);deposit(s);assert.equal(craft(s,'pump').ok,true);
 assert.equal(productionInfo(s,{id:'garden',harvested:0}).interval,67.5);assert.equal(craft(s,'solar').ok,false);
 const north=OUTLAND_SUPPLIES[OUTLAND_BUILDINGS.findIndex(b=>b.id==='northshed')*2];collect(s,north[4]);deposit(s);assert.equal(craft(s,'solar').ok,true);
 assert.equal(productionInfo(s,{id:'garden',harvested:0}).interval,50.625);
 const saved=validateSave(JSON.parse(JSON.stringify(s)));assert.ok(saved.owned.includes('pump')&&saved.owned.includes('solar'));assert.equal(saved.stash.pumpmodule,0);assert.equal(saved.stash.battery,0);
});
test('Ventilated drying shortens new batches only and keeps its timer when saved and packed',()=>{
 const s=freshState();s.x=-16;s.z=22;const d={id:'dryrack',x:-20,z:23,harvested:0};s.placed=[d];s.stash={fish:6,herbs:3,...STATION_UPGRADES.dryrack.cost};
 assert.equal(startDrying(s,d).ok,true);s.elapsed=50;assert.equal(upgradeStation(s,d).ok,true);assert.equal(productionInfo(s,d).remaining,50);
 s.elapsed=100;assert.equal(harvestProduction(s,d).mealOutput,2);assert.equal(startDrying(s,d).ok,true);assert.equal(d.dryingDuration,75);
 s.elapsed=120;assert.equal(packFurniture(s,0),true);s.elapsed=1000;const saved=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(unpackFurniture(saved,0,-20,23,0),true);assert.equal(productionInfo(saved,saved.placed[0]).remaining,55);
 saved.elapsed+=55;assert.equal(harvestProduction(saved,saved.placed[0]).mealOutput,4);assert.equal(harvestProduction(saved,saved.placed[0]).ok,false);
 const old=validateSave({...freshState(),elapsed:40,placed:[{id:'dryrack',x:-20,z:23,harvested:0,upgrade:1,dryingAt:10,dryingOutput:4}]});assert.equal(productionInfo(old,old.placed[0]).remaining,70);
});
test('Room-specific supplies remain useful and do not grow unrelated resources on repeat visits',()=>{
 for(const b of FRONTIER_BUILDINGS){const nodes=FRONTIER_NODES.filter(n=>Math.abs(n[2]-b.x)<b.w/2&&Math.abs(n[3]-b.z)<b.d/2);
  assert.equal(nodes.length,3);
  if(b.style==='retail'&&b.index===2)assert.ok(nodes.every(n=>!n[4].vegetables&&!n[4].metal&&!n[4].parts));
  if(b.style==='port'&&b.index===2)assert.ok(nodes.every(n=>!n[4].battery&&!n[4].pumpmodule));
  for(const n of nodes)for(const cycle of [1,4,12]){const loot=expeditionLoot({id:'node-130',type:n[0],x:n[2],z:n[3],originalLoot:n[4],regionProfile:n[8]},cycle);assert.ok(Object.keys(loot).every(id=>Object.hasOwn(n[4],id)));}
 }
 const pumps=FRONTIER_BUILDINGS.find(b=>b.style==='port'&&b.index===3);assert.ok(FRONTIER_NODES.some(n=>Math.abs(n[2]-pumps.x)<4&&n[4].pumpmodule));
});

import {staticColourKey,colourGeometry} from '../src/static-colours.js';
test('Static colour sharing preserves linear colours and vertices, and separates every other material setting',()=>{
 const red=new THREE.MeshStandardMaterial({color:'#9d673a',roughness:.88}),green=new THREE.MeshStandardMaterial({color:'#638a71',roughness:.88});
 assert.equal(staticColourKey(red),staticColourKey(green));const metal=red.clone();metal.metalness=.5;assert.notEqual(staticColourKey(red),staticColourKey(metal));
 const g=new THREE.BoxGeometry(1,2,3),before=Array.from(g.attributes.position.array),normals=Array.from(g.attributes.normal.array);colourGeometry(g,red.color);
 assert.deepEqual(Array.from(g.attributes.position.array),before);assert.deepEqual(Array.from(g.attributes.normal.array),normals);
 for(let i=0;i<g.attributes.color.count;i++)for(const [axis,value]of [['X',red.color.r],['Y',red.color.g],['Z',red.color.b]])assert.ok(Math.abs(g.attributes.color['get'+axis](i)-value)<1e-7);
 const textured=red.clone();textured.map=new THREE.Texture();assert.equal(staticColourKey(textured),null);const glowing=red.clone();glowing.emissive.set('#ff5500');assert.equal(staticColourKey(glowing),null);
 const dynamic=red.clone();dynamic.userData.dryRoughness=.88;assert.equal(staticColourKey(dynamic),null);
 g.dispose();for(const m of [red,green,metal,textured,glowing,dynamic])m.dispose();textured.map.dispose();
});

test('A single static colour cell retains an independent directional shadow proxy',()=>{
 const scene=new THREE.Scene(),material=new THREE.MeshStandardMaterial({vertexColors:true}),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),material);mesh.castShadow=true;mesh.userData.staticBatch=true;scene.add(mesh);scene.updateMatrixWorld(true);
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().makeOrthographic(-10,10,10,-10,-10,10)),batches=staticShadowBatches(scene,[mesh],frustum);
 assert.equal(batches.length,1);assert.equal(mesh.castShadow,false);assert.equal(batches[0].mesh.intersectsFrustum(frustum),true);assert.equal(batches[0].mesh.intersectsFrustum(new THREE.Frustum()),false);
 for(const o of [mesh,batches[0].mesh]){o.geometry.dispose();o.material.dispose();}
});


test('Flood islands, dry piers and navigable water use the same footprint',()=>{
 for(const d of FLOOD_DOCKS){assert.equal(inWorld(d.foot.x,d.foot.z),true);assert.equal(inFloodWater(d.foot.x,d.foot.z,.3),false,d.id);assert.equal(boatWater(d.boat.x,d.boat.z),true,d.id);assert.ok(Math.hypot(d.foot.x-d.boat.x,d.foot.z-d.boat.z)<3);}
 for(const island of FLOOD_ISLANDS)assert.equal(inFloodWater(island.x,island.z,.3),false);
 assert.equal(inFloodWater(248,40),true);assert.equal(boatWater(248,40),true);assert.equal(boatWater(286,64),false);assert.equal(boatWater(262,70),false);assert.equal(inWorld(300,150),false);
 for(const b of FLOOD_BUILDINGS)for(const [type,name,x,z]of FLOOD_SUPPLIES.filter(n=>n[2]>b.x-b.w/2&&n[2]<b.x+b.w/2&&n[3]>b.z-b.d/2&&n[3]<b.z+b.d/2)){assert.equal(inFloodWater(x,z,.4),false,name);}
});
test('Field repairs spend carried materials once and never reach the home stash',()=>{
 const s=freshState(),d=FLOOD_DOCKS[0];s.x=d.foot.x;s.z=d.foot.z;s.stash={wood:100,cloth:100,metal:100};let before=structuredClone(s);assert.equal(repairField(s,'boat').ok,false);assert.deepEqual(s,before);
 s.bag={...BOAT_REPAIR};assert.equal(repairField(s,'boat').ok,true);assert.equal(s.boat.repaired,true);assert.deepEqual(s.stash,before.stash);assert.equal(Object.values(s.bag).reduce((a,b)=>a+b),0);before=structuredClone(s);assert.equal(repairField(s,'boat').ok,false);assert.deepEqual(s,before);
 s.bag={...CAMP.cost};assert.equal(repairField(s,'camp').ok,false);s.x=CAMP.x;s.z=CAMP.z;assert.equal(repairField(s,'camp').ok,true);assert.equal(s.camp.ready,true);assert.equal(repairField(s,'camp').ok,false);
});
test('Boat rowing cannot cross banks, piers or the outer water boundary at slow frame rates',()=>{
 for(const hz of [15,30,60]){const b=cleanBoat({repaired:true,x:248,z:40,aboard:true});for(let i=0;i<hz*10;i++){rowBoat(b,1/hz,1,0);assert.equal(boatWater(b.x,b.z),true);}assert.ok(b.x<318.5);}
 const b=cleanBoat({repaired:true,...FLOOD_DOCKS[0].boat});for(let i=0;i<500;i++)rowBoat(b,.05,-1,0);assert.ok(b.x>237.49);assert.equal(boatWater(b.x,b.z),true);
 const c=cleanBoat({repaired:true,x:248,z:-85});for(let i=0;i<1000;i++)rowBoat(c,.1,0,-1);assert.ok(c.z>-90.5);assert.equal(boatWater(c.x,c.z),true);
});
test('Boat movement is consistent across frame rates and coasts smoothly to rest',()=>{
 const positions=[];for(const hz of [30,60,120]){const b=cleanBoat({repaired:true,x:248,z:-5});for(let i=0;i<hz*3;i++)rowBoat(b,1/hz,0,1);positions.push(b.z);const speed=Math.hypot(b.vx,b.vz);rowBoat(b,1/hz,0,0);assert.ok(Math.hypot(b.vx,b.vz)<speed);for(let i=0;i<hz*3;i++)rowBoat(b,1/hz,0,0);assert.ok(Math.hypot(b.vx,b.vz)<.001);}assert.ok(Math.max(...positions)-Math.min(...positions)<.1);
});
test('Boat and camp save validation supports old saves and rejects unsafe state',()=>{
 const old=freshState();delete old.boat;delete old.camp;const base=validateSave(old);assert.equal(base.boat.repaired,false);assert.deepEqual(base.camp,{ready:false,store:{}});
 const s=freshState();s.boat={repaired:true,aboard:true,x:248,z:40,heading:1,lastDock:'reedcamp'};s.x=-16;s.z=16;s.camp={ready:true,store:{wood:55,cloth:100,wire:-1,unknown:99}};
 const restored=validateSave(s);assert.equal(restored.x,248);assert.equal(restored.z,40);assert.equal(restored.boat.lastDock,'reedcamp');assert.equal(campWeight(restored),60);assert.equal(restored.camp.store.unknown,undefined);assert.equal(restored.camp.store.wire,undefined);
 const corrupt=cleanBoat({repaired:true,aboard:true,x:286,z:64,heading:Infinity,lastDock:'bad'});assert.equal(boatWater(corrupt.x,corrupt.z),true);assert.equal(corrupt.lastDock,'shore');assert.equal(Number.isFinite(corrupt.heading),true);
 s.x=365;s.z=12;s.boat.aboard=false;s.drops=[{id:'drop-flood',x:365,z:12,loot:{metal:1}}];s.grave={x:351,z:26,loot:{wood:2}};const distant=validateSave(s);assert.equal(distant.x,365);assert.deepEqual(distant.drops,s.drops);assert.deepEqual(distant.grave,s.grave);
});
test('Camp storage is local, capacity limited and cannot duplicate or remotely move resources',()=>{
 const s=freshState();s.camp.ready=true;s.bag={wood:26};s.x=CAMP.x;s.z=CAMP.z;const stash=structuredClone(s.stash);
 assert.equal(transferCamp(s,'wood','deposit',26).count,26);assert.equal(s.bag.wood,0);assert.equal(s.camp.store.wood,26);assert.deepEqual(s.stash,stash);
 s.camp.store.wood=58;s.bag.wood=10;assert.equal(transferCamp(s,'wood','deposit',10).count,2);assert.equal(campWeight(s),60);assert.equal(s.bag.wood,8);
 assert.equal(transferCamp(s,'wood','withdraw',60).count,18);assert.equal(bagWeight(s),26);assert.equal(s.camp.store.wood,42);assert.equal(transferCamp(s,'wood','withdraw',1).ok,false);
 s.x=0;const before=structuredClone(s);assert.equal(transferCamp(s,'wood','deposit',1).ok,false);assert.deepEqual(s,before);s.x=CAMP.x;assert.equal(transferCamp(s,'wood','deposit',-1).ok,false);assert.equal(transferCamp(s,'wood','wrong',1).ok,false);assert.equal(transferCamp(s,'unknown','deposit',1).ok,false);
});
test('Camp cooking uses carried ingredients, yields actual food and keeps home production separate',()=>{
 const s=freshState();s.x=CAMP.x;s.z=CAMP.z;s.camp.ready=true;s.stash={fish:100,herbs:100};s.camp.store={fish:10,herbs:10};assert.equal(cookCamp(s,'meal').ok,false);s.bag={fish:1,herbs:1,wood:1};assert.equal(cookCamp(s,'meal').ok,true);assert.equal(s.meals,1);assert.deepEqual(s.stash,{fish:100,herbs:100});assert.deepEqual(s.camp.store,{fish:10,herbs:10});assert.equal(cookCamp(s,'meal').ok,false);assert.equal(cookCamp(s,'generator').ok,false);s.x=0;assert.equal(cookCamp(s,'tea').ok,false);
});
test('Death leaves recoverable supplies on land and returns the boat to the connected shore',()=>{
 const s=freshState();s.boat={repaired:true,aboard:true,x:300,z:55,heading:0,lastDock:'reedcamp'};s.x=300;s.z=55;s.bag={metal:3};s.camp={ready:true,store:{wood:7}};respawn(s);assert.equal(s.boat.aboard,false);assert.equal(s.boat.repaired,true);assert.equal(s.boat.x,FLOOD_DOCKS[0].boat.x);assert.deepEqual({x:s.grave.x,z:s.grave.z},FLOOD_DOCKS[1].foot);assert.deepEqual(s.grave.loot,{metal:3});assert.deepEqual(s.camp.store,{wood:7});assert.equal(inFloodWater(s.grave.x,s.grave.z),false);
});


test('Map destinations on an island or pier direct a boat to safe docking water',async()=>{
 const {waterDestination,FLOOD_TREES,FLOOD_OBSTACLES,FLOOD_POSTS}=await import('../src/floodplain.js');
 for(const island of FLOOD_ISLANDS){const point=waterDestination(island.x,island.z),dock=FLOOD_DOCKS.find(d=>d.id===island.id);assert.deepEqual(point,dock.boat);assert.equal(boatWater(point.x,point.z),true);}
 for(const dock of FLOOD_DOCKS)assert.deepEqual(waterDestination(dock.foot.x,dock.foot.z),dock.boat);
 assert.deepEqual(waterDestination(310,59),{x:310,z:59});
 for(const o of [...FLOOD_TREES.map(t=>({...t,w:.65*t.scale,d:.65*t.scale})),...FLOOD_OBSTACLES,...FLOOD_POSTS])for(const b of FLOOD_BUILDINGS)assert.equal(overlaps(o,b,.2),false,`Obstacle ${o.x},${o.z} clips ${b.id}`);
});

import {RESTORATIONS,restoreRoute,restorationStatus,cleanRestorations,drainBlocked,restoredDecks} from '../src/restoration.js';
import {walkRegion,FLOOD_STREETS} from '../src/floodplain.js';
import {roadSurfaces,surfaceEdges} from '../src/roads.js';
test('Road union has exactly one surface per point, asphalt priority and stable cell boundaries',()=>{
 const roads=[{x:-24,z:-24,w:12,d:4},{x:-24,z:-24,w:4,d:12},{x:-24,z:-23,w:14,d:8,garden:true}],surfaces=roadSurfaces(roads);
 const inside=(x,z,r)=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2;
 for(let x=-32.125;x<-15;x+=.25)for(let z=-32.125;z<-15;z+=.25){const a=roads.filter(r=>inside(x,z,r)),b=surfaces.filter(r=>inside(x,z,r));assert.equal(b.length,a.length?1:0);if(b.length)assert.equal(b[0].garden,a.every(r=>r.garden));}
 for(const r of surfaces){assert.ok(r.w>0&&r.d>0);assert.ok(Math.floor((r.x-r.w/2+1e-7)/24)===Math.floor((r.x+r.w/2-1e-7)/24));assert.ok(Math.floor((r.z-r.d/2+1e-7)/24)===Math.floor((r.z+r.d/2-1e-7)/24));}
 assert.deepEqual(roadSurfaces([]),[]);assert.ok(surfaceEdges(roads).every(e=>!e.w!==!e.d));
});
test('Every mainland road joins the district network and flood roads avoid building foundations',()=>{
 const seen=new Set([0]),queue=[0];while(queue.length){const r=ROADS[queue.shift()];ROADS.forEach((b,i)=>{if(!seen.has(i)&&Math.abs(r.x-b.x)<=(r.w+b.w)/2+.001&&Math.abs(r.z-b.z)<=(r.d+b.d)/2+.001){seen.add(i);queue.push(i);}});}assert.equal(seen.size,ROADS.length);
 for(const r of FLOOD_STREETS)for(const b of FLOOD_BUILDINGS)assert.ok(Math.abs(r.x-b.x)>=(r.w+b.w)/2||Math.abs(r.z-b.z)>=(r.d+b.d)/2,`${b.id} intersects street`);
});
test('Restoration rechecks carried resources, tool, proximity and hull clearance atomically',()=>{
 for(const p of RESTORATIONS){const s=freshState();s.x=p.x;s.z=p.z;s.bag={...p.cost};const before=structuredClone(s);assert.equal(restoreRoute(s,p.id).ok,false);assert.deepEqual(s,before);s.owned.push('wrench');s.bag={};s.stash={...p.cost};assert.equal(restoreRoute(s,p.id).ok,false);s.bag={...p.cost};s.x+=10;assert.equal(restoreRoute(s,p.id).ok,false);s.x=p.x;
 if(p.decks){Object.assign(s.boat,{x:p.decks[0].x,z:p.decks[0].z});assert.equal(restorationStatus(s,p.id).ok,false);Object.assign(s.boat,FLOOD_DOCKS[0].boat);}
 assert.equal(restorationStatus(s,p.id).ok,true);assert.deepEqual(s.bag,p.cost);assert.equal(restoreRoute(s,p.id).ok,true);assert.deepEqual(s.bag,Object.fromEntries(Object.keys(p.cost).map(k=>[k,0])));const after=structuredClone(s);assert.equal(restoreRoute(s,p.id).ok,false);assert.deepEqual(s,after);assert.deepEqual(validateSave(s).restoredRoutes,[p.id]);}
 assert.deepEqual(cleanRestorations(['bad','camp-crossing','camp-crossing',null]),['camp-crossing']);assert.deepEqual(validateSave({...freshState(),restoredRoutes:null}).restoredRoutes,[]);
});
test('Repaired bridges join foot regions while all five docks remain reachable by boat',()=>{
 const ids=RESTORATIONS.map(p=>p.id);assert.notEqual(walkRegion(301,49),walkRegion(325,35));assert.equal(walkRegion(301,49,ids),walkRegion(325,35,ids));assert.equal(walkRegion(358,76,ids),walkRegion(325,35,ids));assert.equal(inFloodWater(301,40,.3),true);assert.equal(inFloodWater(301,40,.3,ids),false);assert.equal(boatWater(301,40,1.5,ids),false);
 for(const dock of FLOOD_DOCKS){const start={x:240,z:84},goal={x:Math.round(dock.boat.x),z:Math.round(dock.boat.z)};const route=gridPath(start,goal,(x,z)=>!boatWater(x,z,1.5,ids),40000,(ax,az,bx,bz)=>!boatWater((ax+bx)/2,(az+bz)/2,1.5,ids));assert.ok(route.length,`${dock.id} unreachable`);}
 const b=cleanBoat({repaired:true,aboard:true,x:301,z:40},ids);assert.deepEqual({x:b.x,z:b.z},FLOOD_DOCKS[0].boat);assert.ok(restoredDecks(ids).length===3);
 assert.equal(drainBlocked(280,-68,.3),true);assert.equal(drainBlocked(280,-73,.3,ids),false);assert.equal(drainBlocked(280,-57,.3),false);
});
import {curbSegments} from '../src/roads.js';
test('Street curbs leave the full width of crossing roads and footpaths open',()=>{
 const segments=curbSegments([{x:0,z:3,w:35,d:6},{x:5,z:-8,w:4,d:2}],4.25,-20,20);
 assert.deepEqual(segments,[[-20,-9.25],[-6.75,-.25],[6.25,20]]);
});

import {supplyPeriod,discoverNearby} from '../src/expedition-balance.js';
import {PATROL_ROUTES,patrolRoute,idlePatrolTarget} from '../src/patrols.js';
import {roomTheme} from '../src/room-dressing.js';
test('Supply recovery supports varied trips, preserves natural harvesting pace and never renews drops',()=>{
 assert.equal(supplyPeriod({type:'herbs'}),120);assert.equal(supplyPeriod({type:'tree',machine:'standingtree'}),240);assert.equal(supplyPeriod({type:'ore',machine:'quarry'}),240);assert.equal(supplyPeriod({type:'crate'}),480);assert.equal(supplyPeriod({type:'scrap',machine:'motor'}),600);assert.equal(supplyPeriod({type:'crate',originalLoot:{battery:1}}),900);assert.equal(supplyPeriod({type:'drop',originalLoot:{battery:1}}),Infinity);
});
test('Discovery remains append-only, idempotent and respects distances and temporary drops',()=>{
 const s=freshState(),places=[{id:'near',x:s.x,z:s.z,radius:2},{id:'far',x:s.x+3,z:s.z,radius:2}],nodes=[{id:'node-1',x:s.x,z:s.z},{id:'node-1',x:s.x,z:s.z},{id:'node-2',x:s.x+4,z:s.z},{id:'drop-1',x:s.x,z:s.z}];assert.equal(discoverNearby(s,places,nodes),true);assert.deepEqual(s.visited,['home','near']);assert.deepEqual(s.foundNodes,['node-1']);assert.equal(discoverNearby(s,places,nodes),false);
 s.x+=1;assert.equal(discoverNearby(s,places,nodes),true);assert.deepEqual(s.foundNodes,['node-1','node-2']);assert.deepEqual(validateSave(s).foundNodes,s.foundNodes);
});
test('Room stocks and visual themes follow intended use without changing content identities',()=>{
 const library=FRONTIER_BUILDINGS.find(b=>b.style==='school'&&b.index===1);assert.equal(roomTheme(library),'library');const books=FRONTIER_NODES.filter(n=>Math.abs(n[2]-library.x)<library.w/2&&Math.abs(n[3]-library.z)<library.d/2);assert.ok(books.every(n=>!n[4].parts&&!n[4].wire&&!n[4].medicine));
 assert.equal(roomTheme({style:'village',index:1}),'tailor');assert.equal(roomTheme({style:'retail',index:2}),'clinic');
 const pack=RECIPES.find(r=>r.id==='trailpack');assert.equal(pack.cost.battery,undefined);assert.equal(pack.capacity,80);assert.equal(pack.requires,'bag2');assert.ok(pack.cost.cloth>RECIPES.find(r=>r.id==='bag2').cost.cloth);
 const fresh=freshState();fresh.owned=['bag','bag2'];fresh.stash={...pack.cost};assert.equal(craft(fresh,'trailpack').ok,true);assert.equal(capacity(fresh),80);assert.equal(validateSave(fresh).equipment.bag,'trailpack');
});
test('Patrol routes avoid blocked waypoints, keep leashes and advance through actual route length',()=>{
 const blocked=(x,z)=>x===1&&z===0,origin={x:0,z:0},route=patrolRoute('unknown',origin,blocked);assert.ok(route.length>=3);assert.ok(route.every(p=>!blocked(p.x,p.z)&&Math.hypot(p.x,p.z)<9));
 const enemy={x:0,z:0,patrolIndex:0,patrolRoute:[{x:0,z:0},{x:1,z:0},{x:0,z:2}]};assert.equal(idlePatrolTarget(enemy,blocked),null);assert.equal(enemy.patrolIndex,1);assert.equal(idlePatrolTarget(enemy,blocked),null);assert.equal(enemy.patrolIndex,2);assert.deepEqual(idlePatrolTarget(enemy,blocked),{x:0,z:2});enemy.z=2;assert.equal(idlePatrolTarget(enemy,blocked),null);assert.equal(enemy.patrolIndex,0);assert.equal(Object.keys(PATROL_ROUTES).length,9);
});
