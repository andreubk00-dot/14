import {QUARRY_WORKSHOP,QUARRY_FIELD_RECIPES} from './quarry.js';
import {GUNS} from './combat.js';
import {cleanRestorations} from './restoration.js';
import {WORLD_BOUNDS,freshBoat,cleanBoat,FLOOD_DOCKS,CAMP,BOAT_REPAIR} from './floodplain.js';
import {cleanMapMarks} from './map-marks.js';
import {SUPPLY_FIELDS,FOOD_EFFECTS,activeFood} from './food.js';
import {CARGO_WEIGHT,cleanCargo,cargoLoot,cargoStorageCapacity} from './salvage.js';
import {STRUCTURES,dismantleAllowed,cleanConstruction,replacementPlan} from './construction.js';
import {STATION_UPGRADES,collectorCapacity,dryingBatch} from './upgrades.js';
import { GATES, BAITS, fishingProbabilities, weatherAt } from './expedition.js';
import { FINDS, CROPS, MEMORIES, cropInfo } from './homelife.js';
import { footprint, overlaps, circleHitsRect, placementAllowed, yardRouteClear, furnitureColliders } from './layout.js';
import { WORLD_LIMIT, LOCATIONS } from './district.js';
export const SAVE_KEY = 'quiet-district-save-v1';
export const RESOURCES = {
 stone:{name:'Камень',desc:'Для оснований и деревянных стен. Добывается киркой из валунов.',color:'#a9b7b6',weight:1},
  filterunit:{name:'Сменный фильтр',desc:'Для двойного дождевого накопителя. Встречается в насосной и хозяйственных запасах.',color:'#b9cec0',weight:1},
  pumpmodule:{name:'Насосный узел',desc:'Для водоснабжения, накопителя и сортировки лома. Ищи в насосной, на складе насосов набережной и в мастерской на восточной просеке.',color:'#92b8bf',weight:2},
  battery:{name:'Аккумулятор',desc:'Для солнечных панелей, улучшенной сушилки и сортировочного модуля. Ищи в гаражной технике, ремонтной мастерской у разреза и северном лесном складе.',color:'#d3b774',weight:1.5},
  medicine:{name:'Медицинские материалы',color:'#d9c9b3',weight:.25},
  vegetables:{name:'Овощи',color:'#dda06b',weight:.5},
  flowers:{name:'Цветы',color:'#dca4b8',weight:.1},
  seeds: { name: 'Семена', icon: 'herbs', color: '#b5c68b', weight: 0.25 },
  wood: { name: 'Дерево', icon: '▥', color: '#b89368', weight: 1 },
  metal: { name: 'Металл', icon: '⬡', color: '#a3b8bb', weight: 1 },
  wire: { name: 'Провод', icon: '⌁', color: '#dfaa65', weight: 0.5 },
  parts: { name: 'Детали', icon: '⚙', color: '#a7bc88', weight: 0.5 },
  cloth: { name: 'Ткань', icon: '▧', color: '#a5a1c4', weight: 0.5 },
  herbs: { name: 'Травы', icon: '❋', color: '#8eaf72', weight: 0.25 },
  fish: { name: 'Рыба', icon: '≈', color: '#7eb8bb', weight: 1 },
  pearl: { name: 'Перламутр', icon: '◈', color: '#e3d8b2', weight: 0.25 },
  water: { name: 'Чистая вода', icon: 'water', color: '#84bfc7', weight: 0.5 },
};
export const RECIPES = [
 {id:'workawning',name:'Навес ремонтной бригады',category:'shelter',desc:'Небольшой металлический навес во дворе. Под ним не идёт дождь; открытые стороны сохраняют проход.',cost:{wood:6,metal:8,cloth:3},placeable:true},
 {id:'stunner',name:'Дуговой разрядник',category:'weapons',desc:'Дальность 5 м · урон 6. Сбивает атаку тяжёлого противника, освобождая время для отхода. Быстро перегревается. Обычные энергозаряды.',cost:{metal:10,parts:5,wire:6,battery:1},schematic:'quarry-discharge',slot:'weapon',damage:6,range:5,cooldown:1.2},
 {id:'knife',name:'Походный клинок',category:'weapons',desc:'Урон 11 · дистанция 1,6 м · быстрый удар за 6 выносливости. Можно двигаться во время замаха; тяжёлые атаки не прерывает.',cost:{metal:4,cloth:2},slot:'weapon',damage:11,range:1.6,cooldown:.32},
 {id:'heavyaxe',name:'Тяжёлый боевой топор',category:'weapons',desc:'Урон 42 · дистанция 2,1 м · 24 выносливости. Долгий замах прерывает даже удар тяжёлого смотрителя.',cost:{wood:6,metal:12,parts:3,cloth:3},requires:'axe',slot:'weapon',damage:42,range:2.1,cooldown:1.05},
 {id:'cargorack',name:'Стеллаж для техники',category:'shelter',desc:'Хранение целой техники: +12 мест к четырём базовым. Работает после установки дома. Общий предел: 200 агрегатов.',cost:{wood:10,metal:6},placeable:true},
 {id:'precisionbench',name:'Разборочный верстак',category:'shelter',desc:'Разбор привезённой техники за 1,6 вместо 3,2 секунды. Ещё одна ремонтная деталь с каждого груза.',cost:{metal:18,parts:12,wire:6,battery:1},requires:'generator',fixed:true},
 {id:'trailpack',name:'Рюкзак дальнего маршрута',category:'gear',desc:'Вместимость 80 без штрафа скорости. Для вылазок в дальние кварталы.',cost:{cloth:16,metal:4,parts:4},requires:'bag2',slot:'bag',capacity:80},
 {id:'quietboots',name:'Мягкие походные ботинки',category:'gear',desc:'Скорость +12% · дистанция обнаружения −15%. Тихий обход патрулей.',cost:{cloth:10,parts:4,metal:3},requires:'boots',slot:'boots',speedMultiplier:1.12,visibilityMultiplier:.85},
 {id:'yardfence',name:'Деревянная ограда',category:'shelter',desc:'Секция 2 м для двора. Секции ставятся вплотную; проход к дому должен оставаться свободным.',cost:{wood:4,stone:1},placeable:true},
 {id:'yardgate',name:'Дворовая калитка',category:'shelter',desc:'Проход в ограде. Открывается рядом клавишей E; створка участвует в коллизиях.',cost:{wood:4,metal:2},placeable:true},
 {id:'yardpath',name:'Каменная дорожка',category:'shelter',desc:'Площадка 2 × 2 м. Не мешает ходить; можно соединять в дорожку.',cost:{stone:3},placeable:true},
 {id:'scoutcoat',name:'Куртка разведчика',category:'gear',desc:'12% защиты · скорость +8% · дистанция обнаружения −25%. Для обхода патрулей.',cost:{cloth:9,herbs:3,parts:2},slot:'armor',defense:.12,speedMultiplier:1.08,visibilityMultiplier:.75},
 {id:'hauler',name:'Грузовая рама',category:'gear',desc:'Вместимость 70 · скорость −16%. Для больших партий добычи.',cost:{wood:8,metal:7,cloth:8},requires:'bag',slot:'bag',capacity:70,speedMultiplier:.84},
 {id:'raincatcher',name:'Дождевой накопитель',category:'shelter',desc:'Фильтрует дождевую воду во дворе. До 6 воды; сбор вручную.',cost:{wood:6,metal:4,cloth:2},placeable:true},
 {id:'dryrack',name:'Сушилка для улова',category:'shelter',desc:'2 рыбы и 1 трава → 2 порции еды за 100 секунд. Загрузка и сбор вручную.',cost:{wood:8,cloth:3,wire:2},placeable:true},
 {id:'gearrack',name:'Стеллаж комплектов',category:'shelter',desc:'Сохрани два комплекта экипировки и быстро меняй их дома.',cost:{wood:8,metal:3},placeable:true},
 {id:'dressing',name:'Аптечка из медицинских запасов',category:'supplies',desc:'Аптечка из уцелевших материалов клиники. Восстанавливает 45 здоровья; использование Q.',cost:{medicine:1,cloth:1},repeatable:true},
 {id:'lure',name:'Многоразовая блесна',category:'tools',desc:'Привлекает форель. Выбирается у воды; не расходуется.',cost:{metal:3,wire:2,pearl:1},requires:'rod',slot:'tool'},
 {id:'fishmeal',output:2,name:'Рыба, запечённая с овощами',category:'supplies',desc:'Выход: 2 порции. Каждая: +30 здоровья, полная выносливость. На 8 минут: бег расходует на 30% меньше выносливости. Заменяет эффект другого блюда.',cost:{fish:2,vegetables:2,wood:1},repeatable:true},
 {id:'fishtrophy',name:'Панно «Лунная форель»',category:'shelter',desc:'Память о редком улове. Крепится на стену после первой пойманной форели.',cost:{wood:4,fish:3,pearl:1},placeable:true},
  ...Object.entries(FINDS).map(([id,f])=>({id,name:f.name,category:'shelter',desc:f.desc|| (id==='wallclock'?'Крепятся на стену внутри убежища.':id==='recordplayer'?'Уцелевшая пластинка. Включается рядом с проигрывателем.':id==='foundlamp'?'Работает от уцелевшего аккумулятора. Свет можно включать и выключать.':'Удобное кресло. Найденную вещь можно поставить дома.'),cost:{},placeable:true,foundOnly:true})),
  {id:'wrench',name:'Набор ключей',category:'tools',desc:'Ускоряет разбор двигателей и бытовой техники вдвое. Открывает ремонтные проходы и доступ к механизмам.',cost:{metal:5,parts:2},slot:'tool'},
  {id:'cropbed',name:'Посадочная грядка',category:'shelter',desc:'Травы, овощи или цветы. После ручного сбора нужна новая посадка.',cost:{wood:6,metal:2},placeable:true},
  {id:'stew',name:'Овощной паёк',category:'supplies',desc:'1 порция. +30 здоровья, полная выносливость. На 8 минут: восстановление выносливости вне бега на 40% быстрее. Заменяет эффект другого блюда.',cost:{vegetables:2,water:1,herbs:1},repeatable:true},
  {id:'bouquet',name:'Букет в деревянной вазе',category:'shelter',desc:'Свежие цветы из своего огорода. Можно поставить дома.',cost:{flowers:3,wood:1},placeable:true},
  {id:'tooling',name:'Точная оснастка',category:'shelter',desc:'Переработчик даёт на 1 деталь больше за цикл. Работает вместе с улучшением переработчика.',cost:{metal:14,parts:6,wood:8},requires:'generator',fixed:true},
  {id:'receiver',name:'Складской приёмник',category:'shelter',desc:'При ручном сборе продукция отправляется прямо на склад, оставляя рюкзак свободным.',cost:{wood:12,metal:8,wire:4,parts:3},requires:'generator',fixed:true},
  { id: 'helper', name: 'Пригласить садовницу Ладу', category: 'shelter', desc: 'Нужны радиостанция и удобная кровать. Лада собирает готовую продукцию выбранного типа на склад.', cost: { cloth: 6, fish: 3, water: 3 }, requires: 'radio', fixed: true },
  { id: 'seedbed', name: 'Питомник редких трав', category: 'shelter', desc: 'Семена из заброшенного сада дают 6 трав за 120 секунд. Полив и солнечные панели ускоряют рост.', cost: { seeds: 4, wood: 10, water: 3 }, requires: 'pump', placeable: true },
  { id: 'axe', name: 'Походный топор', category: 'tools', desc: 'Позволяет рубить деревья. Больше дерева с каждой вылазки.', cost: { wood: 3, metal: 4 }, slot: 'tool', icon: '⚒' },
  { id: 'pick', name: 'Шахтёрская кирка', category: 'tools', desc: 'Добывает камень из валунов и металл из залежей.', cost: { wood: 4, metal: 6 }, slot: 'tool', icon: '⚒' },
  { id: 'cutter', name: 'Болторез', category: 'tools', desc: 'Открывает запертые технические контейнеры.', cost: { metal: 10, parts: 3 }, slot: 'tool', icon: '✂' },
  { id: 'rod', name: 'Удочка из орешника', category: 'tools', desc: 'Рыбалка у затопленного причала. Забрось и дождись поклёвки.', cost: { wood: 5, cloth: 2, wire: 1 }, slot: 'tool', icon: '≈' },
  { id: 'rod2', name: 'Удочка «Глубина»', category: 'tools', desc: 'Шире зона подсечки. Повышает шанс редких находок.', cost: { wood: 6, metal: 5, parts: 3, pearl: 2 }, requires: 'rod', slot: 'tool', icon: '≈' },
  { id: 'spear', name: 'Стальное копьё', category: 'weapons', desc: 'Дальность 3 м · урон 25 · 12 выносливости. Узкий выпад прерывает лёгких противников.', cost: { wood: 5, metal: 7, cloth: 2 }, slot: 'weapon', damage: 25, range: 3, cooldown: 0.65, icon: '↗' },
  { id: 'pistol', name: 'Сигнальный бластер', category: 'weapons', desc: 'Дальность 11 м · урон 19 · 6 зарядов. ПКМ — прицел, ЛКМ / пробел — выстрел. R — охлаждение.', starterAmmo: 6, cost: { metal: 12, parts: 4, wire: 3 }, slot: 'weapon', damage: 19, range: 11, cooldown: 0.48, icon: '⌁' },
  { id: 'carbine', name: 'Импульсный карабин', category: 'weapons', desc: 'Дальность 15 м · урон 30 · 12 зарядов. Точнее бластера; нагревается быстрее. ПКМ — прицел, R — охлаждение.', starterAmmo: 12, cost: { metal: 20, parts: 8, wire: 6, pearl: 2 }, requires: 'generator', slot: 'weapon', damage: 30, range: 15, cooldown: 0.32, icon: '⌁' },
  { id: 'vest', name: 'Рабочий жилет', category: 'gear', desc: 'Снижает входящий урон на 25%.', cost: { cloth: 6, metal: 3 }, slot: 'armor', defense: 0.25, icon: '▣' },
  { id: 'armor', name: 'Пластинчатая куртка', category: 'gear', desc: 'Защита 45% · скорость −10%. Для опасных мест.', cost: { cloth: 10, metal: 12, parts: 3 }, requires: 'vest', slot: 'armor', defense: 0.45, speedMultiplier:.9, icon: '▣' },
  { id: 'bag', name: 'Рюкзак сборщика', category: 'gear', desc: 'Вместимость 40 вместо 26. Больше находок за один путь.', cost: { cloth: 7, wood: 2 }, slot: 'bag', capacity: 40, icon: '▤' },
  { id: 'bag2', name: 'Экспедиционный рюкзак', category: 'gear', desc: 'Вместимость 60. Для долгих походов.', cost: { cloth: 12, metal: 4, parts: 2 }, requires: 'bag', slot: 'bag', capacity: 60, icon: '▤' },
  { id: 'boots', name: 'Походные ботинки', category: 'gear', desc: 'Скорость движения +18%.', cost: { cloth: 5, metal: 2 }, slot: 'boots', icon: '⌑' },
  { id: 'lantern', name: 'Походный фонарь', category: 'gear', desc: 'Тёплый свет сопровождает тебя в тумане.', cost: { metal: 4, wire: 2, parts: 1 }, slot: 'tool', icon: '☼' },
  { id: 'medkit', name: 'Полевая аптечка', category: 'supplies', desc: 'Восстанавливает 45 здоровья. Использование: Q.', cost: { herbs: 3, cloth: 2 }, repeatable: true, icon: '✚' },
  { id: 'meal', name: 'Походная еда', category: 'supplies', desc: 'Восстанавливает 30 здоровья и всю выносливость.', cost: { fish: 1, herbs: 1, wood: 1 }, repeatable: true, icon: '♨' },
  { id: 'ammo', name: 'Энергозаряды × 12', category: 'supplies', desc: 'Общие боеприпасы для бластера, карабина и разрядника.', cost: { metal: 2, wire: 1 }, repeatable: true, icon: '▰' },
  { id: 'generator', name: 'Восстановить генератор', category: 'shelter', desc: 'Верни свет домой. Питает мастерскую и открывает новые рецепты.', cost: { metal: 10, wire: 4, parts: 3 }, icon: 'ϟ', fixed: true },
  { id: 'bridge', name: 'Починить мост в депо', category: 'shelter', desc: 'Восстанавливает прямой путь через канаву к техническим запасам депо.', cost: { wood: 14, metal: 8 }, icon: '═', fixed: true },
  { id: 'lamp', name: 'Уличный фонарь', category: 'shelter', desc: 'Тёплый свет во дворе. Требуется электричество.', cost: { metal: 4, wire: 2 }, requires: 'generator', placeable: true, icon: '☼' },
  { id: 'bed', name: 'Удобная кровать', category: 'shelter', desc: 'Отдых полностью восстанавливает здоровье.', cost: { wood: 8, cloth: 5 }, placeable: true, icon: '▰' },
  { id: 'garden', name: 'Грядка с травами', category: 'shelter', desc: 'Даёт 3 травы каждые 90 секунд активной игры.', cost: { wood: 6, herbs: 2 }, placeable: true, icon: '❋' },
  { id: 'chest', name: 'Ящик для хранения', category: 'shelter', desc: 'Обустрой склад. Можно сдавать добычу рядом с ящиком.', cost: { wood: 7, metal: 2 }, placeable: true, icon: '▤' },
  { id: 'sofa', name: 'Диван из старого мира', category: 'shelter', desc: 'Уютный уголок с тканевой обивкой.', cost: { wood: 7, cloth: 6 }, placeable: true, icon: '▱' },
  { id: 'planter', name: 'Кашпо с папоротником', category: 'shelter', desc: 'Немного живой зелени в восстановленном доме.', cost: { wood: 3, herbs: 2 }, placeable: true, icon: '❧' },
  { id: 'rug', name: 'Тканый ковёр', category: 'shelter', desc: 'Тёплый акцент для жилой комнаты.', cost: { cloth: 4 }, placeable: true, icon: '▧' },
  { id: 'radio', name: 'Восстановить радиостанцию', category: 'shelter', desc: 'Открывает обмен перламутра и семян у соседей. Позволяет пригласить Ладу для сбора домашней продукции.', cost: { metal: 8, wire: 6, parts: 6 }, requires: 'generator', fixed: true, icon: '◉' },
  { id: 'pump', name: 'Наладить водоснабжение', category: 'shelter', desc: 'Запускает насос у водонапорной башни. Нужен насосный узел из насосной или ремонтной мастерской. Время роста грядок −25%.', cost: { metal: 12, wire: 4, parts: 3, pumpmodule: 1 }, requires: 'generator', fixed: true },
  { id: 'purifier', name: 'Станция очистки воды', category: 'shelter', desc: 'Производит 3 воды за 90 секунд. Урожай забирается дома.', cost: { metal: 8, wood: 4, cloth: 3 }, requires: 'pump', placeable: true },
  { id: 'recycler', name: 'Переработчик лома', category: 'shelter', desc: 'Перерабатывает 3 металла в 2 детали и 1 провод за цикл.', cost: { metal: 12, parts: 4, wire: 3 }, requires: 'generator', placeable: true },
  { id: 'solar', name: 'Солнечные панели', category: 'shelter', desc: 'Нужен аккумулятор. Циклы грядок, очистки воды и переработки лома на 25% короче.', cost: { metal: 14, wire: 6, parts: 5, battery: 1 }, requires: 'generator', fixed: true },
  { id: 'tea', name: 'Травяной чай', category: 'supplies', desc: 'Восстанавливает 15 здоровья и 50 выносливости.', cost: { water: 1, herbs: 1 }, repeatable: true },
];
export const CONTRACTS = [
  { id: 'timber', title: 'Доски для соседей', desc: 'Починим окна до следующего дождя.', cost: { wood: 8 }, reward: { metal: 3, cloth: 2, wire: 1 }, cooldown: 120 },
  { id: 'repairs', title: 'Ремонт старой техники', desc: 'Мастер обменяет материалы на рабочие детали.', cost: { metal: 6, wire: 2 }, reward: { parts: 3, cloth: 3 }, cooldown: 150 },
  { id: 'supper', title: 'Ужин у костра', desc: 'Рыба и свежие травы пригодятся маленькому поселению.', cost: { fish: 3, herbs: 2 }, reward: { wood: 6, metal: 4, cloth: 3 }, cooldown: 120 },
  { id: 'water', title: 'Чистая вода для района', desc: 'Доставь воду людям у водонапорной башни.', cost: { water: 6 }, reward: { metal: 5, parts: 3, wire: 2 }, requires: 'pump', cooldown: 180 },
  { id: 'pearl', title: 'Редкая находка с причала', desc: 'Рыбак обменяет перламутр на технические запасы.', cost: { pearl: 1 }, reward: { parts: 3, wire: 4 }, requires: 'radio', cooldown: 180 },
  { id: 'seeds', title: 'Возвращение садов', desc: 'Найди семена в заброшенном саду. Соседи помогут с оборудованием.', cost: { seeds: 4 }, reward: { parts: 5, wire: 3, cloth: 4 }, requires: 'radio', cooldown: 240 },
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
    gunHeat:Object.fromEntries(Object.keys(GUNS).map(id=>[id,0])),gunLocked:Object.fromEntries(Object.keys(GUNS).map(id=>[id,false])),dodgeReadyAt:0,packingPlan:{},restoredRoutes:[],boat:freshBoat(),camp:{ready:false,store:{}},mapMarks:[],keepResources:[],cargo:[],storedCargo:[],strippedNodes:[],construction:[],brokenNodes:[],loadouts:[null,null],openedGates:[],packedFurniture:[],fishingBait:'none',visited: ['home'], foundNodes: [], lastHaul: {}, finds:{},storedFinds:{},findClaims:[],notes:[],lastFindHaul:{},
    version: 1, x: HOME.x + 1, z: HOME.z + 2, health: 100, stamina: 100,
    stash: { wood: 3, metal: 2, cloth: 2 }, bag: {}, owned: [],
    equipment: { weapon: 'pipe', armor: null, bag: null, boots: null },
    ammo: 0, medkits: 1, meals: 0, teas: 0, fishmeals:0, stews:0, foodEffect:null, cultivars:['herbs'], placed: [], depleted: {}, nodeLoot: {}, droneDeaths: {}, drops: [], contracts: {}, completedOrders: 0, waterCollected: -120,
    elapsed: 0, fishCollection: [], kills: 0, trips: 0, gathered: 0,
    hotbar: ['pipe', null, null, 'medkit', null, null], hotbarSelected: 0, lanternOn: true,
    helper: { assignment: 'garden', cycles: 0 }, recovered: false, grave: null, settings: { sound: true, music:true, musicVolume:.5, quality: 'high', questExpanded: false, minimapExpanded: false },
    tutorial: true, chapterComplete: false,
  };
}
function cleanFurniture(p,elapsed) {
 if(!p||typeof p!=='object'||!RECIPES.some(r=>r.id===p.id&&r.placeable)||!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x<-26||p.x>-6||p.z<6||p.z>26)return null;
 const item={id:p.id,x:p.x,z:p.z,rotation:Number.isFinite(p.rotation)?p.rotation:0,harvested:Number.isFinite(p.harvested)?Math.min(elapsed,Math.max(0,p.harvested)):elapsed};
 if(['lamp','foundlamp','desklamp','cagelamp','homeradio','recordplayer'].includes(p.id))item.enabled=['recordplayer','homeradio'].includes(p.id)?p.enabled===true:p.enabled!==false;
 if(p.id==='yardgate'){item.open=p.open===true;item.openSide=p.openSide===-1?-1:1;}
 if(p.id==='cropbed'){item.crop=Object.hasOwn(CROPS,p.crop)?p.crop:null;item.plantedAt=item.crop&&Number.isFinite(p.plantedAt)?Math.max(0,Math.min(elapsed,p.plantedAt)):null;if(Number.isFinite(p.rainGrowth)&&p.rainGrowth>0)item.rainGrowth=Math.min(p.rainGrowth,10000);}
 if(STATION_UPGRADES[p.id])item.upgrade=p.upgrade===1?1:0;
 if(p.id==='raincatcher')item.rainWater=Number.isFinite(p.rainWater)?Math.max(0,Math.min(collectorCapacity(item),p.rainWater)):0;
 if(p.id==='dryrack'){item.dryingAt=Number.isFinite(p.dryingAt)?Math.max(0,Math.min(elapsed,p.dryingAt)):null;if(item.dryingAt!==null){item.dryingOutput=p.dryingOutput===4?4:2;item.dryingDuration=p.dryingDuration===75&&item.upgrade===1&&item.dryingOutput===4?75:100;}}
 return item;
}
export function validateSave(input) {
  if (!input || input.version !== 1) return null;
  const state = freshState();
  for(const id of Object.keys(GUNS)){const n=input.gunHeat?.[id];state.gunHeat[id]=Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;state.gunLocked[id]=state.gunHeat[id]>=1||state.gunHeat[id]>.3&&input.gunLocked?.[id]===true;}
  state.restoredRoutes=cleanRestorations(input.restoredRoutes);
  state.boat=cleanBoat(input.boat,state.restoredRoutes);
  state.camp.ready=input.camp?.ready===true;
  let storedWeight=0;for(const id of Object.keys(RESOURCES)){const n=input.camp?.store?.[id];if(Number.isSafeInteger(n)&&n>0){const count=Math.min(n,Math.floor((CAMP.capacity-storedWeight)/RESOURCES[id].weight));if(count>0){state.camp.store[id]=count;storedWeight+=count*RESOURCES[id].weight;}}}
  state.mapMarks=cleanMapMarks(input.mapMarks);
  state.packingPlan=Object.fromEntries(Object.keys(RESOURCES).filter(id=>Number.isInteger(input.packingPlan?.[id])&&input.packingPlan[id]>0).map(id=>[id,Math.min(1000,input.packingPlan[id])]));
  state.keepResources=[...new Set((Array.isArray(input.keepResources)?input.keepResources:[]).filter(id=>Object.hasOwn(RESOURCES,id)))];
  state.cargo=cleanCargo(input.cargo,RESOURCES);state.storedCargo=cleanCargo(input.storedCargo,RESOURCES);state.strippedNodes=[...new Set((Array.isArray(input.strippedNodes)?input.strippedNodes:Object.keys(input.nodeLoot||{})).filter(id=>/^node-\d{1,3}$/.test(id)))];
  state.construction=cleanConstruction(input.construction);state.brokenNodes=[...new Set((Array.isArray(input.brokenNodes)?input.brokenNodes:[]).filter(id=>typeof id==='string'&&/^node-\d{1,3}$/.test(id)))].slice(0,500);
  state.openedGates=[...new Set((Array.isArray(input.openedGates)?input.openedGates:[]).filter(id=>GATES.some(g=>g.id===id)))];
  state.fishingBait=Object.hasOwn(BAITS,input.fishingBait)?input.fishingBait:'none';
  for(const field of ['finds','storedFinds','lastFindHaul']) for(const id of Object.keys(FINDS)) if(Number.isInteger(input[field]?.[id])&&input[field][id]>0) state[field][id]=Math.min(99,input[field][id]);
  state.findClaims=[...new Set((Array.isArray(input.findClaims)?input.findClaims:[]).filter(id=>typeof id==='string'&&/^node-\d{1,3}$/.test(id)))];
  state.notes=[...new Set((Array.isArray(input.notes)?input.notes:[]).filter(id=>MEMORIES.some(n=>n.id===id)))];
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
  for (const key of ['elapsed', 'ammo', 'medkits', 'meals', 'teas', 'fishmeals', 'stews', 'kills', 'trips', 'gathered', 'completedOrders']) {
    if (Number.isFinite(input[key])) state[key] = Math.max(0, Math.min(input[key], 100000000));
  }
  const effect=input.foodEffect;
  if(effect&&Object.hasOwn(FOOD_EFFECTS,effect.id)&&Number.isFinite(effect.until)&&effect.until>state.elapsed)state.foodEffect={id:effect.id,until:Math.min(effect.until,state.elapsed+FOOD_EFFECTS[effect.id].duration)};
  // Existing saves keep access to crops they could already grow. New stories discover varieties.
  state.cultivars=Array.isArray(input.cultivars)?[...new Set(['herbs',...input.cultivars.filter(id=>Object.hasOwn(CROPS,id))])]:Object.keys(CROPS);
  for(const item of [...(Array.isArray(input.placed)?input.placed:[]),...(Array.isArray(input.packedFurniture)?input.packedFurniture:[])])if(item&&Object.hasOwn(CROPS,item.crop)&&!state.cultivars.includes(item.crop))state.cultivars.push(item.crop);
  for (const contract of CONTRACTS) if (Number.isFinite(input.contracts?.[contract.id])) state.contracts[contract.id] = Math.max(0, Math.min(state.elapsed, input.contracts[contract.id]));
  if (Number.isFinite(input.waterCollected)) state.waterCollected = Math.max(-120, Math.min(state.elapsed, input.waterCollected));
  const ids = new Set(RECIPES.map(r => r.id));
  state.owned = [...new Set((Array.isArray(input.owned) ? input.owned : []).filter(id => ids.has(id)))];
  for (const slot of Object.keys(state.equipment)) {
    const id = input.equipment?.[slot];
    const recipe = RECIPES.find(r => r.id === id);
    if (id === null) state.equipment[slot] = null;
    else if (id === 'pipe' && slot === 'weapon') state.equipment.weapon = 'pipe';
    else if (state.owned.includes(id) && recipe?.slot === slot) state.equipment[slot] = id;
  }
  for (const key of ['x', 'z']) if (Number.isFinite(input[key])) state[key] = Math.max(key==='x'?WORLD_BOUNDS.minX:WORLD_BOUNDS.minZ, Math.min(key==='x'?WORLD_BOUNDS.maxX:WORLD_BOUNDS.maxZ, input[key]));
  state.placed=(Array.isArray(input.placed)?input.placed:[]).slice(0,500).map(p=>cleanFurniture(p,state.elapsed)).filter(Boolean).slice(0,70);
  state.packedFurniture=(Array.isArray(input.packedFurniture)?input.packedFurniture:[]).slice(0,70).flatMap(p=>{const item=cleanFurniture(p,state.elapsed);return item?[{...item,packedAt:Number.isFinite(p.packedAt)?Math.max(0,Math.min(state.elapsed,p.packedAt)):state.elapsed}]:[];});
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
    return { id: d.id.slice(0, 80), x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, d.x)), z: Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, d.z)), loot };
  }).filter(d => Object.keys(d.loot).length);
  state.loadouts=[0,1].map(i=>{const p=input.loadouts?.[i];if(!p||typeof p!=='object')return null;const e={};for(const slot of Object.keys(state.equipment)){const id=p[slot];e[slot]=id==='pipe'&&slot==='weapon'?'pipe':state.owned.includes(id)&&RECIPES.some(r=>r.id===id&&r.slot===slot)?id:null;}return e;});
  state.fishCollection = (Array.isArray(input.fishCollection) ? input.fishCollection : []).filter(name => FISH.some(f => f.name === name));
  if (input.grave && Number.isFinite(input.grave.x) && Number.isFinite(input.grave.z)) {
    const loot = {};
    for (const id of Object.keys(RESOURCES)) if (Number.isFinite(input.grave.loot?.[id]) && input.grave.loot[id] > 0) loot[id] = Math.min(100000, Math.floor(input.grave.loot[id]));
    const finds={};for(const id of Object.keys(FINDS)) if(Number.isInteger(input.grave.finds?.[id])&&input.grave.finds[id]>0) finds[id]=Math.min(99,input.grave.finds[id]);
    state.grave = { ...(input.grave.cargo?{cargo:cleanCargo(input.grave.cargo,RESOURCES)}:{}), ...(input.grave.finds?{finds}:{}), x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, input.grave.x)), z: Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, input.grave.z)), loot };
  }
  if (['garden', 'seedbed', 'purifier', 'recycler', 'rest'].includes(input.helper?.assignment)) state.helper.assignment = input.helper.assignment;
  if (Number.isFinite(input.helper?.cycles)) state.helper.cycles = Math.floor(Math.max(0, Math.min(100000000, input.helper.cycles)));
  const hotbarIds = new Set(['pipe', ...Object.keys(RESOURCES), ...Object.keys(FINDS), ...RECIPES.filter(r => r.slot || Object.hasOwn(SUPPLY_FIELDS,r.id) || r.id==='ammo').map(r => r.id)]), seenHotbar=new Set();
  if (Array.isArray(input.hotbar)) state.hotbar = Array.from({ length: 6 }, (_, i) => hotbarIds.has(input.hotbar[i])&&!seenHotbar.has(input.hotbar[i]) ? (seenHotbar.add(input.hotbar[i]),input.hotbar[i]) : null);
  if (Number.isInteger(input.hotbarSelected)) state.hotbarSelected = Math.max(-1, Math.min(5, input.hotbarSelected));
  state.visited=[...new Set(['home',...(Array.isArray(input.visited)?input.visited:[]).filter(id=>LOCATIONS.some(l=>l.id===id))])];
  state.foundNodes=[...new Set((Array.isArray(input.foundNodes)?input.foundNodes:[]).filter(id=>typeof id==='string'&&/^node-\d{1,3}$/.test(id)))].slice(0,1000);
  for(const id of Object.keys(RESOURCES)) if(Number.isFinite(input.lastHaul?.[id])&&input.lastHaul[id]>0) state.lastHaul[id]=Math.floor(Math.min(100000,input.lastHaul[id]));
  state.lanternOn = input.lanternOn !== false;
  state.settings.questExpanded = input.settings?.questExpanded === true;
  state.settings.minimapExpanded = input.settings?.minimapExpanded === true;
  state.tutorial = input.tutorial !== false;
  state.chapterComplete = state.owned.includes('radio');
  state.settings.sound = input.settings?.sound !== false;
  state.settings.music=input.settings?.music!==false;state.settings.musicVolume=Number.isFinite(input.settings?.musicVolume)?Math.max(0,Math.min(1,input.settings.musicVolume)):.5;
  state.settings.quality = input.settings?.quality === 'low' ? 'low' : 'high';
  if(state.boat.aboard){state.x=state.boat.x;state.z=state.boat.z;}
  state.dodgeReadyAt=Number.isFinite(input.dodgeReadyAt)?Math.max(0,Math.min(state.elapsed+1.05,input.dodgeReadyAt)):0;
  return state;
}
export function bagWeight(state) {
  return (state.cargo||[]).reduce((n,c)=>n+CARGO_WEIGHT[c.machine],0)+Object.entries(state.bag).reduce((n,[id,count])=>n+(RESOURCES[id]?.weight||0)*count,0)+Object.entries(state.finds).reduce((n,[id,count])=>n+(FINDS[id]?.weight||0)*count,0);
}
export function capacity(state) {
  return RECIPES.find(r => r.id === state.equipment.bag)?.capacity || 26;
}
export function total(state, id) { return (state.stash[id] || 0) + (state.bag[id] || 0); }
export function craftStatus(state, recipe) {
  if (!recipe) return { ok: false, reason: 'Неизвестный рецепт' };
  if(recipe.schematic&&!state.notes.includes(recipe.schematic))return {ok:false,reason:'Схема ещё не изучена'};
  if(recipe.id==='fishtrophy'&&!state.fishCollection.includes('Лунная форель'))return {ok:false,reason:'Сначала поймай лунную форель'};
  if(recipe.foundOnly&&state.placed.length>=70) return {ok:false,reason:'Достигнут лимит построек'};
  if(recipe.foundOnly) return (state.finds[recipe.id]||0)+(state.storedFinds[recipe.id]||0)>0?{ok:true}:{ok:false,reason:'Эту вещь можно найти в районе'};
  if (recipe.id === 'helper' && !state.placed.some(p => p.id === 'bed')) return { ok: false, reason: 'Сначала размести удобную кровать для гостя' };
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
    if (id === 'medkit'||id==='dressing') state.medkits++;
    if (id === 'meal') state.meals++;
    if(id==='stew')state.stews++;
    if (id === 'tea') state.teas++;
    if(id==='fishmeal')state.fishmeals+=recipe.output;
  } else {
    state.owned.push(id);
    state.ammo += recipe.starterAmmo || 0;
    if (Object.hasOwn(state.equipment, recipe.slot)) state.equipment[recipe.slot] = id;
  }
  if (id === 'radio') state.chapterComplete = true;
  return { ok: true, recipe };
}
export function place(state, id, x, z, rotation = 0,obstacles=[]) {
  const recipe = RECIPES.find(r => r.id === id);
  if (!recipe?.placeable || !craftStatus(state, recipe).ok) return false;
  if (x < -26 || x > -6 || z < 6 || z > 26) return false;
  if(!placementAllowed({id,x,z,rotation},obstacles,state.placed,-1,state.construction))return false;
  if(!yardRouteClear(state,{id,x,z,rotation},obstacles))return false;
  if(recipe.foundOnly) {const stock=state.finds[id]>0?state.finds:state.storedFinds;stock[id]--;} else spend(state,recipe.cost);
  state.placed.push({id,x,z,rotation,harvested:state.elapsed,...(['lamp','foundlamp','desklamp','cagelamp','homeradio','recordplayer'].includes(id)?{enabled:!['recordplayer','homeradio'].includes(id)}:{}),...(id==='cropbed'?{crop:null,plantedAt:null}:{})});
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
  const movedCargo=state.cargo.splice(0,Math.max(0,cargoStorageCapacity(state)-state.storedCargo.length));amount+=movedCargo.length;state.storedCargo.push(...movedCargo);
  const findHaul=Object.fromEntries(Object.entries(state.finds).filter(([,n])=>n>0));for(const [id,n] of Object.entries(state.finds)) {state.storedFinds[id]=(state.storedFinds[id]||0)+n;amount+=n;}state.finds={};
  const haul=Object.fromEntries(Object.entries(state.bag).filter(([id,n])=>n>0&&!state.keepResources?.includes(id)));
  for (const [id, n] of Object.entries(haul)) { state.stash[id] = (state.stash[id] || 0) + n; amount += n; delete state.bag[id]; }
  state.bag=Object.fromEntries(Object.entries(state.bag).filter(([,n])=>n>0));
  if (amount) {state.trips++;state.lastHaul=haul;state.lastFindHaul=findHaul;}
  return amount;
}
export function weapon(state) { if (state.equipment.weapon === null) return { id: 'unarmed', name: 'Без оружия', damage: 5, range: 1.6, cooldown: 0.75 }; return RECIPES.find(r => r.id === state.equipment.weapon) || DEFAULT_WEAPON; }
export function takeDamage(state, amount) {
  const defense = RECIPES.find(r => r.id === state.equipment.armor)?.defense || 0;
  state.health = Math.max(0, state.health - amount * (1 - defense));
  return state.health <= 0;
}
export function respawn(state) {
  if(state.boat.aboard){const dock=FLOOD_DOCKS.find(d=>d.id===state.boat.lastDock)||FLOOD_DOCKS[0];state.x=dock.foot.x;state.z=dock.foot.z;}
  state.boat={...state.boat,...FLOOD_DOCKS[0].boat,aboard:false,lastDock:'shore',vx:0,vz:0};
  const previous = state.grave;
  state.grave = {x:state.x,z:state.z,loot:{...state.bag},finds:{...state.finds},...((state.cargo.length||previous?.cargo?.length)?{cargo:[...(previous?.cargo||[]),...state.cargo]}:{})};
  if(previous) for(const [id,n] of Object.entries(previous.finds||{})) state.grave.finds[id]=(state.grave.finds[id]||0)+n;
  if (previous) for (const [id, n] of Object.entries(previous.loot)) state.grave.loot[id] = (state.grave.loot[id] || 0) + n;
  state.bag = {};state.finds={};state.cargo=[]; state.x = HOME.x; state.z = HOME.z + 3;
  state.health = 65; state.stamina = 100;state.foodEffect=null;
}
export function useSupply(state, id) {
  if(Object.hasOwn(FOOD_EFFECTS,id)){
    const field=SUPPLY_FIELDS[id];
    if(!(state[field]>0)||activeFood(state)?.id===id&&state.health>=100&&state.stamina>=100)return false;
    state[field]--;state.health=Math.min(100,state.health+30);state.stamina=100;
    state.foodEffect={id,until:state.elapsed+FOOD_EFFECTS[id].duration};return true;
  }
  if (id === 'medkit' && state.medkits > 0 && state.health < 100) { state.medkits--; state.health = Math.min(100, state.health + 45); return true; }
  if (id === 'meal' && state.meals > 0 && (state.health < 100 || state.stamina < 100)) { state.meals--; state.health = Math.min(100, state.health + 30); state.stamina = 100; return true; }
  if (id === 'tea' && state.teas > 0 && (state.health < 100 || state.stamina < 100)) { state.teas--; state.health = Math.min(100, state.health + 15); state.stamina = Math.min(100, state.stamina + 50); return true; }
  return false;
}
export function catchFish(rng = Math.random, upgraded = false, conditions = {}) {
  const roll = rng();
  const probabilities = fishingProbabilities(upgraded,conditions);
  let cumulative = 0;
  return FISH.find((f, i) => { cumulative += probabilities[i]; return roll < cumulative; }) || FISH.at(-1);
}
export function objective(state) {
  if (!state.owned.includes('generator')) return { title: 'Верни свет домой', desc: 'Собери материалы и восстанови генератор на станции.', recipe: 'generator', number: '01' };
  if (!state.owned.includes('bridge')) return { title: 'Открой путь в депо', desc: 'Восстанови мост, чтобы добраться до технических запасов.', recipe: 'bridge', number: '02' };
  if (!state.owned.includes('radio')) return { title: 'Найди голос в тишине', desc: 'Восстанови радиостанцию и поймай сигнал соседнего района.', recipe: 'radio', number: '03' };
  if (!state.owned.includes('pump')) return { title: 'Вода для нового начала', desc: 'Запусти насос у башни. Обеспечь убежище чистой водой.', recipe: 'pump', number: '04' };
  if (!state.owned.includes('solar')) return { title: 'Дом становится самостоятельным', desc: 'Собери солнечные панели и ускорь своё производство.', recipe: 'solar', number: '05' };
  if (!state.owned.includes('helper')) return { title: 'В доме появится ещё один голос', desc: 'Обустрой кровать и пригласи Ладу. Семена для питомника ищи в заброшенном саду.', recipe: 'helper', number: '06' };
  return { title: 'Район снова живёт', desc: 'Вода и свет вернулись. Развивай производство и помогай соседям.', number: '✓' };
}
export function contractStatus(state, contract) {
  if (!contract) return { ok: false, reason: 'Заказ не найден' };
  if (contract.requires && !state.owned.includes(contract.requires)) return { ok: false, reason: `Нужно: ${RECIPES.find(r => r.id === contract.requires)?.name}` };
  const last = state.contracts[contract.id];
  const remaining = last === undefined ? 0 : Math.max(0, contract.cooldown - (state.elapsed - last));
  if (remaining > 0) return { ok: false, reason: `Новый заказ через ${Math.ceil(remaining)} сек.`, remaining };
  if (Object.entries(contract.cost).some(([id, n]) => total(state, id) < n)) return { ok: false, reason: 'Собери нужные материалы' };
  return { ok: true };
}
export function deliverContract(state, id) {
  const contract = CONTRACTS.find(c => c.id === id), status = contractStatus(state, contract);
  if (!status.ok) return status;
  if (!(state.x >= -27 && state.x <= -6 && state.z >= 5 && state.z <= 27)) return { ok: false, reason: 'Передать заказ можно только дома' };
  spend(state, contract.cost);
  for (const [resource, n] of Object.entries(contract.reward)) state.stash[resource] = (state.stash[resource] || 0) + n;
  state.contracts[id] = state.elapsed; state.completedOrders++;
  return { ok: true, contract };
}
export function productionInfo(state,item) {
  if(item.id==='cropbed') return cropInfo(state,item);
  if(item.id==='raincatcher'){const n=Math.floor(item.rainWater||0);return {loot:{water:n},remaining:n?0:1,waitingForRain:!n,name:`Собрать воду · ${n}`};}
  if(item.id==='dryrack')return {loot:{},mealOutput:item.dryingOutput===4?4:2,needsLoading:!Number.isFinite(item.dryingAt),remaining:Number.isFinite(item.dryingAt)?Math.max(0,(item.dryingDuration===75?75:100)-(state.elapsed-item.dryingAt)):1,name:`Забрать ${item.dryingOutput===4?4:2} порции еды`};
  const recipes = {
    seedbed: { interval: 120, loot: { herbs: 6 }, name: 'Собрать редкие травы' },
    garden: { interval: 90, loot: { herbs: 3 }, name: 'Собрать травы' },
    purifier: { interval: 90, loot: { water: state.placed.some(p=>p.id==='pumpcontroller')?4:3 }, name: 'Забрать чистую воду' },
    recycler: { interval: 120, loot: { parts: 2, wire: 1 }, cost: { metal: 3 }, name: 'Переработать лом' },
  };
  const info = recipes[item.id]; if (!info) return null;
  let interval = item.id==='recycler'&&item.upgrade===1?90:info.interval;
  if (['garden', 'seedbed'].includes(item.id) && state.owned.includes('pump')) interval *= 0.75;
  if (state.owned.includes('solar')) interval *= 0.75;
  const loot=item.id==='recycler'?{parts:(item.upgrade===1?4:2)+(state.owned.includes('tooling')?1:0),wire:item.upgrade===1?2:1}:info.loot;
  return { ...info, loot, interval, remaining: Math.max(0, interval - (state.elapsed - item.harvested)) };
}
export function harvestProduction(state, item) {
  const info = productionInfo(state, item);
  if (!info) return { ok: false, reason: 'Нет производства' };
  if(info.needsLoading)return {ok:false,reason:'Сначала загрузи улов'};
  if(info.waitingForRain)return {ok:false,reason:'Накопитель ожидает дождь'};
  if (info.remaining > 0) return { ok: false, reason: `До готовности ${Math.ceil(info.remaining)} сек.` };
  if(info.mealOutput){state.meals+=info.mealOutput;item.dryingAt=null;delete item.dryingOutput;delete item.dryingDuration;item.harvested=state.elapsed;return {ok:true,received:{},mealOutput:info.mealOutput};}
  const weight = Object.entries(info.loot).reduce((n, [id, count]) => n + RESOURCES[id].weight * count, 0);
  // Fees can free bag space, but readiness is atomic: nothing is spent until output fits.
  const freed = info.cost ? Object.entries(info.cost).reduce((n, [id, count]) => n + Math.max(0, count - (state.stash[id] || 0)) * RESOURCES[id].weight, 0) : 0;
  const toStash=state.owned.includes('receiver');
  if (!toStash && bagWeight(state) + weight - freed > capacity(state)) return { ok: false, reason: 'Освободи место в рюкзаке для результата' };
  if (info.cost && !spend(state, info.cost)) return { ok: false, reason: 'Для переработки нужно 3 металла' };
  let received;
  if(toStash) { for(const [id,n] of Object.entries(info.loot)) state.stash[id]=(state.stash[id]||0)+n;received={...info.loot}; }
  else received=collect(state,info.loot).received;
  item.harvested=state.elapsed;if(item.id==='raincatcher')item.rainWater=Math.max(0,item.rainWater-Math.floor(item.rainWater));
  if(item.id==='cropbed') {item.crop=null;item.plantedAt=null;delete item.rainGrowth;}
  return {ok:true,received,toStash};
}

