import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, validateSave, RECIPES, craft, craftStatus, collect, deposit, bagWeight, capacity, place, takeDamage, respawn, catchFish, useSupply, objective } from '../src/game.js';

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
  craft(s, 'radio'); assert.equal(s.chapterComplete, true); assert.equal(objective(s).recipe, undefined);
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
