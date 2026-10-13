export const SAVE_KEY = 'quiet-district-save-v1';
export const RESOURCES = {
  wood: { name: 'Дерево', icon: '▥', color: '#b89368', weight: 1 },
  metal: { name: 'Металл', icon: '⬡', color: '#a3b8bb', weight: 1 },
  wire: { name: 'Провод', icon: '⌁', color: '#dfaa65', weight: 0.5 },
  parts: { name: 'Детали', icon: '⚙', color: '#a7bc88', weight: 0.5 },
  cloth: { name: 'Ткань', icon: '▧', color: '#a5a1c4', weight: 0.5 },
  herbs: { name: 'Травы', icon: '❋', color: '#8eaf72', weight: 0.25 },
  fish: { name: 'Рыба', icon: '≈', color: '#7eb8bb', weight: 1 },
  pearl: { name: 'Перламутр', icon: '◈', color: '#e3d8b2', weight: 0.25 },
};
export const RECIPES = [
  { id: 'axe', name: 'Походный топор', category: 'tools', desc: 'Позволяет рубить деревья. Больше дерева с каждой вылазки.', cost: { wood: 3, metal: 4 }, slot: 'tool', icon: '⚒' },
  { id: 'pick', name: 'Шахтёрская кирка', category: 'tools', desc: 'Разбивает залежи металла у старого депо.', cost: { wood: 4, metal: 6 }, slot: 'tool', icon: '⚒' },
  { id: 'cutter', name: 'Болторез', category: 'tools', desc: 'Открывает запертые технические контейнеры.', cost: { metal: 10, parts: 3 }, slot: 'tool', icon: '✂' },
  { id: 'rod', name: 'Удочка из орешника', category: 'tools', desc: 'Рыбалка у затопленного причала. Забрось и дождись поклёвки.', cost: { wood: 5, cloth: 2, wire: 1 }, slot: 'tool', icon: '≈' },
  { id: 'rod2', name: 'Удочка «Глубина»', category: 'tools', desc: 'Шире зона подсечки. Повышает шанс редких находок.', cost: { wood: 6, metal: 5, parts: 3, pearl: 2 }, requires: 'rod', slot: 'tool', icon: '≈' },
  { id: 'spear', name: 'Стальное копьё', category: 'weapons', desc: 'Дальность 3 м · урон 25 · без боеприпасов.', cost: { wood: 5, metal: 7, cloth: 2 }, slot: 'weapon', damage: 25, range: 3, cooldown: 0.65, icon: '↗' },
  { id: 'pistol', name: 'Сигнальный бластер', category: 'weapons', desc: 'Дальность 11 м · урон 19 · расходует заряды.', cost: { metal: 12, parts: 4, wire: 3 }, slot: 'weapon', damage: 19, range: 11, cooldown: 0.48, icon: '⌁' },
  { id: 'carbine', name: 'Импульсный карабин', category: 'weapons', desc: 'Дальность 15 м · урон 30 · расходует заряды.', cost: { metal: 20, parts: 8, wire: 6, pearl: 2 }, requires: 'generator', slot: 'weapon', damage: 30, range: 15, cooldown: 0.32, icon: '⌁' },
  { id: 'vest', name: 'Рабочий жилет', category: 'gear', desc: 'Снижает входящий урон на 25%.', cost: { cloth: 6, metal: 3 }, slot: 'armor', defense: 0.25, icon: '▣' },
  { id: 'armor', name: 'Пластинчатая куртка', category: 'gear', desc: 'Снижает урон на 45%. Для дальних вылазок.', cost: { cloth: 10, metal: 12, parts: 3 }, requires: 'vest', slot: 'armor', defense: 0.45, icon: '▣' },
  { id: 'bag', name: 'Рюкзак сборщика', category: 'gear', desc: 'Вместимость 40 вместо 26. Больше находок за один путь.', cost: { cloth: 7, wood: 2 }, slot: 'bag', capacity: 40, icon: '▤' },
  { id: 'bag2', name: 'Экспедиционный рюкзак', category: 'gear', desc: 'Вместимость 60. Для долгих походов.', cost: { cloth: 12, metal: 4, parts: 2 }, requires: 'bag', slot: 'bag', capacity: 60, icon: '▤' },
  { id: 'boots', name: 'Походные ботинки', category: 'gear', desc: 'Скорость движения +18%.', cost: { cloth: 5, metal: 2 }, slot: 'boots', icon: '⌑' },
  { id: 'lantern', name: 'Походный фонарь', category: 'gear', desc: 'Тёплый свет сопровождает тебя в тумане.', cost: { metal: 4, wire: 2, parts: 1 }, slot: 'tool', icon: '☼' },
  { id: 'medkit', name: 'Полевая аптечка', category: 'supplies', desc: 'Восстанавливает 45 здоровья. Использование: Q.', cost: { herbs: 3, cloth: 2 }, repeatable: true, icon: '✚' },
  { id: 'meal', name: 'Уха с травами', category: 'supplies', desc: 'Восстанавливает 30 здоровья и всю выносливость.', cost: { fish: 1, herbs: 1, wood: 1 }, repeatable: true, icon: '♨' },
  { id: 'ammo', name: 'Энергозаряды × 12', category: 'supplies', desc: 'Боеприпасы для бластера и карабина.', cost: { metal: 2, wire: 1 }, repeatable: true, icon: '▰' },
  { id: 'generator', name: 'Восстановить генератор', category: 'shelter', desc: 'Верни свет домой. Питает мастерскую и открывает новые рецепты.', cost: { metal: 10, wire: 4, parts: 3 }, icon: 'ϟ', fixed: true },
  { id: 'bridge', name: 'Починить мост в депо', category: 'shelter', desc: 'Открывает северную часть депо с ценными контейнерами.', cost: { wood: 14, metal: 8 }, icon: '═', fixed: true },
  { id: 'lamp', name: 'Уличный фонарь', category: 'shelter', desc: 'Тёплый свет во дворе. Требуется электричество.', cost: { metal: 4, wire: 2 }, requires: 'generator', placeable: true, icon: '☼' },
  { id: 'bed', name: 'Удобная кровать', category: 'shelter', desc: 'Отдых полностью восстанавливает здоровье.', cost: { wood: 8, cloth: 5 }, placeable: true, icon: '▰' },
  { id: 'garden', name: 'Грядка с травами', category: 'shelter', desc: 'Даёт 3 травы каждые 90 секунд активной игры.', cost: { wood: 6, herbs: 2 }, placeable: true, icon: '❋' },
  { id: 'chest', name: 'Ящик для хранения', category: 'shelter', desc: 'Обустрой склад. Можно сдавать добычу рядом с ящиком.', cost: { wood: 7, metal: 2 }, placeable: true, icon: '▤' },
  { id: 'sofa', name: 'Диван из старого мира', category: 'shelter', desc: 'Уютный уголок с тканевой обивкой.', cost: { wood: 7, cloth: 6 }, placeable: true, icon: '▱' },
  { id: 'planter', name: 'Кашпо с папоротником', category: 'shelter', desc: 'Немного живой зелени в восстановленном доме.', cost: { wood: 3, herbs: 2 }, placeable: true, icon: '❧' },
  { id: 'rug', name: 'Тканый ковёр', category: 'shelter', desc: 'Тёплый акцент для жилой комнаты.', cost: { cloth: 4 }, placeable: true, icon: '▧' },
  { id: 'radio', name: 'Восстановить радиостанцию', category: 'shelter', desc: 'Поймай сигнал из соседнего района. Завершает первую главу.', cost: { metal: 8, wire: 6, parts: 6 }, requires: 'generator', fixed: true, icon: '◉' },
];
export const DEFAULT_WEAPON = { id: 'pipe', name: 'Стальная труба', damage: 13, range: 2.4, cooldown: 0.7 };
export const FISH = [
  { name: 'Речной окунь', rarity: 'Обычная', resource: 'fish', count: 1, chance: 0.46 },
  { name: 'Серебряный карась', rarity: 'Необычная', resource: 'fish', count: 2, chance: 0.29 },
  { name: 'Лунная форель', rarity: 'Редкая', resource: 'fish', count: 3, chance: 0.15 },
  { name: 'Перламутровая раковина', rarity: 'Редкая находка', resource: 'pearl', count: 1, chance: 0.10 },
];
export const HOME = { x: -16, z: 16 };
export function freshState() {
  return {
    version: 1, x: HOME.x + 1, z: HOME.z + 2, health: 100, stamina: 100,
    stash: { wood: 3, metal: 2, cloth: 2 }, bag: {}, owned: [],
    equipment: { weapon: 'pipe', armor: null, bag: null, boots: null },
    ammo: 0, medkits: 1, meals: 0, placed: [], depleted: {}, nodeLoot: {}, droneDeaths: {}, drops: [],
    elapsed: 0, fishCollection: [], kills: 0, trips: 0, gathered: 0,
    recovered: false, grave: null, settings: { sound: true, quality: 'high' },
    tutorial: true, chapterComplete: false,
  };
}
export function validateSave(input) {
  if (!input || input.version !== 1) return null;
  const state = freshState();
  for (const key of ['stash', 'bag']) {
    if (!input[key] || typeof input[key] !== 'object') return null;
    state[key] = {};
    for (const id of Object.keys(RESOURCES)) {
      const n = input[key][id];
      if (Number.isFinite(n) && n >= 0) state[key][id] = Math.floor(Math.min(n, 100000));
    }
  }
  for (const key of ['health', 'stamina']) {
    if (Number.isFinite(input[key])) state[key] = Math.max(key === 'health' ? 1 : 0, Math.min(100, input[key]));
  }
  for (const key of ['elapsed', 'ammo', 'medkits', 'meals', 'kills', 'trips', 'gathered']) {
    if (Number.isFinite(input[key])) state[key] = Math.max(0, Math.min(input[key], 100000000));
  }
  const ids = new Set(RECIPES.map(r => r.id));
  state.owned = [...new Set((Array.isArray(input.owned) ? input.owned : []).filter(id => ids.has(id)))];
  for (const slot of Object.keys(state.equipment)) {
    const id = input.equipment?.[slot];
    const recipe = RECIPES.find(r => r.id === id);
    if (id === 'pipe' && slot === 'weapon') state.equipment.weapon = 'pipe';
    else if (state.owned.includes(id) && recipe?.slot === slot) state.equipment[slot] = id;
  }
  for (const key of ['x', 'z']) if (Number.isFinite(input[key])) state[key] = Math.max(-43, Math.min(43, input[key]));
  state.placed = (Array.isArray(input.placed) ? input.placed : []).filter(p =>
    RECIPES.some(r => r.id === p.id && r.placeable) && Number.isFinite(p.x) && Number.isFinite(p.z)
    && p.x >= -26 && p.x <= -6 && p.z >= 6 && p.z <= 26
  ).slice(0, 70).map(p => ({ id: p.id, x: p.x, z: p.z, rotation: Number.isFinite(p.rotation) ? p.rotation : 0, harvested: Number.isFinite(p.harvested) ? Math.min(state.elapsed, Math.max(0, p.harvested)) : state.elapsed }));
  if (input.depleted && typeof input.depleted === 'object') {
    for (const [id, t] of Object.entries(input.depleted).slice(0, 1000)) if (Number.isFinite(t)) state.depleted[id] = t;
  }
  if (input.nodeLoot && typeof input.nodeLoot === 'object') {
    for (const [id, loot] of Object.entries(input.nodeLoot).slice(0, 1000)) {
      if (!loot || typeof loot !== 'object') continue;
      const clean = {};
      for (const resource of Object.keys(RESOURCES)) if (Number.isFinite(loot[resource]) && loot[resource] > 0) clean[resource] = Math.min(100000, Math.floor(loot[resource]));
      if (Object.keys(clean).length) state.nodeLoot[id] = clean;
    }
  }
  if (input.droneDeaths && typeof input.droneDeaths === 'object') {
    for (const [id, time] of Object.entries(input.droneDeaths).slice(0, 100)) if (Number.isFinite(time)) state.droneDeaths[id] = Math.max(0, Math.min(time, state.elapsed));
  }
  state.drops = (Array.isArray(input.drops) ? input.drops : []).filter(d => d && typeof d.id === 'string' && Number.isFinite(d.x) && Number.isFinite(d.z) && d.loot && typeof d.loot === 'object').slice(0, 100).map(d => {
    const loot = {};
    for (const resource of Object.keys(RESOURCES)) if (Number.isFinite(d.loot[resource]) && d.loot[resource] > 0) loot[resource] = Math.min(100000, Math.floor(d.loot[resource]));
    return { id: d.id.slice(0, 80), x: Math.max(-43, Math.min(43, d.x)), z: Math.max(-43, Math.min(43, d.z)), loot };
  }).filter(d => Object.keys(d.loot).length);
  state.fishCollection = (Array.isArray(input.fishCollection) ? input.fishCollection : []).filter(name => FISH.some(f => f.name === name));
  if (input.grave && Number.isFinite(input.grave.x) && Number.isFinite(input.grave.z)) {
    const loot = {};
    for (const id of Object.keys(RESOURCES)) if (Number.isFinite(input.grave.loot?.[id]) && input.grave.loot[id] > 0) loot[id] = Math.min(100000, Math.floor(input.grave.loot[id]));
    state.grave = { x: Math.max(-43, Math.min(43, input.grave.x)), z: Math.max(-43, Math.min(43, input.grave.z)), loot };
  }
  state.tutorial = input.tutorial !== false;
  state.chapterComplete = state.owned.includes('radio');
  state.settings.sound = input.settings?.sound !== false;
  state.settings.quality = input.settings?.quality === 'low' ? 'low' : 'high';
  return state;
}
export function bagWeight(state) {
  return Object.entries(state.bag).reduce((n, [id, count]) => n + (RESOURCES[id]?.weight || 0) * count, 0);
}
export function capacity(state) {
  return RECIPES.find(r => r.id === state.equipment.bag)?.capacity || 26;
}
export function total(state, id) { return (state.stash[id] || 0) + (state.bag[id] || 0); }
export function craftStatus(state, recipe) {
  if (!recipe) return { ok: false, reason: 'Неизвестный рецепт' };
  if (recipe.requires && !state.owned.includes(recipe.requires)) {
    return { ok: false, reason: `Нужно: ${RECIPES.find(r => r.id === recipe.requires)?.name}` };
  }
  if (!recipe.repeatable && !recipe.placeable && state.owned.includes(recipe.id)) return { ok: false, reason: 'Уже изготовлено', owned: true };
  if (recipe.placeable && state.placed.length >= 70) return { ok: false, reason: 'Достигнут лимит построек' };
  if (Object.entries(recipe.cost).some(([id, n]) => total(state, id) < n)) return { ok: false, reason: 'Не хватает материалов' };
  return { ok: true };
}
export function spend(state, cost) {
  if (Object.entries(cost).some(([id, n]) => total(state, id) < n)) return false;
  for (const [id, count] of Object.entries(cost)) {
    const fromStash = Math.min(state.stash[id] || 0, count);
    state.stash[id] = (state.stash[id] || 0) - fromStash;
    state.bag[id] = (state.bag[id] || 0) - (count - fromStash);
  }
  return true;
}
export function craft(state, id) {
  const recipe = RECIPES.find(r => r.id === id);
  const status = craftStatus(state, recipe);
  if (!status.ok) return status;
  if (recipe.placeable) return { ok: true, placement: true, recipe };
  spend(state, recipe.cost);
  if (recipe.repeatable) {
    if (id === 'ammo') state.ammo += 12;
    if (id === 'medkit') state.medkits++;
    if (id === 'meal') state.meals++;
  } else {
    state.owned.push(id);
    if (Object.hasOwn(state.equipment, recipe.slot)) state.equipment[recipe.slot] = id;
  }
  if (id === 'radio') state.chapterComplete = true;
  return { ok: true, recipe };
}
export function place(state, id, x, z, rotation = 0) {
  const recipe = RECIPES.find(r => r.id === id);
  if (!recipe?.placeable || !craftStatus(state, recipe).ok) return false;
  if (x < -26 || x > -6 || z < 6 || z > 26) return false;
  if (state.placed.some(p => Math.hypot(p.x - x, p.z - z) < 1.6)) return false;
  spend(state, recipe.cost);
  state.placed.push({ id, x, z, rotation, harvested: state.elapsed });
  return true;
}
export function collect(state, loot) {
  const received = {}, remaining = {};
  let space = capacity(state) - bagWeight(state);
  for (const [id, count] of Object.entries(loot)) {
    if (!RESOURCES[id]) continue;
    const n = Math.max(0, Math.min(count, Math.floor((space + 0.001) / RESOURCES[id].weight)));
    if (n) { state.bag[id] = (state.bag[id] || 0) + n; received[id] = n; state.gathered += n; space -= n * RESOURCES[id].weight; }
    if (n < count) remaining[id] = count - n;
  }
  return { received, remaining, full: Object.keys(remaining).length > 0 };
}
export function deposit(state) {
  let amount = 0;
  for (const [id, n] of Object.entries(state.bag)) { state.stash[id] = (state.stash[id] || 0) + n; amount += n; }
  state.bag = {};
  if (amount) state.trips++;
  return amount;
}
export function weapon(state) { return RECIPES.find(r => r.id === state.equipment.weapon) || DEFAULT_WEAPON; }
export function takeDamage(state, amount) {
  const defense = RECIPES.find(r => r.id === state.equipment.armor)?.defense || 0;
  state.health = Math.max(0, state.health - amount * (1 - defense));
  return state.health <= 0;
}
export function respawn(state) {
  const previous = state.grave;
  state.grave = { x: state.x, z: state.z, loot: { ...state.bag } };
  if (previous) for (const [id, n] of Object.entries(previous.loot)) state.grave.loot[id] = (state.grave.loot[id] || 0) + n;
  state.bag = {}; state.x = HOME.x; state.z = HOME.z + 3;
  state.health = 65; state.stamina = 100;
}
export function useSupply(state, id) {
  if (id === 'medkit' && state.medkits > 0 && state.health < 100) { state.medkits--; state.health = Math.min(100, state.health + 45); return true; }
  if (id === 'meal' && state.meals > 0 && (state.health < 100 || state.stamina < 100)) { state.meals--; state.health = Math.min(100, state.health + 30); state.stamina = 100; return true; }
  return false;
}
export function catchFish(rng = Math.random, upgraded = false) {
  const roll = rng();
  const probabilities = upgraded ? [0.3, 0.3, 0.22, 0.18] : FISH.map(f => f.chance);
  let cumulative = 0;
  return FISH.find((f, i) => { cumulative += probabilities[i]; return roll < cumulative; }) || FISH.at(-1);
}
export function objective(state) {
  if (!state.owned.includes('generator')) return { title: 'Верни свет домой', desc: 'Собери материалы и восстанови генератор на станции.', recipe: 'generator', number: '01' };
  if (!state.owned.includes('bridge')) return { title: 'Открой путь в депо', desc: 'Восстанови мост, чтобы добраться до технических запасов.', recipe: 'bridge', number: '02' };
  if (!state.owned.includes('radio')) return { title: 'Найди голос в тишине', desc: 'Восстанови радиостанцию и поймай сигнал соседнего района.', recipe: 'radio', number: '03' };
  return { title: 'Здесь снова есть жизнь', desc: 'Сигнал найден. Обустраивай дом, исследуй район и собирай коллекцию.', number: '✓' };
}