// One selected production type; fees are taken only from the shelter's stash.
// Every completed cycle shares the manual harvest timestamp, preventing double output.
export function updateHelper(state) {
  if (!state.owned.includes('helper') || state.helper.assignment === 'rest') return 0;
  let cycles = 0;
  for (const item of state.placed) {
    if (item.id !== state.helper.assignment) continue;
    const info = productionInfo(state, item);
    if (!info || info.remaining > 0) continue;
    if (info.cost && Object.entries(info.cost).some(([id, n]) => (state.stash[id] || 0) < n)) continue;
    for (const [id, n] of Object.entries(info.cost || {})) state.stash[id] -= n;
    for (const [id, n] of Object.entries(info.loot)) state.stash[id] = Math.min(100000, (state.stash[id] || 0) + n);
    item.harvested = state.elapsed; cycles++; state.helper.cycles++;
  }
  return cycles;
}

export function claimFind(state,node) {
 const f=FINDS[node.find];if(!f||state.findClaims.includes(node.id)) return {ok:false,reason:'Вещь уже забрана'};
 if(bagWeight(state)+f.weight>capacity(state)) return {ok:false,reason:`Для находки нужно ${f.weight} свободного веса`};
 state.finds[node.find]=(state.finds[node.find]||0)+1;state.findClaims.push(node.id);return {ok:true};
}
export function takeStoredFind(state,id,count=1) {
 if(!(state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27)) return {ok:false,reason:'Склад доступен в убежище'};
 if(!FINDS[id]||!Number.isInteger(count)||count<1||(state.storedFinds[id]||0)<count) return {ok:false,reason:'Вещи нет на складе'};
 if(bagWeight(state)+FINDS[id].weight*count>capacity(state)) return {ok:false,reason:'Недостаточно места в рюкзаке'};
 state.storedFinds[id]-=count;state.finds[id]=(state.finds[id]||0)+count;return {ok:true};
}
export function plantCrop(state,item,id) {
 const crop=CROPS[id];if(item?.id!=='cropbed'||!crop||!state.placed.includes(item)) return {ok:false,reason:'Грядка не найдена'};
 if(item.crop) return {ok:false,reason:'Сначала собери урожай'};
 if(!state.cultivars.includes(id))return {ok:false,reason:crop.discovery};
 if(!spend(state,crop.cost)) return {ok:false,reason:'Не хватает семян или воды'};
 item.crop=id;item.plantedAt=state.elapsed;delete item.rainGrowth;return {ok:true};
}
export function recoverFinds(state,finds) {
 for(const [id,n] of Object.entries(finds||{})) {
  if(!FINDS[id]) continue;const count=Math.min(n,Math.floor((capacity(state)-bagWeight(state))/FINDS[id].weight));
  if(count>0) {state.finds[id]=(state.finds[id]||0)+count;finds[id]-=count;}
  if(!finds[id]) delete finds[id];
 }
 return Object.keys(finds||{}).length===0;
}

export function openGate(state,id) {
 const gate=GATES.find(g=>g.id===id);
 if(!gate||state.openedGates.includes(id))return {ok:false,reason:'Проход уже открыт'};
 if(Math.hypot(state.x-gate.x,state.z-gate.z)>3)return {ok:false,reason:'Подойди к двери'};
 if(!state.owned.includes(gate.tool))return {ok:false,reason:'Нужен подходящий инструмент'};
 if(gate.loot&&bagWeight(state)+Object.entries(gate.loot).reduce((n,[id,v])=>n+RESOURCES[id].weight*v,0)>capacity(state))return {ok:false,reason:'Освободи место в рюкзаке для разобранных материалов'};
 const received=gate.loot?collect(state,gate.loot).received:{};state.openedGates.push(id);return {ok:true,received};
}
export function consumeBait(state,id) {
 const bait=Object.hasOwn(BAITS,id)?BAITS[id]:null;if(!bait||bait.tool&&!state.owned.includes(bait.tool)||bait.resource&&!(state.bag[bait.resource]>0))return false;
 if(bait.resource)state.bag[bait.resource]--;return true;
}
export function packFurniture(state,index) {
 const item=state.placed[index];
 if(!item||!(state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27)||state.packedFurniture.length>=70)return false;
 if(item.id==='bed'&&state.owned.includes('helper')&&state.placed.filter(p=>p.id==='bed').length===1)return false;
 state.packedFurniture.push({...item,packedAt:state.elapsed});state.placed.splice(index,1);return true;
}
export function unpackFurniture(state,index,x,z,rotation,obstacles=[]) {
 const saved=state.packedFurniture[index];if(!(state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27)||!saved||state.placed.length>=70||!yardRouteClear(state,{...saved,x,z,rotation},obstacles)||!placementAllowed({...saved,x,z,rotation},obstacles,state.placed,-1,state.construction))return false;
 const {packedAt,...item}=saved,paused=Math.max(0,state.elapsed-packedAt);
 item.harvested+=paused;if(Number.isFinite(item.dryingAt))item.dryingAt+=paused;if(Number.isFinite(item.plantedAt))item.plantedAt+=paused;
 Object.assign(item,{x,z,rotation});state.placed.push(item);state.packedFurniture.splice(index,1);return true;
}
export function updateRainCrops(state,dt,isInside) {
 const rain=weatherAt(state.elapsed).rain;if(!rain||!Number.isFinite(dt)||dt<=0)return false;
 for(const p of state.placed)if(p.id==='raincatcher'&&!isInside(p.x,p.z))p.rainWater=Math.min(collectorCapacity(p),(p.rainWater||0)+dt*rain/35);
 for(const p of state.placed)if(p.id==='cropbed'&&p.crop&&!isInside(p.x,p.z))p.rainGrowth=Math.min(10000,(p.rainGrowth||0)+dt*rain*.25);
 return true;
}

export function startDrying(state,item){
 if(!state.placed.includes(item)||item.id!=='dryrack'||Number.isFinite(item.dryingAt))return {ok:false,reason:'Сушилка уже занята'};
 const batch=dryingBatch(item);if(!spend(state,batch.cost))return {ok:false,reason:`Нужно ${batch.cost.fish} рыбы и ${batch.cost.herbs} травы`};
 item.dryingAt=state.elapsed;item.dryingOutput=batch.output;item.dryingDuration=batch.duration;return {ok:true};
}
export function saveLoadout(state,index){if(![0,1].includes(index)||!state.placed.some(p=>['gearrack','toolcabinet'].includes(p.id))||state.x<-27||state.x>-6||state.z<5||state.z>27)return false;state.loadouts[index]={...state.equipment};return true;}
export function applyLoadout(state,index){
 const e=state.loadouts[index];if(!e||!state.placed.some(p=>['gearrack','toolcabinet'].includes(p.id))||state.x<-27||state.x>-6||state.z<5||state.z>27)return {ok:false,reason:'Комплект доступен у стеллажа дома'};
 for(const [slot,id] of Object.entries(e))if(id!==null&&!(id==='pipe'&&slot==='weapon')&&!RECIPES.some(r=>r.id===id&&r.slot===slot&&state.owned.includes(id)))return {ok:false,reason:'Снаряжение недоступно'};
 const limit=RECIPES.find(r=>r.id===e.bag)?.capacity||26;if(bagWeight(state)>limit)return {ok:false,reason:'Сначала разгрузи рюкзак'};
 state.equipment={...e};state.hotbarSelected=state.hotbar.indexOf(e.weapon);return {ok:true};
}

export function upgradeStation(state,item){
 const spec=STATION_UPGRADES[item?.id];
 if(!spec||!state.placed.includes(item)||state.x<-27||state.x>-6||state.z<5||state.z>27)return {ok:false,reason:'Улучшение доступно у установленной станции дома'};
 if(item.upgrade===1)return {ok:false,reason:'Станция уже улучшена'};
 if(!spend(state,spec.cost))return {ok:false,reason:'Не хватает материалов для улучшения'};
 item.upgrade=1;return {ok:true};
}

export function buildStructure(state,part,obstacles=[]){
 if(state.x<-27||state.x>-6||state.z<5||state.z>27)return {ok:false,reason:'Строительство доступно у убежища'};
 const status=replacementPlan(state,part,obstacles);if(!status.ok)return status;
 if(!spend(state,status.cost))return {ok:false,reason:'Не хватает материалов'};
 if(status.old)state.construction.splice(state.construction.indexOf(status.old),1,{...part});else state.construction.push({...part});
 for(const [id,n]of Object.entries(status.refund||{}))state.stash[id]=(state.stash[id]||0)+n;return {ok:true,replaced:!!status.old};
}
export function dismantleStructure(state,part){
 if(state.x<-27||state.x>-6||state.z<5||state.z>27)return {ok:false,reason:'Разбор доступен у убежища'};
 const result=dismantleAllowed(state,part);if(!result.ok)return result;
 for(const [id,n]of Object.entries(STRUCTURES[part.id].cost))state.stash[id]=(state.stash[id]||0)+n;
 state.construction.splice(state.construction.indexOf(part),1);return {ok:true};
}

export const COOKING_RECIPES=['meal','fishmeal','stew','tea'];
export function atCookingStove(state){return state.placed.some(p=>p.id==='campstove'&&Math.hypot(state.x-p.x,state.z-p.z)<=2.5);}

export function salvageStatus(state,node){
 if(!node||node.find||!Object.hasOwn(CARGO_WEIGHT,node.machine)||!node.group?.visible||!Object.keys(node.loot).length)return {ok:false,reason:'Техника недоступна'};
 if(node.accessGate&&!state.openedGates.includes(node.accessGate))return {ok:false,reason:'Сначала открой помещение'};
 if(node.requires&&!state.owned.includes(node.requires))return {ok:false,reason:'Нужен подходящий инструмент'};
 if(state.depleted[node.id]!==undefined&&state.elapsed-state.depleted[node.id]<(node.respawnTime||240))return {ok:false,reason:'Техника уже забрана'};
 if(state.strippedNodes.includes(node.id))return {ok:false,reason:'Часть техники уже разобрана'};
 if(bagWeight(state)+CARGO_WEIGHT[node.machine]>capacity(state))return {ok:false,reason:'Не хватает места для целой техники'};
 return {ok:true};
}
export function takeSalvage(state,node){
 const status=salvageStatus(state,node);if(!status.ok)return status;
 state.cargo.push({machine:node.machine,node:node.id,loot:{...node.loot}});state.depleted[node.id]=state.elapsed;delete state.nodeLoot[node.id];return {ok:true};
}
export function processSalvage(state,index,stored=false){
 if(Math.hypot(state.x+21,state.z-13)>=4.5&&!nearFoundStation(state,'salvagejig'))return {ok:false,reason:'Подойди к станции рецептов или разборочной оснастке'};
 const list=stored?state.storedCargo:state.cargo,cargo=list[index];if(!cargo)return {ok:false,reason:'Груз уже разобран'};
 const received=cargoLoot(cargo,state);for(const [id,n]of Object.entries(received))state.stash[id]=(state.stash[id]||0)+n;list.splice(index,1);state.gathered+=Object.values(received).reduce((a,b)=>a+b,0);return {ok:true,received};
}
export function recoverCargo(state,cargo){
 if(!cargo)return true;for(let i=0;i<cargo.length;){if(bagWeight(state)+CARGO_WEIGHT[cargo[i].machine]<=capacity(state)){state.cargo.push(cargo.splice(i,1)[0]);}else i++;}return !cargo.length;
}

export function toggleYardGate(state,item,obstacles=[]){
 if(item?.id!=='yardgate'||!state.placed.includes(item)||Math.hypot(item.x-state.x,item.z-state.z)>2.4)return {ok:false,reason:'Подойди к калитке'};
 const c=Math.cos(item.rotation||0),s=Math.sin(item.rotation||0),localZ=(state.x-item.x)*s+(state.z-item.z)*c;
 const next={...item,open:!item.open,openSide:localZ>=0?1:-1},index=state.placed.indexOf(item),rects=furnitureColliders(next);
 if(rects.some(r=>circleHitsRect(state.x,state.z,.32,r)||obstacles.some(o=>!o.disabled&&overlaps(r,o,.02))||state.placed.some((p,i)=>i!==index&&furnitureColliders(p).some(o=>overlaps(r,o,-1e-6)))))return {ok:false,reason:'Отойди от створки или освободи место'};
 if(!yardRouteClear(state,next,obstacles,index))return {ok:false,reason:'Калитка перекроет выход к дому'};
 Object.assign(item,next);return {ok:true};
}

// Field repairs use carried resources; remote home storage is never spent here.
export function fieldCost(state,cost){return Object.entries(cost).every(([id,n])=>(state.bag[id]||0)>=n);}
export function repairField(state,id){
 const shore=FLOOD_DOCKS[0],boat=id==='boat',cost=boat?BOAT_REPAIR:CAMP.cost;
 if(!['boat','camp'].includes(id)||state.boat.aboard||Math.hypot(state.x-(boat?shore.foot.x:CAMP.x),state.z-(boat?shore.foot.z:CAMP.z))>3)return {ok:false,reason:'Подойди к месту ремонта'};
 if(boat?state.boat.repaired:state.camp.ready)return {ok:false,reason:'Уже восстановлено'};
 if(!fieldCost(state,cost))return {ok:false,reason:'Нужные материалы должны быть в рюкзаке'};
 for(const [key,n]of Object.entries(cost))state.bag[key]-=n;
 if(boat)state.boat.repaired=true;else state.camp.ready=true;return {ok:true};
}
export function campWeight(state){return Object.entries(state.camp.store).reduce((n,[id,count])=>n+RESOURCES[id].weight*count,0);}
export function atCamp(state){return state.camp.ready&&!state.boat.aboard&&Math.hypot(state.x-CAMP.x,state.z-CAMP.z)<=3;}
export function transferCamp(state,id,direction,count=1){
 if(!atCamp(state)||!Object.hasOwn(RESOURCES,id)||!['deposit','withdraw'].includes(direction)||!Number.isSafeInteger(count)||count<1)return {ok:false,reason:'Подойди к ящику стоянки'};
 const deposit=direction==='deposit',from=deposit?state.bag:state.camp.store,to=deposit?state.camp.store:state.bag;
 const room=deposit?CAMP.capacity-campWeight(state):capacity(state)-bagWeight(state),n=Math.min(count,from[id]||0,Math.floor((room+1e-8)/RESOURCES[id].weight));
 if(n<1)return {ok:false,reason:'Нет места или материала'};from[id]-=n;to[id]=(to[id]||0)+n;return {ok:true,count:n};
}
export function cookCamp(state,id){
 if(!atCamp(state)||!COOKING_RECIPES.includes(id))return {ok:false,reason:'Подойди к печи стоянки'};
 const recipe=RECIPES.find(r=>r.id===id);if(!fieldCost(state,recipe.cost))return {ok:false,reason:'Ингредиенты должны быть в рюкзаке'};
 for(const [key,n]of Object.entries(recipe.cost))state.bag[key]-=n;const output=recipe.output||1;state[SUPPLY_FIELDS[id]]+=output;return {ok:true,output};
}

// Found workstations enable conveniences, never free supplies or faster production.
export function nearFoundStation(state,id){return !state.boat.aboard&&state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27&&state.placed.some(p=>p.id===id&&Math.hypot(p.x-state.x,p.z-state.z)<3);}
export function rememberPackingPlan(state){
 if(!nearFoundStation(state,'packingdesk'))return {ok:false,reason:'Подойди к столу подготовки дома'};
 const plan=Object.fromEntries(Object.keys(RESOURCES).filter(id=>(state.bag[id]||0)>0).map(id=>[id,Math.min(1000,state.bag[id])]));
 state.packingPlan=plan;return {ok:true};
}
export function refillPackingPlan(state){
 if(!nearFoundStation(state,'packingdesk'))return {ok:false,reason:'Подойди к столу подготовки дома'};
 if(!Object.keys(state.packingPlan).length)return {ok:false,reason:'Сначала запомни ресурсы в рюкзаке'};
 const received={},missing={};let space=capacity(state)-bagWeight(state);
 for(const [id,target]of Object.entries(state.packingPlan)){
  if(!RESOURCES[id])continue;
  const need=Math.max(0,target-(state.bag[id]||0)),n=Math.max(0,Math.min(need,state.stash[id]||0,Math.floor((space+.001)/RESOURCES[id].weight)));
  if(n){state.stash[id]-=n;state.bag[id]=(state.bag[id]||0)+n;received[id]=n;space-=n*RESOURCES[id].weight;}
  if(n<need)missing[id]=need-n;
 }
 return {ok:true,received,missing};
}
export function salvageQueue(state){
 if(!nearFoundStation(state,'salvagejig'))return {ok:false,reason:'Подойди к разборочной оснастке дома'};
 const queue=[...state.cargo.map(cargo=>({cargo,stored:false})),...state.storedCargo.map(cargo=>({cargo,stored:true}))];
 return queue.length?{ok:true,queue}:{ok:false,reason:'Нет техники для разбора'};
}

export function atQuarryWorkshop(state){return state.restoredRoutes.includes(QUARRY_WORKSHOP.id)&&!state.boat.aboard&&Math.hypot(state.x-QUARRY_WORKSHOP.x,state.z-QUARRY_WORKSHOP.z)<2.6;}
export function quarryCraftStatus(state,id){
 if(!atQuarryWorkshop(state))return {ok:false,reason:'Подойди к восстановленной мастерской разреза'};
 if(!QUARRY_FIELD_RECIPES.includes(id))return {ok:false,reason:'Этот рецепт доступен на другой станции'};
 const recipe=RECIPES.find(r=>r.id===id);if(!fieldCost(state,recipe.cost))return {ok:false,reason:'Материалы должны быть в рюкзаке'};
 return {ok:true,recipe};
}
export function craftAtQuarry(state,id){
 const result=quarryCraftStatus(state,id);if(!result.ok)return result;
 for(const [key,n]of Object.entries(result.recipe.cost))state.bag[key]-=n;
 if(id==='ammo')state.ammo+=12;else state.medkits++;
 return {ok:true};
}
